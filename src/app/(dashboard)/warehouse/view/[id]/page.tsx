"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  category?: string;
  currentStock: number;
  reorderPoint: number;
  unitPrice: number;
  supplier?: string;
  lastStockDate: string;
  status: string;
  warehouseLocation: string;
}

interface StockMovement {
  id: string;
  date: string;
  type: 'INWARD' | 'OUTWARD' | 'ADJUSTMENT';
  quantity: number;
  reason: string;
  reference: string;
}

export default function ViewProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Try to fetch product data
        try {
          const response = await fetch(`/api/products/${productId}`);
          if (response.ok) {
            const data = await response.json();
            setProduct(data.product);
          } else {
            throw new Error("Product not found");
          }
        } catch (apiError) {
          // No mock data - only show real data
          setProduct(null);
          setError("Product not found");
        }

        // Try to fetch stock movements
        try {
          const response = await fetch(`/api/products/${productId}/movements`);
          if (response.ok) {
            const data = await response.json();
            setStockMovements(data.movements || []);
          } else {
            throw new Error("Movements not found");
          }
        } catch (apiError) {
          // No mock data - only show real data
          setStockMovements([]);
        }

      } catch (error: any) {
        console.error("Error fetching product data:", error);
        setError(error.message || "Failed to load product data");
      } finally {
        setIsLoading(false);
      }
    };

    if (productId) {
      fetchProductData();
    }
  }, [productId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OUT_OF_STOCK":
        return <Badge variant="outline" className="bg-red-100 text-red-800">Out of Stock</Badge>;
      case "CRITICAL":
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">Critical</Badge>;
      case "IN_STOCK":
        return <Badge variant="outline" className="bg-green-100 text-green-800">In Stock</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMovementTypeBadge = (type: string) => {
    switch (type) {
      case "INWARD":
        return <Badge variant="outline" className="bg-green-100 text-green-800">Inward</Badge>;
      case "OUTWARD":
        return <Badge variant="outline" className="bg-red-100 text-red-800">Outward</Badge>;
      case "ADJUSTMENT":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Adjustment</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
        <span className="ml-2">Loading product details...</span>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex h-40 flex-col items-center justify-center">
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-800">
          <p className="font-medium">Error loading product</p>
          <p className="mt-1 text-sm">{error || "Product not found"}</p>
        </div>
        <Button onClick={() => router.push("/warehouse/management?tab=out-of-stock")}>
          Back to Out of Stock
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{product.name}</h1>
          <p className="text-gray-600">SKU: {product.sku}</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => router.push("/warehouse/management?tab=out-of-stock")}
          >
            Back to Out of Stock
          </Button>
          <Button
            onClick={() => router.push(`/warehouse/reorder/${product.id}`)}
          >
            Reorder
          </Button>
        </div>
      </div>

      {/* Product Information */}
      <Card>
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h3 className="font-medium text-gray-800 mb-2">Basic Details</h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Name:</span> {product.name}</div>
                <div><span className="font-medium">SKU:</span> {product.sku}</div>
                <div><span className="font-medium">Category:</span> {product.category || 'N/A'}</div>
                <div><span className="font-medium">Description:</span> {product.description || 'N/A'}</div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-800 mb-2">Stock Information</h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Current Stock:</span> {product.currentStock}</div>
                <div><span className="font-medium">Reorder Point:</span> {product.reorderPoint}</div>
                <div><span className="font-medium">Status:</span> {getStatusBadge(product.status)}</div>
                <div><span className="font-medium">Location:</span> {product.warehouseLocation}</div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-800 mb-2">Other Details</h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Unit Price:</span> ${product.unitPrice.toFixed(2)}</div>
                <div><span className="font-medium">Supplier:</span> {product.supplier || 'N/A'}</div>
                <div><span className="font-medium">Last Stock Date:</span> {format(new Date(product.lastStockDate), "MMM dd, yyyy")}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Movements */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Stock Movements</CardTitle>
        </CardHeader>
        <CardContent>
          {stockMovements.length > 0 ? (
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2">Quantity</th>
                      <th className="px-4 py-2">Reason</th>
                      <th className="px-4 py-2">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stockMovements.map((movement) => (
                      <tr key={movement.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          {format(new Date(movement.date), "MMM dd, yyyy HH:mm")}
                        </td>
                        <td className="px-4 py-2">
                          {getMovementTypeBadge(movement.type)}
                        </td>
                        <td className="px-4 py-2">
                          <span className={movement.quantity > 0 ? "text-green-600" : "text-red-600"}>
                            {movement.quantity > 0 ? "+" : ""}{movement.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-2">{movement.reason}</td>
                        <td className="px-4 py-2">{movement.reference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No stock movements found for this product.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/warehouse/reorder/${product.id}`)}
            >
              Create Reorder
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/warehouse/adjust-stock")}
            >
              Adjust Stock
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/warehouse/management?tab=out-of-stock")}
            >
              Back to Out of Stock List
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
