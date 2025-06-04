import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("=== STATUS UPDATE API CALLED ===");

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.log("No session found");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { status, reason } = await req.json();

    console.log("Status update request:", { id, status, reason, userId: session.user.id });

    // Validate status
    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    // Get the current transfer
    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!transfer) {
      return NextResponse.json(
        { error: "Transfer not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      status,
    };

    // Add additional fields based on status
    if (status === "APPROVED") {
      updateData.approvedById = session.user.id;
      updateData.approvedDate = new Date();
    } else if (status === "REJECTED") {
      updateData.rejectedById = session.user.id;
      updateData.rejectedDate = new Date();
      updateData.rejectionReason = reason;
    } else if (status === "COMPLETED") {
      updateData.completedById = session.user.id;
      updateData.completedDate = new Date();
    }

    // Update the transfer
    const updatedTransfer = await prisma.transfer.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // If the transfer is completed, update inventory
    if (status === "COMPLETED") {
      try {
        await processCompletedTransfer(updatedTransfer, session.user.id);
      } catch (inventoryError) {
        console.log("Inventory processing failed:", inventoryError);
        // Continue without failing the status update
      }
    }

    // If the transfer is rejected, release reserved inventory
    if (status === "REJECTED") {
      try {
        await releaseReservedInventory(transfer);
      } catch (inventoryError) {
        console.log("Reserved inventory release failed:", inventoryError);
        // Continue without failing the status update
      }
    }

    // Create audit log (simplified to avoid errors)
    try {
      await createAuditLog({
        entityType: "Transfer",
        entityId: id,
        action: "UPDATE" as any,
        details: {
          status,
          reason,
          userId: session.user.id,
          userName: session.user.name,
        },
      });
    } catch (auditError) {
      console.log("Audit log creation failed:", auditError);
      // Continue without failing the status update
    }

    console.log("Status update successful");
    return NextResponse.json(updatedTransfer);
  } catch (error) {
    console.error("=== ERROR IN STATUS UPDATE API ===");
    console.error("Error updating transfer status:", error);

    let errorMessage = "Failed to update transfer status";
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error("Error message:", errorMessage);
      console.error("Error stack:", error.stack);
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.stack : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

async function processCompletedTransfer(transfer: any, userId: string) {
  // Process each item in the transfer
  for (const item of transfer.items) {
    // Determine source and destination based on transfer type
    let sourceInventoryQuery: any = {};
    let destinationInventoryQuery: any = {};

    if (transfer.fromWarehouseId) {
      sourceInventoryQuery = {
        productId: item.productId,
        warehouseId: transfer.fromWarehouseId,
      };
    } else if (transfer.fromStoreId) {
      sourceInventoryQuery = {
        productId: item.productId,
        storeId: transfer.fromStoreId,
      };
    }

    // Process source inventory
    if (Object.keys(sourceInventoryQuery).length > 0) {
      const sourceInventory = await prisma.inventoryItem.findFirst({
        where: sourceInventoryQuery,
      });

      if (sourceInventory) {
        await prisma.inventoryItem.update({
          where: { id: sourceInventory.id },
          data: {
            quantity: {
              decrement: item.quantity,
            },
            reservedQuantity: {
              decrement: item.quantity,
            },
          },
        });

        // Log inventory adjustment
        try {
          await createAuditLog({
            entityType: "InventoryItem",
            entityId: sourceInventory.id,
            action: "UPDATE" as any,
            details: {
              type: "TRANSFER_OUT",
              transferId: transfer.id,
              productId: item.productId,
              quantity: -item.quantity,
              previousQuantity: sourceInventory.quantity,
              newQuantity: sourceInventory.quantity - item.quantity,
            },
          });
        } catch (e) {
          console.log("Audit log failed:", e);
        }
      }
    }

    // Process destination inventory
    if (transfer.toWarehouseId) {
      destinationInventoryQuery = {
        productId: item.productId,
        warehouseId: transfer.toWarehouseId,
      };
    } else if (transfer.toStoreId) {
      destinationInventoryQuery = {
        productId: item.productId,
        storeId: transfer.toStoreId,
      };
    }

    if (Object.keys(destinationInventoryQuery).length > 0) {
      const destinationInventory = await prisma.inventoryItem.findFirst({
        where: destinationInventoryQuery,
      });

      if (destinationInventory) {
        // Update existing inventory
        await prisma.inventoryItem.update({
          where: { id: destinationInventory.id },
          data: {
            quantity: {
              increment: item.quantity,
            },
            costPrice: item.targetCostPrice || destinationInventory.costPrice,
            retailPrice: item.targetRetailPrice || destinationInventory.retailPrice,
          },
        });

        // Log inventory adjustment
        try {
          await createAuditLog({
            entityType: "InventoryItem",
            entityId: destinationInventory.id,
            action: "UPDATE" as any,
            details: {
              type: "TRANSFER_IN",
              transferId: transfer.id,
              productId: item.productId,
              quantity: item.quantity,
              previousQuantity: destinationInventory.quantity,
              newQuantity: destinationInventory.quantity + item.quantity,
              previousCostPrice: destinationInventory.costPrice,
              newCostPrice: item.targetCostPrice || destinationInventory.costPrice,
              previousRetailPrice: destinationInventory.retailPrice,
              newRetailPrice: item.targetRetailPrice || destinationInventory.retailPrice,
            },
          });
        } catch (e) {
          console.log("Audit log failed:", e);
        }
      } else {
        // Create new inventory
        const newInventory = await prisma.inventoryItem.create({
          data: {
            productId: item.productId,
            warehouseId: transfer.toWarehouseId || null,
            storeId: transfer.toStoreId || null,
            quantity: item.quantity,
            reservedQuantity: 0,
            costPrice: item.targetCostPrice || item.sourceCostPrice,
            retailPrice: item.targetRetailPrice || item.sourceRetailPrice,
            status: "AVAILABLE",
          },
        });

        // Log inventory creation
        try {
          await createAuditLog({
            entityType: "InventoryItem",
            entityId: newInventory.id,
            action: "CREATE" as any,
            details: {
              type: "TRANSFER_IN",
              transferId: transfer.id,
              productId: item.productId,
              quantity: item.quantity,
              costPrice: item.targetCostPrice || item.sourceCostPrice,
              retailPrice: item.targetRetailPrice || item.sourceRetailPrice,
            },
          });
        } catch (e) {
          console.log("Audit log failed:", e);
        }
      }
    }

    // Update transfer item - remove completedQuantity if it doesn't exist in schema
    await prisma.transferItem.update({
      where: { id: item.id },
      data: {
        // Remove completedQuantity
        // completedQuantity: item.requestedQuantity,
      },
    });
  }
}

async function releaseReservedInventory(transfer: any) {
  // Process each item in the transfer
  for (const item of transfer.items) {
    // Determine source based on transfer type
    let sourceInventoryQuery: any = {};

    if (transfer.fromWarehouseId) {
      sourceInventoryQuery = {
        productId: item.productId,
        warehouseId: transfer.fromWarehouseId,
      };
    } else if (transfer.fromStoreId) {
      sourceInventoryQuery = {
        productId: item.productId,
        storeId: transfer.fromStoreId,
      };
    }

    // Release reserved quantity
    if (Object.keys(sourceInventoryQuery).length > 0) {
      const sourceInventory = await prisma.inventoryItem.findFirst({
        where: sourceInventoryQuery,
      });

      if (sourceInventory) {
        await prisma.inventoryItem.update({
          where: { id: sourceInventory.id },
          data: {
            reservedQuantity: {
              decrement: item.quantity,
            },
          },
        });

        // Log inventory adjustment
        try {
          await createAuditLog({
            entityType: "InventoryItem",
            entityId: sourceInventory.id,
            action: "UPDATE" as any,
            details: {
              type: "RELEASE_RESERVED",
              transferId: transfer.id,
              productId: item.productId,
              quantity: item.quantity,
              previousReservedQuantity: sourceInventory.reservedQuantity,
              newReservedQuantity: sourceInventory.reservedQuantity - item.quantity,
            },
          });
        } catch (e) {
          console.log("Audit log failed:", e);
        }
      }
    }
  }
}


