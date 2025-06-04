"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Search, Plus, Trash, Save, ArrowLeft } from "lucide-react";

interface Store {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  retailPrice: number;
  category: {
    id: string;
    name: string;
  } | null;
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface ReturnItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  returnReason: string;
  refundAmount: number;
}

interface NewReturnFormProps {
  stores: Store[];
  products: Product[];
  customers: Customer[];
  userId: string;
}

export function NewReturnForm({ stores, products, customers, userId }: NewReturnFormProps) {
  const router = useRouter();

  // Form state
  const [storeId, setStoreId] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Debug logging
  console.log("NewReturnForm received:", {
    storesCount: stores?.length || 0,
    productsCount: products?.length || 0,
    customersCount: customers?.length || 0
  });

  // Filtered products based on search
  const filteredProducts = (products || []).filter((product) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchLower) ||
      product.sku.toLowerCase().includes(searchLower) ||
      product.category?.name.toLowerCase().includes(searchLower)
    );
  });

  // Add item to return
  const addItem = (product: Product) => {
    // Check if product already exists in items
    const existingItemIndex = items.findIndex((item) => item.productId === product.id);

    if (existingItemIndex >= 0) {
      // Update quantity if product already exists
      const updatedItems = [...items];
      updatedItems[existingItemIndex].quantity += 1;
      setItems(updatedItems);
    } else {
      // Add new item
      const newItem: ReturnItem = {
        id: `temp-${Date.now()}`,
        productId: product.id,
        product,
        quantity: 1,
        returnReason: "Defective",
        refundAmount: product.retailPrice,
      };

      setItems([...items, newItem]);
    }

    // Clear search
    setSearchTerm("");
  };

  // Update item quantity
  const updateItemQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;

    const updatedItems = items.map((item) => {
      if (item.id === id) {
        return { ...item, quantity };
      }
      return item;
    });

    setItems(updatedItems);
  };

  // Update item reason
  const updateItemReason = (id: string, returnReason: string) => {
    const updatedItems = items.map((item) => {
      if (item.id === id) {
        return { ...item, returnReason };
      }
      return item;
    });

    setItems(updatedItems);
  };

  // Update item refund amount
  const updateItemRefundAmount = (id: string, refundAmount: number) => {
    const updatedItems = items.map((item) => {
      if (item.id === id) {
        return { ...item, refundAmount };
      }
      return item;
    });

    setItems(updatedItems);
  };

  // Remove item
  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  // Calculate total refund amount
  const totalRefundAmount = items.reduce(
    (total, item) => total + item.refundAmount * item.quantity,
    0
  );

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!storeId) {
      setError("Please select a store");
      return;
    }

    if (items.length === 0) {
      setError("Please add at least one item");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/returns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeId,
          customerId: customerId || null,
          notes,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            reason: item.returnReason,
            unitPrice: item.refundAmount,
            totalPrice: item.refundAmount * item.quantity,
            condition: "GOOD",
          })),
          reason: "Customer Return",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create return");
      }

      const data = await response.json();

      // Redirect to the new return page
      router.push(`/returns/${data.id}`);
      router.refresh();
    } catch (error: any) {
      setError(error.message || "An error occurred while creating the return");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Return Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="store">Store</Label>
              <Select
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                required
              >
                <option value="">Select Store</option>
                {(stores || []).map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </Select>
              {(!stores || stores.length === 0) && (
                <p className="text-sm text-red-600 mt-1">No stores available. Please check database connection.</p>
              )}
            </div>

            <div>
              <Label htmlFor="customer">Customer (Optional)</Label>
              <Select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">Walk-in Customer</option>
                {(customers || []).map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.phone || customer.email}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes about this return"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Return Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="search">Search Products</Label>
              <div className="relative">
                <Input
                  id="search"
                  type="text"
                  placeholder="Search by name, SKU, or category"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-800" />
              </div>

              <div className="mt-2 max-h-60 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-sm">
                {searchTerm ? (
                  // Show filtered results when searching
                  filteredProducts.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                      {filteredProducts.slice(0, 10).map((product) => (
                        <li
                          key={product.id}
                          className="flex cursor-pointer items-center justify-between p-3 hover:bg-gray-50"
                          onClick={() => addItem(product)}
                        >
                          <div>
                            <p className="font-medium text-gray-800">{product.name}</p>
                            <p className="text-xs text-gray-800">
                              SKU: {product.sku} | Category: {product.category?.name || "Uncategorized"}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              addItem(product);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="p-3 text-center text-sm text-gray-800">
                      No products found matching "{searchTerm}"
                    </p>
                  )
                ) : (
                  // Show all products when not searching
                  products && products.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                      {products.slice(0, 10).map((product) => (
                        <li
                          key={product.id}
                          className="flex cursor-pointer items-center justify-between p-3 hover:bg-gray-50"
                          onClick={() => addItem(product)}
                        >
                          <div>
                            <p className="font-medium text-gray-800">{product.name}</p>
                            <p className="text-xs text-gray-800">
                              SKU: {product.sku} | Category: {product.category?.name || "Uncategorized"}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              addItem(product);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="p-3 text-center text-sm text-gray-800">
                      No products available. Please add products to the system first.
                    </p>
                  )
                )}
              </div>
            </div>

            <div className="mt-4">
              <h3 className="mb-2 text-sm font-medium text-gray-800">Selected Items</h3>
              {items.length > 0 ? (
                <ul className="divide-y divide-gray-200 rounded-md border border-gray-200">
                  {items.map((item) => (
                    <li key={item.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{item.product.name}</p>
                          <p className="text-xs text-gray-800">
                            SKU: {item.product.sku} | Price: ${item.product.retailPrice.toFixed(2)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <div>
                          <Label htmlFor={`quantity-${item.id}`} className="text-xs">
                            Quantity
                          </Label>
                          <Input
                            id={`quantity-${item.id}`}
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value))}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`reason-${item.id}`} className="text-xs">
                            Reason
                          </Label>
                          <Select
                            id={`reason-${item.id}`}
                            value={item.returnReason}
                            onChange={(e) => updateItemReason(item.id, e.target.value)}
                            className="h-8"
                          >
                            <option value="Defective">Defective</option>
                            <option value="Wrong Item">Wrong Item</option>
                            <option value="Not as Described">Not as Described</option>
                            <option value="Customer Changed Mind">Changed Mind</option>
                            <option value="Other">Other</option>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor={`refund-${item.id}`} className="text-xs">
                            Refund Amount
                          </Label>
                          <Input
                            id={`refund-${item.id}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.refundAmount}
                            onChange={(e) => updateItemRefundAmount(item.id, parseFloat(e.target.value))}
                            className="h-8"
                          />
                        </div>
                      </div>

                      <div className="mt-2 text-right text-sm">
                        <span className="font-medium">
                          Subtotal: ${(item.refundAmount * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-md border border-gray-200 p-4 text-center text-sm text-gray-800">
                  No items added yet. Search for products above.
                </p>
              )}

              {items.length > 0 && (
                <div className="mt-4 flex justify-end">
                  <p className="text-lg font-bold">
                    Total Refund: ${totalRefundAmount.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Button
          type="submit"
          disabled={isSubmitting || items.length === 0}
        >
          {isSubmitting ? (
            <>Processing...</>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Create Return
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

