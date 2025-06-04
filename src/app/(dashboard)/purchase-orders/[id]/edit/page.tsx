"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PurchaseOrderItemForm } from "../../_components/purchase-order-item-form";
import { notFound } from "next/navigation";

interface Supplier {
  id: string;
  name: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  costPrice: number;
  supplierId?: string;
  category: {
    id: string;
    name: string;
  };
}

interface OrderItem {
  id?: string;
  productId: string;
  product?: Product;
  description?: string;
  orderedQuantity: number;
  receivedQuantity?: number;
  unitPrice: number;
  discount: number;
  tax: number;
  subtotal: number;
  total: number;
  notes?: string;
}

export default function EditPurchaseOrderPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const purchaseOrderId = params.id;
  
  // State for form data
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [purchaseOrder, setPurchaseOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
  
  // Calculated totals
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [total, setTotal] = useState(0);
  
  // Fetch purchase order, suppliers, warehouses, and products
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch purchase order
        const orderResponse = await fetch(`/api/purchase-orders/${purchaseOrderId}`);
        if (!orderResponse.ok) {
          if (orderResponse.status === 404) {
            notFound();
          }
          throw new Error('Failed to fetch purchase order');
        }
        const orderData = await orderResponse.json();
        setPurchaseOrder(orderData.purchaseOrder);
        
        // Set form state from purchase order
        setSupplierId(orderData.purchaseOrder.supplierId);
        setWarehouseId(orderData.purchaseOrder.warehouseId);
        setExpectedDeliveryDate(orderData.purchaseOrder.expectedDeliveryDate ? 
          new Date(orderData.purchaseOrder.expectedDeliveryDate).toISOString().split('T')[0] : "");
        setNotes(orderData.purchaseOrder.notes || "");
        setShipping(orderData.purchaseOrder.shipping || 0);
        setDiscount(orderData.purchaseOrder.discount || 0);
        
        // Format items
        const formattedItems = orderData.purchaseOrder.items.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          product: item.product,
          description: item.description || item.product.name,
          orderedQuantity: item.orderedQuantity,
          receivedQuantity: item.receivedQuantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          tax: item.tax || 0,
          subtotal: item.subtotal,
          total: item.total,
          notes: item.notes,
        }));
        setItems(formattedItems);
        
        // Fetch suppliers
        const suppliersResponse = await fetch('/api/suppliers?status=active');
        if (!suppliersResponse.ok) {
          throw new Error('Failed to fetch suppliers');
        }
        const suppliersData = await suppliersResponse.json();
        setSuppliers(suppliersData.suppliers || []);
        
        // Fetch warehouses
        const warehousesResponse = await fetch('/api/warehouses?status=active');
        if (!warehousesResponse.ok) {
          throw new Error('Failed to fetch warehouses');
        }
        const warehousesData = await warehousesResponse.json();
        setWarehouses(warehousesData.warehouses || []);
        
        // Fetch products
        const productsResponse = await fetch('/api/products?status=active');
        if (!productsResponse.ok) {
          throw new Error('Failed to fetch products');
        }
        const productsData = await productsResponse.json();
        setProducts(productsData.products || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [purchaseOrderId]);
  
  // Filter products by supplier
  useEffect(() => {
    if (supplierId) {
      // Check if products have supplierId before filtering
      const hasSupplierIds = products.some(product => 'supplierId' in product);
      
      if (hasSupplierIds) {
        const filtered = products.filter(product => product.supplierId === supplierId);
        setFilteredProducts(filtered.length > 0 ? filtered : products);
      } else {
        // If products don't have supplierId, don't filter
        setFilteredProducts(products);
      }
    } else {
      setFilteredProducts(products);
    }
  }, [supplierId, products]);
  
  // Calculate totals
  useEffect(() => {
    let itemsSubtotal = 0;
    let itemsTax = 0;
    let itemsDiscount = 0;
    
    items.forEach(item => {
      itemsSubtotal += item.subtotal;
      itemsTax += item.tax;
      itemsDiscount += item.discount;
    });
    
    setSubtotal(itemsSubtotal);
    setTax(itemsTax);
    
    // Only use the discount from items if no manual discount is set
    if (discount === 0) {
      setDiscount(itemsDiscount);
    }
    
    const calculatedTotal = itemsSubtotal + itemsTax + shipping - (discount || itemsDiscount);
    setTotal(calculatedTotal);
  }, [items, shipping, discount]);
  
  // Add a new item to the order
  const handleAddItem = (item: OrderItem) => {
    setItems([...items, item]);
  };
  
  // Update an existing item
  const handleUpdateItem = (updatedItem: OrderItem, index: number) => {
    const newItems = [...items];
    newItems[index] = updatedItem;
    setItems(newItems);
  };
  
  // Remove an item from the order
  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent, saveAsDraft: boolean = true) => {
    e.preventDefault();
    
    if (!supplierId || !warehouseId || items.length === 0) {
      alert('Please fill in all required fields and add at least one item');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const purchaseOrderData = {
        supplierId,
        warehouseId,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        notes,
        items,
        status: saveAsDraft ? "DRAFT" : "ORDERED",
        shipping,
        discount,
      };
      
      const response = await fetch(`/api/purchase-orders/${purchaseOrderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(purchaseOrderData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update purchase order');
      }
      
      const result = await response.json();
      
      // Redirect to purchase order details page
      router.push(`/purchase-orders/${purchaseOrderId}`);
      router.refresh();
    } catch (error) {
      console.error('Error updating purchase order:', error);
      alert('Failed to update purchase order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-white p-6 shadow-md">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 mx-auto"></div>
          <p className="text-gray-500">Loading data...</p>
        </div>
      </div>
    );
  }
  
  if (!purchaseOrder) {
    return notFound();
  }
  
  // Check if purchase order can be edited
  if (purchaseOrder.status !== "DRAFT") {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-white p-6 shadow-md">
        <div className="text-center">
          <p className="text-red-500">This purchase order cannot be edited</p>
          <p className="mt-2 text-gray-500">
            Only purchase orders with status "Draft" can be edited.
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
        <h1 className="text-2xl font-bold text-gray-800">Edit Purchase Order</h1>
        <Link
          href={`/purchase-orders/${purchaseOrderId}`}
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Cancel
        </Link>
      </div>
      
      <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-6">
        {/* Order Details */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Order Details</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="supplier" className="mb-1 block text-sm font-medium text-gray-700">
                Supplier *
              </label>
              <select
                id="supplier"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              >
                <option value="">Select Supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="warehouse" className="mb-1 block text-sm font-medium text-gray-700">
                Warehouse *
              </label>
              <select
                id="warehouse"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
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
              <label htmlFor="expectedDeliveryDate" className="mb-1 block text-sm font-medium text-gray-700">
                Expected Delivery Date
              </label>
              <input
                id="expectedDeliveryDate"
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <div className="md:col-span-2">
              <label htmlFor="notes" className="mb-1 block text-sm font-medium text-gray-700">
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
          </div>
        </div>
        
        {/* Order Items */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Order Items</h2>
            <Button
              type="button"
              onClick={() => {
                if (!supplierId || !warehouseId) {
                  alert('Please select a supplier and warehouse first');
                  return;
                }
                
                const itemForm = document.getElementById('item-form');
                if (itemForm) {
                  itemForm.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              disabled={!supplierId || !warehouseId}
            >
              Add Item
            </Button>
          </div>
          
          {items.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-500">No items added yet. Add items to your purchase order.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-2">Product</th>
                    <th className="px-4 py-2">Description</th>
                    <th className="px-4 py-2">Quantity</th>
                    <th className="px-4 py-2">Unit Price</th>
                    <th className="px-4 py-2">Discount</th>
                    <th className="px-4 py-2">Tax</th>
                    <th className="px-4 py-2">Total</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-2 text-sm font-medium">
                        {item.product?.name || "Unknown Product"}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {item.description || "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                        {item.orderedQuantity}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                        ${item.unitPrice.toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                        ${item.discount.toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                        ${item.tax.toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm font-medium">
                        ${item.total.toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              // Find the product
                              const product = products.find(p => p.id === item.productId);
                              
                              // Scroll to form and populate it
                              const itemForm = document.getElementById('item-form');
                              if (itemForm) {
                                itemForm.scrollIntoView({ behavior: 'smooth' });
                              }
                              
                              // Set form data for editing
                              // This would be handled by the item form component
                              // You would need to pass the item and index to the form
                            }}
                            className="rounded bg-blue-50 p-1 text-blue-600 hover:bg-blue-100"
                            title="Edit Item"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="rounded bg-red-50 p-1 text-red-600 hover:bg-red-100"
                            title="Remove Item"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-gray-200">
                  <tr>
                    <td colSpan={5} className="px-4 py-2"></td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-gray-700">Subtotal:</td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm font-medium">${subtotal.toFixed(2)}</td>
                    <td></td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="px-4 py-2"></td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-gray-700">Tax:</td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm font-medium">${tax.toFixed(2)}</td>
                    <td></td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="px-4 py-2"></td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-gray-700">Shipping:</td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm font-medium">
                      <input
                        type="number"
                        value={shipping}
                        onChange={(e) => setShipping(Number(e.target.value))}
                        min="0"
                        step="0.01"
                        className="w-20 rounded-md border border-gray-300 px-2 py-1 text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td></td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="px-4 py-2"></td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-gray-700">Discount:</td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm font-medium">
                      <input
                        type="number"
                        value={discount}
                        onChange={(e) => setDiscount(Number(e.target.value))}
                        min="0"
                        step="0.01"
                        className="w-20 rounded-md border border-gray-300 px-2 py-1 text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td></td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td colSpan={5} className="px-4 py-2"></td>
                    <td className="whitespace-nowrap px-4 py-2 text-base font-bold text-gray-700">Total:</td>
                    <td className="whitespace-nowrap px-4 py-2 text-base font-bold">${total.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
        
        {/* Item Form */}
        <div id="item-form" className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Add Item</h2>
          <PurchaseOrderItemForm
            products={filteredProducts}
            onAddItem={handleAddItem}
            onUpdateItem={handleUpdateItem}
          />
        </div>
        
        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/purchase-orders/${purchaseOrderId}`)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={isSubmitting || items.length === 0}
          >
            Save as Draft
          </Button>
          <Button
            type="button"
            onClick={(e) => handleSubmit(e, false)}
            isLoading={isSubmitting}
            disabled={isSubmitting || items.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            Submit Order
          </Button>
        </div>
      </form>
    </div>
  );
}

