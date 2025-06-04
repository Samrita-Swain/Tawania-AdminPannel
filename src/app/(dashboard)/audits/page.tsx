import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { AuditStatusBadge } from "./_components/audit-status-badge";

// Define types
interface Warehouse {
  id: string;
  name: string;
  isActive: boolean;
}

interface AuditItem {
  id: string;
  status: string;
}

interface AuditAssignment {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface Audit {
  id: string;
  referenceNumber: string;
  startDate: Date;
  endDate: Date | null;
  status: string;
  warehouse: {
    id: string;
    name: string;
  };
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
  assignments: AuditAssignment[];
  items: AuditItem[];
}

export default async function AuditsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  const resolvedSearchParams = await searchParams;

  // Parse search parameters
  const status = resolvedSearchParams.status as string | undefined;
  const warehouseId = resolvedSearchParams.warehouse as string | undefined;
  const search = resolvedSearchParams.search as string | undefined;
  const page = parseInt(resolvedSearchParams.page as string || "1");
  const pageSize = 10;

  // Build query filters
  const filters: any = {};

  if (status) {
    filters.status = status;
  }

  if (warehouseId) {
    filters.warehouseId = warehouseId;
  }

  if (search) {
    filters.OR = [
      { referenceNumber: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Initialize empty arrays and values with proper types
  let audits: Audit[] = [];
  let totalItems = 0;
  let warehouses: Warehouse[] = [];

  // Check if models exist in Prisma schema before querying
  try {
    // Get warehouses if the model exists
    if ('warehouse' in prisma) {
      // @ts-ignore - Dynamically access the model
      warehouses = await prisma.warehouse.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
    }

    // Get audits if the model exists
    if ('audit' in prisma) {
      // Get audits with pagination
      const results = await Promise.all([
        // @ts-ignore - Dynamically access the model
        prisma.audit.findMany({
          where: filters,
          include: {
            warehouse: true,
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            assignments: {
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
            items: {
              select: {
                id: true,
                status: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        // @ts-ignore - Dynamically access the model
        prisma.audit.count({
          where: filters,
        }),
      ]);

      audits = results[0] as Audit[];
      totalItems = results[1] as number;
    }
  } catch (error) {
    console.error("Error fetching audit data:", error);
  }

  const totalPages = Math.ceil(totalItems / pageSize);

  // Create a clean search params object without symbol properties
  const cleanSearchParams: { [key: string]: string } = {};
  if (status) cleanSearchParams.status = status;
  if (warehouseId) cleanSearchParams.warehouse = warehouseId;
  if (search) cleanSearchParams.search = search;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Inventory Audits</h1>
        <Link
          href="/audits/new"
          className="rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
        >
          Create New Audit
        </Link>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-md">
        <form className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="status" className="mb-1 block text-sm font-medium text-gray-800">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={status || ""}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="PLANNED">Planned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <label htmlFor="warehouse" className="mb-1 block text-sm font-medium text-gray-800">
                Warehouse
              </label>
              <select
                id="warehouse"
                name="warehouse"
                defaultValue={warehouseId || ""}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Warehouses</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="search" className="mb-1 block text-sm font-medium text-gray-800">
                Search
              </label>
              <input
                id="search"
                name="search"
                type="text"
                defaultValue={search || ""}
                placeholder="Search by reference number or notes"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-lg bg-white shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
                <th className="px-6 py-3">Reference #</th>
                <th className="px-6 py-3">Warehouse</th>
                <th className="px-6 py-3">Start Date</th>
                <th className="px-6 py-3">End Date</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Progress</th>
                <th className="px-6 py-3">Created By</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {audits.length > 0 ? (
                audits.map((audit) => {
                  // Calculate progress
                  const totalItems = audit.items.length;
                  const countedItems = audit.items.filter((item) =>
                    item.status === "COUNTED" ||
                    item.status === "RECONCILED" ||
                    item.status === "DISCREPANCY"
                  ).length;

                  // Progress is 100% only when all items are COUNTED or RECONCILED (no discrepancies)
                  const perfectlyCountedItems = audit.items.filter((item) =>
                    item.status === "COUNTED" || item.status === "RECONCILED"
                  ).length;
                  const progress = totalItems > 0 ? Math.round((perfectlyCountedItems / totalItems) * 100) : 0;

                  return (
                    <tr key={audit.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-blue-600">
                        <Link href={`/audits/${audit.id}`}>
                          {audit.referenceNumber}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                        {audit.warehouse.name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                        {format(new Date(audit.startDate), "MMM d, yyyy")}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                        {audit.endDate ? format(new Date(audit.endDate), "MMM d, yyyy") : "-"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <AuditStatusBadge status={audit.status} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-blue-600 h-2.5 rounded-full"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <span className="ml-2 text-xs text-gray-800">{progress}%</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                        {audit.createdBy.name || audit.createdBy.email}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/audits/${audit.id}`}
                            className="rounded bg-blue-50 p-1 text-blue-600 hover:bg-blue-100"
                            title="View Details"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                          </Link>
                          {audit.status === "PLANNED" && (
                            <>
                              <Link
                                href={`/audits/${audit.id}/edit`}
                                className="rounded bg-green-50 p-1 text-green-600 hover:bg-green-100"
                                title="Edit Audit"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                </svg>
                              </Link>
                              <Link
                                href={`/audits/${audit.id}/start`}
                                className="rounded bg-purple-50 p-1 text-purple-600 hover:bg-purple-100"
                                title="Start Audit"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                                </svg>
                              </Link>
                            </>
                          )}
                          {audit.status === "IN_PROGRESS" && (
                            <Link
                              href={`/audits/${audit.id}/count`}
                              className="rounded bg-indigo-50 p-1 text-indigo-600 hover:bg-indigo-100"
                              title="Continue Counting"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                              </svg>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-800">
                    No audits found
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
                  pathname: '/audits',
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
                  pathname: '/audits',
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
                      pathname: '/audits',
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
                          pathname: '/audits',
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
                      pathname: '/audits',
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