import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { ReportDateFilter } from "../_components/report-date-filter";

// Define types for the audit data
interface AuditItem {
  status: string;
  variance: number | null;
  product: {
    name: string;
    sku: string;
  };
}

interface Audit {
  id: string;
  referenceNumber: string;
  status: string;
  createdAt: Date;
  warehouse: {
    name: string;
  };
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
  items: AuditItem[];
}

export default async function AuditReportsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await getServerSession(authOptions);

  // Parse date parameters
  const startDate = searchParams.startDate as string || getDefaultStartDate();
  const endDate = searchParams.endDate as string || getDefaultEndDate();

  // Convert to Date objects
  const startDateTime = new Date(startDate);
  const endDateTime = new Date(endDate);
  endDateTime.setHours(23, 59, 59, 999); // Set to end of day

  // Get audits data
  // @ts-ignore - Dynamically access the model
  const audits: Audit[] = await prisma.audit.findMany({
    where: {
      createdAt: {
        gte: startDateTime,
        lte: endDateTime,
      },
    },
    include: {
      warehouse: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      items: {
        include: {
          product: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Calculate audit statistics
  const totalAudits = audits.length;
  const completedAudits = audits.filter((audit: Audit) => audit.status === "COMPLETED").length;
  const inProgressAudits = audits.filter((audit: Audit) => audit.status === "IN_PROGRESS").length;
  const cancelledAudits = audits.filter((audit: Audit) => audit.status === "CANCELLED").length;

  // Calculate discrepancy statistics
  let totalItems = 0;
  let countedItems = 0;
  let discrepancyItems = 0;
  let positiveVariance = 0;
  let negativeVariance = 0;
  let totalVariance = 0;

  audits.forEach((audit: Audit) => {
    totalItems += audit.items.length;

    audit.items.forEach((item: AuditItem) => {
      if (item.status === "COUNTED" || item.status === "RECONCILED" || item.status === "DISCREPANCY") {
        countedItems++;

        if (item.status === "DISCREPANCY" || (item.variance !== null && item.variance !== 0)) {
          discrepancyItems++;

          if (item.variance !== null) {
            totalVariance += item.variance;

            if (item.variance > 0) {
              positiveVariance++;
            } else if (item.variance < 0) {
              negativeVariance++;
            }
          }
        }
      }
    });
  });

  // Calculate accuracy rate
  const accuracyRate = countedItems > 0 ? ((countedItems - discrepancyItems) / countedItems) * 100 : 0;

  // Get warehouses for filtering
  // @ts-ignore - Dynamically access the model
  const warehouses = await prisma.warehouse.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Audit Reports</h1>
        <Link
          href="/reports"
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 transition-colors"
        >
          Back to Reports
        </Link>
      </div>

      <ReportDateFilter startDate={startDate} endDate={endDate} />

      {/* Summary Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Total Audits</p>
              <p className="text-2xl font-bold text-gray-900">{totalAudits}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75a2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-800">
            During selected period
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Accuracy Rate</p>
              <p className="text-2xl font-bold text-gray-900">{accuracyRate.toFixed(2)}%</p>
            </div>
            <div className="rounded-full bg-green-100 p-3 text-green-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-800">
            {countedItems} items counted
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Discrepancies</p>
              <p className="text-2xl font-bold text-gray-900">{discrepancyItems}</p>
            </div>
            <div className="rounded-full bg-yellow-100 p-3 text-yellow-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-800">
            {positiveVariance} positive, {negativeVariance} negative
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Total Variance</p>
              <p className={`text-2xl font-bold ${totalVariance > 0 ? 'text-green-600' : totalVariance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {totalVariance > 0 ? `+${totalVariance}` : totalVariance}
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3 text-purple-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-800">
            Net inventory adjustment
          </p>
        </div>
      </div>

      {/* Audit Status Breakdown */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Audit Status Breakdown</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-800">Completed</h3>
              <span className="text-2xl font-bold text-green-600">{completedAudits}</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-green-600"
                style={{ width: `${totalAudits > 0 ? (completedAudits / totalAudits) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-800">In Progress</h3>
              <span className="text-2xl font-bold text-yellow-600">{inProgressAudits}</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-yellow-600"
                style={{ width: `${totalAudits > 0 ? (inProgressAudits / totalAudits) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-800">Planned</h3>
              <span className="text-2xl font-bold text-blue-600">
                {totalAudits - completedAudits - inProgressAudits - cancelledAudits}
              </span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-600"
                style={{ width: `${totalAudits > 0 ? ((totalAudits - completedAudits - inProgressAudits - cancelledAudits) / totalAudits) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-800">Cancelled</h3>
              <span className="text-2xl font-bold text-red-600">{cancelledAudits}</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-red-600"
                style={{ width: `${totalAudits > 0 ? (cancelledAudits / totalAudits) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Audit List */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Audit List</h2>

        {audits.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-800">No audits found for the selected period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
                  <th className="px-4 py-2">Reference #</th>
                  <th className="px-4 py-2">Warehouse</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Items</th>
                  <th className="px-4 py-2">Discrepancies</th>
                  <th className="px-4 py-2">Accuracy</th>
                  <th className="px-4 py-2">Created By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {audits.map((audit) => {
                  // Calculate audit statistics
                  const totalItems = audit.items.length;
                  const countedItems = audit.items.filter(item =>
                    item.status === "COUNTED" ||
                    item.status === "RECONCILED" ||
                    item.status === "DISCREPANCY"
                  ).length;

                  // Progress is 100% only when all items are COUNTED or RECONCILED (no discrepancies)
                  const perfectlyCountedItems = audit.items.filter(item =>
                    item.status === "COUNTED" || item.status === "RECONCILED"
                  ).length;
                  const progress = totalItems > 0 ? Math.round((perfectlyCountedItems / totalItems) * 100) : 0;
                  const discrepancyItems = audit.items.filter(item =>
                    item.status === "DISCREPANCY" ||
                    (item.variance !== null && item.variance !== 0)
                  ).length;
                  const accuracyRate = countedItems > 0 ? ((countedItems - discrepancyItems) / countedItems) * 100 : 0;

                  return (
                    <tr key={audit.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-blue-600">
                        <Link href={`/audits/${audit.id}`}>
                          {audit.referenceNumber}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-800">
                        {audit.warehouse.name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-800">
                        {format(new Date(audit.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          audit.status === "COMPLETED"
                            ? "bg-green-100 text-green-800"
                            : audit.status === "IN_PROGRESS"
                              ? "bg-yellow-100 text-yellow-800"
                              : audit.status === "CANCELLED"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                        }`}>
                          {audit.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-800">
                        {totalItems}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-800">
                        {discrepancyItems}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-800">
                        {accuracyRate.toFixed(2)}%
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-800">
                        {audit.createdBy.name || audit.createdBy.email}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper functions
function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30); // 30 days ago
  return date.toISOString().split('T')[0];
}

function getDefaultEndDate(): string {
  return new Date().toISOString().split('T')[0];
}

