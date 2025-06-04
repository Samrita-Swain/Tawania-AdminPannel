import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ReportDateFilter } from "../_components/report-date-filter";
import { ProductPerformanceFilters } from "./_components/product-performance-filters";
import { ProductSalesChart } from "./_components/product-sales-chart";
import { ProductProfitChart } from "./_components/product-profit-chart";

// Define the Product interface to match what ProductPerformanceFilters expects
interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  category: Category;
}

export default async function ProductPerformancePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await getServerSession(authOptions);

  // Parse search parameters
  const startDate = searchParams.startDate as string || getDefaultStartDate();
  const endDate = searchParams.endDate as string || getDefaultEndDate();
  const categoryId = searchParams.category as string | undefined;
  const productId = searchParams.product as string | undefined;
  const sortBy = searchParams.sortBy as string || "sales";

  // Convert to Date objects
  const startDateTime = new Date(startDate);
  const endDateTime = new Date(endDate);
  endDateTime.setHours(23, 59, 59, 999); // Set to end of day

  // Get categories and products for filters
  const [categoriesData, productsData] = await Promise.all([
    prisma.$queryRaw`SELECT id, name FROM "Category" ORDER BY name ASC`,
    prisma.product.findMany({
      where: {
        isActive: true,
        ...(categoryId ? { categoryId } : {}),
      },
      include: {
        category: true,
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  // Transform the data to match the expected interfaces
  const categories: Category[] = categoriesData.map(category => ({
    id: category.id,
    name: category.name
  }));

  const products: Product[] = productsData.map(product => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category ? {
      id: product.category.id,
      name: product.category.name
    } : { id: '', name: 'Uncategorized' }
  }));

  // Get sales data for the period
  const sales = await prisma.sale.findMany({
    where: {
      createdAt: {
        gte: startDateTime,
        lte: endDateTime,
      },
    },
    include: {
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
  });

  // Get inventory data
  const inventoryItems = await prisma.inventoryItem.findMany({
    include: {
      product: true,
    },
  });

  // Calculate product performance metrics
  const productPerformance = calculateProductPerformance(sales, inventoryItems, productId);

  // Sort products based on selected criteria
  let sortedProducts = [...productPerformance];

  if (sortBy === "sales") {
    sortedProducts.sort((a, b) => b.totalSales - a.totalSales);
  } else if (sortBy === "profit") {
    sortedProducts.sort((a, b) => b.profit - a.profit);
  } else if (sortBy === "margin") {
    sortedProducts.sort((a, b) => b.profitMargin - a.profitMargin);
  } else if (sortBy === "quantity") {
    sortedProducts.sort((a, b) => b.quantitySold - a.quantitySold);
  }

  // Calculate totals
  const totalSales = productPerformance.reduce((sum, product) => sum + product.totalSales, 0);
  const totalProfit = productPerformance.reduce((sum, product) => sum + product.profit, 0);
  const totalQuantity = productPerformance.reduce((sum, product) => sum + product.quantitySold, 0);
  const averageMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

  // Prepare data for charts
  const topProductsBySales = sortedProducts.slice(0, 10);
  const topProductsByProfit = [...productPerformance]
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Product Performance</h1>
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

      <ProductPerformanceFilters
        categories={categories}
        products={products}
        currentCategoryId={categoryId}
        currentProductId={productId}
        currentSortBy={sortBy}
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
            Revenue from products
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Total Profit</p>
              <p className="text-2xl font-bold text-gray-900">${totalProfit.toFixed(2)}</p>
            </div>
            <div className="rounded-full bg-green-100 p-3 text-green-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-800">
            Gross profit
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Items Sold</p>
              <p className="text-2xl font-bold text-gray-900">{totalQuantity}</p>
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
              <p className="text-sm font-medium text-gray-800">Average Margin</p>
              <p className="text-2xl font-bold text-gray-900">{averageMargin.toFixed(2)}%</p>
            </div>
            <div className="rounded-full bg-yellow-100 p-3 text-yellow-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-800">
            Profit percentage
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Top Products by Sales</h2>
          <ProductSalesChart data={topProductsBySales} />
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Top Products by Profit</h2>
          <ProductProfitChart data={topProductsByProfit} />
        </div>
      </div>

      {/* Product Performance Table */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Product Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Quantity Sold</th>
                <th className="px-6 py-3">Total Sales</th>
                <th className="px-6 py-3">Cost</th>
                <th className="px-6 py-3">Profit</th>
                <th className="px-6 py-3">Margin</th>
                <th className="px-6 py-3">Current Stock</th>
                <th className="px-6 py-3">Turnover Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedProducts.map((product) => (
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
                    {product.quantitySold}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                    ${product.totalSales.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                    ${product.totalCost.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                    ${product.profit.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                    {product.profitMargin.toFixed(2)}%
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                    {product.currentStock}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${getTurnoverRateClass(product.turnoverRate)}`}>
                      {formatTurnoverRate(product.turnoverRate)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

function calculateProductPerformance(sales: any[], inventoryItems: any[], filterProductId?: string) {
  // Create a map to track product performance
  const productMap = new Map();

  // Process sales data
  sales.forEach(sale => {
    sale.items.forEach((item: any) => {
      const productId = item.productId;

      // Skip if filtering by product and this is not the selected product
      if (filterProductId && productId !== filterProductId) {
        return;
      }

      const productName = item.product.name;
      const categoryName = item.product.category.name;
      const quantity = item.quantity;
      const salesAmount = item.total;
      const costPrice = item.product.costPrice;
      const costAmount = costPrice * quantity;

      if (productMap.has(productId)) {
        const product = productMap.get(productId);
        product.quantitySold += quantity;
        product.totalSales += salesAmount;
        product.totalCost += costAmount;
      } else {
        productMap.set(productId, {
          id: productId,
          name: productName,
          category: categoryName,
          quantitySold: quantity,
          totalSales: salesAmount,
          totalCost: costAmount,
          currentStock: 0, // Will be updated later
        });
      }
    });
  });

  // Add current stock information
  inventoryItems.forEach(item => {
    const productId = item.productId;

    // Skip if filtering by product and this is not the selected product
    if (filterProductId && productId !== filterProductId) {
      return;
    }

    if (productMap.has(productId)) {
      productMap.get(productId).currentStock += item.quantity;
    } else {
      // Product has inventory but no sales
      productMap.set(productId, {
        id: productId,
        name: item.product.name,
        category: item.product.category?.name || "Uncategorized",
        quantitySold: 0,
        totalSales: 0,
        totalCost: 0,
        currentStock: item.quantity,
      });
    }
  });

  // Calculate derived metrics
  return Array.from(productMap.values()).map(product => {
    const profit = product.totalSales - product.totalCost;
    const profitMargin = product.totalSales > 0 ? (profit / product.totalSales) * 100 : 0;

    // Calculate turnover rate (sales quantity / average inventory)
    // For simplicity, we're using current inventory as the denominator
    // In a real system, you'd use average inventory over the period
    const turnoverRate = product.currentStock > 0 ? product.quantitySold / product.currentStock : 0;

    return {
      ...product,
      profit,
      profitMargin,
      turnoverRate,
    };
  });
}

function getTurnoverRateClass(rate: number): string {
  if (rate === 0) {
    return "bg-gray-100 text-gray-800";
  } else if (rate < 0.5) {
    return "bg-red-100 text-red-800";
  } else if (rate < 1) {
    return "bg-yellow-100 text-yellow-800";
  } else if (rate < 2) {
    return "bg-blue-100 text-blue-800";
  } else {
    return "bg-green-100 text-green-800";
  }
}

function formatTurnoverRate(rate: number): string {
  if (rate === 0) {
    return "No Sales";
  } else if (rate < 0.5) {
    return "Slow";
  } else if (rate < 1) {
    return "Moderate";
  } else if (rate < 2) {
    return "Good";
  } else {
    return "Excellent";
  }
}

