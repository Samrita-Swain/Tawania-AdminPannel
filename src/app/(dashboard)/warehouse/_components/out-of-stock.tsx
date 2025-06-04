"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";

interface OutOfStockItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  category: string;
  lastStockDate: string;
  lastQuantity: number;
  warehouseLocation: string;
  reorderPoint: number;
  status: 'OUT_OF_STOCK' | 'CRITICAL' | 'REORDER_PENDING';
  estimatedValue: number;
  supplier?: string;
}

export default function OutOfStockComponent() {
  const [outOfStockItems, setOutOfStockItems] = useState<OutOfStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);



  useEffect(() => {
    const fetchOutOfStockItems = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Build query parameters
        const params = new URLSearchParams();
        params.append("stockType", "outOfStock");
        if (statusFilter !== "all") params.append("status", statusFilter);

        // Try multiple endpoints
        const endpoints = [
          `/api/warehouse/stock-status?${params.toString()}`,
        ];

        let success = false;

        for (const endpoint of endpoints) {
          if (success) break;

          try {
            console.log(`Trying to fetch out-of-stock items from: ${endpoint}`);
            const response = await fetch(endpoint);

            if (!response.ok) {
              // Silently continue to next endpoint without logging error
              continue;
            }

            const data = await response.json();
            console.log(`Fetched out-of-stock data from ${endpoint}:`, data);

            // Transform stock status data to out-of-stock items
            const items = (data.stockStatuses || []).map((stock: any) => ({
              id: stock.id,
              productId: stock.productId,
              productName: stock.product?.name || 'Unknown Product',
              productSku: stock.product?.sku || 'N/A',
              category: stock.product?.category?.name || 'Uncategorized',
              lastStockDate: stock.lastMovementAt || stock.updatedAt,
              lastQuantity: stock.currentStock || 0,
              warehouseLocation: stock.warehouse?.name || 'Unknown Warehouse',
              reorderPoint: stock.product?.reorderPoint || 0,
              status: stock.outOfStock ? 'OUT_OF_STOCK' : 'CRITICAL',
              estimatedValue: (stock.currentStock || 0) * 100, // Estimated value
              supplier: stock.product?.supplier?.name,
            }));

            if (items.length > 0) {
              setOutOfStockItems(items);
              success = true;
              break;
            }
          } catch (endpointError) {
            // Silently continue to next endpoint
          }
        }

        if (!success) {
          // No mock data - only show real data
          setOutOfStockItems([]);
          setError('No out of stock items found. Database tables may not be set up yet.');
        }
      } catch (error: any) {
        // No mock data - only show real data
        setOutOfStockItems([]);
        setError('Failed to load out of stock items');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOutOfStockItems();
  }, [statusFilter]);

  // Filter items based on search and filters
  const filteredItems = outOfStockItems.filter(item => {
    const matchesSearch = searchQuery === "" ||
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.productSku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OUT_OF_STOCK":
        return <Badge variant="outline" className="bg-red-100 text-red-800">Out of Stock</Badge>;
      case "CRITICAL":
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">Critical</Badge>;
      case "REORDER_PENDING":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Reorder Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get unique categories for filter
  const categories = [...new Set(outOfStockItems.map(item => item.category))];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Out of Stock Items</CardTitle>
          <p className="text-sm text-gray-600 mt-1">Products that are finished or critically low</p>
        </div>
        <div className="flex space-x-2">
          <Link href="/warehouse/reorder/new">
            <Button>Create Purchase Order</Button>
          </Link>
          <Link href="/warehouse/adjust-stock">
            <Button variant="outline">Adjust Stock</Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-col gap-4 md:flex-row">
          <div className="flex-1">
            <Input
              placeholder="Search by product name, SKU, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full"
            >
              <option value="all">All Statuses</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
              <option value="CRITICAL">Critical</option>
              <option value="REORDER_PENDING">Reorder Pending</option>
            </Select>
          </div>
          <div className="w-full md:w-48">
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="mb-4 rounded-lg bg-red-50 p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-medium text-red-800">Stock Alert Summary</h3>
              <p className="text-sm text-red-700">
                {filteredItems.filter(item => item.status === 'OUT_OF_STOCK').length} out of stock, {' '}
                {filteredItems.filter(item => item.status === 'CRITICAL').length} critical items
              </p>
            </div>
            <div className="mt-2 md:mt-0">
              <p className="text-lg font-bold text-red-800">
                Total Items: {filteredItems.length}
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
            <span className="ml-2">Loading...</span>
          </div>
        ) : error && !outOfStockItems.length ? (
          <div className="flex h-40 flex-col items-center justify-center">
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-800">
              <p className="font-medium">Error loading out-of-stock items</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
                    <th className="px-4 py-2">Product</th>
                    <th className="px-4 py-2">Category</th>
                    <th className="px-4 py-2">Location</th>
                    <th className="px-4 py-2">Last Stock</th>
                    <th className="px-4 py-2">Reorder Point</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Supplier</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <div className="font-medium">{item.productName}</div>
                          <div className="text-xs text-gray-800">{item.productSku}</div>
                        </td>
                        <td className="px-4 py-2">{item.category}</td>
                        <td className="px-4 py-2">{item.warehouseLocation}</td>
                        <td className="px-4 py-2">
                          <div>{item.lastQuantity}</div>
                          <div className="text-xs text-gray-800">
                            {(() => {
                              try {
                                return format(new Date(item.lastStockDate), "MMM dd, yyyy");
                              } catch (e) {
                                return item.lastStockDate;
                              }
                            })()}
                          </div>
                        </td>
                        <td className="px-4 py-2">{item.reorderPoint}</td>
                        <td className="px-4 py-2">{getStatusBadge(item.status)}</td>
                        <td className="px-4 py-2">{item.supplier || 'N/A'}</td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex justify-end space-x-2">
                            <Link href={`/warehouse/view/${item.productId}`}>
                              <Button variant="outline" size="sm">View</Button>
                            </Link>
                            <Link href={`/warehouse/reorder/${item.productId}`}>
                              <Button variant="outline" size="sm" className="bg-blue-50 text-blue-600 hover:bg-blue-100">
                                Reorder
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="h-24 px-4 py-2 text-center">
                        No out-of-stock items found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
