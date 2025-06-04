"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function InventoryCountPage() {
  const router = useRouter();

  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [warehouseId, setWarehouseId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [countedItems, setCountedItems] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");

  // State for error message
  const [error, setError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("Fetching inventory data...");
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/inventory/data');

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch data');
        }

        const data = await response.json();
        console.log("Data received:", {
          warehouses: data.warehouses?.length || 0,
          inventoryItems: data.inventoryItems?.length || 0
        });

        setWarehouses(data.warehouses || []);
        setInventoryItems(data.inventoryItems || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter inventory items by warehouse
  const filteredItems = warehouseId
    ? inventoryItems.filter(item =>
        item.warehouseId === warehouseId &&
        (searchTerm
          ? item.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.product?.sku?.toLowerCase().includes(searchTerm.toLowerCase())
          : true)
      )
    : [];

  // Handle quantity change
  const handleQuantityChange = (itemId: string, newValue: number) => {
    setCountedItems(prev => ({
      ...prev,
      [itemId]: newValue
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!warehouseId || Object.keys(countedItems).length === 0) {
      setSubmissionError('Please select a warehouse and count at least one item');
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);
    setSubmissionSuccess(null);

    try {
      console.log("Submitting inventory count:", {
        warehouseId,
        countedItems,
        notes
      });

      // Prepare the adjustments
      const adjustments = Object.entries(countedItems).map(([itemId, countedQuantity]) => {
        const item = inventoryItems.find(i => i.id === itemId);
        const currentQuantity = item?.quantity || 0;

        return {
          warehouseId,
          productId: item?.productId,
          adjustmentType: "set", // Set the exact quantity
          quantity: countedQuantity,
          reason: "stock_count",
          notes: notes || "Inventory count adjustment"
        };
      });

      // Submit each adjustment
      const results = await Promise.all(
        adjustments.map(async (adjustment) => {
          try {
            const response = await fetch('/api/inventory/adjust', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(adjustment),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || `Failed to adjust inventory for item ${adjustment.productId}`);
            }

            return await response.json();
          } catch (error) {
            console.error(`Error adjusting item ${adjustment.productId}:`, error);
            throw error;
          }
        })
      );

      console.log("All inventory counts submitted successfully:", results);
      setSubmissionSuccess("Inventory count completed successfully!");

      // Clear form
      setCountedItems({});

      // Show success message and redirect after a delay
      setTimeout(() => {
        router.push('/inventory/warehouse');
        router.refresh();
      }, 2000);
    } catch (error) {
      console.error('Error submitting inventory count:', error);
      setSubmissionError(error instanceof Error ? error.message : 'Failed to submit inventory count. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Inventory Count</h1>
        <Link
          href="/inventory/warehouse"
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 transition-colors"
        >
          Back to Inventory
        </Link>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-lg bg-white p-6 shadow-md">
          <div className="text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 mx-auto"></div>
            <p className="text-gray-800">Loading data...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800">
            <h3 className="text-lg font-medium">Error Loading Data</h3>
            <p className="mt-2">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-md bg-red-100 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-200"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow-md">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="warehouse" className="mb-1 block text-sm font-medium text-gray-800">
                Warehouse *
              </label>
              <select
                id="warehouse"
                value={warehouseId}
                onChange={(e) => {
                  setWarehouseId(e.target.value);
                  setCountedItems({});
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              >
                <option value="">Select Warehouse</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} ({warehouse.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="search" className="mb-1 block text-sm font-medium text-gray-800">
                Search Products
              </label>
              <input
                id="search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or SKU"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="notes" className="mb-1 block text-sm font-medium text-gray-800">
                Count Notes
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Add any notes about this inventory count"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {warehouseId && (
            <div className="mt-6">
              <h3 className="mb-4 text-lg font-medium text-gray-800">Count Inventory Items</h3>

              {filteredItems.length === 0 ? (
                <div className="rounded-lg bg-amber-50 p-4 text-amber-800">
                  {searchTerm ? 'No items match your search criteria.' : 'No inventory items found in this warehouse.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        <th className="px-4 py-2">Product</th>
                        <th className="px-4 py-2">SKU</th>
                        <th className="px-4 py-2">Location</th>
                        <th className="px-4 py-2">System Quantity</th>
                        <th className="px-4 py-2">Counted Quantity</th>
                        <th className="px-4 py-2">Variance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredItems.map((item) => {
                        const countedQty = countedItems[item.id] !== undefined ? countedItems[item.id] : item.quantity;
                        const variance = countedQty - item.quantity;

                        return (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm font-medium text-blue-600">
                              <Link href={`/products/${item.product?.id}`}>
                                {item.product?.name}
                              </Link>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {item.product?.sku}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {item.bin?.code || "Not Assigned"}
                            </td>
                            <td className="px-4 py-2 text-sm font-medium">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                min="0"
                                value={countedQty}
                                onChange={(e) => handleQuantityChange(item.id, Number(e.target.value))}
                                className="w-24 rounded-md border border-gray-300 px-3 py-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className={`px-4 py-2 text-sm font-medium ${variance === 0 ? 'text-green-600' : variance > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                              {variance > 0 ? `+${variance}` : variance}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {submissionError && (
            <div className="mt-4 rounded-md bg-red-50 p-4 text-red-800">
              <p className="font-medium">Error</p>
              <p className="mt-1">{submissionError}</p>
            </div>
          )}

          {submissionSuccess && (
            <div className="mt-4 rounded-md bg-green-50 p-4 text-green-800">
              <p className="font-medium">Success</p>
              <p className="mt-1">{submissionSuccess}</p>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/inventory/warehouse')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={!warehouseId || Object.keys(countedItems).length === 0 || isSubmitting}
            >
              {isSubmitting ? 'Processing...' : 'Submit Inventory Count'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
