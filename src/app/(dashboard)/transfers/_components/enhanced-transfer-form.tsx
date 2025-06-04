"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useNotification } from "@/components/ui/notification";
import { Search } from "lucide-react";

interface Store {
  id: string;
  name: string;
  code: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  unit: string;
  category?: {
    id: string;
    name: string;
  } | null;
}

interface InventoryItemWithProduct {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  costPrice: number;
  retailPrice: number;
  product: Product;
}

interface TransferItem {
  inventoryItemId: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  availableQuantity: number;
  unit: string;
  sourceCostPrice: number;
  sourceRetailPrice: number;
  targetCostPrice: number;
  targetRetailPrice: number;
  adjustmentReason?: string;
}

interface EnhancedTransferFormProps {
  warehouseId: string;
  warehouseName: string;
  stores: Store[];
  warehouseInventory: InventoryItemWithProduct[];
}

export function EnhancedTransferForm({
  warehouseId,
  warehouseName,
  stores,
  warehouseInventory,
}: EnhancedTransferFormProps) {
  const router = useRouter();
  const { showNotification } = useNotification();

  // State for the form
  const [destinationStoreId, setDestinationStoreId] = useState<string>("");
  const [items, setItems] = useState<TransferItem[]>([]);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [adjustPrices, setAdjustPrices] = useState<boolean>(true);
  const [priority, setPriority] = useState<string>("NORMAL");

  // Get unique categories from inventory
  const categories = Array.from(
    new Set(
      warehouseInventory
        .filter(item => item.product.category)
        .map(item => item.product.category?.name)
    )
  ).sort();

  // Filter inventory based on search and category
  const filteredInventory = warehouseInventory.filter(item => {
    const matchesSearch = searchTerm === "" ||
      item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product.sku.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === null ||
      item.product.category?.name === selectedCategory;

    return matchesSearch && matchesCategory && item.quantity > 0;
  });

  // Add item to transfer items
  const addToItems = (item: InventoryItemWithProduct) => {
    // Check if item is already in items
    const existingItemIndex = items.findIndex(
      (transferItem) => transferItem.inventoryItemId === item.id
    );

    if (existingItemIndex >= 0) {
      // Item already in items, update quantity if not exceeding available quantity
      const existingItem = items[existingItemIndex];
      if (existingItem.quantity < item.quantity) {
        const updatedItems = [...items];
        updatedItems[existingItemIndex] = {
          ...existingItem,
          quantity: existingItem.quantity + 1,
        };
        setItems(updatedItems);
      }
    } else {
      // Add new item to items
      setItems([
        ...items,
        {
          inventoryItemId: item.id,
          productId: item.productId,
          productName: item.product.name,
          sku: item.product.sku,
          quantity: 1,
          availableQuantity: item.quantity,
          unit: item.product.unit,
          sourceCostPrice: item.costPrice,
          sourceRetailPrice: item.retailPrice,
          targetCostPrice: item.costPrice,
          targetRetailPrice: item.retailPrice,
          adjustmentReason: "",
        },
      ]);
    }
  };

  // Update item quantity
  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      // Remove item if quantity is 0 or negative
      removeItem(index);
      return;
    }

    const item = items[index];
    if (newQuantity > item.availableQuantity) {
      // Don't allow quantity to exceed available stock
      return;
    }

    const updatedItems = [...items];
    updatedItems[index] = {
      ...item,
      quantity: newQuantity,
    };
    setItems(updatedItems);
  };

  // Update item price
  const updatePrice = (index: number, field: 'targetCostPrice' | 'targetRetailPrice', value: number) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...items[index],
      [field]: value,
    };
    setItems(updatedItems);
  };

  // Update adjustment reason
  const updateAdjustmentReason = (index: number, reason: string) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...items[index],
      adjustmentReason: reason,
    };
    setItems(updatedItems);
  };

  // Remove item from transfer items
  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculate totals
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalSourceValue = items.reduce(
    (sum, item) => sum + item.sourceCostPrice * item.quantity,
    0
  );
  const totalTargetValue = items.reduce(
    (sum, item) => sum + item.targetCostPrice * item.quantity,
    0
  );

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form inputs
    if (items.length === 0) {
      showNotification("warning", "Missing Items", "Please add at least one item to the transfer");
      return;
    }

    if (!destinationStoreId) {
      showNotification("warning", "Missing Destination", "Please select a destination store");
      return;
    }

    // Check if any price adjustments are missing reasons
    if (adjustPrices) {
      const missingReasons = items.some(item =>
        (item.targetCostPrice !== item.sourceCostPrice ||
         item.targetRetailPrice !== item.sourceRetailPrice) &&
        !item.adjustmentReason
      );

      if (missingReasons) {
        showNotification("warning", "Missing Information", "Please provide reasons for all price adjustments");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      console.log("=== FORM SUBMISSION DEBUG ===");
      console.log("Warehouse ID:", warehouseId);
      console.log("Warehouse Name:", warehouseName);
      console.log("Destination Store ID:", destinationStoreId);
      console.log("Available Stores:", stores);
      console.log("Items count:", items.length);
      console.log("Priority:", priority);

      // Validate IDs are not empty
      if (!warehouseId) {
        showNotification("error", "Error", "Warehouse ID is missing");
        setIsSubmitting(false);
        return;
      }

      if (!destinationStoreId) {
        showNotification("error", "Error", "Please select a destination store");
        setIsSubmitting(false);
        return;
      }

      const requestData = {
        fromWarehouseId: warehouseId,
        toStoreId: destinationStoreId,
        transferType: "RESTOCK",
        priority,
        requestedDate: new Date(),
        notes,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          sourceCostPrice: Number(item.sourceCostPrice),
          sourceRetailPrice: Number(item.sourceRetailPrice),
          targetCostPrice: Number(adjustPrices ? item.targetCostPrice : item.sourceCostPrice),
          targetRetailPrice: Number(adjustPrices ? item.targetRetailPrice : item.sourceRetailPrice),
          adjustmentReason: adjustPrices ? item.adjustmentReason : "",
        })),
      };

      console.log("Final request data:", JSON.stringify(requestData, null, 2));

      // Use the simplified transfer API
      console.log("Sending POST request to transfer API...");
      const response = await fetch("/api/transfers/simple", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const data = await response.json();
        console.log("Transfer created successfully:", data.id);
        showNotification("success", "Success", "Transfer created successfully!");
        router.push(`/transfers/${data.id}`);
        router.refresh();
      } else {
        let errorMessage = "Failed to create transfer";
        let responseText = "";

        try {
          // First try to get the response as text
          responseText = await response.text();
          console.log("Raw response text:", responseText);

          // Then try to parse it as JSON
          if (responseText) {
            const error = JSON.parse(responseText);
            console.error("Parsed error response:", error);
            errorMessage = error.error || error.details || error.message || errorMessage;
          } else {
            errorMessage = `Empty response with status ${response.status}`;
          }
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
          console.error("Response text was:", responseText);
          errorMessage = responseText || `HTTP ${response.status}: ${response.statusText}`;
        }

        showNotification("error", "Error", errorMessage);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error creating transfer:", error);
      showNotification("error", "Error", "An unexpected error occurred while creating the transfer");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Product Selection */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transfer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="sourceWarehouse">Source Warehouse</Label>
                  <Input
                    id="sourceWarehouse"
                    value={warehouseName}
                    disabled
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="destinationStore">Destination Store</Label>
                  <select
                    id="destinationStore"
                    value={destinationStoreId}
                    onChange={(e) => setDestinationStoreId(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a store</option>
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <select
                    id="priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2 pt-8">
                  <Switch
                    id="adjustPrices"
                    checked={adjustPrices}
                    onCheckedChange={setAdjustPrices}
                  />
                  <Label htmlFor="adjustPrices">
                    Adjust prices for store (different from warehouse prices)
                  </Label>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1"
                  placeholder="Add any notes about this transfer"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Select Products</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-800" />
                  <Input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={selectedCategory || ""}
                  onChange={(e) => setSelectedCategory(e.target.value || null)}
                  className="rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="h-[400px] overflow-y-auto rounded-md border border-gray-200 p-4">
                {filteredInventory.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredInventory.map((item) => {
                      // Check if item is already in the transfer
                      const isAdded = items.some(transferItem => transferItem.inventoryItemId === item.id);
                      const addedItem = items.find(transferItem => transferItem.inventoryItemId === item.id);

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => addToItems(item)}
                          className={`flex flex-col rounded-md border p-3 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isAdded
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                          }`}
                          disabled={item.quantity === 0}
                        >
                          <div className="flex justify-between">
                            <span className="font-medium text-blue-600">{item.product.name}</span>
                            {isAdded && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                                Added: {addedItem?.quantity}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-800">SKU: {item.product.sku}</span>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-sm font-semibold">${item.retailPrice.toFixed(2)}</span>
                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                              item.quantity > 10
                                ? 'bg-green-100 text-green-800'
                                : item.quantity > 0
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                            }`}>
                              {item.quantity} {item.product.unit} available
                            </span>
                          </div>
                          {item.quantity === 0 && (
                            <p className="mt-1 text-xs text-red-600">Out of stock</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-gray-800">
                      {searchTerm || selectedCategory
                        ? "No products found matching your search criteria"
                        : "No products available in this warehouse"}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Transfer Items */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transfer Items</CardTitle>
            </CardHeader>
            <CardContent>
              {items.length > 0 ? (
                <div className="space-y-6">
                  <div className="max-h-[500px] overflow-y-auto space-y-4">
                    {items.map((item, index) => (
                      <div key={index} className="rounded-md border border-gray-200 p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{item.productName}</h4>
                            <p className="text-xs text-gray-800">{item.sku}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            &times;
                          </button>
                        </div>

                        <div className="mt-2 grid grid-cols-3 gap-2">
                          <div>
                            <Label htmlFor={`quantity-${index}`} className="text-xs">
                              Quantity
                            </Label>
                            <div className="flex rounded-md">
                              <button
                                type="button"
                                onClick={() => updateQuantity(index, item.quantity - 1)}
                                className="rounded-l-md border border-r-0 border-gray-300 px-2 text-gray-800 hover:bg-gray-50"
                              >
                                -
                              </button>
                              <Input
                                id={`quantity-${index}`}
                                type="number"
                                min="1"
                                max={item.availableQuantity}
                                value={item.quantity}
                                onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 0)}
                                className="rounded-none border-x-0 text-center"
                              />
                              <button
                                type="button"
                                onClick={() => updateQuantity(index, item.quantity + 1)}
                                className="rounded-r-md border border-l-0 border-gray-300 px-2 text-gray-800 hover:bg-gray-50"
                              >
                                +
                              </button>
                            </div>
                            <p className="mt-1 text-xs text-gray-800">
                              Max: {item.availableQuantity} {item.unit}
                            </p>
                          </div>

                          <div>
                            <Label className="text-xs">Warehouse Price</Label>
                            <Input
                              value={`$${item.sourceCostPrice.toFixed(2)}`}
                              disabled
                              className="bg-gray-50"
                            />
                          </div>

                          <div>
                            <Label className="text-xs">Warehouse Retail</Label>
                            <Input
                              value={`$${item.sourceRetailPrice.toFixed(2)}`}
                              disabled
                              className="bg-gray-50"
                            />
                          </div>
                        </div>

                        {adjustPrices && (
                          <div className="mt-3 space-y-3 border-t border-gray-200 pt-3">
                            <h5 className="text-sm font-medium text-gray-800">Store Pricing</h5>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor={`targetCostPrice-${index}`} className="text-xs">
                                  Store Cost Price
                                </Label>
                                <div className="relative mt-1">
                                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-800">
                                    $
                                  </span>
                                  <Input
                                    id={`targetCostPrice-${index}`}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.targetCostPrice}
                                    onChange={(e) => updatePrice(index, 'targetCostPrice', parseFloat(e.target.value) || 0)}
                                    className="pl-7"
                                  />
                                </div>
                              </div>
                              <div>
                                <Label htmlFor={`targetRetailPrice-${index}`} className="text-xs">
                                  Store Retail Price
                                </Label>
                                <div className="relative mt-1">
                                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-800">
                                    $
                                  </span>
                                  <Input
                                    id={`targetRetailPrice-${index}`}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.targetRetailPrice}
                                    onChange={(e) => updatePrice(index, 'targetRetailPrice', parseFloat(e.target.value) || 0)}
                                    className="pl-7"
                                  />
                                </div>
                              </div>
                            </div>
                            <div>
                              <Label htmlFor={`adjustmentReason-${index}`} className="text-xs">
                                Reason for Price Adjustment
                              </Label>
                              <Input
                                id={`adjustmentReason-${index}`}
                                value={item.adjustmentReason || ""}
                                onChange={(e) => updateAdjustmentReason(index, e.target.value)}
                                placeholder="e.g., Regional pricing, Promotion, etc."
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="rounded-md bg-gray-50 p-4">
                    <div className="flex justify-between text-sm">
                      <span>Total Items:</span>
                      <span>{totalItems}</span>
                    </div>
                    <div className="mt-1 flex justify-between text-sm">
                      <span>Total Warehouse Value:</span>
                      <span>${totalSourceValue.toFixed(2)}</span>
                    </div>
                    {adjustPrices && (
                      <div className="mt-1 flex justify-between text-sm">
                        <span>Total Store Value:</span>
                        <span>${totalTargetValue.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    onClick={async () => {
                      console.log("=== API TEST BUTTON CLICKED ===");
                      try {
                        const testResponse = await fetch("/api/transfers/basic");
                        console.log("Test response status:", testResponse.status);
                        const testData = await testResponse.json();
                        console.log("Test response data:", testData);
                        showNotification("success", "API Test", "API is working! Check console for details.");
                      } catch (error) {
                        console.error("API test failed:", error);
                        showNotification("error", "API Test", "API test failed! Check console for details.");
                      }
                    }}
                    variant="outline"
                    className="w-full mb-2"
                  >
                    Test API Connection
                  </Button>

                  <Button
                    type="submit"
                    disabled={isSubmitting || items.length === 0 || !destinationStoreId}
                    className="w-full"
                    isLoading={isSubmitting}
                  >
                    {isSubmitting ? "Creating Transfer..." : "Create Transfer"}
                  </Button>
                </div>
              ) : (
                <div className="flex h-[300px] flex-col items-center justify-center text-center">
                  <p className="text-gray-800">No items added to transfer</p>
                  <p className="mt-2 text-sm text-gray-800">
                    Select products from the left panel to add them to your transfer
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
