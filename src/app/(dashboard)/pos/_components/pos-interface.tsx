"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { POSProductList } from "./pos-product-list";
import { POSCart } from "./pos-cart";
import { POSCheckout } from "./pos-checkout";
import { POSHeader } from "./pos-header";
import { POSCategories } from "./pos-categories";
import { POSSearch } from "./pos-search";

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  unit: string | null;
  // Removed category fields for simplified schema
}

interface InventoryItem {
  id: string;
  productId: string;
  storeId: string;
  quantity: number;
  reservedQuantity: number | null;
  costPrice: number | null;
  retailPrice: number | null;
  product: Product;
}

interface Store {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
}

interface TaxRate {
  id: string;
  name: string;
  rate: number;
  isDefault: boolean;
  isActive: boolean;
}

interface CartItem {
  inventoryItemId: string;
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  maxQuantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  unit: string;
}

interface POSInterfaceProps {
  store: Store;
  stores: Store[];
  customers: Customer[];
  inventoryItems: InventoryItem[];
  taxRates: TaxRate[];
  defaultTaxRate: TaxRate;
  userId: string;
}

export function POSInterface({
  store,
  stores,
  customers,
  inventoryItems,
  taxRates,
  defaultTaxRate,
  userId,
}: POSInterfaceProps) {
  const router = useRouter();



  // State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store>(store);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedTaxRate, setSelectedTaxRate] = useState<TaxRate>(defaultTaxRate);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [barcodeInput, setBarcodeInput] = useState<string>("");

  // Derived state
  const filteredItems = inventoryItems.filter(item => {
    // Filter by search query
    const matchesSearch = searchQuery === "" ||
      item.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.product.barcode && item.product.barcode.toLowerCase().includes(searchQuery.toLowerCase()));

    // Filter by category - simplified for our schema
    const matchesCategory = true; // No categories in our simplified schema

    return matchesSearch && matchesCategory;
  });

  // Using empty categories array for simplified schema
  const categories: { id: string; name: string }[] = [];

  // Calculate cart totals
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxAmount = subtotal * (selectedTaxRate.rate / 100);
  const total = subtotal + taxAmount;

  // Handle store change
  const handleStoreChange = (storeId: string) => {
    const newStore = stores.find(s => s.id === storeId);
    if (newStore) {
      // Clear cart when changing stores
      if (cart.length > 0 && !confirm("Changing stores will clear your current cart. Continue?")) {
        return;
      }
      setSelectedStore(newStore);
      setCart([]);
      router.push(`/pos/new?store=${storeId}`);
    }
  };

  // Handle customer change
  const handleCustomerChange = (customerId: string | null) => {
    if (!customerId) {
      setSelectedCustomer(null);
      return;
    }

    const customer = customers.find(c => c.id === customerId);
    setSelectedCustomer(customer || null);
  };

  // Handle tax rate change
  const handleTaxRateChange = (taxRateId: string) => {
    const taxRate = taxRates.find(t => t.id === taxRateId);
    if (taxRate) {
      setSelectedTaxRate(taxRate);
    }
  };

  // Handle adding item to cart
  const handleAddToCart = (inventoryItem: InventoryItem) => {
    const existingItemIndex = cart.findIndex(item => item.inventoryItemId === inventoryItem.id);

    if (existingItemIndex >= 0) {
      // Item already in cart, update quantity
      const updatedCart = [...cart];
      const item = updatedCart[existingItemIndex];

      // Check if we can add more
      if (item.quantity >= item.maxQuantity) {
        alert(`Cannot add more than ${item.maxQuantity} units of this product.`);
        return;
      }

      item.quantity += 1;
      item.totalPrice = item.quantity * item.unitPrice * (1 - item.discount / 100);
      setCart(updatedCart);
    } else {
      // Add new item to cart
      const availableQuantity = inventoryItem.quantity - (inventoryItem.reservedQuantity || 0);

      if (availableQuantity <= 0) {
        alert("This product is out of stock.");
        return;
      }

      const retailPrice = inventoryItem.retailPrice || 0;

      const newItem: CartItem = {
        inventoryItemId: inventoryItem.id,
        productId: inventoryItem.productId,
        name: inventoryItem.product.name,
        sku: inventoryItem.product.sku,
        quantity: 1,
        maxQuantity: availableQuantity,
        unitPrice: retailPrice,
        discount: 0,
        totalPrice: retailPrice,
        unit: inventoryItem.product.unit || 'each',
      };

      setCart([...cart, newItem]);
    }
  };

  // Handle updating cart item
  const handleUpdateCartItem = (index: number, quantity: number, discount: number) => {
    const updatedCart = [...cart];
    const item = updatedCart[index];

    // Validate quantity
    if (quantity > item.maxQuantity) {
      alert(`Cannot add more than ${item.maxQuantity} units of this product.`);
      return;
    }

    if (quantity <= 0) {
      // Remove item if quantity is 0 or less
      updatedCart.splice(index, 1);
    } else {
      // Update item
      item.quantity = quantity;
      item.discount = discount;
      item.totalPrice = quantity * item.unitPrice * (1 - discount / 100);
    }

    setCart(updatedCart);
  };

  // Handle removing cart item
  const handleRemoveCartItem = (index: number) => {
    const updatedCart = [...cart];
    updatedCart.splice(index, 1);
    setCart(updatedCart);
  };

  // Handle barcode scan
  const handleBarcodeScan = (barcode: string) => {
    // Find product by barcode
    const inventoryItem = inventoryItems.find(
      item => item.product.barcode === barcode
    );

    if (inventoryItem) {
      handleAddToCart(inventoryItem);
      setBarcodeInput("");
    } else {
      alert(`Product with barcode ${barcode} not found.`);
    }
  };

  // Handle barcode input
  const handleBarcodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBarcodeInput(e.target.value);
  };

  const handleBarcodeInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && barcodeInput) {
      e.preventDefault();
      handleBarcodeScan(barcodeInput);
    }
  };

  // Handle checkout
  const handleCheckout = () => {
    if (cart.length === 0) {
      alert("Cart is empty. Please add items before checkout.");
      return;
    }

    setIsCheckoutOpen(true);
  };

  // Handle completing sale
  const handleCompleteSale = async (paymentData: {
    paymentMethod: string;
    amountPaid: number;
    referenceNumber?: string;
    notes?: string;
  }) => {
    try {
      const response = await fetch("/api/pos/sale", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeId: selectedStore.id,
          customerId: selectedCustomer?.id || null,
          // userId field removed in our simplified schema
          items: cart.map(item => ({
            inventoryItemId: item.inventoryItemId,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
          })),
          // taxRateId and taxRate fields removed in our simplified schema
          subtotalAmount: subtotal,
          taxAmount,
          totalAmount: total,
          paymentMethod: paymentData.paymentMethod,
          paymentStatus: paymentData.amountPaid >= total ? "PAID" :
                         paymentData.amountPaid > 0 ? "PARTIALLY_PAID" : "UNPAID",
          amountPaid: paymentData.amountPaid,
          referenceNumber: paymentData.referenceNumber,
          notes: paymentData.notes,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert("Sale completed successfully!");

        // Redirect to sale details page
        router.push(`/sales/${data.sale.id}`);
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || "Failed to complete sale"}`);
      }
    } catch (error) {
      console.error("Error completing sale:", error);
      alert("An error occurred while processing the sale");
    }
  };

  // Handle cancel checkout
  const handleCancelCheckout = () => {
    setIsCheckoutOpen(false);
  };

  // Handle clear cart
  const handleClearCart = () => {
    if (cart.length === 0 || confirm("Are you sure you want to clear the cart?")) {
      setCart([]);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <POSHeader
        store={selectedStore}
        stores={stores}
        onStoreChange={handleStoreChange}
        customer={selectedCustomer}
        customers={customers}
        onCustomerChange={handleCustomerChange}
        taxRate={selectedTaxRate}
        taxRates={taxRates}
        onTaxRateChange={handleTaxRateChange}
        barcodeInput={barcodeInput}
        onBarcodeInputChange={handleBarcodeInputChange}
        onBarcodeInputKeyDown={handleBarcodeInputKeyDown}
        onBarcodeScan={handleBarcodeScan}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Product Selection */}
        <div className="flex w-2/3 flex-col border-r border-gray-200">
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center gap-4">
              <POSSearch
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
              <button
                onClick={() => setSearchQuery("")}
                className="rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-800 hover:bg-gray-200"
              >
                Clear
              </button>
            </div>
          </div>

          <POSCategories
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />

          <div className="flex-1 overflow-y-auto p-4">
            <POSProductList
              inventoryItems={filteredItems}
              onAddToCart={handleAddToCart}
            />
          </div>
        </div>

        {/* Cart */}
        <div className="flex w-1/3 flex-col">
          <POSCart
            items={cart}
            onUpdateItem={handleUpdateCartItem}
            onRemoveItem={handleRemoveCartItem}
            onClearCart={handleClearCart}
            subtotal={subtotal}
            taxRate={selectedTaxRate.rate}
            taxAmount={taxAmount}
            total={total}
            onCheckout={handleCheckout}
          />
        </div>
      </div>

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <POSCheckout
          cart={cart}
          customer={selectedCustomer}
          subtotal={subtotal}
          taxRate={selectedTaxRate.rate}
          taxAmount={taxAmount}
          total={total}
          onComplete={handleCompleteSale}
          onCancel={handleCancelCheckout}
        />
      )}
    </div>
  );
}
