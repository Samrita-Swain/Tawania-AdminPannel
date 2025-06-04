"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface CartItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit: string;
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface POSCheckoutProps {
  cart: CartItem[];
  customer: Customer | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  onComplete: (paymentData: {
    paymentMethod: string;
    amountPaid: number;
    referenceNumber?: string;
    notes?: string;
  }) => void;
  onCancel: () => void;
}

export function POSCheckout({
  cart,
  customer,
  subtotal,
  taxRate,
  taxAmount,
  total,
  onComplete,
  onCancel,
}: POSCheckoutProps) {
  // State for payment form
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [amountPaid, setAmountPaid] = useState<number>(total);
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Calculate change
  const change = amountPaid > total ? amountPaid - total : 0;

  // Handle quick amount buttons
  const handleQuickAmount = (amount: number) => {
    setAmountPaid(amount);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onComplete({
      paymentMethod,
      amountPaid,
      referenceNumber: referenceNumber || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Checkout</h2>
          <button
            onClick={onCancel}
            className="rounded-full p-1 text-gray-800 hover:bg-gray-100 hover:text-gray-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6 grid gap-6 md:grid-cols-2">
          {/* Order Summary */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 text-lg font-semibold text-gray-800">Order Summary</h3>

            <div className="mb-4 max-h-60 overflow-y-auto">
              {cart.map((item, index) => (
                <div key={index} className="mb-2 flex justify-between border-b border-gray-200 pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {item.name} × {item.quantity} {item.unit}
                    </p>
                    <p className="text-xs text-gray-800">{formatCurrency(item.unitPrice)} each</p>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{formatCurrency(item.totalPrice)}</p>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-800">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-800">Tax ({taxRate}%)</span>
                <span className="font-medium">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-300 pt-2 text-base font-bold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            {customer && (
              <div className="mt-4 rounded-md bg-blue-50 p-3">
                <h4 className="text-sm font-medium text-blue-800">Customer Information</h4>
                <p className="text-sm text-blue-700">{customer.name || "Customer"}</p>
                {customer.email && <p className="text-xs text-blue-600">{customer.email}</p>}
                {customer.phone && <p className="text-xs text-blue-600">{customer.phone}</p>}
              </div>
            )}
          </div>

          {/* Payment Form */}
          <div>
            <h3 className="mb-3 text-lg font-semibold text-gray-800">Payment</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="paymentMethod" className="mb-1 block text-sm font-medium text-gray-800">
                  Payment Method
                </label>
                <select
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                >
                  <option value="CASH">Cash</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="DEBIT_CARD">Debit Card</option>
                  <option value="MOBILE_PAYMENT">Mobile Payment</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHECK">Check</option>
                  <option value="STORE_CREDIT">Store Credit</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="amountPaid" className="mb-1 block text-sm font-medium text-gray-800">
                  Amount Paid
                </label>
                <div className="flex rounded-md shadow-sm">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-800">
                    ₹
                  </span>
                  <input
                    type="number"
                    id="amountPaid"
                    step="0.01"
                    min="0"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(Number(e.target.value))}
                    className="block w-full rounded-none rounded-r-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                {paymentMethod === "CASH" && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(Math.ceil(total))}
                      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 hover:bg-gray-50"
                    >
                      {formatCurrency(Math.ceil(total))}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(Math.ceil(total / 5) * 5)}
                      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 hover:bg-gray-50"
                    >
                      {formatCurrency(Math.ceil(total / 5) * 5)}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(Math.ceil(total / 10) * 10)}
                      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 hover:bg-gray-50"
                    >
                      {formatCurrency(Math.ceil(total / 10) * 10)}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(Math.ceil(total / 20) * 20)}
                      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 hover:bg-gray-50"
                    >
                      {formatCurrency(Math.ceil(total / 20) * 20)}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(total)}
                      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 hover:bg-gray-50"
                    >
                      Exact
                    </button>
                  </div>
                )}
              </div>

              {paymentMethod !== "CASH" && (
                <div>
                  <label htmlFor="referenceNumber" className="mb-1 block text-sm font-medium text-gray-800">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    id="referenceNumber"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Transaction ID, check number, etc."
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label htmlFor="notes" className="mb-1 block text-sm font-medium text-gray-800">
                  Notes
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Any additional information"
                ></textarea>
              </div>

              {amountPaid >= total && (
                <div className="rounded-md bg-green-50 p-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-green-800">Change</span>
                    <span className="text-sm font-medium text-green-800">{formatCurrency(change)}</span>
                  </div>
                </div>
              )}

              {amountPaid < total && (
                <div className="rounded-md bg-amber-50 p-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-amber-800">Remaining</span>
                    <span className="text-sm font-medium text-amber-800">{formatCurrency(total - amountPaid)}</span>
                  </div>
                  <p className="mt-1 text-xs text-amber-700">
                    This will be recorded as a partial payment.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Complete Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

