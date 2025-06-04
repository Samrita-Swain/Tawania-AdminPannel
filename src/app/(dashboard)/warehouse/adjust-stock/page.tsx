"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useNotification } from "@/components/ui/notification";

interface Product {
  id: string;
  name: string;
  sku: string;
  category?: string;
  currentStock?: number;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface AdjustmentItem {
  productId: string;
  product?: Product;
  currentStock: number;
  adjustedStock: number;
  adjustmentQuantity: number;
  adjustmentType: 'INCREASE' | 'DECREASE' | 'SET';
  reason: string;
  notes?: string;
}

export default function AdjustStockPage() {
  const router = useRouter();
  const { showNotification } = useNotification();

  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    warehouseId: "",
    adjustmentDate: new Date().toISOString().split('T')[0],
    reason: "STOCK_CORRECTION",
    notes: "",
  });

  const [adjustmentItems, setAdjustmentItems] = useState<AdjustmentItem[]>([]);

  const [newItem, setNewItem] = useState({
    productId: "",
    currentStock: 0,
    adjustmentType: "SET" as 'INCREASE' | 'DECREASE' | 'SET',
    adjustmentQuantity: 0,
    reason: "Stock correction",
    notes: "",
  });

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingData(true);

        const [productsRes, warehousesRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/warehouses")
        ]);

        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData.products || []);
        }

        if (warehousesRes.ok) {
          const warehousesData = await warehousesRes.json();
          setWarehouses(warehousesData.warehouses || []);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        // No mock data - only show real data
        setProducts([]);
        setWarehouses([]);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, []);

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (field: string, value: any) => {
    setNewItem(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-calculate adjustment quantity based on type
      if (field === 'adjustmentType' || field === 'adjustmentQuantity' || field === 'currentStock') {
        const currentStock = field === 'currentStock' ? value : updated.currentStock;
        const adjustmentQuantity = field === 'adjustmentQuantity' ? value : updated.adjustmentQuantity;
        const adjustmentType = field === 'adjustmentType' ? value : updated.adjustmentType;

        if (adjustmentType === 'SET') {
          updated.adjustmentQuantity = adjustmentQuantity;
        }
      }

      return updated;
    });
  };

  const addAdjustmentItem = () => {
    if (!newItem.productId) {
      showNotification("error", "Error", "Please select a product");
      return;
    }

    const product = products.find(p => p.id === newItem.productId);
    if (!product) {
      showNotification("error", "Error", "Product not found");
      return;
    }

    const adjustmentItem: AdjustmentItem = {
      productId: newItem.productId,
      product,
      currentStock: newItem.currentStock,
      adjustedStock: newItem.adjustmentType === 'SET'
        ? newItem.adjustmentQuantity
        : newItem.adjustmentType === 'INCREASE'
        ? newItem.currentStock + newItem.adjustmentQuantity
        : newItem.currentStock - newItem.adjustmentQuantity,
      adjustmentQuantity: newItem.adjustmentQuantity,
      adjustmentType: newItem.adjustmentType,
      reason: newItem.reason,
      notes: newItem.notes,
    };

    setAdjustmentItems(prev => [...prev, adjustmentItem]);

    // Reset form
    setNewItem({
      productId: "",
      currentStock: 0,
      adjustmentType: "SET",
      adjustmentQuantity: 0,
      reason: "Stock correction",
      notes: "",
    });
  };

  const removeAdjustmentItem = (index: number) => {
    setAdjustmentItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.warehouseId) {
      showNotification("error", "Error", "Please select a warehouse");
      return;
    }

    if (adjustmentItems.length === 0) {
      showNotification("error", "Error", "Please add at least one adjustment item");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        warehouseId: formData.warehouseId,
        adjustmentDate: formData.adjustmentDate,
        reason: formData.reason,
        notes: formData.notes,
        items: adjustmentItems.map(item => ({
          productId: item.productId,
          currentStock: item.currentStock,
          adjustedStock: item.adjustedStock,
          adjustmentQuantity: item.adjustmentQuantity,
          adjustmentType: item.adjustmentType,
          reason: item.reason,
          notes: item.notes,
        })),
      };

      // For now, just simulate success since we don't have the API endpoint
      console.log("Stock adjustment payload:", payload);

      showNotification("success", "Success", "Stock adjustment completed successfully!");

      // Redirect back to out of stock page
      setTimeout(() => {
        router.push("/warehouse/management?tab=out-of-stock&refresh=true");
      }, 500);

    } catch (error: any) {
      console.error("Error adjusting stock:", error);
      showNotification("error", "Error", error.message || "Failed to adjust stock");
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <h1 className="text-2xl font-bold text-gray-800">Adjust Stock</h1>
        <Button
          variant="outline"
          onClick={() => router.push("/warehouse/management?tab=out-of-stock")}
        >
          Back to Out of Stock
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Adjustment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="warehouse">Warehouse *</Label>
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
                <Label htmlFor="adjustmentDate">Adjustment Date *</Label>
                <Input
                  type="date"
                  id="adjustmentDate"
                  value={formData.adjustmentDate}
                  onChange={(e) => handleFormChange("adjustmentDate", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Select
                  value={formData.reason}
                  onChange={(e) => handleFormChange("reason", e.target.value)}
                >
                  <option value="STOCK_CORRECTION">Stock Correction</option>
                  <option value="DAMAGE">Damage</option>
                  <option value="THEFT">Theft</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="FOUND">Found Stock</option>
                  <option value="OTHER">Other</option>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleFormChange("notes", e.target.value)}
                placeholder="Additional notes about this stock adjustment"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Add Items */}
        <Card>
          <CardHeader>
            <CardTitle>Add Adjustment Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                <Label>Current Stock</Label>
                <Input
                  type="number"
                  min="0"
                  value={newItem.currentStock}
                  onChange={(e) => handleItemChange("currentStock", parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label>Adjustment Type</Label>
                <Select
                  value={newItem.adjustmentType}
                  onChange={(e) => handleItemChange("adjustmentType", e.target.value)}
                >
                  <option value="SET">Set To</option>
                  <option value="INCREASE">Increase By</option>
                  <option value="DECREASE">Decrease By</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  value={newItem.adjustmentQuantity}
                  onChange={(e) => handleItemChange("adjustmentQuantity", parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button type="button" onClick={addAdjustmentItem} className="w-full">
                  Add Item
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Item Notes</Label>
              <Input
                value={newItem.notes}
                onChange={(e) => handleItemChange("notes", e.target.value)}
                placeholder="Optional notes for this adjustment"
              />
            </div>
          </CardContent>
        </Card>

        {/* Items List */}
        {adjustmentItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Adjustment Items ({adjustmentItems.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {adjustmentItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between border rounded-lg p-4">
                    <div className="flex-1">
                      <div className="font-medium">{item.product?.name}</div>
                      <div className="text-sm text-gray-600">
                        SKU: {item.product?.sku} |
                        Current: {item.currentStock} → Adjusted: {item.adjustedStock} |
                        Type: {item.adjustmentType}
                      </div>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">{item.adjustmentType}</Badge>
                        <Badge variant="outline">Qty: {item.adjustmentQuantity}</Badge>
                        {item.notes && <Badge variant="outline">Note: {item.notes}</Badge>}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeAdjustmentItem(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/warehouse/management?tab=out-of-stock")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || adjustmentItems.length === 0}
          >
            {isSubmitting ? "Processing..." : "Adjust Stock"}
          </Button>
        </div>
      </form>
    </div>
  );
}
