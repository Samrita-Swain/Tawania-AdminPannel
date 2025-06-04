"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { format } from "date-fns";
import Link from "next/link";
// import {
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   Legend,
//   ResponsiveContainer
// } from "recharts";

interface ClosingStockItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  category: string;
  quantity: number;
  value: number;
  location: string;
  lastUpdated: string;
}

interface CategorySummary {
  name: string;
  quantity: number;
  value: number;
}

export default function ClosingStockComponent() {
  const [stockItems, setStockItems] = useState<ClosingStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [categorySummary, setCategorySummary] = useState<CategorySummary[]>([]);
  const [error, setError] = useState<string | null>(null);



  useEffect(() => {
    const fetchStockItems = async () => {
      try {
        setIsLoading(true);
        setError(null); // Clear any previous errors

        // Try multiple endpoints for stock data
        const endpoints = [
          "/api/warehouse/stock-status",
          "/api/inventory/data",
          "/api/warehouse/closing-stock"
        ];

        let data = null;
        let success = false;

        for (const endpoint of endpoints) {
          try {
            console.log(`Trying to fetch stock data from: ${endpoint}`);
            const response = await fetch(endpoint);

            if (!response.ok) {
              // Silently continue to next endpoint without logging error
              continue;
            }

            data = await response.json();
            console.log(`Fetched stock data from ${endpoint}:`, data);
            success = true;
            break;
          } catch (endpointError) {
            // Silently continue to next endpoint
          }
        }

        if (!success || !data) {
          // No mock data - only show real data
          setStockItems([]);
          setCategories([]);
          setLocations([]);
          setCategorySummary([]);
          setError('No closing stock data found. Database tables may not be set up yet.');
          return;
        }

        let closingStockItems = [];

        // Handle different data formats
        if (data.stockStatuses) {
          // New stock status API format
          closingStockItems = data.stockStatuses.map((stock: any) => ({
            id: stock.id,
            productId: stock.productId,
            productName: stock.product?.name || "Unknown Product",
            productSku: stock.product?.sku || "",
            category: stock.product?.category?.name || "Uncategorized",
            quantity: stock.currentStock || 0,
            value: (stock.currentStock || 0) * 100, // Estimated value
            location: stock.warehouse?.name || "Unknown Warehouse",
            lastUpdated: stock.lastMovementAt || stock.updatedAt || new Date().toISOString()
          }));
        } else if (data.inventoryItems) {
          // Legacy inventory API format
          const productsMap = new Map();
          data.products?.forEach((product: any) => {
            productsMap.set(product.id, product);
          });

          // Filter inventory items with low stock (near or below reorder point)
          const lowStockItems = data.inventoryItems?.filter((item: any) => {
            const product = productsMap.get(item.productId);
            return product && item.quantity <= (product.reorderPoint || 10);
          }) || [];

          // Transform the data to match our component's expected format
          closingStockItems = lowStockItems.map((item: any) => {
            const product = productsMap.get(item.productId);
            return {
              id: item.id,
              productId: item.productId,
              productName: product?.name || "Unknown Product",
              productSku: product?.sku || "",
              category: product?.category?.name || "Uncategorized",
              quantity: item.quantity,
              value: item.quantity * (item.costPrice || 0),
              location: item.warehouseId ? "Warehouse" : (item.storeId ? "Store" : "Unknown"),
              lastUpdated: item.updatedAt || new Date().toISOString()
            };
          });
        }

        if (closingStockItems.length === 0) {
          // No mock data - only show real data
          setStockItems([]);
          setCategories([]);
          setLocations([]);
          setCategorySummary([]);
          setError('No closing stock items found.');
        } else {
          setStockItems(closingStockItems);

          // Extract unique categories and locations
          const uniqueCategories = Array.from(new Set(closingStockItems.map((item: ClosingStockItem) => item.category)));
          const uniqueLocations = Array.from(new Set(closingStockItems.map((item: ClosingStockItem) => item.location)));

          setCategories(uniqueCategories);
          setLocations(uniqueLocations);

          // Create category summary for chart
          const summary: Record<string, CategorySummary> = {};
          closingStockItems.forEach((item: ClosingStockItem) => {
            if (!summary[item.category]) {
              summary[item.category] = {
                name: item.category,
                quantity: 0,
                value: 0
              };
            }
            summary[item.category].quantity += item.quantity;
            summary[item.category].value += item.value;
          });

          setCategorySummary(Object.values(summary));
        }
      } catch (error: any) {
        // No mock data - only show real data
        setStockItems([]);
        setCategories([]);
        setLocations([]);
        setCategorySummary([]);
        setError('Failed to load closing stock data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStockItems();
  }, []);

  // Filter stock items based on search query, category, and location
  const filteredItems = stockItems.filter(item => {
    // Search filter
    const matchesSearch = searchQuery === "" ||
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.productSku.toLowerCase().includes(searchQuery.toLowerCase());

    // Category filter
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;

    // Location filter
    const matchesLocation = locationFilter === "all" || item.location === locationFilter;

    return matchesSearch && matchesCategory && matchesLocation;
  });

  // Sort filtered items
  const sortedItems = [...filteredItems].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "name":
        comparison = a.productName.localeCompare(b.productName);
        break;
      case "sku":
        comparison = a.productSku.localeCompare(b.productSku);
        break;
      case "category":
        comparison = a.category.localeCompare(b.category);
        break;
      case "quantity":
        comparison = a.quantity - b.quantity;
        break;
      case "value":
        comparison = a.value - b.value;
        break;
      case "location":
        comparison = a.location.localeCompare(b.location);
        break;
      case "lastUpdated":
        comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
        break;
      default:
        comparison = 0;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  // Calculate totals
  const totalItems = filteredItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = filteredItems.reduce((sum, item) => sum + item.value, 0);

  // Handle sort change
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  // Get sort indicator
  const getSortIndicator = (column: string) => {
    if (sortBy !== column) return null;
    return sortOrder === "asc" ? " ↑" : " ↓";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Closing Stock</CardTitle>
        <Link href="/warehouse/management?export=stock">
          <Button variant="outline">Export Stock</Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-blue-50 p-4">
            <h3 className="text-sm font-medium text-blue-700">Total Products</h3>
            <p className="mt-1 text-2xl font-bold text-blue-900">{filteredItems.length}</p>
          </div>
          <div className="rounded-lg bg-green-50 p-4">
            <h3 className="text-sm font-medium text-green-700">Total Quantity</h3>
            <p className="mt-1 text-2xl font-bold text-green-900">{totalItems}</p>
          </div>
          <div className="rounded-lg bg-purple-50 p-4">
            <h3 className="text-sm font-medium text-purple-700">Total Value</h3>
            <p className="mt-1 text-2xl font-bold text-purple-900">₹{totalValue.toFixed(2)}</p>
          </div>
        </div>

        {categorySummary.length > 0 && (
          <div className="mb-6 rounded-lg border p-4">
            <h3 className="mb-4 text-lg font-medium">Stock by Category</h3>
            <div className="h-64">
              {/* Chart will be implemented later */}
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-800">Category summary chart will be displayed here</p>
                  <p className="text-sm text-gray-800">Chart library needs to be installed</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4 flex flex-col gap-4 md:flex-row">
          <div className="flex-1">
            <Input
              placeholder="Search by product name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </Select>
          </div>
          <div className="w-full md:w-48">
            <Select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full"
            >
              <option value="all">All Locations</option>
              {locations.map((location) => (
                <option key={location} value={location}>{location}</option>
              ))}
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
            <span className="ml-2">Loading...</span>
          </div>
        ) : error ? (
          <div className="flex h-40 flex-col items-center justify-center">
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-800">
              <p className="font-medium">Error loading closing stock</p>
              <p className="mt-1 text-sm">{error}</p>
              <p className="mt-2 text-sm">This is expected if the API endpoint is not implemented yet.</p>
            </div>
          </div>
        ) : (
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
                    <th className="px-4 py-2 cursor-pointer" onClick={() => handleSort("name")}>
                      Product {getSortIndicator("name")}
                    </th>
                    <th className="px-4 py-2 cursor-pointer" onClick={() => handleSort("sku")}>
                      SKU {getSortIndicator("sku")}
                    </th>
                    <th className="px-4 py-2 cursor-pointer" onClick={() => handleSort("category")}>
                      Category {getSortIndicator("category")}
                    </th>
                    <th className="px-4 py-2 cursor-pointer" onClick={() => handleSort("quantity")}>
                      Quantity {getSortIndicator("quantity")}
                    </th>
                    <th className="px-4 py-2 cursor-pointer text-right" onClick={() => handleSort("value")}>
                      Value {getSortIndicator("value")}
                    </th>
                    <th className="px-4 py-2 cursor-pointer" onClick={() => handleSort("location")}>
                      Location {getSortIndicator("location")}
                    </th>
                    <th className="px-4 py-2 cursor-pointer" onClick={() => handleSort("lastUpdated")}>
                      Last Updated {getSortIndicator("lastUpdated")}
                    </th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedItems.length > 0 ? (
                    sortedItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{item.productName}</td>
                        <td className="px-4 py-2">{item.productSku}</td>
                        <td className="px-4 py-2">{item.category}</td>
                        <td className="px-4 py-2">{item.quantity}</td>
                        <td className="px-4 py-2 text-right">₹{item.value.toFixed(2)}</td>
                        <td className="px-4 py-2">{item.location}</td>
                        <td className="px-4 py-2">
                          {(() => {
                            try {
                              return format(new Date(item.lastUpdated), "MMM dd, yyyy");
                            } catch (e) {
                              return item.lastUpdated;
                            }
                          })()}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Link href={`/warehouse/stock/${item.productId}`}>
                            <Button variant="outline" size="sm">View</Button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="h-24 px-4 py-2 text-center">
                        No stock items found.
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

