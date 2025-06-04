import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { StoreInventoryFilters } from "../_components/store-inventory-filters";

// Define types for inventory items
interface Product {
  id: string;
  name: string;
  sku: string;
  reorderPoint: number | null;
  minStockLevel: number | null;
  category: {
    id: string;
    name: string;
  } | null;
}

interface Store {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  quantity: number;
  costPrice: number;
  retailPrice: number;
  product: Product;
  store: Store | null;
}

export default async function StoreInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession(authOptions);

  // Await searchParams to fix Next.js 15 compatibility issue
  const params = await searchParams;

  // Parse search parameters
  const storeId = params.store as string | undefined;
  const categoryId = params.category as string | undefined;
  const search = params.search as string | undefined;
  const filter = params.filter as string | undefined;
  const page = parseInt(params.page as string || "1");
  const pageSize = 10;

  // Create a clean params object without symbol properties for client components
  const cleanParams: Record<string, string> = {};
  if (storeId) cleanParams.store = storeId;
  if (categoryId) cleanParams.category = categoryId;
  if (search) cleanParams.search = search;
  if (filter) cleanParams.filter = filter;

  // Get inventory items with pagination
  let inventoryItems: InventoryItem[] = [];
  let totalItems = 0;
  let totalPages = 1;

  if (storeId) {
    // Instead of using fetch, use direct database query for better reliability
    try {
      // Build filters for store-specific inventory
      const storeFilters: any = {
        storeId,
        product: {
          categoryId: categoryId ? categoryId : undefined,
          name: search ? { contains: search, mode: 'insensitive' } : undefined,
        },
      };

      // Add stock level filters
      if (filter === "lowStock") {
        storeFilters.quantity = {
          gt: 0,
          lt: {
            path: ["product", "reorderPoint"],
          },
        };
      } else if (filter === "outOfStock") {
        storeFilters.quantity = {
          lte: 0,
        };
      } else {
        storeFilters.quantity = {
          gt: 0,
        };
      }

      // Use select instead of include to avoid schema mismatches
      [inventoryItems, totalItems] = await Promise.all([
        prisma.inventoryItem.findMany({
          where: storeFilters,
          select: {
            id: true,
            quantity: true,
            costPrice: true,
            retailPrice: true,
            status: true,
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                reorderPoint: true,
                minStockLevel: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                  }
                }
              }
            },
            store: {
              select: {
                id: true,
                name: true,
              }
            },
          },
          orderBy: [
            { product: { name: 'asc' } },
          ],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }) as unknown as Promise<InventoryItem[]>,
        prisma.inventoryItem.count({
          where: storeFilters,
        }),
      ]);

      totalPages = Math.ceil(totalItems / pageSize);
    } catch (error) {
      console.error("Error fetching store inventory:", error);
      inventoryItems = [];
      totalItems = 0;
      totalPages = 1;
    }
  } else {
    // Fetch all inventory items using a safer approach that avoids schema mismatches
    const filters: any = {
      product: {
        categoryId: categoryId ? categoryId : undefined,
        name: search ? { contains: search, mode: 'insensitive' } : undefined,
      },
      quantity: {
        gt: 0,
      },
    };

    // Add stock level filters
    if (filter === "lowStock") {
      filters.quantity = {
        gt: 0,
        lt: {
          path: ["product", "reorderPoint"],
        },
      };
    } else if (filter === "outOfStock") {
      filters.quantity = {
        lte: 0,
      };
    }

    // Use select instead of include to avoid schema mismatches
    [inventoryItems, totalItems] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: filters,
        select: {
          id: true,
          quantity: true,
          costPrice: true,
          retailPrice: true,
          status: true,
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              reorderPoint: true,
              minStockLevel: true,
              category: {
                select: {
                  id: true,
                  name: true,
                }
              }
            }
          },
          store: {
            select: {
              id: true,
              name: true,
            }
          },
        },
        orderBy: [
          { store: { name: 'asc' } },
          { product: { name: 'asc' } },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }) as unknown as Promise<InventoryItem[]>,
      prisma.inventoryItem.count({
        where: filters,
      }),
    ]);

    totalPages = Math.ceil(totalItems / pageSize);
  }

  // Get stores and categories for filters
  // Use select to explicitly specify fields to avoid schema mismatches
  const [stores, categories] = await Promise.all([
    prisma.store.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: { name: 'asc' },
    }),
    // Use a raw query for categories to avoid schema mismatches
    prisma.$queryRaw`SELECT id, name FROM "Category" ORDER BY name ASC`,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Store Inventory</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/inventory/store/adjust"
            className="rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
          >
            Adjust Inventory
          </Link>
          <Link
            href="/pos"
            className="rounded-md bg-green-100 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-200 transition-colors"
          >
            Point of Sale
          </Link>
        </div>
      </div>

      <StoreInventoryFilters
        stores={stores}
        categories={categories}
        currentStoreId={storeId}
        currentCategoryId={categoryId}
        currentSearch={search}
        currentFilter={filter}
      />

      <div className="rounded-lg bg-white shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3">SKU</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Store</th>
                <th className="px-6 py-3">Quantity</th>
                <th className="px-6 py-3">Cost Price</th>
                <th className="px-6 py-3">Retail Price</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {inventoryItems.length > 0 ? (
                inventoryItems.map((item: InventoryItem) => {
                  // Calculate stock status
                  let stockStatus = "Normal";
                  let statusColor = "bg-green-100 text-green-800";

                  if (item.quantity <= 0) {
                    stockStatus = "Out of Stock";
                    statusColor = "bg-red-100 text-red-800";
                  } else if (item.product?.reorderPoint && item.quantity < item.product.reorderPoint) {
                    stockStatus = "Low Stock";
                    statusColor = "bg-yellow-100 text-yellow-800";
                  } else if (item.product?.minStockLevel && item.quantity < item.product.minStockLevel) {
                    stockStatus = "Below Min";
                    statusColor = "bg-orange-100 text-orange-800";
                  }

                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-blue-600">
                        {item.product ? (
                          <Link href={`/products/${item.product.id}`}>
                            {item.product.name}
                          </Link>
                        ) : (
                          "Unknown Product"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                        {item.product?.sku || "N/A"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                        {item.product.category?.name || "Uncategorized"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                        {item.store?.name || "Unknown Store"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                        {item.quantity}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                        ${item.costPrice.toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                        ${item.retailPrice.toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColor}`}>
                          {stockStatus}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/inventory/store/history/${item.id}`}
                            className="rounded bg-blue-50 p-1 text-blue-600 hover:bg-blue-100"
                            title="View History"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                          </Link>
                          <Link
                            href={`/inventory/store/adjust/${item.id}`}
                            className="rounded bg-green-50 p-1 text-green-600 hover:bg-green-100"
                            title="Adjust Inventory"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                          </Link>
                          <Link
                            href={`/pos?product=${item.product?.id || ''}&store=${item.store?.id || ''}`}
                            className="rounded bg-purple-50 p-1 text-purple-600 hover:bg-purple-100"
                            title="Sell"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                            </svg>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-800">
                    No inventory items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <Link
                href={{
                  pathname: '/inventory/store',
                  query: {
                    ...cleanParams,
                    page: page > 1 ? page - 1 : 1,
                  },
                }}
                className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 ${page <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Previous
              </Link>
              <Link
                href={{
                  pathname: '/inventory/store',
                  query: {
                    ...cleanParams,
                    page: page < totalPages ? page + 1 : totalPages,
                  },
                }}
                className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 ${page >= totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Next
              </Link>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-800">
                  Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(page * pageSize, totalItems)}
                  </span>{' '}
                  of <span className="font-medium">{totalItems}</span> results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <Link
                    href={{
                      pathname: '/inventory/store',
                      query: {
                        ...cleanParams,
                        page: page > 1 ? page - 1 : 1,
                      },
                    }}
                    className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-800 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${page <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                    </svg>
                  </Link>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Link
                        key={pageNum}
                        href={{
                          pathname: '/inventory/store',
                          query: {
                            ...cleanParams,
                            page: pageNum,
                          },
                        }}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                          pageNum === page
                            ? 'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                        }`}
                      >
                        {pageNum}
                      </Link>
                    );
                  })}
                  <Link
                    href={{
                      pathname: '/inventory/store',
                      query: {
                        ...cleanParams,
                        page: page < totalPages ? page + 1 : totalPages,
                      },
                    }}
                    className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-800 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${page >= totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </Link>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}