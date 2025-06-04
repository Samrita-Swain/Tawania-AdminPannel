"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, Trash, Save, ArrowLeft } from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  costPrice: number;
  retailPrice: number;
  category: {
    id: string;
    name: string;
  } | null;
}

interface Warehouse {
  id: string;
  name: string;
}

interface Store {
  id: string;
  name: string;
}

interface TransferItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  sourceCostPrice: number;
  sourceRetailPrice: number;
  targetCostPrice: number;
  targetRetailPrice: number;
  adjustmentReason?: string | null;
}

interface Transfer {
  id: string;
  transferNumber: string;
  status: string;
  transferType: string;
  priority: string;
  requestedDate: Date | string | null;
  expectedDeliveryDate: Date | string | null;
  notes: string | null;
  fromWarehouseId: string | null;
  toStoreId: string | null;
  toWarehouseId: string | null;
  items: TransferItem[];
}

interface EditTransferFormProps {
  transfer: Transfer;
  warehouses: Warehouse[];
  stores: Store[];
  products: Product[];
}

export function EditTransferForm({
  transfer,
  warehouses,
  stores,
  products,
}: EditTransferFormProps) {
  const router = useRouter();

  // Form state
  const [fromWarehouseId, setFromWarehouseId] = useState(transfer.fromWarehouseId);
  const [destinationType, setDestinationType] = useState(
    transfer.toStoreId ? "store" : "warehouse"
  );
  const [toStoreId, setToStoreId] = useState(transfer.toStoreId || "");
  const [toWarehouseId, setToWarehouseId] = useState(transfer.toWarehouseId || "");
  const [transferType, setTransferType] = useState(transfer.transferType);
  const [priority, setPriority] = useState(transfer.priority);
  const [requestedDate, setRequestedDate] = useState(
    transfer.requestedDate 
      ? new Date(transfer.requestedDate).toISOString().split("T")[0] 
      : new Date().toISOString().split("T")[0]
  );
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(
    transfer.expectedDeliveryDate
      ? new Date(transfer.expectedDeliveryDate).toISOString().split("T")[0]
      : ""
  );
  const [notes, setNotes] = useState(transfer.notes || "");
  const [items, setItems] = useState<TransferItem[]>(transfer.items);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtered products based on search
  const filteredProducts = products.filter((product) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchLower) ||
      product.sku.toLowerCase().includes(searchLower) ||
      product.category?.name.toLowerCase().includes(searchLower)
    );
  });

  // Add item to transfer
  const addItem = (product: Product) => {
    // Check if product already exists in items
    const existingItemIndex = items.findIndex((item) => item.productId === product.id);

    if (existingItemIndex >= 0) {
      // Update quantity if product already exists
      const updatedItems = [...items];
      updatedItems[existingItemIndex].quantity += 1;
      setItems(updatedItems);
    } else {
      // Add new item
      const newItem: TransferItem = {
        id: `temp-${Date.now()}`,
        productId: product.id,
        product,
        quantity: 1,
        sourceCostPrice: product.costPrice,
        sourceRetailPrice: product.retailPrice,
        targetCostPrice: product.costPrice,
        targetRetailPrice: product.retailPrice,
      };

      setItems([...items, newItem]);
    }

    // Clear search
    setSearchTerm("");
  };

  // Update item quantity
  const updateItemQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;

    const updatedItems = items.map((item) => {
      if (item.id === id) {
        return { ...item, quantity };
      }
      return item;
    });

    setItems(updatedItems);
  };

  // Update item source cost price
  const updateItemSourceCostPrice = (id: string, price: number) => {
    const updatedItems = items.map((item) => {
      if (item.id === id) {
        return { ...item, sourceCostPrice: price };
      }
      return item;
    });

    setItems(updatedItems);
  };

  // Update item source retail price
  const updateItemSourceRetailPrice = (id: string, price: number) => {
    const updatedItems = items.map((item) => {
      if (item.id === id) {
        return { ...item, sourceRetailPrice: price };
      }
      return item;
    });

    setItems(updatedItems);
  };

  // Update item target cost price
  const updateItemTargetCostPrice = (id: string, price: number) => {
    const updatedItems = items.map((item) => {
      if (item.id === id) {
        return { ...item, targetCostPrice: price };
      }
      return item;
    });

    setItems(updatedItems);
  };

  // Update item target retail price
  const updateItemTargetRetailPrice = (id: string, price: number) => {
    const updatedItems = items.map((item) => {
      if (item.id === id) {
        return { ...item, targetRetailPrice: price };
      }
      return item;
    });

    setItems(updatedItems);
  };

  // Update item adjustment reason
  const updateItemAdjustmentReason = (id: string, reason: string) => {
    const updatedItems = items.map((item) => {
      if (item.id === id) {
        return { ...item, adjustmentReason: reason };
      }
      return item;
    });

    setItems(updatedItems);
  };

  // Remove item
  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  // Calculate totals
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalCost = items.reduce(
    (sum, item) => sum + item.sourceCostPrice * item.quantity,
    0
  );
  const totalRetail = items.reduce(
    (sum, item) => sum + item.sourceRetailPrice * item.quantity,
    0
  );

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!fromWarehouseId) {
      setError("Please select a source warehouse");
      return;
    }

    if (destinationType === "store" && !toStoreId) {
      setError("Please select a destination store");
      return;
    }

    if (destinationType === "warehouse" && !toWarehouseId) {
      setError("Please select a destination warehouse");
      return;
    }

    if (items.length === 0) {
      setError("Please add at least one item");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/transfers/${transfer.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromWarehouseId,
          toStoreId: destinationType === "store" ? toStoreId : null,
          toWarehouseId: destinationType === "warehouse" ? toWarehouseId : null,
          transferType,
          priority,
          requestedDate,
          expectedDeliveryDate: expectedDeliveryDate || null,
          notes,
          items: items.map((item) => ({
            id: item.id.startsWith("temp-") ? undefined : item.id,
            productId: item.productId,
            quantity: item.quantity,
            sourceCostPrice: item.sourceCostPrice,
            sourceRetailPrice: item.sourceRetailPrice,
            targetCostPrice: item.targetCostPrice,
            targetRetailPrice: item.targetRetailPrice,
            adjustmentReason: item.adjustmentReason,
          })),
          totalItems,
          totalCost,
          totalRetail,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update transfer");
      }

      // Redirect to the transfer details page
      router.push(`/transfers/${transfer.id}`);
      router.refresh();
    } catch (error: any) {
      setError(error.message || "An error occurred while updating the transfer");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Transfer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="fromWarehouse">From Warehouse</Label>
              <Select
                id="fromWarehouse"
                value={fromWarehouseId === null ? "" : fromWarehouseId}
                onChange={(e) => setFromWarehouseId(e.target.value)}
                required
              >
                <option value="">Select Warehouse</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="destinationType">Destination Type</Label>
              <Select
                id="destinationType"
                value={destinationType}
                onChange={(e) => setDestinationType(e.target.value)}
                required
              >
                <option value="store">Store</option>
                <option value="warehouse">Warehouse</option>
              </Select>
            </div>

            {destinationType === "store" ? (
              <div>
                <Label htmlFor="toStore">To Store</Label>
                <Select
                  id="toStore"
                  value={toStoreId === null ? "" : toStoreId}
                  onChange={(e) => setToStoreId(e.target.value)}
                  required
                >
                  <option value="">Select Store</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <div>
                <Label htmlFor="toWarehouse">To Warehouse</Label>
                <Select
                  id="toWarehouse"
                  value={toWarehouseId === null ? "" : toWarehouseId}
                  onChange={(e) => setToWarehouseId(e.target.value)}
                  required
                >
                  <option value="">Select Warehouse</option>
                  {warehouses
                    .filter((w) => w.id !== fromWarehouseId)
                    .map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </option>
                    ))}
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="transferType">Transfer Type</Label>
              <Select
                id="transferType"
                value={transferType}
                onChange={(e) => setTransferType(e.target.value)}
                required
              >
                <option value="RESTOCK">Restock</option>
                <option value="RETURN">Return</option>
                <option value="TRANSFER">Transfer</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                required
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="requestedDate">Requested Date</Label>
              <Input
                id="requestedDate"
                type="date"
                value={requestedDate}
                onChange={(e) => setRequestedDate(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="expectedDeliveryDate">Expected Delivery Date</Label>
              <Input
                id="expectedDeliveryDate"
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes about this transfer"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transfer Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="search">Search Products</Label>
              <div className="relative">
                <Input
                  id="search"
                  type="text"
                  placeholder="Search by name, SKU, or category"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-800" />
              </div>

              {searchTerm && (
                <div className="mt-2 max-h-60 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-sm">
                  {filteredProducts.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                      {filteredProducts.slice(0, 10).map((product) => (
                        <li
                          key={product.id}
                          className="flex cursor-pointer items-center justify-between p-3 hover:bg-gray-50"
                          onClick={() => addItem(product)}
                        >
                          <div>
                            <p className="font-medium text-gray-800">{product.name}</p>
                            <p className="text-xs text-gray-800">
                              SKU: {product.sku} | Category:{" "}
                              {product.category?.name || "Uncategorized"}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              addItem(product);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="p-3 text-center text-sm text-gray-800">
                      No products found
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4">
              <h3 className="mb-2 text-sm font-medium text-gray-800">
                Selected Items
              </h3>
              {items.length > 0 ? (
                <ul className="divide-y divide-gray-200 rounded-md border border-gray-200">
                  {items.map((item) => (
                    <li key={item.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">
                            {item.product.name}
                          </p>
                          <p className="text-xs text-gray-800">
                            SKU: {item.product.sku} | Category:{" "}
                            {item.product.category?.name || "Uncategorized"}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div>
                          <Label
                            htmlFor={`quantity-${item.id}`}
                            className="text-xs"
                          >
                            Quantity
                          </Label>
                          <Input
                            id={`quantity-${item.id}`}
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItemQuantity(
                                item.id,
                                parseInt(e.target.value)
                              )
                            }
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label
                            htmlFor={`sourceCostPrice-${item.id}`}
                            className="text-xs"
                          >
                            Source Cost Price
                          </Label>
                          <Input
                            id={`sourceCostPrice-${item.id}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.sourceCostPrice}
                            onChange={(e) =>
                              updateItemSourceCostPrice(
                                item.id,
                                parseFloat(e.target.value)
                              )
                            }
                            className="h-8"
                          />
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div>
                          <Label
                            htmlFor={`sourceRetailPrice-${item.id}`}
                            className="text-xs"
                          >
                            Source Retail Price
                          </Label>
                          <Input
                            id={`sourceRetailPrice-${item.id}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.sourceRetailPrice}
                            onChange={(e) =>
                              updateItemSourceRetailPrice(
                                item.id,
                                parseFloat(e.target.value)
                              )
                            }
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label
                            htmlFor={`targetCostPrice-${item.id}`}
                            className="text-xs"
                          >
                            Target Cost Price
                          </Label>
                          <Input
                            id={`targetCostPrice-${item.id}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.targetCostPrice}
                            onChange={(e) =>
                              updateItemTargetCostPrice(
                                item.id,
                                parseFloat(e.target.value)
                              )
                            }
                            className="h-8"
                          />
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div>
                          <Label
                            htmlFor={`targetRetailPrice-${item.id}`}
                            className="text-xs"
                          >
                            Target Retail Price
                          </Label>
                          <Input
                            id={`targetRetailPrice-${item.id}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.targetRetailPrice}
                            onChange={(e) =>
                              updateItemTargetRetailPrice(
                                item.id,
                                parseFloat(e.target.value)
                              )
                            }
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label
                            htmlFor={`adjustmentReason-${item.id}`}
                            className="text-xs"
                          >
                            Adjustment Reason
                          </Label>
                          <Input
                            id={`adjustmentReason-${item.id}`}
                            type="text"
                            value={item.adjustmentReason || ""}
                            onChange={(e) =>
                              updateItemAdjustmentReason(
                                item.id,
                                e.target.value
                              )
                            }
                            className="h-8"
                            placeholder="Reason for price adjustment"
                          />
                        </div>
                      </div>

                      <div className="mt-2 text-right text-sm">
                        <span className="font-medium">
                          Subtotal: $
                          {(item.sourceCostPrice * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-md border border-gray-200 p-4 text-center text-sm text-gray-800">
                  No items added yet. Search for products above.
                </p>
              )}

              {items.length > 0 && (
                <div className="mt-4 flex justify-between">
                  <div>
                    <p className="text-sm text-gray-800">
                      Total Items: <span className="font-medium">{totalItems}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-800">
                      Total Cost:{" "}
                      <span className="font-medium">${totalCost.toFixed(2)}</span>
                    </p>
                    <p className="text-sm text-gray-800">
                      Total Retail:{" "}
                      <span className="font-medium">${totalRetail.toFixed(2)}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Button
          type="submit"
          disabled={isSubmitting || items.length === 0}
        >
          {isSubmitting ? (
            <>Processing...</>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Update Transfer
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

