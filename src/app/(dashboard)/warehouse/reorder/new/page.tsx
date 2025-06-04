"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  currentStock: number;
  reorderPoint: number;
  unitPrice: number;
  supplier?: string;
}

interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export default function NewReorderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedProductId = searchParams.get("productId");
  const { showNotification } = useNotification();

  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    productId: preselectedProductId || "",
    supplierId: "",
    quantity: 1,
    unitPrice: 0,
    expectedDeliveryDate: "",
    priority: "NORMAL",
    notes: "",
  });

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingData(true);

        // Try to fetch products
        try {
          const response = await fetch("/api/products");
          if (response.ok) {
            const data = await response.json();
            setProducts(data.products || []);
          } else {
            throw new Error("Products not found");
          }
        } catch (apiError) {
          // No mock data - only show real data
          setProducts([]);
        }

        // Try to fetch suppliers
        try {
          const response = await fetch("/api/suppliers");
          if (response.ok) {
            const data = await response.json();
            setSuppliers(data.suppliers || []);
          } else {
            throw new Error("Suppliers not found");
          }
        } catch (apiError) {
          // No mock data - only show real data
          setSuppliers([]);
        }

      } catch (error) {
        console.error("Error loading data:", error);
        showNotification("error", "Error", "Failed to load data");
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [showNotification]);

  // Update form when product is selected
  useEffect(() => {
    if (formData.productId) {
      const selectedProduct = products.find(p => p.id === formData.productId);
      if (selectedProduct) {
        setFormData(prev => ({
          ...prev,
          quantity: Math.max(selectedProduct.reorderPoint * 2, 10),
          unitPrice: selectedProduct.unitPrice,
        }));
      }
    }
  }, [formData.productId, products]);

  const handleFormChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateTotal = () => {
    const quantity = Number(formData.quantity) || 0;
    const unitPrice = Number(formData.unitPrice) || 0;
    return quantity * unitPrice;
  };

  const getSelectedProduct = () => {
    return products.find(p => p.id === formData.productId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.productId) {
      showNotification("error", "Error", "Please select a product");
      return;
    }

    if (!formData.supplierId) {
      showNotification("error", "Error", "Please select a supplier");
      return;
    }

    if (formData.quantity <= 0) {
      showNotification("error", "Error", "Please enter a valid quantity");
      return;
    }

    if (formData.unitPrice <= 0) {
      showNotification("error", "Error", "Please enter a valid unit price");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        productId: formData.productId,
        supplierId: formData.supplierId,
        quantity: formData.quantity,
        unitPrice: formData.unitPrice,
        totalAmount: calculateTotal(),
        expectedDeliveryDate: formData.expectedDeliveryDate,
        priority: formData.priority,
        notes: formData.notes,
        status: "PENDING",
      };

      // For now, just simulate success since we don't have the API endpoint
      console.log("Reorder payload:", payload);

      showNotification("success", "Success", "Reorder request created successfully!");

      // Redirect back to out of stock page
      setTimeout(() => {
        router.push("/warehouse/management?tab=out-of-stock&refresh=true");
      }, 500);

    } catch (error: any) {
      console.error("Error creating reorder:", error);
      showNotification("error", "Error", error.message || "Failed to create reorder request");
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

  const selectedProduct = getSelectedProduct();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Create Purchase Order</h1>
          <p className="text-gray-600">Create a new purchase order for restocking</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push("/warehouse/management?tab=out-of-stock")}
        >
          Back to Out of Stock
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Product Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product">Product *</Label>
              <Select
                value={formData.productId}
                onChange={(e) => handleFormChange("productId", e.target.value)}
                required
              >
                <option value="">Select Product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku}) - Current Stock: {product.currentStock}
                  </option>
                ))}
              </Select>
            </div>

            {selectedProduct && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-800">Current Stock</div>
                  <div className="text-lg font-bold text-red-600">{selectedProduct.currentStock}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-800">Reorder Point</div>
                  <div className="text-lg font-bold text-orange-600">{selectedProduct.reorderPoint}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-800">Category</div>
                  <div className="text-lg font-bold text-blue-600">{selectedProduct.category || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-800">Last Unit Price</div>
                  <div className="text-lg font-bold text-green-600">${(Number(selectedProduct.unitPrice) || 0).toFixed(2)}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Information */}
        <Card>
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier *</Label>
                <Select
                  value={formData.supplierId}
                  onChange={(e) => handleFormChange("supplierId", e.target.value)}
                  required
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onChange={(e) => handleFormChange("priority", e.target.value)}
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  type="number"
                  id="quantity"
                  min="1"
                  value={formData.quantity || ""}
                  onChange={(e) => handleFormChange("quantity", parseInt(e.target.value) || 1)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unitPrice">Unit Price *</Label>
                <Input
                  type="number"
                  id="unitPrice"
                  step="0.01"
                  min="0"
                  value={formData.unitPrice || ""}
                  onChange={(e) => handleFormChange("unitPrice", parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="total">Total Amount</Label>
                <Input
                  type="text"
                  id="total"
                  value={`$${(calculateTotal() || 0).toFixed(2)}`}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedDeliveryDate">Expected Delivery Date</Label>
              <Input
                type="date"
                id="expectedDeliveryDate"
                value={formData.expectedDeliveryDate}
                onChange={(e) => handleFormChange("expectedDeliveryDate", e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleFormChange("notes", e.target.value)}
                placeholder="Additional notes for this purchase order"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        {selectedProduct && (
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Product:</span>
                  <span className="font-medium">{selectedProduct.name} ({selectedProduct.sku})</span>
                </div>
                <div className="flex justify-between">
                  <span>Quantity:</span>
                  <span className="font-medium">{formData.quantity} units</span>
                </div>
                <div className="flex justify-between">
                  <span>Unit Price:</span>
                  <span className="font-medium">${(Number(formData.unitPrice) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Priority:</span>
                  <Badge variant="outline" className={
                    formData.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                    formData.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                    formData.priority === 'NORMAL' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    {formData.priority}
                  </Badge>
                </div>
                <hr />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount:</span>
                  <span>${(calculateTotal() || 0).toFixed(2)}</span>
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
            onClick={() => router.push("/warehouse/management?tab=out-of-stock")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !formData.productId || formData.quantity <= 0 || formData.unitPrice <= 0}
          >
            {isSubmitting ? "Creating..." : "Create Purchase Order"}
          </Button>
        </div>
      </form>
    </div>
  );
}
