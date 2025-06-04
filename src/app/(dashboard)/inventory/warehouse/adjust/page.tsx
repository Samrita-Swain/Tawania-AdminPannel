"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdjustInventoryPage() {
  const router = useRouter();

  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [warehouseId, setWarehouseId] = useState("");
  const [productId, setProductId] = useState("");
  const [adjustmentType, setAdjustmentType] = useState("add");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("stock_count");
  const [notes, setNotes] = useState("");

  // State for error message
  const [error, setError] = useState<string | null>(null);

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
          products: data.products?.length || 0,
          inventoryItems: data.inventoryItems?.length || 0
        });

        setWarehouses(data.warehouses || []);
        setProducts(data.products || []);
        setInventoryItems(data.inventoryItems || []);

        // Log sample data for debugging
        if (data.products?.length > 0) {
          console.log("Sample product:", data.products[0]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get all products for the selected warehouse
  const filteredProducts = warehouseId ? products : [];

  // Separate products into those with and without inventory
  const productsWithInventory = warehouseId
    ? products.filter(product => {
        return inventoryItems.some(item =>
          item.warehouseId === warehouseId &&
          item.productId === product.id
        );
      })
    : [];

  const productsWithoutInventory = warehouseId
    ? products.filter(product => {
        return !inventoryItems.some(item =>
          item.warehouseId === warehouseId &&
          item.productId === product.id
        );
      })
    : [];

  // Debug filtered products
  useEffect(() => {
    if (warehouseId) {
      console.log(`Products for warehouse ${warehouseId}:`, {
        totalProducts: products.length,
        filteredProducts: filteredProducts.length,
        productsWithInventory: productsWithInventory.length,
        productsWithoutInventory: productsWithoutInventory.length,
        warehouseInventoryItems: inventoryItems.filter(item => item.warehouseId === warehouseId).length
      });

      // Check if we have inventory items for this warehouse
      const warehouseItems = inventoryItems.filter(item => item.warehouseId === warehouseId);
      if (warehouseItems.length > 0) {
        console.log("Sample warehouse inventory item:", warehouseItems[0]);
      }

      // Log sample products
      if (productsWithInventory.length > 0) {
        console.log("Sample product with inventory:", productsWithInventory[0]);
      }
      if (productsWithoutInventory.length > 0) {
        console.log("Sample product without inventory:", productsWithoutInventory[0]);
      }
    }
  }, [warehouseId, products, inventoryItems, filteredProducts, productsWithInventory, productsWithoutInventory]);

  // Get current inventory item
  const currentInventoryItem = warehouseId && productId
    ? inventoryItems.find(item =>
        item.warehouseId === warehouseId &&
        item.productId === productId
      )
    : null;

  // State for submission error
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // State for destination store selection
  const [showTransferOptions, setShowTransferOptions] = useState(false);
  const [destinationStoreId, setDestinationStoreId] = useState("");
  const [stores, setStores] = useState<any[]>([]);

  // Fetch stores for transfer
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const response = await fetch('/api/stores');
        if (response.ok) {
          const data = await response.json();
          setStores(data.stores || []);
        }
      } catch (error) {
        console.error('Error fetching stores:', error);
      }
    };

    fetchStores();
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!warehouseId || !productId || quantity <= 0) {
      setSubmissionError('Please fill in all required fields');
      return;
    }

    // If creating a transfer, validate destination store
    if (showTransferOptions && !destinationStoreId) {
      setSubmissionError('Please select a destination store for the transfer');
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      console.log("Submitting adjustment:", {
        warehouseId,
        productId,
        adjustmentType,
        quantity,
        reason,
        hasExistingInventory: !!currentInventoryItem,
        createTransfer: showTransferOptions,
        destinationStoreId: showTransferOptions ? destinationStoreId : null
      });

      // First, adjust inventory
      const adjustmentData = {
        warehouseId,
        productId,
        adjustmentType,
        quantity,
        reason,
        notes,
      };

      try {
        const response = await fetch('/api/inventory/adjust', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(adjustmentData),
        });

        let responseData;
        try {
          responseData = await response.json();
        } catch (parseError) {
          console.error("Error parsing response:", parseError);
          throw new Error("Failed to parse API response");
        }

        if (!response.ok) {
          console.error("API error response:", responseData);
          throw new Error(responseData.error || 'Failed to adjust inventory');
        }

        // Log the successful response
        console.log("API success response:", responseData);

        // If creating a transfer, do that next
        if (showTransferOptions && destinationStoreId) {
          try {
            // Get the product details
            const product = products.find(p => p.id === productId);

            // Create transfer with minimal fields to ensure it works
            console.log("Creating transfer with the following data:");
            const transferData = {
              // Only include essential fields
              status: "DRAFT",
              notes: notes || `Transfer created from inventory adjustment: ${reason}`,

              // Include these fields if they exist in your schema
              sourceWarehouseId: warehouseId,
              destinationStoreId: destinationStoreId,
              type: "WAREHOUSE_TO_STORE",
              requestedDate: new Date().toISOString(),

              // Include items if your schema supports it
              items: [
                {
                  productId: productId,
                  requestedQuantity: quantity,
                  condition: "GOOD"
                }
              ]
            };
            console.log("Transfer data:", JSON.stringify(transferData, null, 2));

            try {
              console.log("Sending transfer creation request to API...");
              // Try multiple endpoints
              let transferResponse;
              const endpoints = ['/api/transfers-simple', '/api/transfers'];

              for (const endpoint of endpoints) {
                try {
                  console.log(`Trying to create transfer with endpoint: ${endpoint}`);
                  transferResponse = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(transferData),
                  });

                  if (transferResponse.ok) {
                    console.log(`Successfully created transfer with endpoint: ${endpoint}`);
                    break;
                  } else {
                    console.error(`Failed to create transfer with endpoint: ${endpoint}, status: ${transferResponse.status}`);
                  }
                } catch (error) {
                  console.error(`Error creating transfer with endpoint: ${endpoint}`, error);
                }
              }

              if (!transferResponse || !transferResponse.ok) {
                throw new Error('Failed to create transfer with any endpoint');
              }

              console.log("Transfer API response status:", transferResponse.status);

              // Get the raw response text first
              const responseText = await transferResponse.text();
              console.log("Raw transfer API response:", responseText);

              // Try to parse as JSON
              let transferResult;
              try {
                transferResult = JSON.parse(responseText);
                console.log("Parsed transfer result:", transferResult);
              } catch (parseError) {
                console.error("Error parsing transfer response:", parseError);
                throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
              }

              if (!transferResponse.ok) {
                console.error("Transfer creation failed:", transferResult);
                throw new Error(transferResult.error || 'Failed to create transfer');
              }

              // Check if the transfer result has the expected data
              if (!transferResult || !transferResult.id) {
                console.error("Transfer creation returned invalid data:", transferResult);
                throw new Error('Transfer creation returned invalid data');
              }

              console.log("Transfer created successfully:", transferResult);

              // Show success message
              setSubmissionError(null);

              // Create a success message element
              const successDiv = document.createElement('div');
              successDiv.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50';
              successDiv.innerHTML = `
                <strong class="font-bold">Success!</strong>
                <span class="block sm:inline"> Inventory adjusted and transfer created.</span>
                <a href="/transfers" class="underline font-bold block mt-2">View Transfers</a>
              `;
              document.body.appendChild(successDiv);

              // Remove the success message after 10 seconds
              setTimeout(() => {
                if (document.body.contains(successDiv)) {
                  document.body.removeChild(successDiv);
                }
              }, 10000);

              // Wait a moment before redirecting
              setTimeout(() => {
                router.push('/transfers');
                router.refresh();
              }, 2000);

              return;
            } catch (transferApiError) {
              console.error("Transfer API error details:", transferApiError);

              // Show error but don't throw - this allows the user to stay on the page
              setSubmissionError(`Transfer creation encountered an issue. The inventory was adjusted successfully, but we couldn't create the transfer. You can try creating a transfer manually.`);

              // Wait a moment before redirecting to inventory
              setTimeout(() => {
                router.push('/inventory/warehouse');
                router.refresh();
              }, 5000);

              return;
            }
            return;
          } catch (transferError) {
            console.error("Error creating transfer:", transferError);

            // Always handle gracefully - don't throw errors
            // Show a more user-friendly error
            setSubmissionError(`Inventory was adjusted successfully, but we couldn't create the transfer. You can try creating a transfer manually.`);

            // Create an error message element
            const errorDiv = document.createElement('div');
            errorDiv.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50';
            errorDiv.innerHTML = `
              <strong class="font-bold">Note:</strong>
              <span class="block sm:inline"> Inventory adjusted successfully, but transfer creation failed.</span>
              <a href="/inventory/warehouse" class="underline font-bold block mt-2">View Inventory</a>
            `;
            document.body.appendChild(errorDiv);

            // Remove the error message after 10 seconds
            setTimeout(() => {
              if (document.body.contains(errorDiv)) {
                document.body.removeChild(errorDiv);
              }
            }, 10000);

            // Wait a moment to show the error before redirecting
            setTimeout(() => {
              router.push('/inventory/warehouse');
              router.refresh();
            }, 5000);
            return;
          }
        } else {
          // Redirect to inventory page after success
          router.push('/inventory/warehouse');
          router.refresh();
          return;
        }
      } catch (fetchError) {
        console.error("Fetch error:", fetchError);
        throw fetchError;
      }
    } catch (error) {
      console.error('Error adjusting inventory:', error);
      setSubmissionError(error instanceof Error ? error.message : 'Failed to adjust inventory. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
                  setProductId("");
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
              <label htmlFor="product" className="mb-1 block text-sm font-medium text-gray-800">
                Product *
              </label>
              <div>
                <select
                  id="product"
                  value={productId}
                  onChange={(e) => {
                    const newProductId = e.target.value;
                    setProductId(newProductId);

                    // Check if the selected product has inventory
                    const hasInventory = inventoryItems.some(
                      item => item.warehouseId === warehouseId && item.productId === newProductId
                    );

                    // If no inventory and adjustment type is "remove", change it to "add"
                    if (!hasInventory && adjustmentType === "remove") {
                      setAdjustmentType("add");
                    }
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                  disabled={!warehouseId}
                >
                  <option value="">Select Product</option>

                  {/* Products with existing inventory */}
                  {productsWithInventory.length > 0 && (
                    <optgroup label="Products with Existing Inventory">
                      {productsWithInventory.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.sku})
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {/* Products without inventory */}
                  {productsWithoutInventory.length > 0 && (
                    <optgroup label="Products without Inventory">
                      {productsWithoutInventory.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.sku}) - New
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>

                {warehouseId && products.length === 0 && (
                  <p className="mt-2 text-sm text-amber-600">
                    No products found in the system.
                    <Link href="/products/new" className="ml-1 text-blue-600 hover:underline">
                      Add products
                    </Link>
                  </p>
                )}
              </div>
            </div>

            {productId && (
              <div className="md:col-span-2">
                {currentInventoryItem ? (
                  <div className="rounded-lg bg-blue-50 p-4">
                    <h3 className="mb-2 font-medium text-blue-800">Current Inventory</h3>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <p className="text-sm text-gray-800">Current Quantity</p>
                        <p className="text-lg font-bold">{currentInventoryItem.quantity}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-800">Min Stock Level</p>
                        <p className="text-lg font-medium">{products.find(p => p.id === productId)?.minStockLevel || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-800">Reorder Point</p>
                        <p className="text-lg font-medium">{products.find(p => p.id === productId)?.reorderPoint || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-amber-50 p-4">
                    <h3 className="mb-2 font-medium text-amber-800">New Inventory Item</h3>
                    <p className="text-amber-800">
                      This product doesn't have inventory in this warehouse yet. Adding stock will create a new inventory record.
                    </p>
                    <div className="mt-2 grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-gray-800">Min Stock Level</p>
                        <p className="text-lg font-medium">{products.find(p => p.id === productId)?.minStockLevel || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-800">Reorder Point</p>
                        <p className="text-lg font-medium">{products.find(p => p.id === productId)?.reorderPoint || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

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
                <option value="add">Add Stock</option>
                <option value="remove" disabled={!currentInventoryItem}>
                  Remove Stock {!currentInventoryItem && '(No existing inventory)'}
                </option>
                <option value="set">Set Exact Quantity</option>
              </select>

              {adjustmentType === 'remove' && !currentInventoryItem && (
                <p className="mt-1 text-xs text-red-600">
                  Cannot remove stock from a product that doesn't have inventory yet.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="quantity" className="mb-1 block text-sm font-medium text-gray-800">
                Quantity *
              </label>
              <input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min={1}
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
                <option value="damaged">Damaged/Expired</option>
                <option value="returned">Customer Return</option>
                <option value="supplier_delivery">Supplier Delivery</option>
                <option value="internal_use">Internal Use</option>
                <option value="correction">Data Correction</option>
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
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Transfer Options */}
            {adjustmentType === 'add' && (
              <div className="md:col-span-2 mt-4 border-t pt-4">
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="createTransfer"
                    checked={showTransferOptions}
                    onChange={(e) => setShowTransferOptions(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="createTransfer" className="ml-2 block text-sm font-medium text-gray-800">
                    Create a transfer to a store
                  </label>
                </div>

                {showTransferOptions && (
                  <div className="rounded-lg bg-blue-50 p-4">
                    <h3 className="mb-2 font-medium text-blue-800">Transfer Details</h3>
                    <p className="text-sm text-gray-700 mb-4">
                      This will create a transfer from this warehouse to the selected store with the adjusted inventory.
                    </p>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label htmlFor="destinationStore" className="mb-1 block text-sm font-medium text-gray-800">
                          Destination Store *
                        </label>
                        <select
                          id="destinationStore"
                          value={destinationStoreId}
                          onChange={(e) => setDestinationStoreId(e.target.value)}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required={showTransferOptions}
                        >
                          <option value="">Select Store</option>
                          {stores.map((store) => (
                            <option key={store.id} value={store.id}>
                              {store.name} ({store.code})
                            </option>
                          ))}
                        </select>

                        {stores.length === 0 && (
                          <p className="mt-2 text-sm text-amber-600">
                            No stores found. Please add a store first.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {submissionError && (
            <div className="mt-4 rounded-md bg-red-50 p-4 text-red-800">
              <p className="font-medium">Error</p>
              <p className="mt-1">{submissionError}</p>
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
              disabled={!warehouseId || !productId || quantity <= 0 || isSubmitting || (showTransferOptions && !destinationStoreId)}
            >
              {isSubmitting
                ? 'Processing...'
                : showTransferOptions
                  ? 'Add Stock & Create Transfer'
                  : adjustmentType === 'add'
                    ? 'Add Stock'
                    : adjustmentType === 'remove'
                      ? 'Remove Stock'
                      : 'Set Quantity'
              }
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
