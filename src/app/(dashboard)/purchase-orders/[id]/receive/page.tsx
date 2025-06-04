"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PurchaseOrderStatusBadge } from "../../_components/purchase-order-status-badge";

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  status: string;
  supplier: {
    id: string;
    name: string;
  };
  warehouse: {
    id: string;
    name: string;
  };
  items: PurchaseOrderItem[];
}

interface PurchaseOrderItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    sku: string;
  };
  description?: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitPrice: number;
}

export default function ReceiveItemsPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const purchaseOrderId = params.id;
  
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receivedItems, setReceivedItems] = useState<{ id: string; quantity: number }[]>([]);
  const [notes, setNotes] = useState("");
  
  // Fetch purchase order data
  useEffect(() => {
    const fetchPurchaseOrder = async () => {
      try {
        const response = await fetch(`/api/purchase-orders/${purchaseOrderId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch purchase order');
        }
        
        const data = await response.json();
        setPurchaseOrder(data.purchaseOrder);
        
        // Initialize received items with zero quantities
        const initialItems = data.purchaseOrder.items.map((item: PurchaseOrderItem) => ({
          id: item.id,
          quantity: 0,
        }));
        setReceivedItems(initialItems);
      } catch (error) {
        console.error('Error fetching purchase order:', error);
        alert('Failed to fetch purchase order. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPurchaseOrder();
  }, [purchaseOrderId]);
  
  // Handle quantity change
  const handleQuantityChange = (itemId: string, quantity: number) => {
    setReceivedItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that at least one item is being received
    const totalReceiving = receivedItems.reduce((sum, item) => sum + item.quantity, 0);
    if (totalReceiving <= 0) {
      alert('Please enter a quantity for at least one item');
      return;
    }
    
    // Validate that quantities are valid
    const invalidItems = receivedItems.filter(item => {
      if (item.quantity <= 0) return false;
      
      const orderItem = purchaseOrder?.items.find(i => i.id === item.id);
      if (!orderItem) return true;
      
      const remainingQuantity = orderItem.orderedQuantity - orderItem.receivedQuantity;
      return item.quantity > remainingQuantity;
    });
    
    if (invalidItems.length > 0) {
      alert('Some items have invalid quantities. Please check that you are not receiving more than the remaining quantity.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Filter out items with zero quantity
      const itemsToReceive = receivedItems.filter(item => item.quantity > 0);
      
      const response = await fetch(`/api/purchase-orders/${purchaseOrderId}/receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: itemsToReceive,
          notes,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to receive items');
      }
      
      // Redirect to purchase order details page
      router.push(`/purchase-orders/${purchaseOrderId}`);
      router.refresh();
    } catch (error) {
      console.error('Error receiving items:', error);
      alert('Failed to receive items. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-white p-6 shadow-md">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 mx-auto"></div>
          <p className="text-gray-500">Loading purchase order data...</p>
        </div>
      </div>
    );
  }
  
  if (!purchaseOrder) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-white p-6 shadow-md">
        <div className="text-center">
          <p className="text-red-500">Purchase order not found</p>
          <Link
            href="/purchase-orders"
            className="mt-4 inline-block rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
          >
            Back to Purchase Orders
          </Link>
        </div>
      </div>
    );
  }
  
  // Check if purchase order can be received
  if (purchaseOrder.status !== "ORDERED" && purchaseOrder.status !== "PARTIAL") {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-white p-6 shadow-md">
        <div className="text-center">
          <p className="text-red-500">This purchase order cannot be received</p>
          <p className="mt-2 text-gray-500">
            Only purchase orders with status "Ordered" or "Partially Received" can receive items.
          </p>
          <Link
            href={`/purchase-orders/${purchaseOrderId}`}
            className="mt-4 inline-block rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
          >
            Back to Purchase Order
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Receive Items</h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-gray-500">Purchase Order: {purchaseOrder.orderNumber}</p>
            <PurchaseOrderStatusBadge status={purchaseOrder.status} />
          </div>
        </div>
        <Link
          href={`/purchase-orders/${purchaseOrderId}`}
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Cancel
        </Link>
      </div>
      
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Order Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Supplier</p>
            <p className="font-medium">{purchaseOrder.supplier.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Warehouse</p>
            <p className="font-medium">{purchaseOrder.warehouse.name}</p>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Receive Items</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2">SKU</th>
                  <th className="px-4 py-2">Ordered</th>
                  <th className="px-4 py-2">Previously Received</th>
                  <th className="px-4 py-2">Remaining</th>
                  <th className="px-4 py-2">Receiving Now</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {purchaseOrder.items.map((item) => {
                  const remainingQuantity = item.orderedQuantity - item.receivedQuantity;
                  const isFullyReceived = remainingQuantity <= 0;
                  
                  return (
                    <tr key={item.id} className={`hover:bg-gray-50 ${isFullyReceived ? 'bg-gray-50' : ''}`}>
                      <td className="whitespace-nowrap px-4 py-2 text-sm font-medium">
                        {item.product.name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                        {item.product.sku}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                        {item.orderedQuantity}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                        {item.receivedQuantity}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                        {remainingQuantity}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm">
                        <input
                          type="number"
                          value={receivedItems.find(i => i.id === item.id)?.quantity || 0}
                          onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                          min="0"
                          max={remainingQuantity}
                          disabled={isFullyReceived}
                          className={`w-20 rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            isFullyReceived ? 'bg-gray-100 cursor-not-allowed' : ''
                          }`}
                        />
                        {isFullyReceived && (
                          <span className="ml-2 text-xs text-green-600">Fully received</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add any notes about this receipt (optional)"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex justify-end gap-2">
          <Link
            href={`/purchase-orders/${purchaseOrderId}`}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={isSubmitting || receivedItems.every(item => item.quantity === 0)}
          >
            Receive Items
          </Button>
        </div>
      </form>
    </div>
  );
}
