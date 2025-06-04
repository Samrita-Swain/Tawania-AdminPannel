"use client";

import { useRef } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useReactToPrint } from "react-to-print";

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  loyaltyPoints?: number;
}

interface Store {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

interface ReceiptGeneratorProps {
  receiptNumber: string;
  saleDate: Date;
  items: CartItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  paymentMethod: string;
  customer?: Customer;
  store: Store;
  cashier: string;
  pointsEarned?: number;
  notes?: string;
  onClose: () => void;
}

export function ReceiptGenerator({
  receiptNumber,
  saleDate,
  items,
  subtotal,
  taxAmount,
  total,
  paymentMethod,
  customer,
  store,
  cashier,
  pointsEarned = 0,
  notes,
  onClose,
}: ReceiptGeneratorProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Receipt-${receiptNumber}`,
    onAfterPrint: () => {
      console.log("Print completed");
    },
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Receipt</h2>
        </div>

        {/* Receipt Preview */}
        <div className="p-4">
          <div
            ref={receiptRef}
            className="bg-white p-4 min-h-[300px] font-mono text-sm"
            style={{ width: "80mm" }} // Standard receipt width
          >
            {/* Store Header */}
            <div className="text-center mb-4">
              <h1 className="text-lg font-bold">{store.name}</h1>
              {store.address && <p className="text-xs">{store.address}</p>}
              {store.phone && <p className="text-xs">Tel: {store.phone}</p>}
              {store.email && <p className="text-xs">{store.email}</p>}
              <div className="border-t border-b border-dashed my-2"></div>
            </div>

            {/* Receipt Info */}
            <div className="mb-4">
              <p>Receipt: {receiptNumber}</p>
              <p>Date: {format(saleDate, "yyyy-MM-dd HH:mm")}</p>
              <p>Cashier: {cashier}</p>
              {customer && <p>Customer: {customer.name}</p>}
              <div className="border-b border-dashed my-2"></div>
            </div>

            {/* Items */}
            <div className="mb-4">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left">Item</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="text-left">{item.productName}</td>
                      <td className="text-right">{item.quantity}</td>
                      <td className="text-right">${item.unitPrice.toFixed(2)}</td>
                      <td className="text-right">${item.totalPrice.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-b border-dashed my-2"></div>
            </div>

            {/* Totals */}
            <div className="mb-4">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div className="border-b border-dashed my-2"></div>
            </div>

            {/* Payment Info */}
            <div className="mb-4">
              <p>Payment Method: {paymentMethod.replace("_", " ")}</p>
              {customer && pointsEarned > 0 && (
                <p>Loyalty Points Earned: {pointsEarned}</p>
              )}
              {customer && customer.loyaltyPoints && (
                <p>Total Loyalty Points: {customer.loyaltyPoints + pointsEarned}</p>
              )}
              {notes && (
                <>
                  <div className="border-b border-dashed my-2"></div>
                  <p>Notes: {notes}</p>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="text-center text-xs mt-6">
              <p>Thank you for your purchase!</p>
              <p>Please keep this receipt for returns or exchanges.</p>
              <p>Returns accepted within 30 days with receipt.</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t flex justify-end space-x-2">
          <Button
            onClick={onClose}
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 transition-colors"
          >
            Close
          </Button>
          <Button
            onClick={handlePrint}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Print Receipt
          </Button>
        </div>
      </div>
    </div>
  );
}