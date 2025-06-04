import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TransferStatusBadge } from "../_components/transfer-status-badge";
import { TransferActions } from "../_components/transfer-actions";
import { CheckCircle, ArrowLeft } from "lucide-react";

export default async function TransferDetailPage({
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

  // Calculate totals
  const totalItems = transfer.items.length;
  const totalQuantity = transfer.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = transfer.items.reduce((sum, item) => {
    const itemValue = item.sourceCostPrice ? item.quantity * Number(item.sourceCostPrice) : 0;
    return sum + itemValue;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Back to Transfers Button */}
      <div className="mb-4">
        <Link
          href="/transfers"
          className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back To Transfers
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Transfer #{transfer.transferNumber}</h1>
          <p className="text-gray-500">
            Created on {new Date(transfer.createdAt).toLocaleDateString()} at {new Date(transfer.createdAt).toLocaleTimeString()}
          </p>
        </div>
        <TransferActions transfer={transfer} />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {/* Transfer Details */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Transfer Details</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Transfer Type</h3>
                <p className="mt-1 text-base text-gray-900">
                  {transfer.transferType === "RESTOCK" ? "Restock" : transfer.transferType}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <div className="mt-1">
                  <TransferStatusBadge status={transfer.status} />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">From Warehouse</h3>
                <p className="mt-1 text-base text-gray-900">
                  <Link href={`/warehouses/${transfer.fromWarehouseId}`} className="text-blue-600 hover:underline">
                    {transfer.Warehouse_Transfer_fromWarehouseIdToWarehouse?.name || 'Unknown Warehouse'}
                  </Link>
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Destination</h3>
                <p className="mt-1 text-base text-gray-900">
                  {transfer.Warehouse_Transfer_toWarehouseIdToWarehouse ? (
                    <Link href={`/warehouses/${transfer.toWarehouseId}`} className="text-blue-600 hover:underline">
                      {transfer.Warehouse_Transfer_toWarehouseIdToWarehouse.name}
                    </Link>
                  ) : transfer.Store_Transfer_toStoreIdToStore ? (
                    <Link href={`/stores/${transfer.toStoreId}`} className="text-blue-600 hover:underline">
                      {transfer.Store_Transfer_toStoreIdToStore.name}
                    </Link>
                  ) : (
                    "N/A"
                  )}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Created At</h3>
                <p className="mt-1 text-base text-gray-900">
                  {new Date(transfer.createdAt).toLocaleDateString()}
                </p>
              </div>
              {transfer.approvedDate && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Approved At</h3>
                  <p className="mt-1 text-base text-gray-900">
                    {new Date(transfer.approvedDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              {transfer.completedDate && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Received At</h3>
                  <p className="mt-1 text-base text-gray-900">
                    {new Date(transfer.completedDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              {transfer.notes && (
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-500">Notes</h3>
                  <p className="mt-1 text-base text-gray-900">{transfer.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Transfer Items */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Transfer Items</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Cost Price</th>
                    <th className="px-4 py-3">Retail Price</th>
                    <th className="px-4 py-3">Total Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transfer.items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-blue-600">
                        <Link href={`/products/${item.productId}`}>
                          {item.product.name}
                        </Link>
                        <div className="text-xs text-gray-500">{item.product.sku}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                        {item.product.category?.name || "Uncategorized"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                        {item.quantity} {item.product.unit}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                        {item.sourceCostPrice ? `$${Number(item.sourceCostPrice).toFixed(2)}` : "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                        {item.sourceRetailPrice ? `$${Number(item.sourceRetailPrice).toFixed(2)}` : "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                        {item.sourceCostPrice
                          ? `$${(Number(item.sourceCostPrice) * item.quantity).toFixed(2)}`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-sm font-medium text-gray-900">
                      Total
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {totalQuantity} items
                    </td>
                    <td colSpan={2} className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      Total Value:
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      ${totalValue.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Transfer Summary */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Transfer Summary</h2>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <TransferStatusBadge status={transfer.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Items</span>
                <span className="font-medium text-gray-900">{totalItems}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Quantity</span>
                <span className="font-medium text-gray-900">{totalQuantity} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Value</span>
                <span className="font-medium text-gray-900">${totalValue.toFixed(2)}</span>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span className="text-gray-900">{new Date(transfer.createdAt).toLocaleDateString()}</span>
                </div>
                {transfer.actualDeliveryDate && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">Processed</p>
                      <p className="text-sm text-gray-500">
                        {new Date(transfer.actualDeliveryDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
                {transfer.completedDate && (
                  <div className="flex justify-between mt-2">
                    <span className="text-gray-500">Received</span>
                    <span className="text-gray-900">{new Date(transfer.completedDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href={`/transfers/${transferId}/print`}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 transition-all hover:bg-blue-50 hover:text-blue-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
                </svg>
                <span>Print Transfer Document</span>
              </Link>
              {transfer.status === "PENDING" && (
                <>
                  <Link
                    href={`/transfers/${transferId}/edit`}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 transition-all hover:bg-blue-50 hover:text-blue-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                    <span>Edit Transfer</span>
                  </Link>
                  <Link
                    href={`/transfers/${transferId}/process`}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 transition-all hover:bg-blue-50 hover:text-blue-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                    </svg>
                    <span>Process Transfer</span>
                  </Link>
                  <Link
                    href={`/transfers/${transferId}/cancel`}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-red-700 transition-all hover:bg-red-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                    <span>Cancel Transfer</span>
                  </Link>
                </>
              )}
              {transfer.status === "IN_TRANSIT" && (
                <Link
                  href={`/transfers/${transferId}/receive`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 transition-all hover:bg-blue-50 hover:text-blue-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <span>Receive Transfer</span>
                </Link>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Metadata</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Transfer ID:</span>
                <span className="font-mono text-gray-700">{transfer.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Transfer Number:</span>
                <span className="text-gray-700">{transfer.transferNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created At:</span>
                <span className="text-gray-700">{new Date(transfer.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last Updated:</span>
                <span className="text-gray-700">{new Date(transfer.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


