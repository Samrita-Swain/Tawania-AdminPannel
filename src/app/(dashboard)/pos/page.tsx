"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  sku: string;
  retailPrice: number;
  wholesalePrice: number;
  costPrice: number;
  categoryId: string;
}

interface Store {
  id: string;
  name: string;
  code: string;
}

interface InventoryItem {
  id: string;
  productId: string;
  storeId: string;
  quantity: number;
  retailPrice: number;
  wholesalePrice: number;
  costPrice: number;
}

interface CartItem {
  inventoryItemId: string;
  productId: string;
  product: Product;
  quantity: number;
  price: number;
  discount: number;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: string;
}

export default function POSPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [notes, setNotes] = useState("");

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/pos/data');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }

        const data = await response.json();
        setStores(data.stores || []);
        setProducts(data.products || []);
        setInventoryItems(data.inventoryItems || []);
        setCustomers(data.customers || []);

        // Set default store if only one store exists
        if (data.stores?.length === 1) {
          setSelectedStoreId(data.stores[0].id);
        }

        // Check for store and product in URL params
        const storeId = searchParams?.get('store');
        const productId = searchParams?.get('product');

        if (storeId) {
          setSelectedStoreId(storeId);
        }

        if (storeId && productId && data.products && data.inventoryItems) {
          const product = data.products.find((p: Product) => p.id === productId);
          const inventoryItem = data.inventoryItems.find(
            (i: InventoryItem) => i.productId === productId && i.storeId === storeId
          );

          if (product && inventoryItem && inventoryItem.quantity > 0) {
            addToCart(inventoryItem, product);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [searchParams]);

  // Filtered products based on search term and selected store
  const filteredProducts = selectedStoreId
    ? products.filter(product => {
        const matchesSearch = searchTerm
          ? product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.sku.toLowerCase().includes(searchTerm.toLowerCase())
          : true;

        const hasInventory = inventoryItems.some(
          item => item.productId === product.id &&
                 item.storeId === selectedStoreId &&
                 item.quantity > 0
        );

        return matchesSearch && hasInventory;
      })
    : [];

  // Add item to cart
  const addToCart = (inventoryItem: InventoryItem, product: Product) => {
    // Check if item already exists in cart
    const existingItemIndex = cart.findIndex(
      item => item.inventoryItemId === inventoryItem.id
    );

    if (existingItemIndex >= 0) {
      // Update quantity if item already in cart
      const updatedCart = [...cart];
      const currentItem = updatedCart[existingItemIndex];

      // Check if we have enough inventory
      const availableQuantity = inventoryItems.find(
        item => item.id === inventoryItem.id
      )?.quantity || 0;

      if (currentItem.quantity >= availableQuantity) {
        alert(`Cannot add more. Only ${availableQuantity} available in stock.`);
        return;
      }

      updatedCart[existingItemIndex] = {
        ...currentItem,
        quantity: currentItem.quantity + 1,
      };

      setCart(updatedCart);
    } else {
      // Add new item to cart
      setCart([
        ...cart,
        {
          inventoryItemId: inventoryItem.id,
          productId: product.id,
          product,
          quantity: 1,
          price: inventoryItem.retailPrice || product.retailPrice || 0,
          discount: 0,
        },
      ]);
    }
  };

  // Remove item from cart
  const removeFromCart = (index: number) => {
    const updatedCart = [...cart];
    updatedCart.splice(index, 1);
    setCart(updatedCart);
  };

  // Update item quantity
  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;

    const updatedCart = [...cart];
    const currentItem = updatedCart[index];

    // Check if we have enough inventory
    const inventoryItem = inventoryItems.find(
      item => item.id === currentItem.inventoryItemId
    );

    if (!inventoryItem || newQuantity > inventoryItem.quantity) {
      alert(`Cannot add more. Only ${inventoryItem?.quantity} available in stock.`);
      return;
    }

    updatedCart[index] = {
      ...currentItem,
      quantity: newQuantity,
    };

    setCart(updatedCart);
  };

  // Update item discount
  const updateDiscount = (index: number, newDiscount: number) => {
    if (newDiscount < 0 || newDiscount > 100) return;

    const updatedCart = [...cart];
    updatedCart[index] = {
      ...updatedCart[index],
      discount: newDiscount,
    };

    setCart(updatedCart);
  };

  // Calculate subtotal
  const subtotal = cart.reduce((sum, item) => {
    const itemTotal = item.price * item.quantity;
    const discountAmount = (itemTotal * item.discount) / 100;
    return sum + (itemTotal - discountAmount);
  }, 0);

  // Calculate tax (assuming 10% tax rate)
  const taxRate = 0.1;
  const tax = subtotal * taxRate;

  // Calculate total
  const total = subtotal + tax;

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStoreId || cart.length === 0) {
      alert('Please select a store and add items to cart');
      return;
    }

    setIsSubmitting(true);

    try {
      const saleData = {
        storeId: selectedStoreId,
        customerId: selectedCustomerId || undefined,
        items: cart.map(item => ({
          inventoryItemId: item.inventoryItemId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.price,
          discount: item.discount,
        })),
        paymentMethod,
        subtotalAmount: subtotal,
        taxAmount: tax,
        totalAmount: total,
        paymentStatus: "PAID",
        notes,
      };

      const response = await fetch('/api/pos/sale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saleData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create sale');
      }

      const result = await response.json();

      // Clear cart and show success message
      setCart([]);
      alert(`Sale completed successfully! Receipt #${result.sale.receiptNumber}`);

      // Redirect to sale details page
      router.push(`/sales/${result.sale.id}`);
    } catch (error) {
      console.error('Error creating sale:', error);
      alert('Failed to complete sale. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Point of Sale</h1>
        <Link
          href="/sales"
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 transition-colors"
        >
          View Sales History
        </Link>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-lg bg-white p-6 shadow-md">
          <div className="text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 mx-auto"></div>
            <p className="text-gray-800">Loading data...</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Product Selection */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-lg bg-white p-4 shadow-md">
              <div className="mb-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="store" className="mb-1 block text-sm font-medium text-gray-800">
                    Store *
                  </label>
                  <select
                    id="store"
                    value={selectedStoreId}
                    onChange={(e) => setSelectedStoreId(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Store</option>
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name} ({store.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="customer" className="mb-1 block text-sm font-medium text-gray-800">
                    Customer (Optional)
                  </label>
                  <select
                    id="customer"
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Walk-in Customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} ({customer.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="search" className="mb-1 block text-sm font-medium text-gray-800">
                  Search Products
                </label>
                <input
                  id="search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by product name or SKU"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={!selectedStoreId}
                />
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow-md">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">Products</h2>

              {!selectedStoreId ? (
                <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300">
                  <p className="text-gray-800">Please select a store to view products</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300">
                  <p className="text-gray-800">No products found</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {filteredProducts.map((product) => {
                    const inventoryItem = inventoryItems.find(
                      item => item.productId === product.id && item.storeId === selectedStoreId
                    );

                    if (!inventoryItem) return null;

                    return (
                      <div
                        key={product.id}
                        className="flex flex-col rounded-lg border border-gray-200 p-4 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all"
                        onClick={() => addToCart(inventoryItem, product)}
                      >
                        <h3 className="mb-1 font-medium text-blue-600">{product.name}</h3>
                        <p className="text-xs text-gray-800">{product.sku}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-lg font-bold">{formatCurrency(inventoryItem.retailPrice || product.retailPrice || 0)}</span>
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                            {inventoryItem.quantity} in stock
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Cart and Checkout */}
          <div className="space-y-6">
            <div className="rounded-lg bg-white p-4 shadow-md">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">Cart</h2>

              {cart.length === 0 ? (
                <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300">
                  <p className="text-gray-800">Cart is empty</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item, index) => (
                    <div key={index} className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{item.product.name}</h3>
                        <button
                          type="button"
                          onClick={() => removeFromCart(index)}
                          className="rounded-full p-1 text-red-600 hover:bg-red-50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-xs text-gray-800">{item.product.sku}</p>

                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-gray-800">Quantity</label>
                          <div className="flex rounded-md border border-gray-300">
                            <button
                              type="button"
                              onClick={() => updateQuantity(index, item.quantity - 1)}
                              className="px-2 py-1 text-gray-800 hover:bg-gray-100"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                              className="w-full border-x border-gray-300 px-2 py-1 text-center text-sm"
                              min="1"
                            />
                            <button
                              type="button"
                              onClick={() => updateQuantity(index, item.quantity + 1)}
                              className="px-2 py-1 text-gray-800 hover:bg-gray-100"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-gray-800">Price</label>
                          <input
                            type="text"
                            value={formatCurrency(item.price)}
                            readOnly
                            className="w-full rounded-md border border-gray-300 px-3 py-1 text-sm bg-gray-50"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-gray-800">Discount %</label>
                          <input
                            type="number"
                            value={item.discount}
                            onChange={(e) => updateDiscount(index, parseInt(e.target.value) || 0)}
                            className="w-full rounded-md border border-gray-300 px-3 py-1 text-sm"
                            min="0"
                            max="100"
                          />
                        </div>
                      </div>

                      <div className="mt-2 flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span className="font-medium">
                          {formatCurrency((item.price * item.quantity) * (1 - item.discount / 100))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg bg-white p-4 shadow-md">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">Checkout</h2>

              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="paymentMethod" className="mb-1 block text-sm font-medium text-gray-800">
                      Payment Method
                    </label>
                    <select
                      id="paymentMethod"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    >
                      <option value="CASH">Cash</option>
                      <option value="CREDIT_CARD">Credit Card</option>
                      <option value="DEBIT_CARD">Debit Card</option>
                      <option value="MOBILE_PAYMENT">Mobile Payment</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
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
                      rows={2}
                    />
                  </div>

                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax (10%):</span>
                      <span>{formatCurrency(tax)}</span>
                    </div>
                    <div className="mt-2 flex justify-between font-bold">
                      <span>Total:</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    isLoading={isSubmitting}
                    disabled={cart.length === 0 || !selectedStoreId || isSubmitting}
                  >
                    Complete Sale
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
