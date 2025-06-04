import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { format } from "date-fns";
import { SalesFilters } from "./_components/sales-filters";

// Import prisma with a try-catch to handle cases where it might not be available
let prisma;
try {
  prisma = require("@/lib/prisma").prisma;
} catch (error) {
  console.error("Failed to import Prisma:", error);
  // We'll handle this case in the component
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await getServerSession(authOptions);

  // Parse search parameters
  const storeId = searchParams.store as string | undefined;
  const customerId = searchParams.customer as string | undefined;
  const startDate = searchParams.startDate as string | undefined;
  const endDate = searchParams.endDate as string | undefined;
  const page = parseInt(searchParams.page as string || "1");
  const pageSize = 10;

  // Build query filters
  const filters: any = {
    storeId: storeId ? storeId : undefined,
    customerId: customerId ? customerId : undefined,
  };

  // Add date range filter if specified
  if (startDate || endDate) {
    filters.createdAt = {};

    if (startDate) {
      filters.createdAt.gte = new Date(startDate);
    }

    if (endDate) {
      // Set end date to end of day
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      filters.createdAt.lte = endDateTime;
    }
  }

  // Get sales with pagination
  let sales = [];
  let totalItems = 0;
  let stores = [];
  let customers = [];

  try {
    // Check if Prisma is available
    if (!prisma || typeof prisma.sale?.findMany !== 'function') {
      console.warn("Prisma client or sale model not available");
      // Keep the default empty arrays
    } else {
      // Use select instead of include to avoid schema mismatches
      [sales, totalItems, stores, customers] = await Promise.all([
        prisma.sale.findMany({
        where: filters,
        select: {
          id: true,
          receiptNumber: true,
          totalAmount: true,
          // Remove fields that don't exist in your schema
          // subtotal: true,
          // tax: true,
          // discount: true,
          paymentMethod: true,
          paymentStatus: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          storeId: true,
          customerId: true,
          createdById: true,
          store: {
            select: {
              id: true,
              name: true,
            }
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true,
            }
          },
          items: {
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              // Remove if this doesn't exist in your schema
              // discount: true,
              productId: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.sale.count({
        where: filters,
      }),
      prisma.store.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.customer.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      }),
      ]);
    }
  } catch (error) {
    console.error("Error fetching sales data:", error);
    // Provide empty arrays if query fails
    sales = [];
    totalItems = 0;
    stores = [];
    customers = [];
  }

  const totalPages = Math.ceil(totalItems / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Sales History</h1>
        <Link
          href="/pos"
          className="rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
        >
          Point of Sale
        </Link>
      </div>

      <SalesFilters
        stores={stores}
        customers={customers}
        currentStoreId={storeId}
        currentCustomerId={customerId}
        currentStartDate={startDate}
        currentEndDate={endDate}
      />

      <div className="rounded-lg bg-white shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
                <th className="px-6 py-3">Receipt #</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Store</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Items</th>
                <th className="px-6 py-3">Total</th>
                <th className="px-6 py-3">Payment</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sales.length > 0 ? (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-blue-600">
                      <Link href={`/sales/${sale.id}`}>
                        {sale.receiptNumber}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                      {sale.createdAt ? (
                        (() => {
                          try {
                            return format(new Date(sale.createdAt), "MMM d, yyyy h:mm a");
                          } catch (e) {
                            return format(new Date(), "MMM d, yyyy h:mm a");
                          }
                        })()
                      ) : (
                        format(new Date(), "MMM d, yyyy h:mm a")
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                      {sale.store?.name || "Unknown Store"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                      {sale.customer ? sale.customer.name : "Walk-in Customer"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                      {sale.items?.length || 0}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                      ₹{typeof sale.totalAmount === 'number' ? sale.totalAmount.toFixed(2) : '0.00'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                      {formatPaymentMethod(sale.paymentMethod)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {sale.paymentStatus ? (
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                          sale.paymentStatus === "PAID" ? "bg-green-100 text-green-800" :
                          sale.paymentStatus === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                          sale.paymentStatus === "CANCELLED" ? "bg-red-100 text-red-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {sale.paymentStatus}
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
                          Unknown
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/sales/${sale.id}`}
                          className="rounded bg-blue-50 p-1 text-blue-600 hover:bg-blue-100"
                          title="View Details"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          </svg>
                        </Link>
                        <Link
                          href={`/sales/${sale.id}/print`}
                          className="rounded bg-purple-50 p-1 text-purple-600 hover:bg-purple-100"
                          title="Print Receipt"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
                          </svg>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-800">
                    No sales found
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
                  pathname: '/sales',
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
                  pathname: '/sales',
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
                      pathname: '/sales',
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
                          pathname: '/sales',
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
                      pathname: '/sales',
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

function formatPaymentMethod(method: string | null | undefined) {
  if (!method) return "Unknown";

  switch (method) {
    case "CASH":
      return "Cash";
    case "CARD":
      return "Credit/Debit Card";
    case "MOBILE":
      return "Mobile Payment";
    default:
      return method;
  }
}

