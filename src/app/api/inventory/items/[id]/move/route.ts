import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InventoryStatus } from "@prisma/client";
import { randomUUID } from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const sourceInventoryId = resolvedParams.id;
    const data = await req.json();
    const { destinationType, destinationId, quantity, reason, notes } = data;

    console.log("Moving inventory:", {
      sourceInventoryId,
      destinationType,
      destinationId,
      quantity,
      reason
    });

    // Validate required fields
    if (!destinationType || !destinationId || quantity === undefined || !reason) {
      return NextResponse.json(
        { error: "Missing required fields: destinationType, destinationId, quantity, reason" },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { error: "Quantity must be greater than 0" },
        { status: 400 }
      );
    }

    // Fetch the source inventory item
    const sourceInventoryItem = await prisma.inventoryItem.findUnique({
      where: { id: sourceInventoryId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          }
        },
        warehouse: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    if (!sourceInventoryItem) {
      return NextResponse.json(
        { error: "Source inventory item not found" },
        { status: 404 }
      );
    }

    if (quantity > sourceInventoryItem.quantity) {
      return NextResponse.json(
        { error: "Cannot move more than available quantity" },
        { status: 400 }
      );
    }

    // Validate destination exists
    if (destinationType === "store") {
      const store = await prisma.store.findUnique({
        where: { id: destinationId },
        select: { id: true, name: true }
      });
      if (!store) {
        return NextResponse.json(
          { error: "Destination store not found" },
          { status: 404 }
        );
      }
    } else if (destinationType === "warehouse") {
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: destinationId },
        select: { id: true, name: true }
      });
      if (!warehouse) {
        return NextResponse.json(
          { error: "Destination warehouse not found" },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Invalid destination type. Must be 'store' or 'warehouse'" },
        { status: 400 }
      );
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update source inventory (reduce quantity)
      const newSourceQuantity = sourceInventoryItem.quantity - quantity;
      const sourceStatus = newSourceQuantity > 0 ? InventoryStatus.AVAILABLE : InventoryStatus.OUT_OF_STOCK;

      const updatedSourceItem = await tx.inventoryItem.update({
        where: { id: sourceInventoryId },
        data: {
          quantity: newSourceQuantity,
          status: sourceStatus,
          updatedAt: new Date(),
        }
      });

      // Check if destination inventory item already exists
      const existingDestinationItem = await tx.inventoryItem.findFirst({
        where: {
          productId: sourceInventoryItem.productId,
          ...(destinationType === "store" 
            ? { storeId: destinationId, warehouseId: null }
            : { warehouseId: destinationId, storeId: null }
          )
        }
      });

      let destinationItem;
      if (existingDestinationItem) {
        // Update existing destination inventory
        destinationItem = await tx.inventoryItem.update({
          where: { id: existingDestinationItem.id },
          data: {
            quantity: existingDestinationItem.quantity + quantity,
            status: InventoryStatus.AVAILABLE,
            updatedAt: new Date(),
          }
        });
      } else {
        // Create new destination inventory item
        destinationItem = await tx.inventoryItem.create({
          data: {
            id: randomUUID(),
            productId: sourceInventoryItem.productId,
            ...(destinationType === "store" 
              ? { storeId: destinationId, warehouseId: null }
              : { warehouseId: destinationId, storeId: null }
            ),
            quantity: quantity,
            status: InventoryStatus.AVAILABLE,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        });
      }

      // Try to create transaction records if the table exists
      try {
        // Source transaction (removal)
        await tx.inventoryTransaction.create({
          data: {
            inventoryItemId: sourceInventoryId,
            type: "MOVE_OUT",
            quantity: -quantity,
            reason: reason.toUpperCase(),
            notes: notes || null,
            userId: session.user?.id || null,
            createdAt: new Date(),
          }
        });

        // Destination transaction (addition)
        await tx.inventoryTransaction.create({
          data: {
            inventoryItemId: destinationItem.id,
            type: "MOVE_IN",
            quantity: quantity,
            reason: reason.toUpperCase(),
            notes: notes || null,
            userId: session.user?.id || null,
            createdAt: new Date(),
          }
        });
        console.log("Transaction records created");
      } catch (transactionError) {
        console.log("Could not create transaction records (table may not exist):", transactionError);
        // Continue without transaction records if table doesn't exist
      }

      return {
        sourceItem: updatedSourceItem,
        destinationItem,
      };
    });

    console.log("Inventory move completed:", {
      sourceInventoryId,
      destinationType,
      destinationId,
      quantity,
      newSourceQuantity: result.sourceItem.quantity,
      destinationQuantity: result.destinationItem.quantity
    });

    return NextResponse.json({
      success: true,
      move: {
        sourceItem: result.sourceItem,
        destinationItem: result.destinationItem,
        quantity,
        reason,
        destinationType,
      }
    });
  } catch (error) {
    console.error("Error moving inventory:", error);
    return NextResponse.json(
      { error: "Failed to move inventory" },
      { status: 500 }
    );
  }
}
