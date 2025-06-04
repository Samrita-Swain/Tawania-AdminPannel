"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface QCItem {
  id?: string;
  productId: string;
  product: Product;
  quantity: number;
  passedQuantity: number;
  failedQuantity: number;
  pendingQuantity: number;
  status: string;
  reason?: string;
  action?: string;
  notes?: string;
}

interface Warehouse {
  id: string;
  name: string;
}

interface QualityControlFormProps {
  warehouses: Warehouse[];
  products: Product[];
  type: string;
  purchaseOrderId?: string;
  returnId?: string;
  initialItems?: QCItem[];
}

export function QualityControlForm({
  warehouses,
  products,
  type,
  purchaseOrderId,
  returnId,
  initialItems = [],
}: QualityControlFormProps) {
  const router = useRouter();

  // Form state
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [items, setItems] = useState<QCItem[]>(initialItems);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Add item to the QC
  const addItem = () => {
    if (!selectedProduct || quantity <= 0) return;

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    const existingItemIndex = items.findIndex(item => item.productId === selectedProduct);

    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...items];
      updatedItems[existingItemIndex].quantity += quantity;
      updatedItems[existingItemIndex].pendingQuantity += quantity;
      setItems(updatedItems);
    } else {
      // Add new item
      setItems([
        ...items,
        {
          productId: selectedProduct,
          product,
          quantity,
          passedQuantity: 0,
          failedQuantity: 0,
          pendingQuantity: quantity,
          status: "PENDING",
        },
      ]);
    }

    // Reset selection
    setSelectedProduct("");
    setQuantity(1);
  };

  // Remove item from QC
  const removeItem = (index: number) => {
    const updatedItems = [...items];
    updatedItems.splice(index, 1);
    setItems(updatedItems);
  };

  // Update item inspection results
  const updateItemResults = (index: number, passed: number, failed: number) => {
    const item = items[index];
    const total = item.quantity;

    // Ensure passed + failed <= total
    if (passed + failed > total) {
      if (passed > total) passed = total;
      failed = total - passed;
    }

    const pending = total - (passed + failed);
    const status = pending === 0
      ? (failed === 0 ? "PASSED" : (passed === 0 ? "FAILED" : "PARTIALLY_PASSED"))
      : "PENDING";

    const updatedItems = [...items];
    updatedItems[index] = {
      ...item,
      passedQuantity: passed,
      failedQuantity: failed,
      pendingQuantity: pending,
      status,
    };

    setItems(updatedItems);
  };

  // Update item action
  const updateItemAction = (index: number, action: string) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...items[index],
      action,
    };
    setItems(updatedItems);
  };

  // Update item reason
  const updateItemReason = (index: number, reason: string) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...items[index],
      reason,
    };
    setItems(updatedItems);
  };

  // Update item notes
  const updateItemNotes = (index: number, notes: string) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...items[index],
      notes,
    };
    setItems(updatedItems);
  };

  // Submit the quality control
  const handleSubmit = async () => {
    if (!warehouseId || items.length === 0) return;

    setIsSubmitting(true);

    try {
      // Create the quality control data
      const qualityControlData = {
        type,
        warehouseId,
        purchaseOrderId: purchaseOrderId || undefined,
        returnId: returnId || undefined,
        notes,
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          passedQuantity: item.passedQuantity,
          failedQuantity: item.failedQuantity,
          pendingQuantity: item.pendingQuantity || (item.quantity - (item.passedQuantity + item.failedQuantity)),
          status: item.status,
          reason: item.reason,
          action: item.action,
          notes: item.notes,
        })),
      };

      const response = await fetch("/api/quality-control", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(qualityControlData),
      });

      if (response.ok) {
        const data = await response.json();

        // Redirect to the quality control detail page
        if (data && data.id) {
          router.push(`/quality-control/${data.id}`);
        } else {
          // If we got a response with no ID, just go back to the quality control list
          router.push('/quality-control');
        }
        return;
      }

      // If the API call failed, show error
      const error = await response.json();
      throw new Error(error.error || "Failed to create quality control");
    } catch (error) {
      console.error("Error creating quality control:", error);
      alert("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="warehouse" className="block text-sm font-medium text-gray-800">
            Warehouse
          </label>
          <select
            id="warehouse"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          >
            <option value="">Select Warehouse</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-800">
            Quality Control Type
          </label>
          <input
            id="type"
            value={type}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-100 cursor-not-allowed"
            disabled
          />
        </div>
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
        ></textarea>
      </div>

      <div className="rounded-md border border-gray-200 p-4">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Items</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label htmlFor="product" className="block text-sm font-medium text-gray-800">
              Product
            </label>
            <select
              id="product"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select Product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-800">
              Quantity
            </label>
            <input
              type="number"
              id="quantity"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end">
            <Button
              onClick={addItem}
              disabled={!selectedProduct || quantity <= 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2"
            >
              Add Item
            </Button>
          </div>
        </div>

        {items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                    Product
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                    Passed
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                    Failed
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                    Action
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.product.name}
                      <div className="text-xs text-gray-800">{item.product.sku}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      <input
                        type="number"
                        min="0"
                        max={item.quantity}
                        value={item.passedQuantity}
                        onChange={(e) => updateItemResults(index, parseInt(e.target.value) || 0, item.failedQuantity)}
                        className="w-16 rounded-md border border-gray-300 px-2 py-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      <input
                        type="number"
                        min="0"
                        max={item.quantity}
                        value={item.failedQuantity}
                        onChange={(e) => updateItemResults(index, item.passedQuantity, parseInt(e.target.value) || 0)}
                        className="w-16 rounded-md border border-gray-300 px-2 py-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          item.status === "PASSED"
                            ? "bg-green-100 text-green-800"
                            : item.status === "FAILED"
                            ? "bg-red-100 text-red-800"
                            : item.status === "PARTIALLY_PASSED"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      <select
                        value={item.action || ""}
                        onChange={(e) => updateItemAction(index, e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select Action</option>
                        <option value="ACCEPT">Accept</option>
                        <option value="REJECT">Reject</option>
                        <option value="REWORK">Rework</option>
                        <option value="RETURN_TO_SUPPLIER">Return to Supplier</option>
                        <option value="DISPOSE">Dispose</option>
                      </select>
                      {item.failedQuantity > 0 && !item.action && (
                        <p className="text-xs text-red-500 mt-1">Action required for failed items</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      <Button
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-800">
            <p>No items added</p>
            <p className="mt-2 text-sm">
              Select products from above to add them to the quality control
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !warehouseId || items.length === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4"
        >
          {isSubmitting ? "Processing..." : "Create Quality Control"}
        </Button>
      </div>
    </div>
  );
}
