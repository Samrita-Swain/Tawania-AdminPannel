import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStoreById } from "@/lib/store";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";

export default async function StoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  const resolvedParams = await params;

  // Get store details
  const storeData = await getStoreById(resolvedParams.id);

  if (!storeData) {
    notFound();
  }

  const { store, stats } = storeData;
  const { totalInventoryItems, totalSales, totalRevenue } = stats;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{store.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-gray-500">Code: {store.code}</span>
            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
              store.isActive
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}>
              {store.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/stores/${store.id}/edit`}
            className="rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
          >
            Edit
          </Link>
          <Link
            href="/stores"
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Back to Stores
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Store Details */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Store Details</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{store.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Code</p>
                <p className="font-medium">{store.code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{store.phone || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{store.email || "Not provided"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-medium">{store.address || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Opening Hours</p>
                <div className="font-medium">
                  {store.openingHours ? (
                    <pre className="font-sans text-sm whitespace-pre-wrap">
                      {(() => {
                        try {
                          // Try to parse as JSON and format it
                          const parsedHours = JSON.parse(store.openingHours);
                          return JSON.stringify(parsedHours, null, 2);
                        } catch (error) {
                          // If it's not valid JSON, just return the raw string
                          return store.openingHours;
                        }
                      })()}
                    </pre>
                  ) : (
                    "Not provided"
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                  store.isActive
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}>
                  {store.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>

          {/* Inventory Items */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Inventory Items</h2>
              <Link
                href={`/inventory/store?store=${store.id}`}
                className="rounded-md bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
              >
                View All Items
              </Link>
            </div>

            {store.inventoryItems.length === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500">No inventory items found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      <th className="px-4 py-2">Product</th>
                      <th className="px-4 py-2">SKU</th>
                      <th className="px-4 py-2">Quantity</th>
                      <th className="px-4 py-2">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {store.inventoryItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-blue-600">
                          <Link href={`/products/${item.product.id}`}>
                            {item.product.name}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                          {item.product.sku}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm font-medium">
                          {item.quantity}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                          ${Number(item.product.retailPrice).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {totalInventoryItems > 10 && (
                  <div className="mt-4 text-right">
                    <Link
                      href={`/inventory/store?store=${store.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      View all {totalInventoryItems} items
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent Sales */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Recent Sales</h2>
              <Link
                href={`/sales?store=${store.id}`}
                className="rounded-md bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
              >
                View All Sales
              </Link>
            </div>

            {store.sales.length === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500">No sales found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      <th className="px-4 py-2">Receipt #</th>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Customer</th>
                      <th className="px-4 py-2">Staff</th>
                      <th className="px-4 py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {store.sales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-blue-600">
                          <Link href={`/sales/${sale.id}`}>
                            {sale.receiptNumber}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                          {format(new Date(sale.saleDate), "MMM d, yyyy")}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                          {sale.customer ? (
                            <Link href={`/customers/${sale.customer.id}`} className="text-blue-600 hover:underline">
                              {sale.customer.name}
                            </Link>
                          ) : (
                            "Walk-in Customer"
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                          {sale.createdBy.name || sale.createdBy.email}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm font-medium">
                          ${Number(sale.totalAmount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {totalSales > 10 && (
                  <div className="mt-4 text-right">
                    <Link
                      href={`/sales?store=${store.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      View all {totalSales} sales
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Store Statistics */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Store Statistics</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Total Sales</p>
                <p className="text-xl font-bold text-gray-900">{totalSales}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-xl font-bold text-gray-900">
                  ${Number(totalRevenue).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Inventory Items</p>
                <p className="text-xl font-bold text-gray-900">{totalInventoryItems}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Staff Members</p>
                <p className="text-xl font-bold text-gray-900">{store.staff.length}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Actions</h2>
            <div className="space-y-3">
              <Link
                href={`/stores/${store.id}/edit`}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
                Edit Store
              </Link>
              <Link
                href={`/inventory/store?store=${store.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                </svg>
                View Inventory
              </Link>
              <Link
                href={`/pos?store=${store.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-green-100 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                </svg>
                Point of Sale
              </Link>
              <Link
                href={`/stores/${store.id}/staff`}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-700 hover:bg-yellow-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
                Manage Staff
              </Link>
            </div>
          </div>

          {/* Staff */}
          {store.staff.length > 0 && (
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">Store Staff</h2>
              <div className="space-y-3">
                {store.staff.map((staffMember) => (
                  <div
                    key={staffMember.id}
                    className="rounded-lg border border-gray-200 p-3"
                  >
                    <div className="font-medium">{staffMember.user.name || staffMember.user.email}</div>
                    <div className="text-sm text-gray-500">{staffMember.user.email}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {staffMember.isManager ? "Store Manager" : "Store Staff"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
