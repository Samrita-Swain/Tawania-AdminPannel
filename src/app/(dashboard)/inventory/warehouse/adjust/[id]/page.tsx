"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface InventoryItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    sku: string;
    minStockLevel: number;
    reorderPoint: number;
  };
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
}

export default function AdjustInventoryItemPage() {
  const params = useParams();
  const router = useRouter();
  const inventoryId = params.id as string;

  const [inventoryItem, setInventoryItem] = useState<InventoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [adjustmentType, setAdjustmentType] = useState("add");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("stock_count");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const fetchInventoryItem = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/inventory/items/${inventoryId}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (response.status === 404) {
            setError(`Inventory item not found. ${errorData.availableIds ? `Available IDs: ${errorData.availableIds.join(', ')}` : ''}`);
          } else {
            setError(errorData.error || 'Failed to fetch inventory item');
          }
          return;
        }

        const data = await response.json();
        setInventoryItem(data);
      } catch (error) {
        console.error('Error fetching inventory item:', error);
        setError('Failed to fetch inventory item. Please check your connection and try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (inventoryId) {
      fetchInventoryItem();
    }
  }, [inventoryId]);

  const calculateNewQuantity = () => {
    if (!inventoryItem) return 0;

    if (adjustmentType === "add") {
      return inventoryItem.quantity + quantity;
    } else if (adjustmentType === "remove") {
      return Math.max(0, inventoryItem.quantity - quantity);
    } else if (adjustmentType === "set") {
      return quantity;
    }
    return inventoryItem.quantity;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inventoryItem || !adjustmentType || !reason) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const adjustmentData = {
        inventoryId,
        adjustmentType,
        quantity,
        reason,
        notes,
      };

      const response = await fetch(`/api/inventory/items/${inventoryId}/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(adjustmentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to adjust inventory');
      }

      // Redirect back to warehouse inventory
      router.push('/inventory/warehouse');
      router.refresh();
    } catch (error) {
      console.error('Error adjusting inventory:', error);
      alert('Failed to adjust inventory. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 mx-auto"></div>
          <p className="text-gray-800">Loading inventory item...</p>
        </div>
      </div>
    );
  }

  if (error || !inventoryItem) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Adjust Inventory</h1>
          <Link
            href="/inventory/warehouse"
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 transition-colors"
          >
            Back to Inventory
          </Link>
        </div>
        <div className="rounded-lg bg-red-50 p-6">
          <h3 className="text-lg font-medium text-red-800">Error</h3>
          <p className="mt-2 text-red-700">{error || 'Inventory item not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Adjust Inventory</h1>
        <Link
          href="/inventory/warehouse"
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 transition-colors"
        >
          Back to Inventory
        </Link>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Item Details</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm text-gray-600">Product</p>
            <p className="font-medium text-gray-800">{inventoryItem.product.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">SKU</p>
            <p className="font-medium text-gray-800">{inventoryItem.product.sku}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Warehouse</p>
            <p className="font-medium text-gray-800">{inventoryItem.warehouse.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Current Quantity</p>
            <p className="font-medium text-gray-800">{inventoryItem.quantity}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="adjustmentType" className="mb-1 block text-sm font-medium text-gray-800">
                Adjustment Type *
              </label>
              <select
                id="adjustmentType"
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              >
                <option value="add">Add Inventory</option>
                <option value="remove">Remove Inventory</option>
                <option value="set">Set Inventory Level</option>
              </select>
            </div>

            <div>
              <label htmlFor="quantity" className="mb-1 block text-sm font-medium text-gray-800">
                Quantity *
              </label>
              <input
                id="quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="reason" className="mb-1 block text-sm font-medium text-gray-800">
                Reason *
              </label>
              <select
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              >
                <option value="stock_count">Stock Count</option>
                <option value="restock">Restock</option>
                <option value="damaged">Damaged</option>
                <option value="expired">Expired</option>
                <option value="theft">Theft</option>
                <option value="correction">Correction</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="notes" className="mb-1 block text-sm font-medium text-gray-800">
                Notes
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={3}
              />
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 p-4">
            <h3 className="mb-2 font-medium text-gray-800">Adjustment Summary</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-gray-600">Current Quantity</p>
                <p className="text-lg font-semibold">{inventoryItem.quantity}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Adjustment</p>
                <p className="text-lg font-semibold">
                  {adjustmentType === "add" && "+"}
                  {adjustmentType === "remove" && "-"}
                  {adjustmentType === "set" && "="}
                  {quantity}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">New Quantity</p>
                <p className="text-lg font-semibold">{calculateNewQuantity()}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Link
              href="/inventory/warehouse"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <Button
              type="submit"
              disabled={isSubmitting || quantity <= 0}
            >
              {isSubmitting ? "Adjusting..." : "Adjust Inventory"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
