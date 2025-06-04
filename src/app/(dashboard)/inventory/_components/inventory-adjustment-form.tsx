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

interface Warehouse {
  id: string;
  name: string;
}

interface Store {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  productId: string;
  warehouseId: string | null;
  storeId: string | null;
  quantity: number;
  reservedQuantity: number;
  product: Product;
  warehouse: Warehouse | null;
  store: Store | null;
}

interface AdjustmentReason {
  id: string;
  name: string;
}

interface InventoryAdjustmentFormProps {
  inventoryItem: InventoryItem;
  adjustmentReasons: AdjustmentReason[];
}

export function InventoryAdjustmentForm({
  inventoryItem,
  adjustmentReasons,
}: InventoryAdjustmentFormProps) {
  const router = useRouter();
  
  // State for the form
  const [adjustmentType, setAdjustmentType] = useState<"add" | "subtract" | "set">("set");
  const [quantity, setQuantity] = useState<number>(0);
  const [reasonId, setReasonId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Calculate new quantity based on adjustment type
  const calculateNewQuantity = () => {
    switch (adjustmentType) {
      case "add":
        return inventoryItem.quantity + quantity;
      case "subtract":
        return inventoryItem.quantity - quantity;
      case "set":
        return quantity;
      default:
        return inventoryItem.quantity;
    }
  };
  
  const newQuantity = calculateNewQuantity();
  const quantityChange = newQuantity - inventoryItem.quantity;
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (quantity <= 0) {
      alert("Please enter a valid quantity");
      return;
    }
    
    if (!reasonId) {
      alert("Please select an adjustment reason");
      return;
    }
    
    if (adjustmentType === "subtract" && quantity > inventoryItem.quantity) {
      alert("Cannot subtract more than the current quantity");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/inventory/${inventoryItem.id}/adjust`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adjustmentType,
          quantity,
          reasonId,
          notes,
        }),
      });
      
      if (response.ok) {
        router.push(`/inventory/${inventoryItem.id}`);
        router.refresh();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || "Failed to adjust inventory"}`);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error adjusting inventory:", error);
      alert("An error occurred while adjusting the inventory");
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="adjustmentType" className="block text-sm font-medium text-gray-800">
            Adjustment Type
          </label>
          <select
            id="adjustmentType"
            value={adjustmentType}
            onChange={(e) => setAdjustmentType(e.target.value as "add" | "subtract" | "set")}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="set">Set to specific quantity</option>
            <option value="add">Add quantity</option>
            <option value="subtract">Subtract quantity</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-800">
            {adjustmentType === "set" ? "New Quantity" : "Quantity to " + adjustmentType}
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input
              type="number"
              id="quantity"
              min={0}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
            <span className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-800">
              {inventoryItem.product.unit}
            </span>
          </div>
        </div>
        
        <div>
          <label htmlFor="reasonId" className="block text-sm font-medium text-gray-800">
            Adjustment Reason
          </label>
          <select
            id="reasonId"
            value={reasonId}
            onChange={(e) => setReasonId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          >
            <option value="">Select a reason</option>
            {adjustmentReasons.map((reason) => (
              <option key={reason.id} value={reason.id}>
                {reason.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-800">
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Add any notes about this adjustment"
          ></textarea>
        </div>
      </div>
      
      <div className="rounded-lg bg-blue-50 p-4">
        <h3 className="font-medium text-blue-800">Adjustment Summary</h3>
        <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-800">Current Quantity</p>
            <p className="font-medium text-gray-800">
              {inventoryItem.quantity} {inventoryItem.product.unit}
            </p>
          </div>
          <div>
            <p className="text-gray-800">New Quantity</p>
            <p className="font-medium text-gray-800">
              {newQuantity} {inventoryItem.product.unit}
            </p>
          </div>
          <div>
            <p className="text-gray-800">Change</p>
            <p className={`font-medium ${quantityChange > 0 ? 'text-green-600' : quantityChange < 0 ? 'text-red-600' : 'text-gray-800'}`}>
              {quantityChange > 0 ? '+' : ''}{quantityChange} {inventoryItem.product.unit}
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
          disabled={isSubmitting || quantity <= 0 || !reasonId || (adjustmentType === "subtract" && quantity > inventoryItem.quantity)}
        >
          {isSubmitting ? "Processing..." : "Confirm Adjustment"}
        </Button>
      </div>
    </form>
  );
}
