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

interface Zone {
  id: string;
  name: string;
  warehouseId: string;
}

interface Aisle {
  id: string;
  name: string;
  zoneId: string;
  zone: Zone;
}

interface Shelf {
  id: string;
  name: string;
  aisleId: string;
  aisle: Aisle;
}

interface Bin {
  id: string;
  name: string;
  shelfId: string;
  shelf: Shelf;
}

interface Transfer {
  id: string;
  referenceNumber: string;
  transferType: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string | null;
  destinationStoreId: string | null;
  sourceWarehouse: Warehouse | null;
  destinationWarehouse: Warehouse | null;
  destinationStore: Store | null;
  items: TransferItem[];
}

interface TransferReceiveFormProps {
  transfer: Transfer;
  destinationBins: Bin[];
}

interface ReceivedItem {
  transferItemId: string;
  productId: string;
  receivedQuantity: number;
  binId?: string | null;
  notes?: string;
}

export function TransferReceiveForm({ transfer, destinationBins }: TransferReceiveFormProps) {
  const router = useRouter();
  
  // State for the form
  const [receivedItems, setReceivedItems] = useState<ReceivedItem[]>(
    transfer.items.map(item => ({
      transferItemId: item.id,
      productId: item.productId,
      receivedQuantity: item.quantity,
      binId: null,
      notes: "",
    }))
  );
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Update received quantity
  const updateReceivedQuantity = (index: number, quantity: number) => {
    const updatedItems = [...receivedItems];
    updatedItems[index] = {
      ...updatedItems[index],
      receivedQuantity: quantity,
    };
    setReceivedItems(updatedItems);
  };
  
  // Update bin
  const updateBin = (index: number, binId: string) => {
    const updatedItems = [...receivedItems];
    updatedItems[index] = {
      ...updatedItems[index],
      binId: binId || null,
    };
    setReceivedItems(updatedItems);
  };
  
  // Update item notes
  const updateItemNotes = (index: number, itemNotes: string) => {
    const updatedItems = [...receivedItems];
    updatedItems[index] = {
      ...updatedItems[index],
      notes: itemNotes,
    };
    setReceivedItems(updatedItems);
  };
  
  // Format bin location for display
  const formatBinLocation = (binId: string) => {
    const bin = destinationBins.find(b => b.id === binId);
    if (!bin) return "Unknown";
    
    return `${bin.shelf.aisle.zone.name} / ${bin.shelf.aisle.name} / ${bin.shelf.name} / ${bin.name}`;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that all received quantities are valid
    for (const [index, item] of receivedItems.entries()) {
      const transferItem = transfer.items[index];
      if (item.receivedQuantity < 0 || item.receivedQuantity > transferItem.quantity) {
        alert(`Invalid received quantity for ${transferItem.product.name}. Must be between 0 and ${transferItem.quantity}.`);
        return;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/transfers/${transfer.id}/receive`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receivedItems,
          notes,
        }),
      });
      
      if (response.ok) {
        router.push(`/transfers/${transfer.id}`);
        router.refresh();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || "Failed to receive transfer"}`);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error receiving transfer:", error);
      alert("An error occurred while receiving the transfer");
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg bg-blue-50 p-4">
        <h3 className="font-medium text-blue-800">Receiving Information</h3>
        <p className="mt-1 text-sm text-blue-700">
          Receiving this transfer will mark it as "Completed" and update inventory accordingly.
          The items will be added to the destination {transfer.transferType === "WAREHOUSE_TO_WAREHOUSE" ? "warehouse" : "store"}.
          You can adjust quantities if there are discrepancies.
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <h3 className="mb-2 text-sm font-medium text-gray-800">Items to Receive</h3>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Expected</th>
              <th className="px-4 py-3">Received</th>
              {transfer.transferType === "WAREHOUSE_TO_WAREHOUSE" && (
                <th className="px-4 py-3">Bin Location</th>
              )}
              <th className="px-4 py-3">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {transfer.items.map((item, index) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                  {item.product.name}
                  <div className="text-xs text-gray-800">{item.product.sku}</div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                  {item.quantity} {item.product.unit}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <div className="flex items-center">
                    <input
                      type="number"
                      min="0"
                      max={item.quantity}
                      value={receivedItems[index].receivedQuantity}
                      onChange={(e) => updateReceivedQuantity(index, parseInt(e.target.value) || 0)}
                      className="w-20 rounded-md border border-gray-300 px-3 py-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-800">{item.product.unit}</span>
                  </div>
                </td>
                {transfer.transferType === "WAREHOUSE_TO_WAREHOUSE" && (
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <select
                      value={receivedItems[index].binId || ""}
                      onChange={(e) => updateBin(index, e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select Bin Location</option>
                      {destinationBins.map((bin) => (
                        <option key={bin.id} value={bin.id}>
                          {formatBinLocation(bin.id)}
                        </option>
                      ))}
                    </select>
                  </td>
                )}
                <td className="px-4 py-3 text-sm">
                  <input
                    type="text"
                    value={receivedItems[index].notes || ""}
                    onChange={(e) => updateItemNotes(index, e.target.value)}
                    placeholder="Any issues?"
                    className="w-full rounded-md border border-gray-300 px-3 py-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-800">
          Receiving Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Add any notes about receiving this transfer"
        ></textarea>
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
          {isSubmitting ? "Processing..." : "Complete Receiving"}
        </Button>
      </div>
    </form>
  );
}

