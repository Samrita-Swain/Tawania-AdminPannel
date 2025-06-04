"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useNotification } from "@/components/ui/notification";

interface Product {
  id: string;
  name: string;
  sku: string;
  costPrice: number;
  unit: string;
  category?: {
    id: string;
    name: string;
  };
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface Store {
  id: string;
  name: string;
  code: string;
}

interface OutwardItem {
  productId: string;
  product?: Product;
  quantity: number;
  unitCost: number;
  totalCost: number;
  condition: string;
  notes?: string;
}

export default function NewOutwardPage() {
  const router = useRouter();
  const { showNotification } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Form data
  const [formData, setFormData] = useState({
    warehouseId: "",
    destinationType: "STORE",
    destinationId: "",
    sourceType: "TRANSFER",
    sourceId: "",
    notes: "",
  });

  const [items, setItems] = useState<OutwardItem[]>([]);
  const [newItem, setNewItem] = useState<OutwardItem>({
    productId: "",
    quantity: 1,
    unitCost: 0,
    totalCost: 0,
    condition: "NEW",
    notes: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingData(true);

        // Fetch warehouses, stores, and products
        const [warehousesRes, storesRes, productsRes] = await Promise.all([
          fetch("/api/warehouses"),
          fetch("/api/stores"),
          fetch("/api/products"),
        ]);

        if (warehousesRes.ok) {
          const warehousesData = await warehousesRes.json();
          setWarehouses(warehousesData.warehouses || []);
        }

        if (storesRes.ok) {
          const storesData = await storesRes.json();
          setStores(storesData.stores || []);
        }

        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData.products || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        showNotification("error", "Error", "Failed to load data");
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleItemChange = (field: string, value: string | number) => {
    setNewItem(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-calculate total cost when quantity or unit cost changes
      if (field === "quantity" || field === "unitCost") {
        updated.totalCost = updated.quantity * updated.unitCost;
      }

      // Auto-fill unit cost from product data
      if (field === "productId" && value) {
        const product = products.find(p => p.id === value);
        if (product) {
          updated.unitCost = product.costPrice || 0;
          updated.totalCost = updated.quantity * updated.unitCost;
          updated.product = product;
        }
      }

      return updated;
    });
  };

  const addItem = () => {
    if (!newItem.productId || newItem.quantity <= 0) {
      showNotification("error", "Validation Error", "Please select a product and enter a valid quantity");
      return;
    }

    const product = products.find(p => p.id === newItem.productId);
    if (!product) {
      showNotification("error", "Error", "Selected product not found");
      return;
    }

    setItems(prev => [...prev, { ...newItem, product }]);
    setNewItem({
      productId: "",
      quantity: 1,
      unitCost: 0,
      totalCost: 0,
      condition: "NEW",
      notes: "",
    });
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.warehouseId) {
      showNotification("error", "Validation Error", "Please select a warehouse");
      return;
    }

    if (!formData.destinationId) {
      showNotification("error", "Validation Error", "Please select a destination");
      return;
    }

    if (items.length === 0) {
      showNotification("error", "Validation Error", "Please add at least one item");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        warehouseId: formData.warehouseId,
        movementType: "OUTWARD",
        sourceType: formData.sourceType,
        sourceId: formData.sourceId || null,
        notes: formData.notes,
        destinationType: formData.destinationType,
        destinationId: formData.destinationId,
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          condition: item.condition,
          notes: item.notes || null,
        })),
      };

      const response = await fetch("/api/warehouse/movements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create outward movement");
      }

      const result = await response.json();
      showNotification("success", "Success", "Outward movement created successfully!");

      // Add a small delay to ensure the data is saved before redirecting
      setTimeout(() => {
        router.push("/warehouse/management?tab=outwards&refresh=true");
      }, 500);
    } catch (error: any) {
      console.error("Error creating outward movement:", error);
      showNotification("error", "Error", error.message || "Failed to create outward movement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = items.reduce((sum, item) => sum + item.totalCost, 0);

  if (isLoadingData) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">New Outward Movement</h1>
        <Button
          variant="outline"
          onClick={() => router.push("/warehouse/management")}
        >
          Back to Warehouse Management
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Movement Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="warehouse">From Warehouse *</Label>
                <Select
                  value={formData.warehouseId}
                  onChange={(e) => handleFormChange("warehouseId", e.target.value)}
                  required
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} ({warehouse.code})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="destinationType">Destination Type</Label>
                <Select
                  value={formData.destinationType}
                  onChange={(e) => handleFormChange("destinationType", e.target.value)}
                >
                  <option value="STORE">Store</option>
                  <option value="WAREHOUSE">Warehouse</option>
                  <option value="CUSTOMER">Customer</option>
                  <option value="OTHER">Other</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="destination">
                  To {formData.destinationType === "STORE" ? "Store" : "Destination"} *
                </Label>
                <Select
                  value={formData.destinationId}
                  onChange={(e) => handleFormChange("destinationId", e.target.value)}
                  required
                >
                  <option value="">Select Destination</option>
                  {formData.destinationType === "STORE" ? (
                    stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name} ({store.code})
                      </option>
                    ))
                  ) : formData.destinationType === "WAREHOUSE" ? (
                    warehouses.filter(w => w.id !== formData.warehouseId).map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} ({warehouse.code})
                      </option>
                    ))
                  ) : (
                    <option value="custom">Custom Destination</option>
                  )}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sourceType">Movement Type</Label>
                <Select
                  value={formData.sourceType}
                  onChange={(e) => handleFormChange("sourceType", e.target.value)}
                >
                  <option value="TRANSFER">Transfer</option>
                  <option value="SALE">Sale</option>
                  <option value="RETURN">Return</option>
                  <option value="ADJUSTMENT">Adjustment</option>
                  <option value="OTHER">Other</option>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceId">Reference Number (Optional)</Label>
              <Input
                id="sourceId"
                value={formData.sourceId}
                onChange={(e) => handleFormChange("sourceId", e.target.value)}
                placeholder="e.g., TRF-001, SALE-001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleFormChange("notes", e.target.value)}
                placeholder="Additional notes about this outward movement"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Add Items */}
        <Card>
          <CardHeader>
            <CardTitle>Add Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Product *</Label>
                <Select
                  value={newItem.productId}
                  onChange={(e) => handleItemChange("productId", e.target.value)}
                >
                  <option value="">Select Product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min="1"
                  value={newItem.quantity}
                  onChange={(e) => handleItemChange("quantity", parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label>Unit Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newItem.unitCost}
                  onChange={(e) => handleItemChange("unitCost", parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label>Condition</Label>
                <Select
                  value={newItem.condition}
                  onChange={(e) => handleItemChange("condition", e.target.value)}
                >
                  <option value="NEW">New</option>
                  <option value="USED">Used</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="REFURBISHED">Refurbished</option>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Item Notes</Label>
              <Input
                value={newItem.notes}
                onChange={(e) => handleItemChange("notes", e.target.value)}
                placeholder="Optional notes for this item"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Total Cost: ${newItem.totalCost.toFixed(2)}
              </div>
              <Button type="button" onClick={addItem}>
                Add Item
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Items List */}
        {items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Items to Transfer ({items.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between border rounded-lg p-4">
                    <div className="flex-1">
                      <div className="font-medium">{item.product?.name}</div>
                      <div className="text-sm text-gray-600">
                        SKU: {item.product?.sku} | Qty: {item.quantity} |
                        Unit Cost: ${item.unitCost.toFixed(2)} |
                        Total: ${item.totalCost.toFixed(2)}
                      </div>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">{item.condition}</Badge>
                        {item.notes && <Badge variant="outline">Note: {item.notes}</Badge>}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                ))}

                <div className="border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span>Total Items: {totalItems}</span>
                    <span>Total Value: ${totalValue.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/warehouse/management")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || items.length === 0}
          >
            {isSubmitting ? "Creating..." : "Create Outward Movement"}
          </Button>
        </div>
      </form>
    </div>
  );
}
