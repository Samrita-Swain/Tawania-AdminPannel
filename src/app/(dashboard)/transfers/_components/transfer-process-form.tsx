"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Product {
  id: string;
  name: string;
  sku: string;
  unit: string;
}

interface TransferItem {
  id: string;
  productId: string;
  quantity: number;
  product: Product;
}

interface Warehouse {
  id: string;
  name: string;
}

interface Store {
  id: string;
  name: string;
}

interface Transfer {
  id: string;
  transferNumber: string;
  transferType: string;
  fromWarehouseId: string;
  toWarehouseId: string | null;
  toStoreId: string | null;
  fromWarehouse: Warehouse | null;
  toWarehouse: Warehouse | null;
  toStore: Store | null;
  items: TransferItem[];
}

interface TransferProcessFormProps {
  transfer: Transfer;
}

export function TransferProcessForm({ transfer }: TransferProcessFormProps) {
  const router = useRouter();

  // State for the form
  const [shippingMethod, setShippingMethod] = useState<string>("");
  const [trackingNumber, setTrackingNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/transfers/${transfer.id}/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "ship",
          shippingMethod,
          trackingNumber,
          notes,
        }),
      });

      if (response.ok) {
        router.push(`/transfers/${transfer.id}`);
        router.refresh();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || "Failed to process transfer"}`);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error processing transfer:", error);
      alert("An error occurred while processing the transfer");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg bg-amber-50 p-4">
        <h3 className="font-medium text-amber-800">Processing Information</h3>
        <p className="mt-1 text-sm text-amber-700">
          Processing this transfer will mark it as "In Transit" and update inventory accordingly.
          The items will be removed from the source warehouse and marked as in transit until received
          at the destination.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="shippingMethod" className="block text-sm font-medium text-gray-800">
            Shipping Method
          </label>
          <input
            id="shippingMethod"
            type="text"
            value={shippingMethod}
            onChange={(e) => setShippingMethod(e.target.value)}
            placeholder="e.g., Company Truck, Courier, etc."
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="trackingNumber" className="block text-sm font-medium text-gray-800">
            Tracking Number (Optional)
          </label>
          <input
            id="trackingNumber"
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="Enter tracking number if available"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-800">
            Processing Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Add any notes about processing this transfer"
          ></textarea>
        </div>
      </div>

      <div className="overflow-x-auto">
        <h3 className="mb-2 text-sm font-medium text-gray-800">Items to be Transferred</h3>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Unit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {transfer.items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                  {item.product.name}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-800">
                  {item.product.sku}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                  {item.quantity}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-800">
                  {item.product.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
          disabled={isSubmitting}
        >
          {isSubmitting ? "Processing..." : "Process Transfer"}
        </Button>
      </div>
    </form>
  );
}

