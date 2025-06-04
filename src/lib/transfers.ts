import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { TransferStatus, TransferType } from '@prisma/client';

interface TransferItemInput {
  productId: string;
  quantity: number;
  sourceCostPrice: number;
  sourceRetailPrice: number;
  targetCostPrice: number;
  targetRetailPrice: number;
  adjustmentReason?: string;
  notes?: string;
}

interface CreateTransferInput {
  fromWarehouseId?: string;
  fromStoreId?: string;
  toWarehouseId?: string;
  toStoreId?: string;
  transferType: TransferType;
  expectedDeliveryDate?: Date;
  shippingMethod?: string;
  notes?: string;
  items: TransferItemInput[];
}

export async function createTransfer(input: CreateTransferInput, userId: string) {
  // Validate that either fromWarehouseId or fromStoreId is provided
  if (!input.fromWarehouseId && !input.fromStoreId) {
    throw new Error('Either fromWarehouseId or fromStoreId must be provided');
  }

  // Validate that either toWarehouseId or toStoreId is provided
  if (!input.toWarehouseId && !input.toStoreId) {
    throw new Error('Either toWarehouseId or toStoreId must be provided');
  }

  // Validate that source and destination are not the same
  if (
    (input.fromWarehouseId && input.toWarehouseId && input.fromWarehouseId === input.toWarehouseId) ||
    (input.fromStoreId && input.toStoreId && input.fromStoreId === input.toStoreId)
  ) {
    throw new Error('Source and destination cannot be the same');
  }

  // Generate a unique transfer number
  const transferNumber = `TRF-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

  // Calculate totals
  const totalItems = input.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalCost = input.items.reduce((sum, item) => sum + (item.targetCostPrice * item.quantity), 0);
  const totalRetail = input.items.reduce((sum, item) => sum + (item.targetRetailPrice * item.quantity), 0);

  // Create the transfer
  const transfer = await prisma.transfer.create({
    data: {
      transferNumber,
      fromWarehouseId: input.fromWarehouseId,
      fromStoreId: input.fromStoreId,
      toWarehouseId: input.toWarehouseId,
      toStoreId: input.toStoreId,
      status: TransferStatus.DRAFT,
      transferType: input.transferType,
      requestedById: userId,
      requestedDate: new Date(),
      expectedDeliveryDate: input.expectedDeliveryDate,
      shippingMethod: input.shippingMethod,
      notes: input.notes,
      totalItems,
      totalCost,
      totalRetail,
      items: {
        create: input.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          sourceCostPrice: item.sourceCostPrice,
          sourceRetailPrice: item.sourceRetailPrice,
          targetCostPrice: item.targetCostPrice,
          targetRetailPrice: item.targetRetailPrice,
          adjustmentReason: item.adjustmentReason,
          notes: item.notes,
        })),
      },
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
      Warehouse_Transfer_fromWarehouseIdToWarehouse: true,
      Store_Transfer_fromStoreIdToStore: true,
      Warehouse_Transfer_toWarehouseIdToWarehouse: true,
      Store_Transfer_toStoreIdToStore: true,
    },
  });

  // Create audit log
  await createAuditLog({
    entityType: 'Transfer',
    entityId: transfer.id,
    action: 'CREATE',
    details: {
      transferNumber,
      fromWarehouseId: input.fromWarehouseId,
      fromStoreId: input.fromStoreId,
      toWarehouseId: input.toWarehouseId,
      toStoreId: input.toStoreId,
      transferType: input.transferType,
      totalItems,
      totalCost,
      totalRetail,
    },
  });

  return transfer;
}

export async function updateTransferStatus(
  transferId: string,
  status: TransferStatus,
  userId: string,
  reason?: string
) {
  const transfer = await prisma.transfer.findUnique({
    where: { id: transferId },
    include: {
      items: true,
    },
  });

  if (!transfer) {
    throw new Error('Transfer not found');
  }

  const updateData: any = {
    status,
  };

  // Update additional fields based on status
  if (status === TransferStatus.APPROVED) {
    updateData.approvedById = userId;
    updateData.approvedDate = new Date();
  } else if (status === TransferStatus.REJECTED) {
    updateData.rejectedById = userId;
    updateData.rejectedDate = new Date();
    updateData.rejectionReason = reason;
  } else if (status === TransferStatus.COMPLETED) {
    updateData.completedById = userId;
    updateData.completedDate = new Date();
    updateData.actualDeliveryDate = new Date();
  }

  // Update the transfer
  const updatedTransfer = await prisma.transfer.update({
    where: { id: transferId },
    data: updateData,
    include: {
      items: {
        include: {
          product: true,
        },
      },
      Warehouse_Transfer_fromWarehouseIdToWarehouse: true,
      Store_Transfer_fromStoreIdToStore: true,
      Warehouse_Transfer_toWarehouseIdToWarehouse: true,
      Store_Transfer_toStoreIdToStore: true,
    },
  });

  // If the transfer is completed, update inventory
  if (status === TransferStatus.COMPLETED) {
    await processCompletedTransfer(updatedTransfer);
  }

  // Create audit log
  await createAuditLog({
    entityType: 'Transfer',
    entityId: transferId,
    action: status === TransferStatus.APPROVED ? 'APPROVAL' :
            status === TransferStatus.REJECTED ? 'REJECTION' : 'UPDATE',
    details: {
      status,
      reason,
    },
  });

  return updatedTransfer;
}

async function processCompletedTransfer(transfer: any) {
  // Process each item in the transfer
  for (const item of transfer.items) {
    // Reduce inventory at source location
    if (transfer.fromWarehouseId) {
      // Find the inventory item in the source warehouse
      const sourceInventory = await prisma.inventoryItem.findFirst({
        where: {
          productId: item.productId,
          warehouseId: transfer.fromWarehouseId,
        },
      });

      if (sourceInventory) {
        // Update the source inventory
        await prisma.inventoryItem.update({
          where: { id: sourceInventory.id },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });

        // Create audit log for inventory reduction
        await createAuditLog({
          entityType: 'InventoryItem',
          entityId: sourceInventory.id,
          action: 'ADJUSTMENT',
          details: {
            type: 'TRANSFER_OUT',
            transferId: transfer.id,
            previousQuantity: sourceInventory.quantity,
            newQuantity: sourceInventory.quantity - item.quantity,
          },
        });
      }
    } else if (transfer.fromStoreId) {
      // Find the inventory item in the source store
      const sourceInventory = await prisma.inventoryItem.findFirst({
        where: {
          productId: item.productId,
          storeId: transfer.fromStoreId,
        },
      });

      if (sourceInventory) {
        // Update the source inventory
        await prisma.inventoryItem.update({
          where: { id: sourceInventory.id },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });

        // Create audit log for inventory reduction
        await createAuditLog({
          entityType: 'InventoryItem',
          entityId: sourceInventory.id,
          action: 'ADJUSTMENT',
          details: {
            type: 'TRANSFER_OUT',
            transferId: transfer.id,
            previousQuantity: sourceInventory.quantity,
            newQuantity: sourceInventory.quantity - item.quantity,
          },
        });
      }
    }

    // Increase inventory at destination location
    if (transfer.toWarehouseId) {
      // Find the inventory item in the destination warehouse
      let destInventory = await prisma.inventoryItem.findFirst({
        where: {
          productId: item.productId,
          warehouseId: transfer.toWarehouseId,
        },
      });

      if (destInventory) {
        // Update the destination inventory
        await prisma.inventoryItem.update({
          where: { id: destInventory.id },
          data: {
            quantity: {
              increment: item.quantity,
            },
            costPrice: item.targetCostPrice,
            retailPrice: item.targetRetailPrice,
          },
        });

        // Create audit log for inventory increase
        await createAuditLog({
          entityType: 'InventoryItem',
          entityId: destInventory.id,
          action: 'ADJUSTMENT',
          details: {
            type: 'TRANSFER_IN',
            transferId: transfer.id,
            previousQuantity: destInventory.quantity,
            newQuantity: destInventory.quantity + item.quantity,
            previousCostPrice: destInventory.costPrice,
            newCostPrice: item.targetCostPrice,
            previousRetailPrice: destInventory.retailPrice,
            newRetailPrice: item.targetRetailPrice,
          },
        });
      } else {
        // Create new inventory item in the destination warehouse
        destInventory = await prisma.inventoryItem.create({
          data: {
            productId: item.productId,
            warehouseId: transfer.toWarehouseId,
            quantity: item.quantity,
            costPrice: item.targetCostPrice,
            retailPrice: item.targetRetailPrice,
            status: 'AVAILABLE',
          },
        });

        // Create audit log for new inventory
        await createAuditLog({
          entityType: 'InventoryItem',
          entityId: destInventory.id,
          action: 'CREATE',
          details: {
            type: 'TRANSFER_IN',
            transferId: transfer.id,
            quantity: item.quantity,
            costPrice: item.targetCostPrice,
            retailPrice: item.targetRetailPrice,
          },
        });
      }
    } else if (transfer.toStoreId) {
      // Find the inventory item in the destination store
      let destInventory = await prisma.inventoryItem.findFirst({
        where: {
          productId: item.productId,
          storeId: transfer.toStoreId,
        },
      });

      if (destInventory) {
        // Update the destination inventory
        await prisma.inventoryItem.update({
          where: { id: destInventory.id },
          data: {
            quantity: {
              increment: item.quantity,
            },
            costPrice: item.targetCostPrice,
            retailPrice: item.targetRetailPrice,
          },
        });

        // Create audit log for inventory increase
        await createAuditLog({
          entityType: 'InventoryItem',
          entityId: destInventory.id,
          action: 'ADJUSTMENT',
          details: {
            type: 'TRANSFER_IN',
            transferId: transfer.id,
            previousQuantity: destInventory.quantity,
            newQuantity: destInventory.quantity + item.quantity,
            previousCostPrice: destInventory.costPrice,
            newCostPrice: item.targetCostPrice,
            previousRetailPrice: destInventory.retailPrice,
            newRetailPrice: item.targetRetailPrice,
          },
        });
      } else {
        // Create new inventory item in the destination store
        destInventory = await prisma.inventoryItem.create({
          data: {
            productId: item.productId,
            storeId: transfer.toStoreId,
            quantity: item.quantity,
            costPrice: item.targetCostPrice,
            retailPrice: item.targetRetailPrice,
            status: 'AVAILABLE',
          },
        });

        // Create audit log for new inventory
        await createAuditLog({
          entityType: 'InventoryItem',
          entityId: destInventory.id,
          action: 'CREATE',
          details: {
            type: 'TRANSFER_IN',
            transferId: transfer.id,
            quantity: item.quantity,
            costPrice: item.targetCostPrice,
            retailPrice: item.targetRetailPrice,
          },
        });
      }
    }
  }
}
