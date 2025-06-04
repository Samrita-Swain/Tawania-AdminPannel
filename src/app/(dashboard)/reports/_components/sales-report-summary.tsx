"use client";

import Link from "next/link";

interface PaymentMethod {
  payment_method: string;
  count: number;
  total: number;
}

interface TopProduct {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  total: number;
}

interface SalesSummary {
  totalSales: number;
  totalRevenue: number;
  totalSubtotal: number;
  totalTax: number;
  averageSale: number;
  totalItems: number;
  totalQuantity: number;
  paymentMethods: PaymentMethod[];
  topProducts: TopProduct[];
}

interface SalesReportSummaryProps {
  summary: SalesSummary;
}

export function SalesReportSummary({ summary }: SalesReportSummaryProps) {
  // Format payment method label
  const formatPaymentMethod = (method: string) => {
    return method.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg bg-white p-4 shadow-md">
        <h2 className="text-sm font-medium text-gray-800">Total Sales</h2>
        <p className="mt-2 text-3xl font-bold text-gray-900">{summary.totalSales}</p>
        <p className="mt-1 text-sm text-gray-800">
          {summary.totalQuantity} items sold
        </p>
      </div>
      <div className="rounded-lg bg-white p-4 shadow-md">
        <h2 className="text-sm font-medium text-gray-800">Total Revenue</h2>
        <p className="mt-2 text-3xl font-bold text-green-600">₹{summary.totalRevenue.toFixed(2)}</p>
        <p className="mt-1 text-sm text-gray-800">
          Subtotal: ₹{summary.totalSubtotal.toFixed(2)} | Tax: ₹{summary.totalTax.toFixed(2)}
        </p>
      </div>
      <div className="rounded-lg bg-white p-4 shadow-md">
        <h2 className="text-sm font-medium text-gray-800">Average Sale</h2>
        <p className="mt-2 text-3xl font-bold text-gray-900">₹{summary.averageSale.toFixed(2)}</p>
        <p className="mt-1 text-sm text-gray-800">
          Per transaction average
        </p>
      </div>
      <div className="rounded-lg bg-white p-4 shadow-md">
        <h2 className="text-sm font-medium text-gray-800">Items Per Sale</h2>
        <p className="mt-2 text-3xl font-bold text-gray-900">
          {summary.totalSales > 0 ? (summary.totalQuantity / summary.totalSales).toFixed(1) : "0"}
        </p>
        <p className="mt-1 text-sm text-gray-800">
          Average items per transaction
        </p>
      </div>

      {/* Payment Methods */}
      <div className="rounded-lg bg-white p-4 shadow-md md:col-span-2">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Payment Methods</h2>
        {summary.paymentMethods && summary.paymentMethods.length > 0 ? (
          <div className="space-y-4">
            {summary.paymentMethods.map((method, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="mr-3 h-3 w-3 rounded-full" style={{
                    backgroundColor: getPaymentMethodColor(method.payment_method)
                  }}></div>
                  <span className="text-sm font-medium text-gray-800">
                    {formatPaymentMethod(method.payment_method)}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">₹{Number(method.total).toFixed(2)}</p>
                  <p className="text-xs text-gray-800">{method.count} sales</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-800">No payment method data available</p>
        )}
      </div>

      {/* Top Products */}
      <div className="rounded-lg bg-white p-4 shadow-md md:col-span-2">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Top Selling Products</h2>
        {summary.topProducts && summary.topProducts.length > 0 ? (
          <div className="space-y-4">
            {summary.topProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between">
                <div>
                  <Link href={`/products/${product.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                    {product.name}
                  </Link>
                  <p className="text-xs text-gray-800">{product.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{Number(product.quantity)} units</p>
                  <p className="text-xs text-gray-800">₹{Number(product.total).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-800">No product data available</p>
        )}
      </div>
    </div>
  );
}

// Helper function to get color for payment method
function getPaymentMethodColor(method: string): string {
  switch (method) {
    case 'CASH':
      return '#10B981'; // Green
    case 'CREDIT_CARD':
      return '#3B82F6'; // Blue
    case 'DEBIT_CARD':
      return '#6366F1'; // Indigo
    case 'MOBILE_PAYMENT':
      return '#8B5CF6'; // Purple
    case 'BANK_TRANSFER':
      return '#EC4899'; // Pink
    case 'CHECK':
      return '#F59E0B'; // Amber
    case 'STORE_CREDIT':
      return '#EF4444'; // Red
    default:
      return '#6B7280'; // Gray
  }
}
