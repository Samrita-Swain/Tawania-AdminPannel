import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { SalesChart } from "./_components/sales-chart";
import { InventoryValueChart } from "./_components/inventory-value-chart";
import { InventoryStatusChart } from "./_components/inventory-status-chart";
import { TopProductsChart } from "./_components/top-products-chart";
import { ReportDateFilter } from "./_components/report-date-filter";
import { MetricCard } from "./_components/metric-card";

export default async function ReportsPage({
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

  // Get sales data
  const salesData = await prisma.sale.findMany({
    where: {
      createdAt: {
        gte: startDateTime,
        lte: endDateTime,
      },
    },
    include: {
      store: true,
      items: {
        include: {
          product: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // Get inventory data
  const inventoryItems = await prisma.inventoryItem.findMany({
    include: {
      product: true,
      warehouse: true,
      store: true,
    },
  });

  // Get audit metrics
  const [
    totalAudits,
    completedAudits,
    inProgressAudits,
    recentAudits,
  ] = await Promise.all([
    // @ts-ignore - Dynamically access the model
    prisma.audit.count(),
    // @ts-ignore - Dynamically access the model
    prisma.audit.count({
      where: {
        status: "COMPLETED",
      },
    }),
    // @ts-ignore - Dynamically access the model
    prisma.audit.count({
      where: {
        status: "IN_PROGRESS",
      },
    }),
    // @ts-ignore - Dynamically access the model
    prisma.audit.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        warehouse: true,
        items: true,
      },
    }),
  ]);

  // Calculate total sales
  const totalSales = salesData.reduce((sum, sale) => {
    // Use type assertion to access the total property
    const rawSale = sale as any;
    return sum + (rawSale.total || 0);
  }, 0);

  // Calculate total inventory value
  const totalInventoryValue = inventoryItems.reduce((sum, item) => {
    return sum + (item.quantity * item.costPrice);
  }, 0);

  // Calculate total inventory items
  const totalInventoryItems = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);

  // Calculate average order value
  const averageOrderValue = salesData.length > 0 ? totalSales / salesData.length : 0;

  // Prepare data for sales chart (daily sales)
  const salesByDay = getSalesByDay(salesData, startDateTime, endDateTime);

  // Prepare data for top products chart
  const topProducts = getTopProducts(salesData);

  // Prepare data for inventory value chart
  const inventoryValueByLocation = getInventoryValueByLocation(inventoryItems);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Reports & Analytics</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/reports/sales"
            className="rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
          >
            Sales Reports
          </Link>
          <Link
            href="/reports/inventory"
            className="rounded-md bg-green-100 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-200 transition-colors"
          >
            Inventory Reports
          </Link>
        </div>
      </div>

      <ReportDateFilter startDate={startDate} endDate={endDate} />

      {/* Summary Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900">${totalSales.toFixed(2)}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-800">
            {salesData.length} orders
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Average Order Value</p>
              <p className="text-2xl font-bold text-gray-900">${averageOrderValue.toFixed(2)}</p>
            </div>
            <div className="rounded-full bg-green-100 p-3 text-green-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-800">
            Per transaction
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Inventory Value</p>
              <p className="text-2xl font-bold text-gray-900">${totalInventoryValue.toFixed(2)}</p>
            </div>
            <div className="rounded-full bg-purple-100 p-3 text-purple-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-800">
            {totalInventoryItems} items in stock
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Low Stock Items</p>
              <p className="text-2xl font-bold text-gray-900">
                {inventoryItems.filter(item =>
                  item.quantity > 0 &&
                  item.quantity < item.product.reorderPoint
                ).length}
              </p>
            </div>
            <div className="rounded-full bg-yellow-100 p-3 text-yellow-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-800">
            Need attention
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Sales Trend</h2>
          <SalesChart data={salesByDay} />
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Top Selling Products</h2>
          <TopProductsChart data={topProducts} />
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Inventory Value by Location</h2>
        <InventoryValueChart data={inventoryValueByLocation} />
      </div>

      {/* Audit Overview */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Audit Overview</h2>
          <Link
            href="/audits"
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            View All Audits
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-800">Total Audits</h3>
              <span className="text-2xl font-bold text-blue-600">{totalAudits}</span>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-800">Completed</h3>
              <span className="text-2xl font-bold text-green-600">{completedAudits}</span>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-800">In Progress</h3>
              <span className="text-2xl font-bold text-yellow-600">{inProgressAudits}</span>
            </div>
          </div>
        </div>

        <h3 className="mb-3 font-medium text-gray-800">Recent Audits</h3>
        {recentAudits.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-800">No recent audits</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
                  <th className="px-4 py-2">Reference #</th>
                  <th className="px-4 py-2">Warehouse</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Items</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentAudits.map((audit: any) => {
                  // Calculate audit statistics
                  const totalItems = audit.items.length;
                  const countedItems = audit.items.filter((item: any) => 
                    item.status === "COUNTED" || 
                    item.status === "RECONCILED" || 
                    item.status === "DISCREPANCY"
                  ).length;
                  const discrepancyItems = audit.items.filter((item: any) => 
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
                        {format(new Date(audit.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-800">
                        {audit.items.length}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Report Links */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/reports/sales"
          className="flex flex-col rounded-lg bg-white p-6 shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="mb-4 rounded-full bg-blue-100 p-3 w-12 h-12 flex items-center justify-center text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Sales Reports</h3>
          <p className="mt-2 text-sm text-gray-800">
            Detailed sales analysis by product, category, store, and time period.
          </p>
        </Link>

        <Link
          href="/reports/inventory"
          className="flex flex-col rounded-lg bg-white p-6 shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="mb-4 rounded-full bg-green-100 p-3 w-12 h-12 flex items-center justify-center text-green-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Inventory Reports</h3>
          <p className="mt-2 text-sm text-gray-800">
            Inventory valuation, stock levels, and movement analysis.
          </p>
        </Link>

        <Link
          href="/reports/product-performance"
          className="flex flex-col rounded-lg bg-white p-6 shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="mb-4 rounded-full bg-purple-100 p-3 w-12 h-12 flex items-center justify-center text-purple-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Product Performance</h3>
          <p className="mt-2 text-sm text-gray-800">
            Analyze product sales, profitability, and turnover rates.
          </p>
        </Link>

        <Link
          href="/reports/audits"
          className="flex flex-col rounded-lg bg-white p-6 shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="mb-4 rounded-full bg-indigo-100 p-3 w-12 h-12 flex items-center justify-center text-indigo-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75a2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Audit Reports</h3>
          <p className="mt-2 text-sm text-gray-800">
            Inventory audit history, discrepancies, and reconciliation data.
          </p>
        </Link>
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

function getSalesByDay(salesData: any[], startDate: Date, endDate: Date): { date: string; value: number }[] {
  // Create a map to store sales by day
  const salesByDay = new Map();
  
  // Initialize all dates in the range
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateString = currentDate.toISOString().split('T')[0];
    salesByDay.set(dateString, 0);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Aggregate sales by day
  salesData.forEach(sale => {
    const dateString = new Date(sale.createdAt).toISOString().split('T')[0];
    const rawSale = sale as any;
    const saleTotal = rawSale.total || 0;
    
    if (salesByDay.has(dateString)) {
      salesByDay.set(dateString, salesByDay.get(dateString) + saleTotal);
    } else {
      salesByDay.set(dateString, saleTotal);
    }
  });
  
  // Convert map to array with the correct property name (value instead of total)
  return Array.from(salesByDay, ([date, total]) => ({
    date,
    value: total, // Renamed to 'value' to match the expected interface
  }));
}

function getTopProducts(sales: any[]): any[] {
  // Create a map of product sales
  const productMap = new Map();

  // Aggregate sales by product
  sales.forEach(sale => {
    sale.items.forEach((item: any) => {
      const productId = item.productId;
      const productName = item.product.name;
      const quantity = item.quantity;
      const total = item.total;

      if (productMap.has(productId)) {
        const product = productMap.get(productId);
        product.quantity += quantity;
        product.total += total;
      } else {
        productMap.set(productId, {
          id: productId,
          name: productName,
          quantity,
          total,
        });
      }
    });
  });

  // Convert map to array and sort by total sales
  return Array.from(productMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10); // Top 10 products
}

function getInventoryValueByLocation(inventoryItems: any[]): { name: string; value: number; type: string }[] {
  // Create maps for warehouses and stores
  const warehouseMap = new Map();
  const storeMap = new Map();

  // Aggregate inventory value by location
  inventoryItems.forEach(item => {
    const value = item.quantity * item.costPrice;

    if (item.warehouseId) {
      const warehouseName = item.warehouse.name;
      if (warehouseMap.has(warehouseName)) {
        warehouseMap.set(warehouseName, warehouseMap.get(warehouseName) + value);
      } else {
        warehouseMap.set(warehouseName, value);
      }
    } else if (item.storeId) {
      const storeName = item.store.name;
      if (storeMap.has(storeName)) {
        storeMap.set(storeName, storeMap.get(storeName) + value);
      } else {
        storeMap.set(storeName, value);
      }
    }
  });

  // Convert maps to arrays
  const warehouseData = Array.from(warehouseMap, ([name, value]) => ({
    name,
    value,
    type: 'Warehouse',
  }));

  const storeData = Array.from(storeMap, ([name, value]) => ({
    name,
    value,
    type: 'Store',
  }));

  // Combine and sort by value
  return [...warehouseData, ...storeData].sort((a, b) => b.value - a.value);
}

function calculateAuditAccuracy(audit: { items: any[] }): number {
  if (!audit || !audit.items || audit.items.length === 0) {
    return 0;
  }
  
  // Count items with discrepancies
  const totalItems = audit.items.length;
  const itemsWithDiscrepancies = audit.items.filter(item => 
    item.status === "DISCREPANCY" || 
    (item.variance !== null && item.variance !== 0)
  ).length;
  
  // Calculate accuracy percentage
  return ((totalItems - itemsWithDiscrepancies) / totalItems) * 100;
}
