import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PrintTransferDocument } from "../../_components/print-transfer-document";

export default async function PrintTransferPage({
  params,
}: {
  params: { id: string };
}) {
  const transferId = params.id;

  // Get transfer with related data
  const transfer = await prisma.transfer.findUnique({
    where: { id: transferId },
    include: {
      Warehouse_Transfer_fromWarehouseIdToWarehouse: {
        select: { id: true, name: true, code: true, address: true }
      },
      Warehouse_Transfer_toWarehouseIdToWarehouse: {
        select: { id: true, name: true, code: true, address: true }
      },
      Store_Transfer_toStoreIdToStore: {
        select: { id: true, name: true, code: true, address: true }
      },
      Store_Transfer_fromStoreIdToStore: {
        select: { id: true, name: true, code: true, address: true }
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              costPrice: true,
              retailPrice: true,
              category: {
                select: { id: true, name: true }
              }
            }
          },
        },
      },
    },
  });

  if (!transfer) {
    notFound();
  }

  // Create a compatible transfer object with all required fields
  const adaptedTransfer = {
    ...transfer,
    approvedAt: transfer.approvedDate,
    shippedAt: transfer.actualDeliveryDate || null, // Use actualDeliveryDate instead of shippedDate
    receivedAt: transfer.completedDate || null,
    // Add compatibility aliases for the print component
    fromWarehouse: transfer.Warehouse_Transfer_fromWarehouseIdToWarehouse,
    toWarehouse: transfer.Warehouse_Transfer_toWarehouseIdToWarehouse,
    toStore: transfer.Store_Transfer_toStoreIdToStore,
    fromStore: transfer.Store_Transfer_fromStoreIdToStore,
  };

  return <PrintTransferDocument transfer={adaptedTransfer as any} />;
}


