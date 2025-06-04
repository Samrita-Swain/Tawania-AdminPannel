"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Warehouse, Store, Product, Category } from "@prisma/client";

interface InventoryItemWithProduct {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    sku: string;
    barcode?: string | null;
    unit: string;
    category?: {
      id: string;
      name: string;
    } | null;
  };
  warehouse?: {
    id: string;
    name: string;
  } | null;
}

interface ProductWithCategory extends Product {
  category?: Category | null;
}

interface TransferFormProps {
  warehouses: Warehouse[];
  stores: Store[];
  sourceInventory: InventoryItemWithProduct[];
  initialSourceId?: string;
  initialDestinationId?: string;
  initialProductId?: string;
  initialTransferType?: string;
  selectedProduct?: ProductWithCategory | null;
}

interface TransferItem {
  inventoryItemId: string;
  productId: string;
  productName: string;
  quantity: number;
  availableQuantity: number;
  unit: string;
  costPrice: number;
  retailPrice: number;
  condition: string;
}

export function TransferForm({
  warehouses,
  stores,
  sourceInventory,
  initialSourceId,
  initialDestinationId,
  initialProductId,
  initialTransferType,
  selectedProduct,
}: TransferFormProps) {
  const router = useRouter();

  // State for the form
  const [transferType, setTransferType] = useState(initialTransferType || "WAREHOUSE_TO_WAREHOUSE");
  const [sourceWarehouseId, setSourceWarehouseId] = useState(initialSourceId || "");
  const [destinationWarehouseId, setDestinationWarehouseId] = useState(
    transferType === "WAREHOUSE_TO_WAREHOUSE" ? initialDestinationId || "" : ""
  );
  const [destinationStoreId, setDestinationStoreId] = useState(
    transferType === "WAREHOUSE_TO_STORE" ? initialDestinationId || "" : ""
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState<TransferItem[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adjustPrices, setAdjustPrices] = useState(false);

  // Filter products based on search term
  const filteredProducts = searchTerm
    ? sourceInventory.filter(
        (item) =>
          item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.product.barcode && item.product.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : sourceInventory;

  // Add selected product to items if provided
  useEffect(() => {
    if (selectedProduct && initialProductId) {
      const inventoryItem = sourceInventory.find(item => item.productId === initialProductId);
      if (inventoryItem) {
        addToItems(inventoryItem);
      }
    }
  }, [selectedProduct, initialProductId, sourceInventory]);

  // Handle transfer type change
  const handleTransferTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value;
    setTransferType(newType);

    // Reset destination based on type
    if (newType === "WAREHOUSE_TO_WAREHOUSE") {
      setDestinationStoreId("");
    } else if (newType === "WAREHOUSE_TO_STORE") {
      setDestinationWarehouseId("");
    }
  };

  // Handle source warehouse change
  const handleSourceWarehouseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSourceId = e.target.value;
    setSourceWarehouseId(newSourceId);
    setItems([]); // Clear items when source changes

    // Redirect to the same page with the new source ID
    router.push(`/transfers/new?source=${newSourceId}&type=${transferType}`);
  };

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
          quantity: 1,
          availableQuantity: item.quantity,
          unit: item.product.unit,
          costPrice: 0, // Will be fetched from API
          retailPrice: 0, // Will be fetched from API
          condition: "NEW", // Default to NEW
        },
      ]);

      // Fetch product prices
      fetchProductPrices(item.productId, item.id);
    }
  };

  // Fetch product prices from API
  const fetchProductPrices = async (productId: string, inventoryItemId: string) => {
    try {
      const response = await fetch(`/api/products/${productId}/prices`);
      if (response.ok) {
        const data = await response.json();

        // Update the item with fetched prices
        setItems(prevItems =>
          prevItems.map(item =>
            item.inventoryItemId === inventoryItemId
              ? { ...item, costPrice: data.costPrice, retailPrice: data.retailPrice }
              : item
          )
        );
      }
    } catch (error) {
      console.error("Error fetching product prices:", error);
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
  const updatePrice = (index: number, field: 'costPrice' | 'retailPrice', value: number) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...items[index],
      [field]: value,
    };
    setItems(updatedItems);
  };

  // Remove item from transfer items
  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      alert("Please add at least one item to the transfer");
      return;
    }

    if (transferType === "WAREHOUSE_TO_WAREHOUSE" && !destinationWarehouseId) {
      alert("Please select a destination warehouse");
      return;
    }

    if (transferType === "WAREHOUSE_TO_STORE" && !destinationStoreId) {
      alert("Please select a destination store");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transferType,
          sourceWarehouseId,
          destinationWarehouseId: transferType === "WAREHOUSE_TO_WAREHOUSE" ? destinationWarehouseId : null,
          destinationStoreId: transferType === "WAREHOUSE_TO_STORE" ? destinationStoreId : null,
          items: items.map((item) => ({
            inventoryItemId: item.inventoryItemId,
            productId: item.productId,
            quantity: item.quantity,
            costPrice: adjustPrices ? item.costPrice : undefined,
            retailPrice: adjustPrices ? item.retailPrice : undefined,
            condition: item.condition,
          })),
          notes,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/transfers/${data.id}`);
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || "Failed to create transfer"}`);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error creating transfer:", error);
      alert("An error occurred while creating the transfer");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left Column - Product Selection */}
      <div className="lg:col-span-2 space-y-6">
        <div className="rounded-lg bg-white p-4 shadow-md">
          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="transferType" className="block text-sm font-medium text-gray-800">
                Transfer Type
              </label>
              <select
                id="transferType"
                value={transferType}
                onChange={handleTransferTypeChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="WAREHOUSE_TO_WAREHOUSE">Warehouse to Warehouse</option>
                <option value="WAREHOUSE_TO_STORE">Warehouse to Store</option>
              </select>
            </div>
            <div>
              <label htmlFor="sourceWarehouse" className="block text-sm font-medium text-gray-800">
                Source Warehouse
              </label>
              <select
                id="sourceWarehouse"
                value={sourceWarehouseId}
                onChange={handleSourceWarehouseChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select Source Warehouse</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </div>
            {transferType === "WAREHOUSE_TO_WAREHOUSE" && (
              <div>
                <label htmlFor="destinationWarehouse" className="block text-sm font-medium text-gray-800">
                  Destination Warehouse
                </label>
                <select
                  id="destinationWarehouse"
                  value={destinationWarehouseId}
                  onChange={(e) => setDestinationWarehouseId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select Destination Warehouse</option>
                  {warehouses
                    .filter((warehouse) => warehouse.id !== sourceWarehouseId)
                    .map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
            {transferType === "WAREHOUSE_TO_STORE" && (
              <div>
                <label htmlFor="destinationStore" className="block text-sm font-medium text-gray-800">
                  Destination Store
                </label>
                <select
                  id="destinationStore"
                  value={destinationStoreId}
                  onChange={(e) => setDestinationStoreId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select Destination Store</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-800">
                Search Products
              </label>
              <input
                id="search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, SKU, or barcode"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {sourceWarehouseId ? (
            <div className="h-96 overflow-y-auto rounded border border-gray-200">
              <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 md:grid-cols-4">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => addToItems(item)}
                      className="flex flex-col items-center rounded-lg border border-gray-200 bg-white p-3 text-center shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                    >
                      <div className="mb-2 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-lg font-semibold text-blue-600">
                          {item.product.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-gray-800 line-clamp-2">
                        {item.product.name}
                      </h3>
                      <p className="text-xs text-gray-800">{item.product.sku}</p>
                      <p className="text-xs text-gray-800">
                        Stock: {item.quantity} {item.product.unit}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="col-span-full py-8 text-center text-gray-800">
                    No products found in this warehouse
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded border border-gray-200 p-8 text-center text-gray-800">
              Please select a source warehouse to view available products
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Transfer Items */}
      <div className="space-y-6">
        <div className="rounded-lg bg-white p-4 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Transfer Items</h2>

          {items.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="adjustPrices"
                  checked={adjustPrices}
                  onChange={(e) => setAdjustPrices(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="adjustPrices" className="ml-2 text-sm text-gray-800">
                  Adjust prices for destination
                </label>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {items.map((item, index) => (
                  <div key={index} className="mb-3 rounded border border-gray-200 p-3">
                    <div className="flex justify-between">
                      <h3 className="font-medium text-gray-800">{item.productName}</h3>
                      <button
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center">
                        <button
                          onClick={() => updateQuantity(index, item.quantity - 1)}
                          className="rounded-l-md border border-gray-300 bg-gray-50 px-2 py-1 text-gray-800 hover:bg-gray-100"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={item.availableQuantity}
                          value={item.quantity}
                          onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                          className="w-12 border-y border-gray-300 px-2 py-1 text-center text-sm"
                        />
                        <button
                          onClick={() => updateQuantity(index, item.quantity + 1)}
                          className="rounded-r-md border border-gray-300 bg-gray-50 px-2 py-1 text-gray-800 hover:bg-gray-100"
                        >
                          +
                        </button>
                        <span className="ml-2 text-sm text-gray-800">
                          {item.unit} (Max: {item.availableQuantity})
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <label htmlFor={`condition-${index}`} className="block text-xs font-medium text-gray-800">
                          Condition
                        </label>
                        <select
                          id={`condition-${index}`}
                          value={item.condition}
                          onChange={(e) => {
                            const updatedItems = [...items];
                            updatedItems[index] = {
                              ...items[index],
                              condition: e.target.value,
                            };
                            setItems(updatedItems);
                          }}
                          className="block w-full rounded-md border border-gray-300 px-3 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="NEW">New</option>
                          <option value="DAMAGED">Damaged</option>
                        </select>
                      </div>
                    </div>

                    {adjustPrices && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div>
                          <label htmlFor={`costPrice-${index}`} className="block text-xs font-medium text-gray-800">
                            Cost Price
                          </label>
                          <div className="relative mt-1 rounded-md shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                              <span className="text-gray-800 sm:text-sm">$</span>
                            </div>
                            <input
                              type="number"
                              id={`costPrice-${index}`}
                              min="0"
                              step="0.01"
                              value={item.costPrice}
                              onChange={(e) => updatePrice(index, 'costPrice', parseFloat(e.target.value) || 0)}
                              className="block w-full rounded-md border border-gray-300 pl-7 pr-3 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label htmlFor={`retailPrice-${index}`} className="block text-xs font-medium text-gray-800">
                            Retail Price
                          </label>
                          <div className="relative mt-1 rounded-md shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                              <span className="text-gray-800 sm:text-sm">$</span>
                            </div>
                            <input
                              type="number"
                              id={`retailPrice-${index}`}
                              min="0"
                              step="0.01"
                              value={item.retailPrice}
                              onChange={(e) => updatePrice(index, 'retailPrice', parseFloat(e.target.value) || 0)}
                              className="block w-full rounded-md border border-gray-300 pl-7 pr-3 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
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
                  placeholder="Add any notes about this transfer"
                ></textarea>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  items.length === 0 ||
                  (transferType === "WAREHOUSE_TO_WAREHOUSE" && !destinationWarehouseId) ||
                  (transferType === "WAREHOUSE_TO_STORE" && !destinationStoreId)
                }
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
              >
                {isSubmitting ? "Processing..." : "Create Transfer"}
              </Button>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-800">
              <p>No items added</p>
              <p className="mt-2 text-sm">
                Select products from the left to add them to your transfer
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
