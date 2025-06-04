"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Sale {
  id: string;
  receiptNumber: string;
}

interface PaymentFormProps {
  sale: Sale;
  balanceDue: number;
}

export function PaymentForm({ sale, balanceDue }: PaymentFormProps) {
  const router = useRouter();

  // State for the form
  const [amount, setAmount] = useState<number>(balanceDue);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (amount > balanceDue) {
      alert(`Payment amount cannot exceed the balance due (${balanceDue.toFixed(2)})`);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/sales/${sale.id}/payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          paymentMethod,
          referenceNumber: referenceNumber || null,
          notes: notes || null,
        }),
      });

      if (response.ok) {
        router.push(`/sales/${sale.id}`);
        router.refresh();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || "Failed to process payment"}`);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      alert("An error occurred while processing the payment");
      setIsSubmitting(false);
    }
  };

  // Handle quick amount buttons
  const handleQuickAmount = (percentage: number) => {
    setAmount(Math.round((balanceDue * percentage) * 100) / 100);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-800">
            Payment Amount
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-800">
              ₹
            </span>
            <input
              type="number"
              id="amount"
              step="0.01"
              min="0.01"
              max={balanceDue}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="block w-full rounded-none rounded-r-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => handleQuickAmount(0.25)}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-800 hover:bg-gray-50"
            >
              25%
            </button>
            <button
              type="button"
              onClick={() => handleQuickAmount(0.5)}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-800 hover:bg-gray-50"
            >
              50%
            </button>
            <button
              type="button"
              onClick={() => handleQuickAmount(0.75)}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-800 hover:bg-gray-50"
            >
              75%
            </button>
            <button
              type="button"
              onClick={() => handleQuickAmount(1)}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-800 hover:bg-gray-50"
            >
              Full
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-800">
            Payment Method
          </label>
          <select
            id="paymentMethod"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          <label htmlFor="referenceNumber" className="block text-sm font-medium text-gray-800">
            Reference Number
          </label>
          <input
            type="text"
            id="referenceNumber"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="Transaction ID, check number, etc."
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-800">
            Notes
          </label>
          <input
            type="text"
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional information"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="rounded-lg bg-blue-50 p-4">
        <h3 className="font-medium text-blue-800">Payment Summary</h3>
        <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-800">Receipt Number</p>
            <p className="font-medium text-gray-800">{sale.receiptNumber}</p>
          </div>
          <div>
            <p className="text-gray-800">Payment Amount</p>
            <p className="font-medium text-gray-800">₹{amount.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-800">Payment Method</p>
            <p className="font-medium text-gray-800">{paymentMethod.replace("_", " ")}</p>
          </div>
          <div>
            <p className="text-gray-800">Remaining Balance</p>
            <p className="font-medium text-gray-800">
              ₹{(balanceDue - amount).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || amount <= 0 || amount > balanceDue}
        >
          {isSubmitting ? "Processing..." : "Process Payment"}
        </Button>
      </div>
    </form>
  );
}
