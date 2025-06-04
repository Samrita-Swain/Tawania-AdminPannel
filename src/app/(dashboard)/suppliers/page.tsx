import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { executeWithRetry } from "@/lib/db-helpers";
import Link from "next/link";
import { SupplierFilters } from "./_components/supplier-filters";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await getServerSession(authOptions);

  // Parse search parameters - properly handle searchParams as a Promise in newer Next.js versions
  const searchParamsData = await Promise.resolve(searchParams);
  const search = searchParamsData.search;
  const status = searchParamsData.status;
  const pageParam = searchParamsData.page;

  const searchValue = typeof search === 'string' ? search : undefined;
  const statusValue = typeof status === 'string' ? status : undefined;
  const page = parseInt(typeof pageParam === 'string' ? pageParam : "1");
  const pageSize = 10;

  // Build query filters
  const filters: any = {};

  if (searchValue) {
    filters.OR = [
      { name: { contains: searchValue, mode: 'insensitive' } },
      { email: { contains: searchValue, mode: 'insensitive' } },
      { phone: { contains: searchValue, mode: 'insensitive' } },
      { contactPerson: { contains: searchValue, mode: 'insensitive' } },
    ];
  }

  if (statusValue === "active") {
    filters.isActive = true;
  } else if (statusValue === "inactive") {
    filters.isActive = false;
  }

  // Get suppliers with pagination using retry logic
  const [suppliers, totalItems] = await Promise.all([
    executeWithRetry(() =>
      prisma.supplier.findMany({
        where: filters,
        include: {
          products: {
            select: {
              id: true,
            },
          },
          // Removed purchaseOrders include
        },
        orderBy: {
          name: "asc",
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      })
    ),
    executeWithRetry(() =>
      prisma.supplier.count({
        where: filters,
      })
    ),
  ]);

  // Try to get purchase order counts for each supplier
  let supplierOrderCounts: Record<string, number> = {};
  try {
    // @ts-ignore - Dynamically access the model
    const purchaseOrderCounts = await Promise.all(
      suppliers.map(async (supplier) => {
        try {
          // @ts-ignore - Dynamically access the model
          const count = await executeWithRetry(() =>
            prisma.purchaseOrder.count({
              where: { supplierId: supplier.id },
            })
          );
          return { supplierId: supplier.id, count };
        } catch (error) {
          console.error(`Error fetching purchase orders for supplier ${supplier.id}:`, error);
          return { supplierId: supplier.id, count: 0 };
        }
      })
    );

    // Convert to a lookup object
    supplierOrderCounts = purchaseOrderCounts.reduce((acc, item) => {
      acc[item.supplierId] = item.count;
      return acc;
    }, {} as Record<string, number>);
  } catch (error) {
    console.error("Error fetching purchase order counts:", error);
  }

  // Add product count to each supplier
  const suppliersWithCounts = suppliers.map(supplier => {
    // Use type assertion to access properties
    const supplierWithProducts = supplier as any;
    return {
      ...supplier,
      productCount: supplierWithProducts.products?.length || 0,
      orderCount: supplierOrderCounts[supplier.id] || 0,
    };
  });

  const totalPages = Math.ceil(totalItems / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Suppliers</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/suppliers/new"
            className="rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
          >
            Add Supplier
          </Link>
          <Link
            href="/purchase-orders"
            className="rounded-md bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-200 transition-colors"
          >
            Purchase Orders
          </Link>
        </div>
      </div>

      <SupplierFilters
        currentSearch={searchValue}
        currentStatus={statusValue}
      />

      {/* Add the client-side supplier form */}
      <div className="mt-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Quick Add Supplier</h2>
          <p className="text-sm text-gray-600">Use this form to quickly add a new supplier without leaving this page.</p>
        </div>
        {/* @ts-expect-error Server Component */}
        <div className="supplier-form-client-wrapper">
          <div className="supplier-form-client-placeholder" id="supplier-form-client-placeholder"></div>
        </div>
        <script dangerouslySetInnerHTML={{
          __html: `
            import('/suppliers/_components/supplier-form-client').then(module => {
              const SupplierFormClient = module.default;
              const placeholder = document.getElementById('supplier-form-client-placeholder');
              if (placeholder && placeholder.parentNode) {
                const parent = placeholder.parentNode;
                const reactRoot = document.createElement('div');
                parent.replaceChild(reactRoot, placeholder);
                const React = window.React;
                const ReactDOM = window.ReactDOM;
                if (React && ReactDOM) {
                  ReactDOM.render(React.createElement(SupplierFormClient), reactRoot);
                }
              }
            }).catch(err => console.error('Error loading supplier form client:', err));
          `
        }} />
      </div>

      <div className="rounded-lg bg-white shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
                <th className="px-6 py-3">Supplier</th>
                <th className="px-6 py-3">Contact Person</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">Products</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {suppliersWithCounts.length > 0 ? (
                suppliersWithCounts.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-blue-600">
                      <Link href={`/suppliers/${supplier.id}`}>
                        {supplier.name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                      {supplier.contactPerson || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                      {supplier.email || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                      {supplier.phone || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                      {supplier.productCount || 0}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${supplier.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {supplier.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/suppliers/${supplier.id}`}
                          className="rounded bg-blue-50 p-1 text-blue-600 hover:bg-blue-100"
                          title="View Details"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          </svg>
                        </Link>
                        <Link
                          href={`/suppliers/${supplier.id}/edit`}
                          className="rounded bg-green-50 p-1 text-green-600 hover:bg-green-100"
                          title="Edit Supplier"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                          </svg>
                        </Link>
                        <Link
                          href={`/purchase-orders/new?supplier=${supplier.id}`}
                          className="rounded bg-purple-50 p-1 text-purple-600 hover:bg-purple-100"
                          title="Create Purchase Order"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                          </svg>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-800">
                    No suppliers found
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
                  pathname: '/suppliers',
                  query: {
                    ...searchParams,
                    page: page > 1 ? page - 1 : 1,
                  },
                }}
                className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 ${page <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Previous
              </Link>
              <Link
                href={{
                  pathname: '/suppliers',
                  query: {
                    ...searchParams,
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
                      pathname: '/suppliers',
                      query: {
                        ...searchParams,
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
                          pathname: '/suppliers',
                          query: {
                            ...searchParams,
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
                      pathname: '/suppliers',
                      query: {
                        ...searchParams,
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

