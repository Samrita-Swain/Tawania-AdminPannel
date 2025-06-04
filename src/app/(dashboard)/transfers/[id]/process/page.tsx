import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { TransferProcessForm } from "../../_components/transfer-process-form";

export default async function TransferProcessPage({
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
      fromWarehouse: true,
      toWarehouse: true,
      toStore: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!transfer) {
    notFound();
  }

  // Redirect if transfer is not in PENDING status
  if (transfer.status !== "PENDING") {
    redirect(`/transfers/${transferId}`);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Process Transfer #{transfer.transferNumber}</h1>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div>
            <h3 className="text-sm font-medium text-gray-500">From Warehouse</h3>
            <p className="mt-1 text-base font-medium text-gray-900">{transfer.fromWarehouse?.name}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Destination</h3>
            <p className="mt-1 text-base font-medium text-gray-900">
              {transfer.toWarehouse?.name || transfer.toStore?.name}
            </p>
            <p className="text-sm text-gray-500">
              {transfer.toWarehouse ? "Warehouse" : "Store"}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Items</h3>
            <p className="mt-1 text-base font-medium text-gray-900">
              {transfer.items.length} products
            </p>
            <p className="text-sm text-gray-500">
              {transfer.items.reduce((sum, item) => sum + item.quantity, 0)} total units
            </p>
          </div>
        </div>

        <TransferProcessForm transfer={transfer} />
      </div>
    </div>
  );
}
