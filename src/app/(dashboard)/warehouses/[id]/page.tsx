import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";

export default async function WarehouseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  const resolvedParams = await params;

  // Get warehouse details
  const warehouse = await prisma.warehouse.findUnique({
    where: {
      id: resolvedParams.id,
    },
    include: {
      zones: {
        include: {
          aisles: {
            include: {
              shelves: {
                include: {
                  bins: true,
                },
              },
            },
          },
        },
      },
      staff: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      inventoryItems: {
        include: {
          product: true,
          bin: true,
        },
        take: 10,
      },
    },
  });

  if (!warehouse) {
    notFound();
  }

  // Count total inventory items
  const totalInventoryItems = await prisma.inventoryItem.count({
    where: {
      warehouseId: warehouse.id,
    },
  });

  // Count total bins
  let totalBins = 0;
  warehouse.zones.forEach(zone => {
    zone.aisles.forEach(aisle => {
      aisle.shelves.forEach(shelf => {
        totalBins += shelf.bins.length;
      });
    });
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{warehouse.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-gray-500">Code: {warehouse.code}</span>
            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
              warehouse.isActive
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}>
              {warehouse.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/warehouses/${warehouse.id}/edit`}
            className="rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
          >
            Edit
          </Link>
          <Link
            href="/warehouses"
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Back to Warehouses
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Warehouse Details */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Warehouse Details</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{warehouse.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Code</p>
                <p className="font-medium">{warehouse.code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Contact Person</p>
                <p className="font-medium">{warehouse.contactPerson || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{warehouse.phone || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{warehouse.email || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                  warehouse.isActive
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}>
                  {warehouse.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-medium">{warehouse.address || "Not provided"}</p>
              </div>
            </div>
          </div>

          {/* Zones */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Warehouse Zones</h2>
              <Link
                href={`/warehouses/${warehouse.id}/zones`}
                className="rounded-md bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
              >
                Manage Zones
              </Link>
            </div>

            {warehouse.zones.length === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500">No zones found</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {warehouse.zones.map((zone) => (
                  <div
                    key={zone.id}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <h3 className="font-medium text-gray-800">{zone.name}</h3>
                    <p className="mt-1 text-sm text-gray-500">Code: {zone.code}</p>
                    <div className="mt-2 text-sm text-gray-500">
                      <div>Aisles: {zone.aisles.length}</div>
                      <div>
                        Shelves: {zone.aisles.reduce((sum, aisle) => sum + aisle.shelves.length, 0)}
                      </div>
                      <div>
                        Bins: {zone.aisles.reduce((sum, aisle) =>
                          sum + aisle.shelves.reduce((shelfSum, shelf) =>
                            shelfSum + shelf.bins.length, 0), 0)}
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Link
                        href={`/warehouses/${warehouse.id}/zones/${zone.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inventory Items */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Inventory Items</h2>
              <Link
                href={`/inventory/warehouse?warehouse=${warehouse.id}`}
                className="rounded-md bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
              >
                View All Items
              </Link>
            </div>

            {warehouse.inventoryItems.length === 0 ? (
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
                      <th className="px-4 py-2">Location</th>
                      <th className="px-4 py-2">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {warehouse.inventoryItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-blue-600">
                          <Link href={`/products/${item.product.id}`}>
                            {item.product.name}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                          {item.product.sku}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                          {item.bin ? item.bin.code : "Not Assigned"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm font-medium">
                          {item.quantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {totalInventoryItems > 10 && (
                  <div className="mt-4 text-right">
                    <Link
                      href={`/inventory/warehouse?warehouse=${warehouse.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      View all {totalInventoryItems} items
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Warehouse Statistics */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Warehouse Statistics</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Total Zones</p>
                <p className="text-xl font-bold text-gray-900">{warehouse.zones.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Aisles</p>
                <p className="text-xl font-bold text-gray-900">
                  {warehouse.zones.reduce((sum, zone) => sum + zone.aisles.length, 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Shelves</p>
                <p className="text-xl font-bold text-gray-900">
                  {warehouse.zones.reduce((sum, zone) =>
                    sum + zone.aisles.reduce((aisleSum, aisle) =>
                      aisleSum + aisle.shelves.length, 0), 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Bins</p>
                <p className="text-xl font-bold text-gray-900">{totalBins}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Inventory Items</p>
                <p className="text-xl font-bold text-gray-900">{totalInventoryItems}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Actions</h2>
            <div className="space-y-3">
              <Link
                href={`/warehouses/${warehouse.id}/edit`}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
                Edit Warehouse
              </Link>
              <Link
                href={`/warehouses/${warehouse.id}/zones`}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                </svg>
                Manage Zones
              </Link>
              <Link
                href={`/inventory/warehouse?warehouse=${warehouse.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-green-100 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                </svg>
                View Inventory
              </Link>
              <Link
                href={`/audits/new?warehouse=${warehouse.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-700 hover:bg-yellow-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75a2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                </svg>
                Create Audit
              </Link>
            </div>
          </div>

          {/* Staff */}
          {warehouse.staff.length > 0 && (
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">Warehouse Staff</h2>
              <div className="space-y-3">
                {warehouse.staff.map((staffMember) => (
                  <div
                    key={staffMember.id}
                    className="rounded-lg border border-gray-200 p-3"
                  >
                    <div className="font-medium">{staffMember.user.name || staffMember.user.email}</div>
                    <div className="text-sm text-gray-500">{staffMember.user.email}</div>
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
