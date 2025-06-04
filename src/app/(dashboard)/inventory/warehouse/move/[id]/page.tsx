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
  };
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
}

interface Store {
  id: string;
  name: string;
  code: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

export default function MoveInventoryPage() {
  const params = useParams();
  const router = useRouter();
  const inventoryId = params.id as string;

  const [inventoryItem, setInventoryItem] = useState<InventoryItem | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [destinationType, setDestinationType] = useState<"warehouse" | "store">("store");
  const [destinationId, setDestinationId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("transfer");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch inventory item
        const itemResponse = await fetch(`/api/inventory/items/${inventoryId}`);
        if (!itemResponse.ok) {
          throw new Error('Failed to fetch inventory item');
        }
        const itemData = await itemResponse.json();
        setInventoryItem(itemData);

        // Fetch stores and warehouses
        const dataResponse = await fetch('/api/inventory/data');
        if (!dataResponse.ok) {
          throw new Error('Failed to fetch data');
        }
        const data = await dataResponse.json();
        setStores(data.stores || []);
        setWarehouses(data.warehouses || []);

      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    if (inventoryId) {
      fetchData();
    }
  }, [inventoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inventoryItem || !destinationId || !quantity || quantity <= 0) {
      alert("Please fill in all required fields");
      return;
    }

    if (quantity > inventoryItem.quantity) {
      alert("Cannot move more than available quantity");
      return;
    }

    setIsSubmitting(true);

    try {
      const moveData = {
        sourceInventoryId: inventoryId,
        destinationType,
        destinationId,
        quantity,
        reason,
        notes,
      };

      const response = await fetch(`/api/inventory/items/${inventoryId}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(moveData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to move inventory');
      }

      // Redirect back to warehouse inventory
      router.push('/inventory/warehouse');
      router.refresh();
    } catch (error) {
      console.error('Error moving inventory:', error);
      alert('Failed to move inventory. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 mx-auto"></div>
          <p className="text-gray-800">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !inventoryItem) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Move Inventory</h1>
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

  const availableDestinations = destinationType === "store" ? stores : warehouses.filter(w => w.id !== inventoryItem.warehouse.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Move Inventory</h1>
        <Link
          href="/inventory/warehouse"
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 transition-colors"
        >
          Back to Inventory
        </Link>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Source Item</h2>
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
            <p className="text-sm text-gray-600">Source Warehouse</p>
            <p className="font-medium text-gray-800">{inventoryItem.warehouse.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Available Quantity</p>
            <p className="font-medium text-gray-800">{inventoryItem.quantity}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="destinationType" className="mb-1 block text-sm font-medium text-gray-800">
                Destination Type *
              </label>
              <select
                id="destinationType"
                value={destinationType}
                onChange={(e) => {
                  setDestinationType(e.target.value as "warehouse" | "store");
                  setDestinationId("");
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              >
                <option value="store">Store</option>
                <option value="warehouse">Warehouse</option>
              </select>
            </div>

            <div>
              <label htmlFor="destination" className="mb-1 block text-sm font-medium text-gray-800">
                Destination {destinationType === "store" ? "Store" : "Warehouse"} *
              </label>
              <select
                id="destination"
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              >
                <option value="">Select {destinationType === "store" ? "Store" : "Warehouse"}</option>
                {availableDestinations.map((dest) => (
                  <option key={dest.id} value={dest.id}>
                    {dest.name} ({dest.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="quantity" className="mb-1 block text-sm font-medium text-gray-800">
                Quantity to Move *
              </label>
              <input
                id="quantity"
                type="number"
                min={1}
                max={inventoryItem.quantity}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Maximum: {inventoryItem.quantity}
              </p>
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
                <option value="transfer">Transfer</option>
                <option value="restock">Restock</option>
                <option value="redistribution">Redistribution</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="md:col-span-2">
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
            <h3 className="mb-2 font-medium text-gray-800">Move Summary</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-gray-600">From</p>
                <p className="font-medium">{inventoryItem.warehouse.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">To</p>
                <p className="font-medium">
                  {destinationId 
                    ? availableDestinations.find(d => d.id === destinationId)?.name || "Select destination"
                    : "Select destination"
                  }
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Quantity</p>
                <p className="font-medium">{quantity}</p>
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
              disabled={isSubmitting || !destinationId || quantity <= 0 || quantity > inventoryItem.quantity}
            >
              {isSubmitting ? "Moving..." : "Move Inventory"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
