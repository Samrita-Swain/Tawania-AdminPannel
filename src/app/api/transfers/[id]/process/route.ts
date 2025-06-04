import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

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
    const { action, shippingMethod, trackingNumber, notes } = body;

    // Validate required fields
    if (!action) {
      return NextResponse.json(
        { message: "Action is required" },
        { status: 400 }
      );
    }

    // Get the transfer
    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                costPrice: true,
                retailPrice: true
              }
            },
          },
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

    // Process the transfer based on the action
    let updatedTransfer;

    if (action === 'approve') {
      // Check if transfer is in a state that can be approved
      if (transfer.status !== 'PENDING') {
        return NextResponse.json(
          { message: "Transfer must be in PENDING status to be approved" },
          { status: 400 }
        );
      }

      // Update transfer status
      updatedTransfer = await prisma.transfer.update({
        where: { id: transferId },
        data: {
          status: 'APPROVED',
          approvedById: session.user.id,
          approvedDate: new Date(),
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          fromWarehouse: true,
          toWarehouse: true,
          fromStore: true,
          toStore: true,
        },
      });

      // Create audit log
      await createAuditLog({
        entityType: 'Transfer',
        entityId: transfer.id,
        action: 'APPROVAL',
        userId: session.user.id,
        details: {
          transferNumber: transfer.transferNumber,
          status: 'APPROVED',
          notes,
        },
      });
    } else if (action === 'reject') {
      // Check if transfer is in a state that can be rejected
      if (transfer.status !== 'PENDING') {
        return NextResponse.json(
          { message: "Transfer must be in PENDING status to be rejected" },
          { status: 400 }
        );
      }

      // Update transfer status
      updatedTransfer = await prisma.transfer.update({
        where: { id: transferId },
        data: {
          status: 'REJECTED',
          rejectedById: session.user.id,
          rejectedDate: new Date(),
          rejectionReason: notes,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          fromWarehouse: true,
          toWarehouse: true,
          fromStore: true,
          toStore: true,
        },
      });

      // Create audit log
      await createAuditLog({
        entityType: 'Transfer',
        entityId: transfer.id,
        action: 'REJECTION',
        userId: session.user.id,
        details: {
          transferNumber: transfer.transferNumber,
          status: 'REJECTED',
          rejectionReason: notes,
        },
      });
    } else if (action === 'ship') {
      // Check if transfer is in a state that can be shipped
      if (transfer.status !== 'PENDING') {
        return NextResponse.json(
          { message: "Transfer must be in PENDING status to be shipped" },
          { status: 400 }
        );
      }

      // Start a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update the transfer status
        const updatedTransfer = await tx.transfer.update({
          where: { id: transferId },
          data: {
            status: "IN_TRANSIT",
            shippingMethod: shippingMethod || null,
            trackingNumber: trackingNumber || null,
            approvedAt: new Date(),
            approvedById: session.user.id,
            processingNotes: notes || null,
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
            fromWarehouse: true,
            toWarehouse: true,
            fromStore: true,
            toStore: true,
          },
        });

        // Process inventory reduction from source location
        // Process each item in the transfer
        for (const item of transfer.items) {
          // Get the source inventory item
          const sourceInventoryItem = await tx.inventoryItem.findFirst({
            where: {
              productId: item.productId,
              warehouseId: transfer.fromWarehouseId,
            },
          });

          if (!sourceInventoryItem) {
            throw new Error(`Source inventory item not found for product ${item.product.name}`);
          }

          if (sourceInventoryItem.quantity < item.quantity) {
            throw new Error(`Insufficient quantity for product ${item.product.name} in warehouse`);
          }

          // Update the source inventory item
          await tx.inventoryItem.update({
            where: { id: sourceInventoryItem.id },
            data: {
              quantity: {
                decrement: item.quantity,
              },
            },
          });

          // Create inventory transaction record
          await tx.inventoryTransaction.create({
            data: {
              type: "TRANSFER_OUT",
              quantity: -item.quantity,
              productId: item.productId,
              warehouseId: transfer.fromWarehouseId,
              referenceId: transferId,
              referenceType: "TRANSFER",
              notes: `Transfer #${transfer.transferNumber} processed`,
              createdById: session.user.id,
            },
          });
        }

        return updatedTransfer;
      });

      updatedTransfer = result;

      // Create audit log
      await createAuditLog({
        entityType: 'Transfer',
        entityId: transfer.id,
        action: 'TRANSFER',
        userId: session.user.id,
        details: {
          transferNumber: transfer.transferNumber,
          status: 'IN_TRANSIT',
          notes,
        },
      });
    } else if (action === 'cancel') {
      // Check if transfer is in a state that can be cancelled
      if (transfer.status === 'COMPLETED' || transfer.status === 'CANCELLED') {
        return NextResponse.json(
          { message: "Transfer cannot be cancelled in its current state" },
          { status: 400 }
        );
      }

      // Update transfer status
      updatedTransfer = await prisma.transfer.update({
        where: { id: transferId },
        data: {
          status: 'CANCELLED',
          cancelledById: session.user.id,
          cancelledDate: new Date(),
          cancellationReason: notes,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          fromWarehouse: true,
          toWarehouse: true,
          fromStore: true,
          toStore: true,
        },
      });

      // Create audit log
      await createAuditLog({
        entityType: 'Transfer',
        entityId: transfer.id,
        action: 'CANCELLATION',
        userId: session.user.id,
        details: {
          transferNumber: transfer.transferNumber,
          status: 'CANCELLED',
          cancellationReason: notes,
        },
      });
    } else {
      return NextResponse.json(
        { message: "Invalid action" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: `Transfer ${action}d successfully`,
      transfer: updatedTransfer,
    });
  } catch (error) {
    console.error("Error processing transfer:", error);
    return NextResponse.json(
      { message: "Failed to process transfer", error: (error as Error).message },
      { status: 500 }
    );
  }
}
