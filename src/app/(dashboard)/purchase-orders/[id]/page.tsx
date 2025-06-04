import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { PurchaseOrderStatusBadge } from "../_components/purchase-order-status-badge";
import { PurchaseOrderActions } from "../_components/purchase-order-actions";

// Define interfaces for type safety
interface PurchaseOrderItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    sku: string;
  };
  description?: string | null;
  orderedQuantity: number;
  receivedQuantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  subtotal: number;
  total: number;
}

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  const resolvedParams = await params;

  // Get purchase order details - using try/catch to handle potential model issues
  let purchaseOrder;
  try {
    // @ts-ignore - Dynamically access the model
    purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: {
        id: resolvedParams.id,
      },
      include: {
        supplier: true,
        warehouse: true,
        items: {
          include: {
            product: true,
          },
        },
        // Note: createdBy and updatedBy relations don't exist in schema
        // We'll handle these with createdById and updatedById
      },
    });
  } catch (error) {
    console.error("Error fetching purchase order:", error);
    notFound();
  }

  if (!purchaseOrder) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Purchase Order: {purchaseOrder.orderNumber}</h1>
          <div className="mt-1 flex items-center gap-2">
            <PurchaseOrderStatusBadge status={purchaseOrder.status} />
            <span className="text-sm text-gray-500">
              Created on {format(new Date(purchaseOrder.createdAt), "MMMM d, yyyy")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PurchaseOrderActions purchaseOrder={purchaseOrder} />
          <Link
            href="/purchase-orders"
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Back to Purchase Orders
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Order Details */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Order Details</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">Supplier</p>
                <p className="font-medium">
                  <Link href={`/suppliers/${purchaseOrder.supplierId}`} className="text-blue-600 hover:underline">
                    {purchaseOrder.supplier?.name || 'Unknown Supplier'}
                  </Link>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Warehouse</p>
                <p className="font-medium">
                  <Link href={`/warehouses/${purchaseOrder.warehouseId}`} className="text-blue-600 hover:underline">
                    {purchaseOrder.warehouse?.name || 'Unknown Warehouse'}
                  </Link>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Order Date</p>
                <p className="font-medium">
                  {format(new Date(purchaseOrder.orderDate), "MMMM d, yyyy")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Expected Delivery</p>
                <p className="font-medium">
                  {purchaseOrder.expectedDeliveryDate
                    ? format(new Date(purchaseOrder.expectedDeliveryDate), "MMMM d, yyyy")
                    : "Not specified"}
                </p>
              </div>
              {/* deliveredDate field doesn't exist in schema */}
              <div>
                <p className="text-sm text-gray-500">Created By</p>
                <p className="font-medium">
                  System {/* createdBy relation doesn't exist */}
                </p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Order Items</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-2">Product</th>
                    <th className="px-4 py-2">Description</th>
                    <th className="px-4 py-2">Ordered</th>
                    <th className="px-4 py-2">Received</th>
                    <th className="px-4 py-2">Unit Price</th>
                    <th className="px-4 py-2">Discount</th>
                    <th className="px-4 py-2">Tax</th>
                    <th className="px-4 py-2">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(purchaseOrder.items || []).map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-2 text-sm font-medium">
                        <Link href={`/products/${item.productId}`} className="text-blue-600 hover:underline">
                          {item.product?.name || 'Unknown Product'}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {item.description || "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                        {item.quantity}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                        <span className={item.receivedQuantity === item.quantity
                          ? "text-green-600 font-medium"
                          : item.receivedQuantity > 0
                            ? "text-yellow-600"
                            : ""
                        }>
                          {item.receivedQuantity}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                        ${item.unitPrice.toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                        $0.00 {/* discount field doesn't exist */}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                        $0.00 {/* tax field doesn't exist */}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm font-medium">
                        ${item.totalPrice.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-gray-200">
                  <tr>
                    <td colSpan={6} className="px-4 py-2"></td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-gray-700">Subtotal:</td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm font-medium">${purchaseOrder.subtotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan={6} className="px-4 py-2"></td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-gray-700">Tax:</td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm font-medium">${purchaseOrder.taxAmount.toFixed(2)}</td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td colSpan={6} className="px-4 py-2"></td>
                    <td className="whitespace-nowrap px-4 py-2 text-base font-bold text-gray-700">Total:</td>
                    <td className="whitespace-nowrap px-4 py-2 text-base font-bold">${purchaseOrder.totalAmount.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes */}
          {purchaseOrder.notes && (
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h2 className="mb-2 text-lg font-semibold text-gray-800">Notes</h2>
              <p className="whitespace-pre-line text-gray-700">{purchaseOrder.notes}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Actions */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Actions</h2>
            <div className="space-y-3">
              {purchaseOrder.status === "DRAFT" && (
                <>
                  <Link
                    href={`/purchase-orders/${purchaseOrder.id}/edit`}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                    Edit Order
                  </Link>
                  <form action={`/api/purchase-orders/${purchaseOrder.id}/submit`} method="GET">
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-md bg-green-100 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-200 transition-colors"
                    >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                    </svg>
                      Submit Order
                    </button>
                  </form>
                </>
              )}

              {(purchaseOrder.status === "ORDERED" || purchaseOrder.status === "PARTIAL") && (
                <Link
                  href={`/purchase-orders/${purchaseOrder.id}/receive`}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-200 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                  </svg>
                  Receive Items
                </Link>
              )}

              <Link
                href={`/purchase-orders/${purchaseOrder.id}/print`}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
                </svg>
                Print Order
              </Link>

              {purchaseOrder.status !== "CANCELLED" && purchaseOrder.status !== "RECEIVED" && (
                <form action={`/api/purchase-orders/${purchaseOrder.id}/cancel`} method="GET">
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200 transition-colors"
                  >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                    Cancel Order
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Order Information */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Order Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <PurchaseOrderStatusBadge status={purchaseOrder.status} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Created At</p>
                <p className="font-medium">
                  {format(new Date(purchaseOrder.createdAt), "MMMM d, yyyy h:mm a")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Last Updated</p>
                <p className="font-medium">
                  {format(new Date(purchaseOrder.updatedAt), "MMMM d, yyyy h:mm a")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Items</p>
                <p className="font-medium">{purchaseOrder.items?.length || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Quantity</p>
                <p className="font-medium">
                  {purchaseOrder.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Received Quantity</p>
                <p className="font-medium">
                  {purchaseOrder.items?.reduce((sum: number, item: any) => sum + item.receivedQuantity, 0) || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Supplier Information */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Supplier Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Supplier</p>
                <p className="font-medium">
                  <Link href={`/suppliers/${purchaseOrder.supplierId}`} className="text-blue-600 hover:underline">
                    {purchaseOrder.supplier?.name || 'Unknown Supplier'}
                  </Link>
                </p>
              </div>
              {purchaseOrder.supplier?.contactPerson && (
                <div>
                  <p className="text-sm text-gray-500">Contact Person</p>
                  <p className="font-medium">{purchaseOrder.supplier.contactPerson}</p>
                </div>
              )}
              {purchaseOrder.supplier?.email && (
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{purchaseOrder.supplier.email}</p>
                </div>
              )}
              {purchaseOrder.supplier?.phone && (
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{purchaseOrder.supplier.phone}</p>
                </div>
              )}
              <div>
                <Link
                  href={`/suppliers/${purchaseOrder.supplierId}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  View Supplier Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




