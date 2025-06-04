"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Customer, Store } from "@prisma/client";

interface InventoryItemWithProduct {
  id: string;
  productId: string;
  quantity: number;
  retailPrice: number;
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
}

interface POSFormProps {
  stores: Store[];
  selectedStore: Store;
  storeInventory: InventoryItemWithProduct[];
  customers: Customer[];
}

interface CartItem {
  inventoryItemId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  maxQuantity: number;
}

export function POSForm({ stores, selectedStore, storeInventory, customers }: POSFormProps) {
  const router = useRouter();
  
  // State for the form
  const [storeId, setStoreId] = useState(selectedStore?.id || "");
  const [customerId, setCustomerId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const taxRate = 0.07; // 7% tax rate
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;
  
  // Filter products based on search term
  const filteredProducts = searchTerm
    ? storeInventory.filter(
        (item) =>
          item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.product.barcode && item.product.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : storeInventory;
  
  // Handle store change
  const handleStoreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStoreId = e.target.value;
    setStoreId(newStoreId);
    // Redirect to the same page with the new store ID
    router.push(`/pos/new?store=${newStoreId}`);
  };
  
  // Add item to cart
  const addToCart = (item: InventoryItemWithProduct) => {
    // Check if item is already in cart
    const existingItemIndex = cart.findIndex(
      (cartItem) => cartItem.inventoryItemId === item.id
    );
    
    if (existingItemIndex >= 0) {
      // Item already in cart, update quantity if not exceeding available quantity
      const existingItem = cart[existingItemIndex];
      if (existingItem.quantity < item.quantity) {
        const updatedCart = [...cart];
        updatedCart[existingItemIndex] = {
          ...existingItem,
          quantity: existingItem.quantity + 1,
          total: (existingItem.quantity + 1) * existingItem.unitPrice,
        };
        setCart(updatedCart);
      }
    } else {
      // Add new item to cart
      setCart([
        ...cart,
        {
          inventoryItemId: item.id,
          productId: item.productId,
          productName: item.product.name,
          quantity: 1,
          unitPrice: Number(item.retailPrice),
          total: Number(item.retailPrice),
          maxQuantity: item.quantity,
        },
      ]);
    }
  };
  
  // Update cart item quantity
  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      // Remove item if quantity is 0 or negative
      removeFromCart(index);
      return;
    }
    
    const item = cart[index];
    if (newQuantity > item.maxQuantity) {
      // Don't allow quantity to exceed available stock
      return;
    }
    
    const updatedCart = [...cart];
    updatedCart[index] = {
      ...item,
      quantity: newQuantity,
      total: newQuantity * item.unitPrice,
    };
    setCart(updatedCart);
  };
  
  // Remove item from cart
  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cart.length === 0) {
      alert("Please add at least one item to the cart");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeId,
          customerId: customerId || undefined,
          items: cart.map((item) => ({
            inventoryItemId: item.inventoryItemId,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
          paymentMethod,
          notes,
          subtotal,
          taxAmount,
          totalAmount: total,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        router.push(`/sales/${data.id}`);
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || "Failed to create sale"}`);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error creating sale:", error);
      alert("An error occurred while creating the sale");
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left Column - Product Selection */}
      <div className="lg:col-span-2 space-y-6">
        <div className="rounded-lg bg-white p-4 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <label htmlFor="store" className="block text-sm font-medium text-gray-800">
                Store
              </label>
              <select
                id="store"
                value={storeId}
                onChange={handleStoreChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="customer" className="block text-sm font-medium text-gray-800">
                Customer
              </label>
              <select
                id="customer"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Walk-in Customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mb-4">
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
          
          <div className="h-96 overflow-y-auto rounded border border-gray-200">
            <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 md:grid-cols-4">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
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
                    <p className="mt-1 text-sm font-semibold text-green-600">
                      ${Number(item.retailPrice).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-800">
                      Stock: {item.quantity} {item.product.unit}
                    </p>
                  </button>
                ))
              ) : (
                <div className="col-span-full py-8 text-center text-gray-800">
                  No products found
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Column - Cart */}
      <div className="space-y-6">
        <div className="rounded-lg bg-white p-4 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Shopping Cart</h2>
          
          {cart.length > 0 ? (
            <div className="space-y-4">
              <div className="max-h-96 overflow-y-auto">
                {cart.map((item, index) => (
                  <div key={index} className="mb-3 rounded border border-gray-200 p-3">
                    <div className="flex justify-between">
                      <h3 className="font-medium text-gray-800">{item.productName}</h3>
                      <button
                        onClick={() => removeFromCart(index)}
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
                          max={item.maxQuantity}
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
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-800">
                          ${item.unitPrice.toFixed(2)} × {item.quantity}
                        </p>
                        <p className="font-semibold text-gray-800">
                          ${item.total.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between">
                  <span className="text-gray-800">Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-gray-800">Tax (7%)</span>
                  <span className="font-medium">${taxAmount.toFixed(2)}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-gray-200 pt-2">
                  <span className="text-lg font-semibold text-gray-800">Total</span>
                  <span className="text-lg font-semibold text-gray-800">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>
              
              <div>
                <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-800">
                  Payment Method
                </label>
                <select
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="DEBIT_CARD">Debit Card</option>
                  <option value="MOBILE_PAYMENT">Mobile Payment</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-800">
                  Notes
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                ></textarea>
              </div>
              
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || cart.length === 0}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
              >
                {isSubmitting ? "Processing..." : "Complete Sale"}
              </Button>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-800">
              <p>No items in cart</p>
              <p className="mt-2 text-sm">
                Select products from the left to add them to your cart
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
