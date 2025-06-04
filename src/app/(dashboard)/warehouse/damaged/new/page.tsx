"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useNotification } from "@/components/ui/notification";
import PageWrapper from "./page-wrapper";

// Default export for Next.js page
export default PageWrapper;

interface Product {
  id: string;
  name: string;
  sku: string;
  costPrice: number;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

export function ReportDamagedItemPage() {
  const router = useRouter();
  const { showNotification } = useNotification();

  // Form state
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState<"inward" | "outward" | "other">("other");
  const [sourceReference, setSourceReference] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch products and warehouses
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch products
        const productsResponse = await fetch("/api/products");
        if (productsResponse.ok) {
          const data = await productsResponse.json();
          setProducts(data.products || []);
        }

        // Fetch warehouses
        const warehousesResponse = await fetch("/api/warehouses");
        if (warehousesResponse.ok) {
          const data = await warehousesResponse.json();
          setWarehouses(data.warehouses || []);

          // Set default warehouse if available
          if (data.warehouses?.length > 0) {
            setSelectedWarehouse(data.warehouses[0].id);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        showNotification("error", "Error", "Failed to load data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate value based on selected product and quantity
  const calculateValue = () => {
    const product = products.find(p => p.id === selectedProduct);
    return product ? product.costPrice * quantity : 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct || !selectedWarehouse || quantity <= 0 || !reason) {
      showNotification("error", "Validation Error", "Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const product = products.find(p => p.id === selectedProduct);

      const response = await fetch("/api/warehouse/damaged", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: selectedProduct,
          warehouseId: selectedWarehouse,
          quantity,
          reason,
          notes,
          source,
          sourceReference,
          value: calculateValue(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to report damaged item");
      }

      showNotification("success", "Success", "Damaged item reported successfully");
      router.push("/warehouse/management");
    } catch (error: any) {
      console.error("Error reporting damaged item:", error);
      showNotification("error", "Error", error.message || "Failed to report damaged item. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Report Damaged Item</h1>
        <Button
          variant="outline"
          onClick={() => router.back()}
        >
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Damaged Item Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Product Selection */}
              <div className="space-y-2">
                <Label htmlFor="product" className="font-medium">
                  Product <span className="text-red-500">*</span>
                </Label>
                <Select
                  id="product"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  disabled={isLoading || isSubmitting}
                  required
                  className="w-full"
                >
                  <option value="">Select a product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </Select>
              </div>

              {/* Warehouse Selection */}
              <div className="space-y-2">
                <Label htmlFor="warehouse" className="font-medium">
                  Warehouse <span className="text-red-500">*</span>
                </Label>
                <Select
                  id="warehouse"
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  disabled={isLoading || isSubmitting}
                  required
                  className="w-full"
                >
                  <option value="">Select a warehouse</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} ({warehouse.code})
                    </option>
                  ))}
                </Select>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity" className="font-medium">
                  Quantity <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  disabled={isLoading || isSubmitting}
                  required
                />
              </div>

              {/* Source */}
              <div className="space-y-2">
                <Label htmlFor="source" className="font-medium">
                  Source
                </Label>
                <Select
                  id="source"
                  value={source}
                  onChange={(e) => setSource(e.target.value as "inward" | "outward" | "other")}
                  disabled={isLoading || isSubmitting}
                  className="w-full"
                >
                  <option value="inward">Inward (Receiving)</option>
                  <option value="outward">Outward (Transfer)</option>
                  <option value="other">Other</option>
                </Select>
              </div>

              {/* Source Reference */}
              <div className="space-y-2">
                <Label htmlFor="sourceReference" className="font-medium">
                  Reference Number
                </Label>
                <Input
                  id="sourceReference"
                  value={sourceReference}
                  onChange={(e) => setSourceReference(e.target.value)}
                  disabled={isLoading || isSubmitting}
                  placeholder="PO-2023-001 or TR-2023-001"
                />
              </div>

              {/* Value (Calculated) */}
              <div className="space-y-2">
                <Label htmlFor="value" className="font-medium">
                  Value
                </Label>
                <Input
                  id="value"
                  value={`$${calculateValue().toFixed(2)}`}
                  disabled
                  readOnly
                />
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason" className="font-medium">
                Reason for Damage <span className="text-red-500">*</span>
              </Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isLoading || isSubmitting}
                required
                placeholder="e.g., Broken during transport, Manufacturing defect"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="font-medium">
                Additional Notes
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isLoading || isSubmitting}
                placeholder="Enter any additional details about the damaged item"
                rows={4}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isLoading || isSubmitting}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isSubmitting ? "Submitting..." : "Report Damaged Item"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
