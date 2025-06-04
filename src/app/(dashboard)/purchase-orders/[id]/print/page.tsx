"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  status: string;
  orderDate: string;
  expectedDeliveryDate: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes: string | null;
  supplier: {
    id: string;
    name: string;
    contactPerson: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
  };
  warehouse: {
    id: string;
    name: string;
    code: string;
    address: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
  };
  items: {
    id: string;
    productId: string;
    product: {
      id: string;
      name: string;
      sku: string;
    };
    notes: string | null;
    quantity: number;
    receivedQuantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  createdAt: string;
}

export default function PrintPurchaseOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [purchaseOrderId, setPurchaseOrderId] = useState<string | null>(null);

  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resolve params
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setPurchaseOrderId(resolvedParams.id);
    };
    resolveParams();
  }, [params]);

  // Fetch purchase order data
  useEffect(() => {
    if (!purchaseOrderId) return;
    const fetchPurchaseOrder = async () => {
      try {
        const response = await fetch(`/api/purchase-orders/${purchaseOrderId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch purchase order');
        }

        const data = await response.json();
        setPurchaseOrder(data.purchaseOrder);
      } catch (error) {
        console.error('Error fetching purchase order:', error);
        setError('Failed to load purchase order data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPurchaseOrder();
  }, [purchaseOrderId]);

  // Print the page when it loads
  useEffect(() => {
    if (!isLoading && purchaseOrder && !error) {
      // Short delay to ensure the page is fully rendered
      const timer = setTimeout(() => {
        window.print();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isLoading, purchaseOrder, error]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 mx-auto"></div>
          <p className="text-gray-500">Loading purchase order data...</p>
        </div>
      </div>
    );
  }

  if (error || !purchaseOrder) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">{error || 'Purchase order not found'}</p>
          <Link
            href="/purchase-orders"
            className="mt-4 inline-block rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
          >
            Back to Purchase Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6 print:p-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold text-gray-800">Print Purchase Order</h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => window.print()}
          >
            Print
          </Button>
          <Link
            href={`/purchase-orders/${purchaseOrderId}`}
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Back to Purchase Order
          </Link>
        </div>
      </div>

      <div className="print-content rounded-lg bg-white p-8 shadow-md print:shadow-none">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Purchase Order</h1>
            <p className="text-gray-500">#{purchaseOrder.orderNumber}</p>
          </div>
          <div className="text-right">
            <p className="font-medium">Date: {format(new Date(purchaseOrder.orderDate), "MMMM d, yyyy")}</p>
            {purchaseOrder.expectedDeliveryDate && (
              <p className="text-gray-500">Expected Delivery: {format(new Date(purchaseOrder.expectedDeliveryDate), "MMMM d, yyyy")}</p>
            )}
          </div>
        </div>

        {/* Addresses */}
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-800">Supplier</h2>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="font-medium">{purchaseOrder.supplier.name}</p>
              {purchaseOrder.supplier.contactPerson && (
                <p>Attn: {purchaseOrder.supplier.contactPerson}</p>
              )}
              {purchaseOrder.supplier.address && (
                <p>{purchaseOrder.supplier.address}</p>
              )}
              {(purchaseOrder.supplier.city || purchaseOrder.supplier.state || purchaseOrder.supplier.postalCode) && (
                <p>
                  {purchaseOrder.supplier.city}{purchaseOrder.supplier.city && purchaseOrder.supplier.state ? ', ' : ''}
                  {purchaseOrder.supplier.state} {purchaseOrder.supplier.postalCode}
                </p>
              )}
              {purchaseOrder.supplier.country && (
                <p>{purchaseOrder.supplier.country}</p>
              )}
              {purchaseOrder.supplier.phone && (
                <p>Phone: {purchaseOrder.supplier.phone}</p>
              )}
              {purchaseOrder.supplier.email && (
                <p>Email: {purchaseOrder.supplier.email}</p>
              )}
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-800">Ship To</h2>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="font-medium">{purchaseOrder.warehouse.name} ({purchaseOrder.warehouse.code})</p>
              {purchaseOrder.warehouse.address && (
                <p>{purchaseOrder.warehouse.address}</p>
              )}
              {(purchaseOrder.warehouse.city || purchaseOrder.warehouse.state || purchaseOrder.warehouse.postalCode) && (
                <p>
                  {purchaseOrder.warehouse.city}{purchaseOrder.warehouse.city && purchaseOrder.warehouse.state ? ', ' : ''}
                  {purchaseOrder.warehouse.state} {purchaseOrder.warehouse.postalCode}
                </p>
              )}
              {purchaseOrder.warehouse.country && (
                <p>{purchaseOrder.warehouse.country}</p>
              )}
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Order Items</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-300 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-2">Item</th>
                  <th className="px-4 py-2">Description</th>
                  <th className="px-4 py-2 text-right">Quantity</th>
                  <th className="px-4 py-2 text-right">Unit Price</th>
                  <th className="px-4 py-2 text-right">Discount</th>
                  <th className="px-4 py-2 text-right">Tax</th>
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {purchaseOrder.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-2 text-sm font-medium">
                      {item.product.name}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {item.notes || item.product.sku}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500 text-right">
                      {item.quantity}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500 text-right">
                      ${item.unitPrice.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500 text-right">
                      $0.00
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500 text-right">
                      $0.00
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-right">
                      ${item.totalPrice.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-gray-300">
                <tr>
                  <td colSpan={5} className="px-4 py-2"></td>
                  <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-gray-700 text-right">Subtotal:</td>
                  <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-right">${purchaseOrder.subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={5} className="px-4 py-2"></td>
                  <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-gray-700 text-right">Tax:</td>
                  <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-right">${purchaseOrder.taxAmount.toFixed(2)}</td>
                </tr>
                <tr className="border-t border-gray-300">
                  <td colSpan={5} className="px-4 py-2"></td>
                  <td className="whitespace-nowrap px-4 py-2 text-base font-bold text-gray-700 text-right">Total:</td>
                  <td className="whitespace-nowrap px-4 py-2 text-base font-bold text-right">${purchaseOrder.totalAmount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Notes */}
        {purchaseOrder.notes && (
          <div className="mb-8">
            <h2 className="mb-2 text-lg font-semibold text-gray-800">Notes</h2>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="whitespace-pre-line text-gray-700">{purchaseOrder.notes}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 border-t border-gray-300 pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="mb-2 text-sm font-semibold text-gray-800">Terms & Conditions</h2>
              <p className="text-xs text-gray-500">
                1. Please send two copies of your invoice.<br />
                2. Enter this order in accordance with the prices, terms, delivery method, and specifications listed above.<br />
                3. Please notify us immediately if you are unable to ship as specified.
              </p>
            </div>
            <div className="text-right">
              <h2 className="mb-2 text-sm font-semibold text-gray-800">Authorized by</h2>
              <div className="mt-8 border-t border-gray-300 pt-2">
                <p className="text-xs text-gray-500">Signature</p>
              </div>
            </div>
          </div>
          <div className="mt-6 text-center text-xs text-gray-500">
            <p>Purchase Order #{purchaseOrder.orderNumber}</p>
            <p>Generated on {format(new Date(), "MMMM d, yyyy")}</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 1cm;
          }

          /* Hide all admin panel elements */
          body * {
            visibility: hidden;
          }

          /* Show only the print content */
          .print-content,
          .print-content * {
            visibility: visible;
          }

          /* Position the print content */
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }

          /* Hide navigation, sidebar, and other UI elements */
          nav,
          aside,
          .sidebar,
          .navigation,
          .header,
          .footer,
          .print\\:hidden,
          [class*="sidebar"],
          [class*="nav"],
          [data-sidebar],
          .bg-gray-50,
          .bg-gray-100 {
            display: none !important;
            visibility: hidden !important;
          }

          /* Ensure clean print layout */
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Remove shadows and borders for print */
          .print-content .shadow-md {
            box-shadow: none !important;
          }

          /* Ensure proper spacing */
          .print-content {
            margin: 0 !important;
            padding: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
