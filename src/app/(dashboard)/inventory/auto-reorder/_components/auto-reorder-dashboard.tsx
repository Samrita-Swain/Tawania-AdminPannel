"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowPathIcon, ShoppingCartIcon } from "@heroicons/react/24/outline";

interface Warehouse {
  id: string;
  name: string;
}

interface Store {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  costPrice: number;
  reorderPoint: number;
  minStockLevel: number;
  supplier?: {
    id: string;
    name: string;
  };
  category?: {
    id: string;
    name: string;
  };
}

interface InventoryItem {
  inventoryItem: {
    id: string;
    quantity: number;
  };
  product: Product;
  currentQuantity: number;
  reorderPoint: number;
  minStockLevel: number;
  reorderQuantity: number;
  supplier?: {
    id: string;
    name: string;
  };
}

interface Location {
  id: string;
  type: string;
  name: string;
  items: InventoryItem[];
}

interface AutoReorderDashboardProps {
  warehouses: Warehouse[];
  stores: Store[];
  suppliers: Supplier[];
}

export function AutoReorderDashboard({
  warehouses,
  stores,
  suppliers,
}: AutoReorderDashboardProps) {
  const router = useRouter();

  // State
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingOrder, setCreatingOrder] = useState<boolean>(false);
  const [orderSuccess, setOrderSuccess] = useState<boolean>(false);

  // Filters
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [storeId, setStoreId] = useState<string>("");
  const [threshold, setThreshold] = useState<number>(100);

  // Selected items for reordering
  const [selectedItems, setSelectedItems] = useState<{[key: string]: boolean}>({});
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");

  // Fetch inventory items that need reordering
  const fetchReorderItems = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query params
      const params = new URLSearchParams();

      if (warehouseId) {
        params.append("warehouseId", warehouseId);
      }

      if (storeId) {
        params.append("storeId", storeId);
      }

      params.append("threshold", threshold.toString());

      const response = await fetch(`/api/inventory/auto-reorder?${params.toString()}`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to fetch reorder items");
      }

      if (!data.locations) {
        console.warn("API response missing locations property:", data);
        setLocations([]);
        return;
      }

      setLocations(data.locations);
    } catch (err: any) {
      console.error("Error fetching reorder items:", err);
      setError(err.message || "Failed to load reorder items. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and when filters change
  useEffect(() => {
    fetchReorderItems();
  }, [warehouseId, storeId, threshold]);

  // Handle item selection
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Select all items for a supplier
  const selectAllForSupplier = (supplierId: string) => {
    const newSelectedItems = { ...selectedItems };

    locations.forEach(location => {
      location.items.forEach(item => {
        if (item.supplier?.id === supplierId) {
          newSelectedItems[item.inventoryItem?.id || item.product.id] = true;
        }
      });
    });

    setSelectedItems(newSelectedItems);
    setSelectedSupplier(supplierId);
  };

  // Get selected items count
  const getSelectedItemsCount = () => {
    return Object.values(selectedItems).filter(Boolean).length;
  };

  // Get selected items data
  const getSelectedItemsData = () => {
    const items: any[] = [];

    locations.forEach(location => {
      location.items.forEach(item => {
        if (selectedItems[item.inventoryItem?.id || item.product.id]) {
          items.push({
            productId: item.product.id,
            quantity: item.reorderQuantity,
            unitPrice: item.product.costPrice,
          });
        }
      });
    });

    return items;
  };

  // Create purchase order
  const createPurchaseOrder = async () => {
    if (!selectedWarehouse || !selectedSupplier) {
      alert("Please select a warehouse and supplier for the purchase order");
      return;
    }

    const selectedItemsCount = getSelectedItemsCount();
    if (selectedItemsCount === 0) {
      alert("Please select at least one item to reorder");
      return;
    }

    setCreatingOrder(true);

    try {
      const response = await fetch("/api/inventory/auto-reorder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          warehouseId: selectedWarehouse,
          supplierId: selectedSupplier,
          items: getSelectedItemsData(),
          notes: "Auto-generated purchase order for restock",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to create purchase order");
      }

      setOrderSuccess(true);
      setTimeout(() => {
        router.push(`/purchase-orders/${data.id}`);
      }, 2000);
    } catch (err) {
      console.error("Error creating purchase order:", err);
      alert("Failed to create purchase order. Please try again.");
    } finally {
      setCreatingOrder(false);
    }
  };

  // Group items by supplier
  const getItemsBySupplier = () => {
    const supplierItems: {[key: string]: any} = {};

    locations.forEach(location => {
      location.items.forEach(item => {
        const supplierId = item.supplier?.id || "unknown";
        const supplierName = item.supplier?.name || "Unknown Supplier";

        if (!supplierItems[supplierId]) {
          supplierItems[supplierId] = {
            id: supplierId,
            name: supplierName,
            items: [],
          };
        }

        supplierItems[supplierId].items.push({
          ...item,
          location: {
            id: location.id,
            name: location.name,
            type: location.type,
          },
        });
      });
    });

    return Object.values(supplierItems);
  };

  return (
    <div>
      {/* Filters */}
      <div className="p-4 border-b grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label htmlFor="warehouse" className="block text-sm font-medium text-gray-800 mb-1">
            Warehouse
          </label>
          <select
            id="warehouse"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Warehouses</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="store" className="block text-sm font-medium text-gray-800 mb-1">
            Store
          </label>
          <select
            id="store"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Stores</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="threshold" className="block text-sm font-medium text-gray-800 mb-1">
            Threshold (%)
          </label>
          <Input
            id="threshold"
            type="number"
            min="0"
            max="200"
            value={threshold}
            onChange={(e) => setThreshold(parseInt(e.target.value) || 100)}
            className="block w-full"
          />
        </div>

        <div className="flex items-end">
          <Button
            onClick={fetchReorderItems}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Create Order Panel */}
      {getSelectedItemsCount() > 0 && (
        <div className="p-4 bg-blue-50 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-medium">Create Purchase Order</h3>
              <p className="text-sm text-gray-800">
                {getSelectedItemsCount()} items selected for reordering
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <select
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select Destination Warehouse</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                onClick={createPurchaseOrder}
                disabled={creatingOrder || !selectedWarehouse || !selectedSupplier}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {creatingOrder ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : orderSuccess ? (
                  "Order Created!"
                ) : (
                  <>
                    <ShoppingCartIcon className="h-4 w-4 mr-2" />
                    Create Purchase Order
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div>
        {loading ? (
          <div className="p-8 text-center">
            <ArrowPathIcon className="h-8 w-8 mx-auto animate-spin text-gray-800" />
            <p className="mt-2 text-gray-800">Loading inventory items...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-500">{error}</p>
            <Button
              onClick={fetchReorderItems}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Try Again
            </Button>
          </div>
        ) : locations.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-800">No items below reorder point found.</p>
          </div>
        ) : (
          <div>
            {getItemsBySupplier().map((supplierGroup) => (
              <div key={supplierGroup.id} className="border-b last:border-b-0">
                <div className="p-4 bg-gray-50 flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{supplierGroup.name}</h3>
                    <p className="text-sm text-gray-800">
                      {supplierGroup.items.length} items below reorder point
                    </p>
                  </div>
                  <Button
                    onClick={() => selectAllForSupplier(supplierGroup.id)}
                    className="bg-blue-100 text-blue-700 hover:bg-blue-200"
                  >
                    Select All Items
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            onChange={() => {
                              const allSelected = supplierGroup.items.every(
                                (item: any) => selectedItems[item.inventoryItem?.id || item.product.id]
                              );

                              const newSelectedItems = { ...selectedItems };
                              supplierGroup.items.forEach((item: any) => {
                                newSelectedItems[item.inventoryItem?.id || item.product.id] = !allSelected;
                              });

                              setSelectedItems(newSelectedItems);
                            }}
                            checked={supplierGroup.items.every(
                              (item: any) => selectedItems[item.inventoryItem?.id || item.product.id]
                            )}
                          />
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                          Product
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                          Location
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                          Current Stock
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                          Reorder Point
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                          Min Stock Level
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                          Suggested Order
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                          Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {supplierGroup.items.map((item: any) => (
                        <tr key={item.inventoryItem?.id || item.product.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={!!selectedItems[item.inventoryItem?.id || item.product.id]}
                              onChange={() => toggleItemSelection(item.inventoryItem?.id || item.product.id)}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.product.name}
                            <div className="text-xs text-gray-800">{item.product.sku}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                            {item.location.name}
                            <div className="text-xs text-gray-800">
                              {item.location.type === "warehouse" ? "Warehouse" : "Store"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                            <Badge className={`${
                              item.currentQuantity === 0
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}>
                              {item.currentQuantity}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                            {item.reorderPoint}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                            {item.minStockLevel}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                            <Badge className="bg-blue-100 text-blue-800">
                              {item.reorderQuantity}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                            ${(item.product.costPrice * item.reorderQuantity).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

