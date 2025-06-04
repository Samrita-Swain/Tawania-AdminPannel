import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { ReportDateFilter } from "../_components/report-date-filter";
import { SalesReportFilters } from "./_components/sales-report-filters";
import { SalesByCategoryChart } from "./_components/sales-by-category-chart";
import { SalesByStoreChart } from "./_components/sales-by-store-chart";

// Define interfaces for better type safety
interface SaleItem {
  productId: string;
  quantity: number;
  price: number;
  unitPrice?: number;
  total?: number;
  product: {
    id: string;
    name: string;
    categoryId: string | null;
    category: {
      id: string;
      name: string;
    } | null;
  };
}

interface Sale {
  id: string;
  receiptNumber: string;
  createdAt: Date;
  storeId: string;
  store: {
    id: string;
    name: string;
  };
  customer: {
    id: string;
    name: string;
  } | null;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  total: number;
}

export default async function SalesReportPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await getServerSession(authOptions);

  // Parse search parameters
  const startDate = searchParams.startDate as string || getDefaultStartDate();
  const endDate = searchParams.endDate as string || getDefaultEndDate();
  const storeId = searchParams.store as string | undefined;
  const categoryId = searchParams.category as string | undefined;
  const productId = searchParams.product as string | undefined;
  const groupBy = searchParams.groupBy as string || "day";

  // Convert to Date objects
  const startDateTime = new Date(startDate);
  const endDateTime = new Date(endDate);
  endDateTime.setHours(23, 59, 59, 999); // Set to end of day

  // Build query filters
  const filters: any = {
    createdAt: {
      gte: startDateTime,
      lte: endDateTime,
    },
  };

  if (storeId) {
    filters.storeId = storeId;
  }

  // Get sales data
  const salesData = await prisma.sale.findMany({
    where: filters,
    include: {
      store: true,
      customer: true,
      items: {
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Transform the data to match our interface
  const sales: Sale[] = salesData.map(sale => {
    // Transform each sale item
    const items: SaleItem[] = sale.items.map(item => {
      // Access the raw item data to get price and total
      const rawItem = item as any; // Use type assertion to access properties

      return {
        productId: item.productId,
        quantity: item.quantity,
        price: Number(rawItem.unitPrice || rawItem.price || 0),
        unitPrice: Number(rawItem.unitPrice || 0),
        total: Number(rawItem.total || (rawItem.unitPrice || rawItem.price || 0) * item.quantity),
        product: {
          id: item.product.id,
          name: item.product.name,
          categoryId: item.product.categoryId,
          category: item.product.category
        }
      };
    });

    // Calculate totals if they don't exist in the database
    const rawSale = sale as any; // Use type assertion to access properties
    const subtotal = Number(rawSale.subtotal || items.reduce((sum, item) => sum + (item.total || 0), 0));
    const tax = Number(rawSale.tax || subtotal * 0.1); // Assuming 10% tax if not provided
    const total = Number(rawSale.total || subtotal + tax);

    return {
      id: sale.id,
      receiptNumber: sale.receiptNumber,
      createdAt: sale.createdAt,
      storeId: sale.storeId,
      store: {
        id: sale.store.id,
        name: sale.store.name
      },
      customer: sale.customer,
      items,
      subtotal,
      tax,
      total
    };
  });

  // Filter sales items by category or product if specified
  const filteredSales: Sale[] = sales.map(sale => {
    if (categoryId || productId) {
      const filteredItems = sale.items.filter(item => {
        if (productId) {
          return item.productId === productId;
        }
        if (categoryId) {
          return item.product.categoryId === categoryId;
        }
        return true;
      });

      // Calculate new totals based on filtered items
      const newSubtotal = filteredItems.reduce((sum, item) =>
        sum + (item.total || item.price * item.quantity), 0);
      const newTax = filteredItems.reduce((sum, item) =>
        sum + ((item.total || item.price * item.quantity) * 0.1), 0); // Assuming 10% tax
      const newTotal = filteredItems.reduce((sum, item) =>
        sum + ((item.total || item.price * item.quantity) * 1.1), 0); // Including tax

      return {
        ...sale,
        items: filteredItems,
        subtotal: newSubtotal,
        tax: newTax,
        total: newTotal
      };
    }
    return sale;
  }).filter(sale => sale.items.length > 0);

  // Get stores, categories, and products for filters
  const [stores, categories, products] = await Promise.all([
    prisma.store.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.$queryRaw`SELECT id, name FROM "Category" ORDER BY name ASC`,
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  // Calculate summary statistics
  const totalSales = filteredSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
  const totalItems = filteredSales.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
  const totalOrders = filteredSales.length;
  const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  // Group sales by date
  const salesByDate = groupSalesByDate(filteredSales, groupBy);

  // Group sales by category
  const salesByCategory = groupSalesByCategory(filteredSales);

  // Group sales by store
  const salesByStore = groupSalesByStore(filteredSales);

  // Get top selling products
  const topProducts = getTopProducts(filteredSales);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Sales Report</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/reports"
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 transition-colors"
          >
            Back to Reports
          </Link>
        </div>
      </div>

      <ReportDateFilter startDate={startDate} endDate={endDate} />

      <SalesReportFilters
        stores={stores}
        categories={categories}
        products={products}
        currentStoreId={storeId}
        currentCategoryId={categoryId}
        currentProductId={productId}
        currentGroupBy={groupBy}
      />

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
            {formatDateRange(startDateTime, endDateTime)}
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
            </div>
            <div className="rounded-full bg-green-100 p-3 text-green-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-800">
            Completed orders
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Items Sold</p>
              <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
            </div>
            <div className="rounded-full bg-purple-100 p-3 text-purple-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-800">
            Total quantity
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Average Order Value</p>
              <p className="text-2xl font-bold text-gray-900">${averageOrderValue.toFixed(2)}</p>
            </div>
            <div className="rounded-full bg-yellow-100 p-3 text-yellow-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-800">
            Per transaction
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Sales by Category</h2>
          <SalesByCategoryChart data={salesByCategory} />
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Sales by Store</h2>
          <SalesByStoreChart data={salesByStore} />
        </div>
      </div>

      {/* Top Products Table */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Top Selling Products</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Quantity Sold</th>
                <th className="px-6 py-3">Total Sales</th>
                <th className="px-6 py-3">Average Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {topProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-blue-600">
                    <Link href={`/products/${product.id}`}>
                      {product.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                    {product.category}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                    {product.quantity}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                    ${product.total.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                    ${(product.total / product.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sales Table */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Sales Transactions</h2>
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
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSales.slice(0, 10).map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-blue-600">
                    <Link href={`/sales/${sale.id}`}>
                      {sale.receiptNumber}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                    {format(new Date(sale.createdAt), "MMM d, yyyy h:mm a")}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                    {sale.store.name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                    {sale.customer ? sale.customer.name : "Walk-in Customer"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                    {sale.items.length}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                    ${sale.total.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredSales.length > 10 && (
            <div className="mt-4 text-center">
              <Link
                href="/sales"
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                View All Sales
              </Link>
            </div>
          )}
        </div>
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

function formatDateRange(startDate: Date, endDate: Date): string {
  return `${format(startDate, "MMM d, yyyy")} - ${format(endDate, "MMM d, yyyy")}`;
}

function groupSalesByDate(sales: any[], groupBy: string): any[] {
  const dateMap = new Map();

  sales.forEach(sale => {
    let dateKey;
    const date = new Date(sale.createdAt);

    if (groupBy === "day") {
      dateKey = date.toISOString().split('T')[0];
    } else if (groupBy === "week") {
      // Get the week number
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
      const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      dateKey = `${date.getFullYear()}-W${weekNumber}`;
    } else if (groupBy === "month") {
      dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    if (dateMap.has(dateKey)) {
      dateMap.set(dateKey, dateMap.get(dateKey) + sale.total);
    } else {
      dateMap.set(dateKey, sale.total);
    }
  });

  return Array.from(dateMap, ([date, value]) => ({ date, value }));
}

function groupSalesByCategory(sales: any[]): any[] {
  const categoryMap = new Map();

  sales.forEach(sale => {
    sale.items.forEach((item: any) => {
      const categoryId = item.product.categoryId;
      const categoryName = item.product.category.name;
      const total = item.total;

      if (categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          ...categoryMap.get(categoryId),
          total: categoryMap.get(categoryId).total + total,
        });
      } else {
        categoryMap.set(categoryId, {
          id: categoryId,
          name: categoryName,
          total,
        });
      }
    });
  });

  return Array.from(categoryMap.values())
    .sort((a, b) => b.total - a.total);
}

function groupSalesByStore(sales: Sale[]): any[] {
  const storeMap = new Map();

  sales.forEach(sale => {
    const storeId = sale.storeId;
    const storeName = sale.store.name;
    const total = sale.total || 0;

    if (storeMap.has(storeId)) {
      storeMap.set(storeId, {
        ...storeMap.get(storeId),
        total: storeMap.get(storeId).total + total,
      });
    } else {
      storeMap.set(storeId, {
        id: storeId,
        name: storeName,
        total,
      });
    }
  });

  return Array.from(storeMap.values())
    .sort((a, b) => b.total - a.total);
}

function getTopProducts(sales: any[]): any[] {
  const productMap = new Map();

  sales.forEach(sale => {
    sale.items.forEach((item: any) => {
      const productId = item.productId;
      const productName = item.product.name;
      const categoryName = item.product.category.name;
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
          category: categoryName,
          quantity,
          total,
        });
      }
    });
  });

  return Array.from(productMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10); // Top 10 products
}

