"use client";

import Link from "next/link";
import { format } from "date-fns";

interface SaleItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    sku: string;
  };
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount: number;
  total: number;
}

interface Sale {
  id: string;
  receiptNumber: string;
  storeId: string;
  store: {
    id: string;
    name: string;
  };
  saleDate: Date;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  items: SaleItem[];
  loyaltyPointsEarned: number;
  loyaltyPointsRedeemed: number;
}

interface CustomerSalesListProps {
  sales: Sale[];
}

export function CustomerSalesList({ sales }: CustomerSalesListProps) {
  if (sales.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300">
        <p className="text-gray-800">No purchase history found</p>
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
            <th className="px-4 py-2">Receipt #</th>
            <th className="px-4 py-2">Date</th>
            <th className="px-4 py-2">Store</th>
            <th className="px-4 py-2">Items</th>
            <th className="px-4 py-2">Total</th>
            <th className="px-4 py-2">Payment</th>
            <th className="px-4 py-2">Loyalty</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sales.map((sale) => (
            <tr key={sale.id} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-blue-600">
                <Link href={`/sales/${sale.id}`}>
                  {sale.receiptNumber}
                </Link>
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-800">
                {format(new Date(sale.saleDate), "MMM d, yyyy")}
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-800">
                {sale.store.name}
              </td>
              <td className="px-4 py-2 text-sm text-gray-800">
                <span className="font-medium">{sale.items.length}</span>
                <div className="mt-1 text-xs text-gray-800">
                  {sale.items.slice(0, 2).map((item) => (
                    <div key={item.id} className="truncate max-w-[200px]">
                      {item.quantity} × {item.product.name}
                    </div>
                  ))}
                  {sale.items.length > 2 && (
                    <div>+{sale.items.length - 2} more items</div>
                  )}
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-gray-900">
                ${Number(sale.totalAmount).toFixed(2)}
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-sm">
                <div>{formatPaymentMethod(sale.paymentMethod)}</div>
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                  sale.paymentStatus === "PAID"
                    ? "bg-green-100 text-green-800"
                    : sale.paymentStatus === "PENDING"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                }`}>
                  {formatPaymentStatus(sale.paymentStatus)}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-800">
                {sale.loyaltyPointsEarned > 0 && (
                  <div className="text-green-600">+{sale.loyaltyPointsEarned} pts</div>
                )}
                {sale.loyaltyPointsRedeemed > 0 && (
                  <div className="text-red-600">-{sale.loyaltyPointsRedeemed} pts</div>
                )}
                {sale.loyaltyPointsEarned === 0 && sale.loyaltyPointsRedeemed === 0 && "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatPaymentMethod(method: string): string {
  switch (method) {
    case "CASH":
      return "Cash";
    case "CREDIT_CARD":
      return "Credit Card";
    case "DEBIT_CARD":
      return "Debit Card";
    case "MOBILE_PAYMENT":
      return "Mobile Payment";
    case "BANK_TRANSFER":
      return "Bank Transfer";
    case "CHEQUE":
      return "Cheque";
    case "GIFT_CARD":
      return "Gift Card";
    case "LOYALTY_POINTS":
      return "Loyalty Points";
    case "OTHER":
      return "Other";
    default:
      return method;
  }
}

function formatPaymentStatus(status: string): string {
  switch (status) {
    case "PAID":
      return "Paid";
    case "PENDING":
      return "Pending";
    case "FAILED":
      return "Failed";
    case "REFUNDED":
      return "Refunded";
    case "PARTIALLY_REFUNDED":
      return "Partially Refunded";
    default:
      return status;
  }
}

