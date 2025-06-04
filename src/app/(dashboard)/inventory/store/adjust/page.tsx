"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Force recompilation - Store ID fix applied

interface Store {
  id: string;
  name: string;
  code: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  minStockLevel: number;
  reorderPoint: number;
  categoryId: string | null;
}

interface InventoryItem {
  id: string;
  productId: string;
  storeId: string;
  quantity: number;
  status: string;
}

function AdjustStoreInventoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  let initialStoreId = searchParams?.get('store') || '';

  // Fix known invalid store ID
  if (initialStoreId === 'cmb7lm54v0000ugo4mmvlsc5v') {
    initialStoreId = 'cmb7q8j9k0000ugc4zn650o9p'; // Correct store ID
    console.log('Fixed invalid store ID from URL');
  }

  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [storeId, setStoreId] = useState(initialStoreId);
  const [productId, setProductId] = useState("");
  const [adjustmentType, setAdjustmentType] = useState("add");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("RESTOCK");
  const [notes, setNotes] = useState("");

  // Additional effect to fix store ID when stores are loaded
  useEffect(() => {
    if (stores.length > 0 && storeId) {
      const storeExists = stores.some(store => store.id === storeId);
      if (!storeExists) {
        console.warn(`Store ID ${storeId} not found. Auto-correcting to first available store.`);
        const firstStore = stores[0];
        setStoreId(firstStore.id);
        console.log(`Auto-corrected store ID to: ${firstStore.id} (${firstStore.name})`);
      }
    }
  }, [stores, storeId]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/inventory/data');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }

        const data = await response.json();
        setStores(data.stores || []);
        setProducts(data.products || []);
        setInventoryItems(data.inventoryItems || []);

        // Fix invalid store ID from URL parameters
        if (initialStoreId && data.stores && data.stores.length > 0) {
          const storeExists = data.stores.some((store: Store) => store.id === initialStoreId);
          if (!storeExists) {
            console.warn(`Store ID ${initialStoreId} from URL not found. Available stores:`, data.stores);
            // Automatically set to the first available store
            const firstStore = data.stores[0];
            setStoreId(firstStore.id);
            console.log(`Auto-corrected store ID to: ${firstStore.id} (${firstStore.name})`);
          }
        }

        console.log('Inventory data fetched:', {
          stores: data.stores?.length || 0,
          products: data.products?.length || 0,
          inventoryItems: data.inventoryItems?.length || 0,
          initialStoreId,
          storeExists: data.stores?.some((store: Store) => store.id === initialStoreId)
        });
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter products based on selected store
  const filteredProducts = storeId
    ? products.filter(product => {
        return inventoryItems.some(item =>
          item.storeId === storeId &&
          item.productId === product.id
        );
      })
    : [];

  // If no products found for the store, show all products (for new inventory)
  const availableProducts = filteredProducts.length > 0 ? filteredProducts : (storeId ? products : []);

  // Debug logging
  console.log('Product filtering debug:', {
    storeId,
    totalProducts: products.length,
    totalInventoryItems: inventoryItems.length,
    inventoryItemsForStore: inventoryItems.filter(item => item.storeId === storeId).length,
    filteredProducts: filteredProducts.length,
    availableProducts: availableProducts.length
  });

  // Get current inventory level for selected product
  const currentInventory = storeId && productId
    ? inventoryItems.find(item =>
        item.storeId === storeId &&
        item.productId === productId
      )?.quantity || 0
    : 0;

  // Calculate new inventory level based on adjustment
  const calculateNewInventory = () => {
    if (adjustmentType === "add") {
      return currentInventory + quantity;
    } else if (adjustmentType === "remove") {
      return Math.max(0, currentInventory - quantity);
    } else if (adjustmentType === "set") {
      return quantity;
    }
    return currentInventory;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!storeId || !productId || !adjustmentType || !reason) {
      alert("Please fill in all required fields");
      return;
    }

    // Validate that the selected store exists in the available stores
    const storeExists = stores.some(store => store.id === storeId);
    if (!storeExists) {
      alert(`Invalid store selected. Please select a valid store from the dropdown.`);
      console.error('Invalid store ID:', storeId, 'Available stores:', stores);
      return;
    }

    console.log('Submitting inventory adjustment:', {
      storeId,
      productId,
      adjustmentType,
      quantity,
      reason,
      notes
    });

    setIsSubmitting(true);

    try {
      const adjustmentData = {
        productId,
        adjustmentType,
        quantity,
        reason,
        notes,
      };

      const response = await fetch(`/api/stores/${storeId}/inventory/adjust`, {
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

      // Redirect to inventory page
      router.push(`/inventory/store?store=${storeId}`);
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
          <p className="text-gray-800">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Adjust Store Inventory</h1>
        <Link
          href="/inventory/store"
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 transition-colors"
        >
          Back to Store Inventory
        </Link>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="store" className="mb-1 block text-sm font-medium text-gray-800">
                Store *
              </label>
              <select
                id="store"
                value={storeId}
                onChange={(e) => {
                  setStoreId(e.target.value);
                  setProductId("");
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              >
                <option value="">Select Store</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>
                    {store.name} ({store.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="product" className="mb-1 block text-sm font-medium text-gray-800">
                Product *
              </label>
              <select
                id="product"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
                disabled={!storeId}
              >
                <option value="">Select Product</option>
                {availableProducts.map(product => {
                  const hasInventory = inventoryItems.some(item =>
                    item.storeId === storeId && item.productId === product.id
                  );
                  return (
                    <option key={product.id} value={product.id}>
                      {product.name} (SKU: {product.sku}){!hasInventory ? ' - New' : ''}
                    </option>
                  );
                })}
              </select>
              {storeId && availableProducts.length === 0 && (
                <p className="mt-1 text-sm text-amber-600">
                  No products available. Please add products to the system first.
                </p>
              )}
              {storeId && availableProducts.length > 0 && filteredProducts.length === 0 && (
                <p className="mt-1 text-sm text-blue-600">
                  Showing all products. Products marked "New" don't have existing inventory in this store.
                </p>
              )}
            </div>

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
                <option value="RESTOCK">Restock</option>
                <option value="SALE">Sale</option>
                <option value="RETURN">Return</option>
                <option value="DAMAGED">Damaged</option>
                <option value="EXPIRED">Expired</option>
                <option value="THEFT">Theft</option>
                <option value="CORRECTION">Correction</option>
                <option value="OTHER">Other</option>
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

          {storeId && productId && (
            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="mb-2 font-medium text-gray-800">Inventory Summary</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-gray-800">Current Inventory</p>
                  <p className="text-lg font-semibold">{currentInventory}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-800">Adjustment</p>
                  <p className="text-lg font-semibold">
                    {adjustmentType === "add" && "+"}
                    {adjustmentType === "remove" && "-"}
                    {adjustmentType === "set" && "="}
                    {quantity}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-800">New Inventory</p>
                  <p className="text-lg font-semibold">{calculateNewInventory()}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Link
              href="/inventory/store"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <Button
              type="submit"
              disabled={isSubmitting || !storeId || !productId}
            >
              {isSubmitting ? "Adjusting..." : "Adjust Inventory"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Adjust Store Inventory</h1>
        <Link
          href="/inventory/store"
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 transition-colors"
        >
          Back to Store Inventory
        </Link>
      </div>
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Loading inventory adjustment...</p>
        </div>
      </div>
    </div>
  );
}

export default function AdjustStoreInventoryPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AdjustStoreInventoryContent />
    </Suspense>
  );
}
