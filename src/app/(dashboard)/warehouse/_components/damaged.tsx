"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";

interface DamagedItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  reason: string;
  reportedDate: string;
  status: string;
  location: string;
  value: number;
  source: 'inward' | 'outward' | 'other';
  sourceReferenceId: string;
  sourceReference: string;
}

export default function DamagedComponent() {
  const [damagedItems, setDamagedItems] = useState<DamagedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDamagedItems = async () => {
      try {
        setIsLoading(true);
        setError(null); // Clear any previous errors

        // Build query parameters
        const params = new URLSearchParams();
        if (sourceFilter !== "all") params.append("source", sourceFilter);
        if (statusFilter !== "all") params.append("status", statusFilter);

        // Fetch data from the API
        const response = await fetch(`/api/warehouse/damaged?${params.toString()}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch damaged items: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.items || !Array.isArray(data.items)) {
          throw new Error("Invalid data format received from API");
        }

        // Calculate value for each item if not provided
        const itemsWithValue = data.items.map((item: any) => {
          // If value is not provided or is 0, calculate it based on quantity and a default value
          if (!item.value || item.value === 0) {
            // Default value of ₹100 per item if not specified
            item.value = item.quantity * 100;
          }
          return item;
        });

        setDamagedItems(itemsWithValue);
      } catch (error: any) {
        console.error("Error fetching damaged items:", error);
        // Set error message and empty array
        setError(error.message || "Failed to fetch damaged items. API endpoint may not be implemented yet.");
        setDamagedItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDamagedItems();
  }, [sourceFilter, statusFilter]);

  // Filter damaged items based on search query, status, date, and source
  const filteredItems = damagedItems.filter(item => {
    // Search filter
    const matchesSearch = searchQuery === "" ||
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.productSku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sourceReference.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus = statusFilter === "all" || item.status.toLowerCase() === statusFilter.toLowerCase();

    // Source filter
    const matchesSource = sourceFilter === "all" || item.source === sourceFilter;

    // Date filter
    let matchesDate = true;
    if (dateFilter === "today") {
      const today = new Date().toISOString().split("T")[0];
      matchesDate = item.reportedDate.startsWith(today);
    } else if (dateFilter === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      matchesDate = new Date(item.reportedDate) >= weekAgo;
    } else if (dateFilter === "month") {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      matchesDate = new Date(item.reportedDate) >= monthAgo;
    }

    return matchesSearch && matchesStatus && matchesSource && matchesDate;
  });

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "reported":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Reported</Badge>;
      case "inspected":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Inspected</Badge>;
      case "disposed":
        return <Badge variant="outline" className="bg-red-100 text-red-800">Disposed</Badge>;
      case "repaired":
        return <Badge variant="outline" className="bg-green-100 text-green-800">Repaired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate total value of damaged items
  const totalValue = filteredItems.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Damaged Inventory</CardTitle>
        <Link href="/warehouse/damaged/new">
          <Button>Report Damaged Item</Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-col gap-4 md:flex-row">
          <div className="flex-1">
            <Input
              placeholder="Search by product name, SKU, location, or reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-full md:w-36">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full"
            >
              <option value="all">All Statuses</option>
              <option value="reported">Reported</option>
              <option value="inspected">Inspected</option>
              <option value="disposed">Disposed</option>
              <option value="repaired">Repaired</option>
            </Select>
          </div>
          <div className="w-full md:w-36">
            <Select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as 'inward' | 'outward' | 'other' | 'all')}
              className="w-full"
            >
              <option value="all">All Sources</option>
              <option value="inward">Inward</option>
              <option value="outward">Outward</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div className="w-full md:w-36">
            <Select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </Select>
          </div>
        </div>

        <div className="mb-4 rounded-lg bg-amber-50 p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-medium text-amber-800">Damaged Inventory Summary</h3>
              <p className="text-sm text-amber-700">Total items: {filteredItems.length}</p>
            </div>
            <div className="mt-2 md:mt-0">
              <p className="text-lg font-bold text-amber-800">
                Total Value: ₹{totalValue.toFixed(2)}
              </p>
            </div>
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
              <p className="font-medium">Error loading damaged items</p>
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
                    <th className="px-4 py-2">Product</th>
                    <th className="px-4 py-2">Location</th>
                    <th className="px-4 py-2">Quantity</th>
                    <th className="px-4 py-2">Source</th>
                    <th className="px-4 py-2">Reported Date</th>
                    <th className="px-4 py-2">Reason</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 text-right">Value</th>
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
                        <td className="px-4 py-2">{item.location}</td>
                        <td className="px-4 py-2">{item.quantity}</td>
                        <td className="px-4 py-2">
                          {item.source === 'inward' && (
                            <div>
                              <Badge variant="outline" className="bg-blue-100 text-blue-800">Inward</Badge>
                              {item.sourceReference && (
                                <div className="mt-1 text-xs text-gray-800">{item.sourceReference}</div>
                              )}
                            </div>
                          )}
                          {item.source === 'outward' && (
                            <div>
                              <Badge variant="outline" className="bg-green-100 text-green-800">Outward</Badge>
                              {item.sourceReference && (
                                <div className="mt-1 text-xs text-gray-800">{item.sourceReference}</div>
                              )}
                            </div>
                          )}
                          {item.source === 'other' && (
                            <Badge variant="outline" className="bg-gray-100 text-gray-800">Other</Badge>
                          )}
                        </td>
                        <td className="px-4 py-2">{format(new Date(item.reportedDate), "MMM dd, yyyy")}</td>
                        <td className="px-4 py-2">
                          <div className="max-w-xs truncate" title={item.reason}>
                            {item.reason}
                          </div>
                        </td>
                        <td className="px-4 py-2">{getStatusBadge(item.status)}</td>
                        <td className="px-4 py-2 text-right">₹{item.value.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex justify-end space-x-2">
                            <Link href={`/warehouse/damaged/${item.id}`}>
                              <Button variant="outline" size="sm">View</Button>
                            </Link>
                            {item.status === 'reported' && (
                              <Link href={`/warehouse/damaged/${item.id}/process`}>
                                <Button variant="outline" size="sm" className="bg-amber-50 text-amber-600 hover:bg-amber-100">
                                  Process
                                </Button>
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="h-24 px-4 py-2 text-center">
                        No damaged items found.
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
