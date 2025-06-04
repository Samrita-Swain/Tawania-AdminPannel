
// File: src/app/(dashboard)/inventory/[id]/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InventoryStatusBadge } from "../_components/inventory-status-badge";
import { InventoryTransactionList } from "../_components/inventory-transaction-list";

// Add types for InventoryItem with all necessary relations
interface InventoryItem {
  id: string;
  warehouseId: string | null;
  storeId: string | null;
  productId: string;
  quantity: number;
  reservedQuantity: number;
  costPrice: number;
  retailPrice: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  binId: string | null;
  product: {
    id: string;
    name: string;
    sku: string;
    barcode: string | null;
    unit: string;
    categoryId: string | null;
    supplierId: string | null;
    category: {
      id: string;
      name: string;
    } | null;
    supplier: {
      id: string;
      name: string;
    } | null;
  };
  warehouse: {
    id: string;
    name: string;
  } | null;
  store: {
    id: string;
    name: string;
  } | null;
  bin: {
    id: string;
    name: string;
    shelf: {
      id: string;
      name: string;
      aisle: {
        id: string;
        name: string;
        zone: {
          id: string;
          name: string;
        };
      };
    };
  } | null;
}

export default async function InventoryDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const inventoryId = params.id;

  // Get inventory item with related data
  const inventoryItem = await prisma.inventoryItem.findUnique({
    where: { id: inventoryId },
    include: {
      product: {
        include: {
          category: true,
          supplier: true,
        },
      },
      warehouse: true,
      store: true,
      bin: {
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
      },
    },
  }) as InventoryItem | null;

  if (!inventoryItem) {
    notFound();
  }

  // Get inventory transactions for this item - check if the model exists first
  let transactions: any[] = [];
  
  // Most Prisma schemas use "inventoryTransaction" (singular) or "InventoryTransaction"
  if ('inventoryTransaction' in prisma) {
    try {
      // @ts-ignore - Dynamic model access
      transactions = await prisma.inventoryTransaction.findMany({
        where: { inventoryItemId: inventoryId },
        include: {
          user: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    } catch (error) {
      console.error('Error fetching inventory transactions:', error);
    }
  } else if ('InventoryTransaction' in prisma) {
    try {
      // @ts-ignore - Dynamic model access
      transactions = await prisma.InventoryTransaction.findMany({
        where: { inventoryItemId: inventoryId },
        include: {
          user: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    } catch (error) {
      console.error('Error fetching inventory transactions:', error);
    }
  }

  // Get similar inventory items (same product in different locations)
  const similarItems = await prisma.inventoryItem.findMany({
    where: {
      productId: inventoryItem.productId,
      id: { not: inventoryId },
    },
    include: {
      warehouse: true,
      store: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Inventory Details</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/inventory/${inventoryId}/edit`}
            className="rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
          >
            Edit Inventory
          </Link>
          {inventoryItem.warehouseId && (
            <Link
              href={`/transfers/new?source=${inventoryItem.warehouseId}&product=${inventoryItem.productId}`}
              className="rounded-md bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-200 transition-colors"
            >
              Transfer
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {/* Product Information */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Product Information</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Product Name</h3>
                <p className="mt-1 text-base font-medium text-gray-900">
                  <Link href={`/products/${inventoryItem.productId}`} className="text-blue-600 hover:underline">
                    {inventoryItem.product.name}
                  </Link>
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">SKU</h3>
                <p className="mt-1 text-base text-gray-900">{inventoryItem.product.sku}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Barcode</h3>
                <p className="mt-1 text-base text-gray-900">{inventoryItem.product.barcode || "N/A"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Category</h3>
                <p className="mt-1 text-base text-gray-900">{inventoryItem.product.category?.name || "Uncategorized"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Supplier</h3>
                <p className="mt-1 text-base text-gray-900">
                  {inventoryItem.product.supplier ? (
                    <Link href={`/suppliers/${inventoryItem.product.supplierId}`} className="text-blue-600 hover:underline">
                      {inventoryItem.product.supplier.name}
                    </Link>
                  ) : (
                    "N/A"
                  )}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Unit</h3>
                <p className="mt-1 text-base text-gray-900">{inventoryItem.product.unit}</p>
              </div>
            </div>
          </div>

          {/* Inventory Details */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Inventory Details</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Location Type</h3>
                <p className="mt-1 text-base text-gray-900">
                  {inventoryItem.warehouseId ? "Warehouse" : "Store"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Location Name</h3>
                <p className="mt-1 text-base text-gray-900">
                  {inventoryItem.warehouse?.name || inventoryItem.store?.name || "N/A"}
                </p>
              </div>
              {inventoryItem.bin && (
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-500">Bin Location</h3>
                  <p className="mt-1 text-base text-gray-900">
                    Zone: {inventoryItem.bin.shelf.aisle.zone.name} | 
                    Aisle: {inventoryItem.bin.shelf.aisle.name} | 
                    Shelf: {inventoryItem.bin.shelf.name} | 
                    Bin: {inventoryItem.bin.name}
                  </p>
                </div>
              )}
              <div>
                <h3 className="text-sm font-medium text-gray-500">Quantity</h3>
                <p className="mt-1 text-base font-medium text-gray-900">
                  {inventoryItem.quantity} {inventoryItem.product.unit}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Reserved Quantity</h3>
                <p className="mt-1 text-base text-gray-900">
                  {inventoryItem.reservedQuantity} {inventoryItem.product.unit}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Available Quantity</h3>
                <p className="mt-1 text-base font-medium text-green-600">
                  {inventoryItem.quantity - inventoryItem.reservedQuantity} {inventoryItem.product.unit}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <div className="mt-1">
                  <InventoryStatusBadge status={inventoryItem.status} />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Cost Price</h3>
                <p className="mt-1 text-base text-gray-900">
                  ${Number(inventoryItem.costPrice).toFixed(2)}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Retail Price</h3>
                <p className="mt-1 text-base text-gray-900">
                  ${Number(inventoryItem.retailPrice).toFixed(2)}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Last Updated</h3>
                <p className="mt-1 text-base text-gray-900">
                  {new Date(inventoryItem.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          {transactions.length > 0 && (
            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Transaction History</h2>
                <Link
                  href={`/inventory/${inventoryId}/transactions`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  View All
                </Link>
              </div>
              <InventoryTransactionList transactions={transactions} />
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href={`/inventory/${inventoryId}/adjust`}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 transition-all hover:bg-blue-50 hover:text-blue-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                </svg>
                <span>Adjust Quantity</span>
              </Link>
              {inventoryItem.warehouseId && (
                <>
                  <Link
                    href={`/transfers/new?source=${inventoryItem.warehouseId}&product=${inventoryItem.productId}`}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 transition-all hover:bg-blue-50 hover:text-blue-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                    </svg>
                    <span>Transfer Item</span>
                  </Link>
                  <Link
                    href={`/inventory/${inventoryId}/move`}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 transition-all hover:bg-blue-50 hover:text-blue-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9.75h4.875a2.625 2.625 0 0 1 0 5.25H12M8.25 9.75 10.5 7.5M8.25 9.75 10.5 12m9-7.243V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185Z" />
                    </svg>
                    <span>Change Bin Location</span>
                  </Link>
                </>
              )}
              {inventoryItem.storeId && (
                <Link
                  href={`/pos/new?store=${inventoryItem.storeId}&product=${inventoryItem.productId}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 transition-all hover:bg-blue-50 hover:text-blue-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                  </svg>
                  <span>Sell Item</span>
                </Link>
              )}
              <Link
                href={`/inventory/${inventoryId}/print-label`}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 transition-all hover:bg-blue-50 hover:text-blue-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
                </svg>
                <span>Print Label</span>
              </Link>
            </div>
          </div>

          {/* Similar Items */}
          {similarItems.length > 0 && (
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">Same Product in Other Locations</h2>
              <div className="space-y-3">
                {similarItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/inventory/${item.id}`}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-3 hover:border-blue-300 hover:bg-blue-50"
                  >
                    <div>
                      <p className="font-medium text-blue-600">
                        {item.warehouse?.name || item.store?.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.warehouse ? "Warehouse" : "Store"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {item.quantity} {inventoryItem.product.unit}
                      </p>
                      <InventoryStatusBadge status={item.status} small />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Metadata</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Inventory ID:</span>
                <span className="font-mono text-gray-700">{inventoryItem.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created At:</span>
                <span className="text-gray-700">{new Date(inventoryItem.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last Updated:</span>
                <span className="text-gray-700">{new Date(inventoryItem.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}