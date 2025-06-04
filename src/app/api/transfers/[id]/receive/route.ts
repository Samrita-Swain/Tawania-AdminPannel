import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

interface ReceivedItem {
  transferItemId: string;
  productId: string;
  receivedQuantity: number;
  binId?: string | null;
  notes?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const transferId = params.id;

    // Parse request body
    const body = await req.json();
    const { receivedItems, notes } = body;

    // Validate required fields
    if (!receivedItems || !Array.isArray(receivedItems)) {
      return NextResponse.json(
        { message: "Missing or invalid receivedItems" },
        { status: 400 }
      );
    }

    // Get the transfer
    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
      include: {
        items: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            sourceCostPrice: true,
            sourceRetailPrice: true,
            targetCostPrice: true,
            targetRetailPrice: true
          }
        },
        Warehouse_Transfer_fromWarehouseIdToWarehouse: {
          select: { id: true, name: true, code: true }
        },
        Warehouse_Transfer_toWarehouseIdToWarehouse: {
          select: { id: true, name: true, code: true }
        },
        Store_Transfer_toStoreIdToStore: {
          select: { id: true, name: true, code: true }
        },
        Store_Transfer_fromStoreIdToStore: {
          select: { id: true, name: true, code: true }
        },
      },
    });

    if (!transfer) {
      return NextResponse.json(
        { message: "Transfer not found" },
        { status: 404 }
      );
    }

    // Check if transfer is in IN_TRANSIT status
    if (transfer.status !== "IN_TRANSIT") {
      return NextResponse.json(
        { message: "Transfer can only be received when in IN_TRANSIT status" },
        { status: 400 }
      );
    }

    // Start a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the transfer status
      const updatedTransfer = await tx.transfer.update({
        where: { id: transferId },
        data: {
          status: "COMPLETED",
          completedDate: new Date(),
          completedById: session.user.id,
          notes: notes || transfer.notes,
        },
      });

      // Process each received item
      for (const receivedItem of receivedItems) {
        const transferItem = transfer.items.find(item => item.id === receivedItem.transferItemId);

        if (!transferItem) {
          throw new Error(`Transfer item not found: ${receivedItem.transferItemId}`);
        }

        // Update the transfer item with received quantity
        await tx.transferItem.update({
          where: { id: receivedItem.transferItemId },
          data: {
            notes: receivedItem.notes || transferItem.notes,
          },
        });

        // Skip if received quantity is 0
        if (receivedItem.receivedQuantity <= 0) {
          continue;
        }

        // Handle based on transfer type
        if (transfer.transferType === "RELOCATION" && transfer.toWarehouseId) {
          // Check if inventory item already exists at destination
          let destinationInventoryItem = await tx.inventoryItem.findFirst({
            where: {
              productId: receivedItem.productId,
              warehouseId: transfer.toWarehouseId,
              binId: receivedItem.binId || null,
            },
          });

          if (destinationInventoryItem) {
            // Update existing inventory item
            await tx.inventoryItem.update({
              where: { id: destinationInventoryItem.id },
              data: {
                quantity: {
                  increment: receivedItem.receivedQuantity,
                },
              },
            });

            // Create inventory transaction record
            await tx.$executeRaw`
              INSERT INTO "InventoryTransaction" (
                "id",
                "inventoryItemId",
                "productId",
                "transactionType",
                "quantity",
                "notes",
                "createdById",
                "createdAt",
                "updatedAt"
              ) VALUES (
                ${randomUUID()},
                ${destinationInventoryItem.id},
                ${receivedItem.productId},
                'TRANSFER_IN',
                ${receivedItem.receivedQuantity},
                ${`Transfer in: ${transfer.transferNumber}`},
                ${session.user.id},
                ${new Date()},
                ${new Date()}
              )
            `;
          } else {
            // Create new inventory item at destination
            const newInventoryItem = await tx.inventoryItem.create({
              data: {
                productId: receivedItem.productId,
                warehouseId: transfer.toWarehouseId,
                binId: receivedItem.binId || null,
                quantity: receivedItem.receivedQuantity,
                reservedQuantity: 0,
                status: "AVAILABLE",
              },
            });

            // Create inventory transaction record
            await tx.$executeRaw`
              INSERT INTO "InventoryTransaction" (
                "id",
                "inventoryItemId",
                "productId",
                "transactionType",
                "quantity",
                "notes",
                "createdById",
                "createdAt",
                "updatedAt"
              ) VALUES (
                ${randomUUID()},
                ${newInventoryItem.id},
                ${receivedItem.productId},
                'TRANSFER_IN',
                ${receivedItem.receivedQuantity},
                ${`Transfer in: ${transfer.transferNumber}`},
                ${session.user.id},
                ${new Date()},
                ${new Date()}
              )
            `;
          }
        } else if (transfer.transferType === "RESTOCK" && transfer.toStoreId) {
          // Check if inventory item already exists at destination store
          let destinationInventoryItem = await tx.inventoryItem.findFirst({
            where: {
              productId: receivedItem.productId,
              storeId: transfer.toStoreId,
            },
          });

          if (destinationInventoryItem) {
            // Update existing inventory item
            await tx.inventoryItem.update({
              where: { id: destinationInventoryItem.id },
              data: {
                quantity: {
                  increment: receivedItem.receivedQuantity,
                },
              },
            });

            // Create inventory transaction record
            await tx.$executeRaw`
              INSERT INTO "InventoryTransaction" (
                "id",
                "inventoryItemId",
                "productId",
                "transactionType",
                "quantity",
                "notes",
                "createdById",
                "createdAt",
                "updatedAt"
              ) VALUES (
                ${randomUUID()},
                ${destinationInventoryItem.id},
                ${receivedItem.productId},
                'TRANSFER_IN',
                ${receivedItem.receivedQuantity},
                ${`Transfer in: ${transfer.transferNumber}`},
                ${session.user.id},
                ${new Date()},
                ${new Date()}
              )
            `;
          } else {
            // Create new inventory item at destination store
            const newInventoryItem = await tx.inventoryItem.create({
              data: {
                productId: receivedItem.productId,
                storeId: transfer.toStoreId,
                quantity: receivedItem.receivedQuantity,
                reservedQuantity: 0,
                status: "AVAILABLE",
              },
            });

            // Create inventory transaction record
            await tx.$executeRaw`
              INSERT INTO "InventoryTransaction" (
                "id",
                "inventoryItemId",
                "productId",
                "transactionType",
                "quantity",
                "notes",
                "createdById",
                "createdAt",
                "updatedAt"
              ) VALUES (
                ${randomUUID()},
                ${newInventoryItem.id},
                ${receivedItem.productId},
                'TRANSFER_IN',
                ${receivedItem.receivedQuantity},
                ${`Transfer in: ${transfer.transferNumber}`},
                ${session.user.id},
                ${new Date()},
                ${new Date()}
              )
            `;
          }
        }
      }

      return updatedTransfer;
    });

    return NextResponse.json({
      message: "Transfer received successfully",
      transfer: result,
    });
  } catch (error) {
    console.error("Error receiving transfer:", error);
    return NextResponse.json(
      { message: "Failed to receive transfer", error: (error as Error).message },
      { status: 500 }
    );
  }
}


