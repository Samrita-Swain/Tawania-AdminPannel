import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CancelTransferForm } from "../../_components/cancel-transfer-form";

export default async function CancelTransferPage({
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

  // Only allow cancellation of transfers in DRAFT or PENDING status
  if (transfer.status !== "DRAFT" && transfer.status !== "PENDING") {
    return (
      <div className="mx-auto max-w-4xl py-8">
        <div className="rounded-lg bg-yellow-50 p-4 text-yellow-800">
          <h2 className="text-lg font-medium">Cannot Cancel Transfer</h2>
          <p className="mt-2">
            This transfer cannot be cancelled because it is in {transfer.status} status.
            Only transfers in DRAFT or PENDING status can be cancelled.
          </p>
          <div className="mt-4">
            <a
              href={`/transfers/${transfer.id}`}
              className="rounded-md bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-800 hover:bg-yellow-200"
            >
              Back to Transfer Details
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">
          Cancel Transfer #{transfer.transferNumber}
        </h1>
      </div>

      <CancelTransferForm transfer={transfer} />
    </div>
  );
}
