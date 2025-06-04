import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import Link from "next/link";
import { format } from "date-fns";
import { PurchaseOrderFilters } from "./_components/purchase-order-filters";
import { StatusDropdown } from "./_components/status-dropdown";

// Define interfaces for type safety
interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  status: string;
  createdAt: Date;
  total?: number;
  totalAmount?: number;
  supplierName: string;
  items?: Array<any>;
  itemCount?: number;
}

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  const resolvedSearchParams = await searchParams;

  // Parse search parameters
  const supplierId = resolvedSearchParams.supplier as string | undefined;
  const status = resolvedSearchParams.status as string | undefined;
  const search = resolvedSearchParams.search as string | undefined;
  const page = parseInt(resolvedSearchParams.page as string || "1");
  const pageSize = 10;

  // Build query filters
  const filters: any = {};

  if (supplierId) {
    filters.supplierId = supplierId;
  }

  if (status) {
    filters.status = status;
  }

  if (search) {
    filters.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { supplier: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  // Get purchase orders with pagination
  let purchaseOrders: PurchaseOrder[] = [];
  let totalItems = 0;

  try {
    // @ts-ignore - Dynamically access the model
    const [purchaseOrdersResult, countResult] = await Promise.all([
      // @ts-ignore - Dynamically access the model
      prisma.$queryRaw`
        SELECT
          po.id,
          po."orderNumber",
          po."supplierId",
          po.status,
          po."createdAt",
          po."totalAmount" as total,
          s.name as "supplierName",
          COALESCE(item_counts.item_count, 0) as "itemCount"
        FROM "PurchaseOrder" po
        JOIN "Supplier" s ON po."supplierId" = s.id
        LEFT JOIN (
          SELECT
            "purchaseOrderId",
            COUNT(*) as item_count
          FROM "PurchaseOrderItem"
          GROUP BY "purchaseOrderId"
        ) item_counts ON po.id = item_counts."purchaseOrderId"
        WHERE 1=1
        ${supplierId ? Prisma.sql`AND po."supplierId" = ${supplierId}` : Prisma.empty}
        ${status ? Prisma.sql`AND po.status = ${status}` : Prisma.empty}
        ${search ? Prisma.sql`AND (po."orderNumber" ILIKE ${'%' + search + '%'} OR s.name ILIKE ${'%' + search + '%'})` : Prisma.empty}
        ORDER BY po."createdAt" DESC
        LIMIT ${pageSize}
        OFFSET ${(page - 1) * pageSize}
      `,
      // @ts-ignore - Dynamically access the model
      prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM "PurchaseOrder" po
        JOIN "Supplier" s ON po."supplierId" = s.id
        WHERE 1=1
        ${supplierId ? Prisma.sql`AND po."supplierId" = ${supplierId}` : Prisma.empty}
        ${status ? Prisma.sql`AND po.status = ${status}` : Prisma.empty}
        ${search ? Prisma.sql`AND (po."orderNumber" ILIKE ${'%' + search + '%'} OR s.name ILIKE ${'%' + search + '%'})` : Prisma.empty}
      `,
    ]);

    purchaseOrders = purchaseOrdersResult as PurchaseOrder[];
    totalItems = parseInt(countResult[0].count.toString());
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    // Set default values in case of error
    purchaseOrders = [];
    totalItems = 0;
  }

  // Get suppliers for filter
  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  const totalPages = Math.ceil(totalItems / pageSize);

  // Create a clean search params object without symbol properties
  const cleanSearchParams: { [key: string]: string } = {};
  if (supplierId) cleanSearchParams.supplier = supplierId;
  if (status) cleanSearchParams.status = status;
  if (search) cleanSearchParams.search = search;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Purchase Orders</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/purchase-orders/new"
            className="rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
          >
            Create Purchase Order
          </Link>
          <Link
            href="/suppliers"
            className="rounded-md bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-200 transition-colors"
          >
            Manage Suppliers
          </Link>
        </div>
      </div>

      <PurchaseOrderFilters
        suppliers={suppliers}
        currentSupplierId={supplierId}
        currentStatus={status}
        currentSearch={search}
      />

      <div className="rounded-lg bg-white shadow-md">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
                <th className="px-6 py-3">Order #</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Supplier</th>
                <th className="px-6 py-3">Items</th>
                <th className="px-6 py-3">Total</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {purchaseOrders.length > 0 ? (
                purchaseOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-blue-600">
                      <Link href={`/purchase-orders/${order.id}`}>
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                      {format(new Date(order.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                      <Link href={`/suppliers/${order.supplierId}`} className="text-blue-600 hover:underline">
                        {order.supplierName}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                      {order.itemCount || 0}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                      ${(order.totalAmount || order.total || 0).toFixed(2)}
                    </td>
                    <td className="relative px-6 py-4 text-sm">
                      <StatusDropdown
                        orderId={order.id}
                        currentStatus={order.status}
                      />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/purchase-orders/${order.id}`}
                          className="rounded bg-blue-50 p-1 text-blue-600 hover:bg-blue-100"
                          title="View Details"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          </svg>
                        </Link>
                        {order.status === "DRAFT" && (
                          <Link
                            href={`/purchase-orders/${order.id}/edit`}
                            className="rounded bg-green-50 p-1 text-green-600 hover:bg-green-100"
                            title="Edit Order"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                            </svg>
                          </Link>
                        )}
                        {(order.status === "ORDERED" || order.status === "PARTIALLY_RECEIVED") && (
                          <Link
                            href={`/purchase-orders/${order.id}/receive`}
                            className="rounded bg-purple-50 p-1 text-purple-600 hover:bg-purple-100"
                            title="Receive Items"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                            </svg>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-800">
                    No purchase orders found
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
                  pathname: '/purchase-orders',
                  query: {
                    ...cleanSearchParams,
                    page: page > 1 ? page - 1 : 1,
                  },
                }}
                className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 ${page <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Previous
              </Link>
              <Link
                href={{
                  pathname: '/purchase-orders',
                  query: {
                    ...cleanSearchParams,
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
                      pathname: '/purchase-orders',
                      query: {
                        ...cleanSearchParams,
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
                          pathname: '/purchase-orders',
                          query: {
                            ...cleanSearchParams,
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
                      pathname: '/purchase-orders',
                      query: {
                        ...cleanSearchParams,
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

function getStatusClass(status: string): string {
  switch (status) {
    case "DRAFT":
      return "bg-gray-100 text-gray-800";
    case "SUBMITTED":
      return "bg-yellow-100 text-yellow-800";
    case "APPROVED":
      return "bg-blue-100 text-blue-800";
    case "ORDERED":
      return "bg-indigo-100 text-indigo-800";
    case "PARTIALLY_RECEIVED":
      return "bg-purple-100 text-purple-800";
    case "RECEIVED":
      return "bg-green-100 text-green-800";
    case "CANCELLED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function formatStatus(status: string): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "SUBMITTED":
      return "Submitted";
    case "APPROVED":
      return "Approved";
    case "ORDERED":
      return "Ordered";
    case "PARTIALLY_RECEIVED":
      return "Partially Received";
    case "RECEIVED":
      return "Received";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

