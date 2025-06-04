"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import { use } from "react";

interface Audit {
  id: string;
  referenceNumber: string;
  status: string;
  warehouse: {
    id: string;
    name: string;
  };
}

interface AuditItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    sku: string;
  };
  inventoryItemId: string;
  inventoryItem: {
    id: string;
    quantity: number;
    bin?: {
      id: string;
      name: string;
      shelf?: {
        id: string;
        name: string;
        aisle?: {
          id: string;
          name: string;
          zone?: {
            id: string;
            name: string;
          };
        };
      };
    } | null;
  };
  expectedQuantity: number;
  actualQuantity: number | null;
  status: string;
  notes: string | null;
}

interface Zone {
  id: string;
  name: string;
}

export default function AuditCountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  // Use React.use() to unwrap the params Promise
  const unwrappedParams = use(params);
  const auditId = unwrappedParams.id;

  const [audit, setAudit] = useState<Audit | null>(null);
  const [items, setItems] = useState<AuditItem[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countedItems, setCountedItems] = useState<Record<string, { quantity: number; notes: string }>>({});

  // Fetch audit data
  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const response = await fetch(`/api/audits/${auditId}`);
        if (!response.ok) {
          if (response.status === 404) {
            notFound();
          }
          throw new Error('Failed to fetch audit');
        }

        const data = await response.json();
        setAudit(data.audit);

        // Check if audit can be counted
        if (data.audit.status !== "IN_PROGRESS") {
          alert('This audit is not in progress and cannot be counted.');
          router.push(`/audits/${auditId}`);
          return;
        }

        // Extract zones from items
        const zoneMap = new Map<string, Zone>();
        data.audit.items.forEach((item: AuditItem) => {
          const zone = item.inventoryItem?.bin?.shelf?.aisle?.zone;
          if (zone) {
            zoneMap.set(zone.id, zone);
          }
        });

        const uniqueZones = Array.from(zoneMap.values());
        setZones(uniqueZones);

        // Set first zone as selected if available
        if (uniqueZones.length > 0 && !selectedZone) {
          setSelectedZone(uniqueZones[0].id);
        }
      } catch (error) {
        console.error('Error fetching audit:', error);
        alert('Failed to load audit data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAudit();
  }, [auditId, router, selectedZone]);

  // Fetch items when zone changes
  useEffect(() => {
    const fetchItems = async () => {
      if (!selectedZone) return;

      try {
        setIsLoading(true);

        const response = await fetch(`/api/audits/${auditId}/items?zone=${selectedZone}`);
        if (!response.ok) {
          throw new Error('Failed to fetch audit items');
        }

        const data = await response.json();
        setItems(data.items);

        // Initialize counted items state
        const initialCounted: Record<string, { quantity: number; notes: string }> = {};
        data.items.forEach((item: AuditItem) => {
          if (item.actualQuantity !== null) {
            initialCounted[item.id] = {
              quantity: item.actualQuantity,
              notes: item.notes || "",
            };
          }
        });
        setCountedItems(initialCounted);
      } catch (error) {
        console.error('Error fetching audit items:', error);
        alert('Failed to load audit items. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();
  }, [auditId, selectedZone]);

  // Handle zone change
  const handleZoneChange = (zoneId: string) => {
    setSelectedZone(zoneId);
  };

  // Handle quantity change
  const handleQuantityChange = (itemId: string, quantity: number) => {
    setCountedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId] || { notes: "" },
        quantity,
      },
    }));
  };

  // Handle notes change
  const handleNotesChange = (itemId: string, notes: string) => {
    setCountedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId] || { quantity: 0 },
        notes,
      },
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate that at least one item is being counted
    const itemsToUpdate = Object.entries(countedItems).map(([id, data]) => ({
      id,
      actualQuantity: data.quantity,
      notes: data.notes,
    }));

    if (itemsToUpdate.length === 0) {
      alert('Please count at least one item');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/audits/${auditId}/items`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: itemsToUpdate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update audit items');
      }

      const result = await response.json();

      alert('Items counted successfully!');

      // If all items have been counted, suggest completing the audit
      if (result.isComplete) {
        if (confirm('All items have been counted. Would you like to complete the audit now?')) {
          router.push(`/audits/${auditId}/complete`);
          return;
        }
      }

      // Refresh the items
      const itemsResponse = await fetch(`/api/audits/${auditId}/items?zone=${selectedZone}`);
      if (!itemsResponse.ok) {
        throw new Error('Failed to refresh audit items');
      }

      const itemsData = await itemsResponse.json();
      setItems(itemsData.items);

      // Reset counted items
      setCountedItems({});
    } catch (error) {
      console.error('Error updating audit items:', error);
      alert('Failed to update audit items. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter items by search query
  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      item.product.name.toLowerCase().includes(query) ||
      item.product.sku.toLowerCase().includes(query) ||
      (item.inventoryItem?.bin?.name?.toLowerCase().includes(query) || false)
    );
  });

  if (isLoading && !audit) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-white p-6 shadow-md">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 mx-auto"></div>
          <p className="text-gray-500">Loading audit data...</p>
        </div>
      </div>
    );
  }

  if (!audit) {
    return notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Count Inventory</h1>
          <p className="text-gray-500">
            Audit: {audit.referenceNumber} - {audit.warehouse.name}
          </p>
        </div>
        <Link
          href={`/audits/${auditId}`}
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Back to Audit
        </Link>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="zone" className="mb-1 block text-sm font-medium text-gray-700">
              Select Zone
            </label>
            <select
              id="zone"
              value={selectedZone}
              onChange={(e) => handleZoneChange(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="search" className="mb-1 block text-sm font-medium text-gray-700">
              Search Products
            </label>
            <input
              id="search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product name, SKU, or location"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2">Location</th>
                  <th className="px-4 py-2">Expected</th>
                  <th className="px-4 py-2">Actual Count</th>
                  <th className="px-4 py-2">Variance</th>
                  <th className="px-4 py-2">Notes</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => {
                    // Format location
                    const bin = item.inventoryItem?.bin?.name || "Unassigned";
                    const shelf = item.inventoryItem?.bin?.shelf?.name || "";
                    const aisle = item.inventoryItem?.bin?.shelf?.aisle?.name || "";

                    const location = shelf
                      ? `${aisle} / ${shelf} / ${bin}`
                      : bin;

                    // Calculate variance
                    const counted = countedItems[item.id]?.quantity !== undefined
                      ? countedItems[item.id].quantity
                      : item.actualQuantity !== null
                        ? item.actualQuantity
                        : null;

                    const variance = counted !== null
                      ? counted - item.expectedQuantity
                      : null;

                    // Determine variance class
                    let varianceClass = "text-gray-500";
                    if (variance !== null) {
                      varianceClass = variance > 0 ? "text-green-600" : variance < 0 ? "text-red-600" : "text-gray-500";
                    }

                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-2 text-sm font-medium">
                          <div>{item.product.name}</div>
                          <div className="text-xs text-gray-500">{item.product.sku}</div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {location}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                          {item.expectedQuantity}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm">
                          <input
                            type="number"
                            value={countedItems[item.id]?.quantity !== undefined
                              ? countedItems[item.id].quantity
                              : item.actualQuantity !== null
                                ? item.actualQuantity
                                : ""}
                            onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                            min="0"
                            className="w-20 rounded-md border border-gray-300 px-3 py-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className={`whitespace-nowrap px-4 py-2 text-sm font-medium ${varianceClass}`}>
                          {variance !== null ? (variance > 0 ? `+${variance}` : variance) : "-"}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <input
                            type="text"
                            value={countedItems[item.id]?.notes !== undefined
                              ? countedItems[item.id].notes
                              : item.notes || ""}
                            onChange={(e) => handleNotesChange(item.id, e.target.value)}
                            placeholder="Add notes"
                            className="w-full rounded-md border border-gray-300 px-3 py-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            item.status === "PENDING"
                              ? "bg-gray-100 text-gray-800"
                              : item.status === "COUNTED"
                                ? "bg-blue-100 text-blue-800"
                                : item.status === "DISCREPANCY"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-green-100 text-green-800"
                          }`}>
                            {item.status === "PENDING"
                              ? "Pending"
                              : item.status === "COUNTED"
                                ? "Counted"
                                : item.status === "DISCREPANCY"
                                  ? "Discrepancy"
                                  : "Reconciled"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                      {isLoading
                        ? "Loading items..."
                        : searchQuery
                          ? "No items match your search"
                          : "No items found in this zone"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/audits/${auditId}`)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || Object.keys(countedItems).length === 0}
            >
              {isSubmitting ? "Saving..." : "Save Counts"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}