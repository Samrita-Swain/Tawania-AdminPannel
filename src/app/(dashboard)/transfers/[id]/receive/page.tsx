import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { TransferReceiveForm } from "../../_components/transfer-receive-form";

export default async function TransferReceivePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const transferId = params.id;

  // Get transfer with related data
  const transfer = await prisma.transfer.findUnique({
    where: { id: transferId },
    include: {
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
    },
  });

  if (!transfer) {
    notFound();
  }

  // Redirect if transfer is not in IN_TRANSIT status
  if (transfer.status !== "IN_TRANSIT") {
    redirect(`/transfers/${transferId}`);
  }

  // Get destination bins if it's a warehouse-to-warehouse transfer
  let destinationBins = [];
  if (transfer.transferType === "RELOCATION" && transfer.toWarehouseId) {
    try {
      // @ts-ignore - Handle potential missing bin model
      destinationBins = await prisma.bin.findMany({
        where: {
          shelf: {
            aisle: {
              zone: {
                warehouseId: transfer.toWarehouseId,
              },
            },
          },
        },
        include: {
          shelf: {
            include: {
              aisle: {
                include: {
                  zone: true,
                },
              },
            },
          },
        },
        orderBy: [
          { shelf: { aisle: { zone: { name: 'asc' } } } },
          { shelf: { aisle: { name: 'asc' } } },
          { shelf: { name: 'asc' } },
          { name: 'asc' },
        ],
      });
    } catch (error) {
      console.error("Error fetching bins:", error);
      destinationBins = [];
    }
  }

  // Create a compatible transfer object for the TransferReceiveForm
  const adaptedTransfer = {
    id: transfer.id,
    referenceNumber: transfer.transferNumber, // Use transferNumber as referenceNumber
    transferType: transfer.transferType,
    sourceWarehouseId: transfer.fromWarehouseId || "",
    destinationWarehouseId: transfer.toWarehouseId,
    destinationStoreId: transfer.toStoreId,
    sourceWarehouse: transfer.fromWarehouse,
    destinationWarehouse: transfer.toWarehouse,
    destinationStore: transfer.toStore,
    items: transfer.items,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Receive Transfer #{transfer.transferNumber}</h1>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Source</h3>
            <p className="mt-1 text-base font-medium text-gray-900">{transfer.fromWarehouse?.name}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Destination</h3>
            <p className="mt-1 text-base font-medium text-gray-900">
              {transfer.toWarehouse?.name || transfer.toStore?.name}
            </p>
            <p className="text-sm text-gray-500">
              {transfer.transferType === "RELOCATION" ? "Warehouse" : "Store"}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Shipping Info</h3>
            <p className="mt-1 text-base font-medium text-gray-900">
              {transfer.shippingMethod || "Not specified"}
            </p>
            {transfer.trackingNumber && (
              <p className="text-sm text-gray-500">
                Tracking: {transfer.trackingNumber}
              </p>
            )}
          </div>
        </div>

        <TransferReceiveForm
          transfer={adaptedTransfer as any}
          destinationBins={destinationBins}
        />
      </div>
    </div>
  );
}

