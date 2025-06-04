import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PaymentStatusBadge } from "../_components/payment-status-badge";
import { SaleActions } from "../_components/sale-actions";
import { format } from "date-fns"; // Import format from date-fns
import { ReactNode } from "react";

// Define a type for the sale data
interface SaleWithRelations {
  createdAt: string | number | Date;
  id: string;
  receiptNumber: string;
  storeId: string;
  store: {
    code: ReactNode;
    id: string;
    name: string;
  };
  customerId: string | null;
  customer: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
  createdById: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
  saleDate: Date;
  subtotal: number;
  tax: number;
  total: number;
  subtotalAmount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  notes: string | null;
  items: Array<{
    id: string;
    productId: string;
    product: {
      id: string;
      name: string;
      sku: string;
      category?: {
        id: string;
        name: string;
      } | null;
    };
    quantity: number;
    unitPrice: number;
    discount: number;
    total: number;
    inventoryItem: any;
  }>;
  Payment: Array<{
    id: string;
    amount: number;
    paymentMethod: string;
    referenceNumber?: string | null;
    createdAt: Date;
  }>;
}

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  const resolvedParams = await params;
  const saleId = resolvedParams.id;

  // Get sale with related data
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      store: true,
      customer: true,
      createdBy: true, // Changed from user to createdBy to match schema
      items: {
        include: {
          product: {
            include: {
              category: true,
            },
          },
          inventoryItem: true,
        },
      },
      Payment: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  }) as unknown as SaleWithRelations; // Type assertion

  if (!sale) {
    notFound();
  }

  // Calculate totals
  const totalItems = sale.items.length;
  const totalQuantity = sale.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
  const subtotal = Number(sale.subtotal);
  const tax = Number(sale.taxAmount);
  const total = Number(sale.totalAmount);

  // Calculate payment totals
  const totalPaid = (sale.Payment || []).reduce((sum: number, payment: any) => sum + Number(payment.amount), 0);
  const balance = total - totalPaid;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Sale Details</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/sales"
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Back to Sales
          </Link>
          <Link
            href={`/sales/${sale.id}/print`}
            className="rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
          >
            Print Receipt
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Sale Items */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Items</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-2">Product</th>
                    <th className="px-4 py-2">SKU</th>
                    <th className="px-4 py-2">Quantity</th>
                    <th className="px-4 py-2">Unit Price</th>
                    <th className="px-4 py-2">Discount</th>
                    <th className="px-4 py-2">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sale.items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-blue-600">
                        <Link href={`/products/${item.product.id}`}>
                          {item.product.name}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                        {item.product.sku}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                        {item.quantity}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                        ${item.unitPrice.toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                        {item.discountAmount > 0 ? `$${item.discountAmount.toFixed(2)}` : "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm font-medium">
                        ${item.totalPrice.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200">
                    <td colSpan={4} className="px-4 py-2"></td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-gray-700">
                      Subtotal:
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm font-medium">
                      ${subtotal.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-4 py-2"></td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-gray-700">
                      Tax:
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm font-medium">
                      ${tax.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-4 py-2"></td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm font-bold text-gray-900">
                      Total:
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm font-bold text-gray-900">
                      ${total.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes */}
          {sale.notes && (
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h2 className="mb-2 text-lg font-semibold text-gray-800">Notes</h2>
              <p className="text-gray-700">{sale.notes}</p>
            </div>
          )}
        </div>

        {/* Sale Information */}
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Sale Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Receipt Number</p>
                <p className="font-medium">{sale.receiptNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">
                  {format(new Date(sale.createdAt), "MMMM d, yyyy h:mm a")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Payment Status</p>
                <p className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                  {sale.paymentStatus}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Payment Method</p>
                <p className="font-medium">{formatPaymentMethod(sale.paymentMethod)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Store Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Store</p>
                <p className="font-medium">{sale.store.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Code</p>
                <p className="font-medium">{sale.store.code}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Customer Information</h2>
            {sale.customer ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{sale.customer.name}</p>
                </div>
                {sale.customer.email && (
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{sale.customer.email}</p>
                  </div>
                )}
                {sale.customer.phone && (
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{sale.customer.phone}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Walk-in Customer</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatPaymentMethod(method: string) {
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

