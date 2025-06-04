"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface InwardItem {
  id: string;
  referenceNumber: string;
  date: string;
  supplier: string;
  status: string;
  totalItems: number;
  totalValue: number;
  hasDamagedItems: boolean;
  warehouse?: any;
  items?: ProductItem[];
}

interface ProductItem {
  id: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    category?: string;
  };
  quantity: number;
  unitCost: number;
  totalCost: number;
  condition: string;
  batchNumber?: string;
  expiryDate?: string;
  notes?: string;
}

export default function InwardsComponent() {
  const [inwards, setInwards] = useState<InwardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchInwards();
  }, [statusFilter]);

  // Separate effect for search and date filters (client-side filtering)
  useEffect(() => {
    // Client-side filtering is handled in the filteredInwards computation
  }, [searchQuery, dateFilter]);

  const fetchInwards = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('movementType', 'INWARD');

      if (statusFilter !== 'all') {
        params.append('status', statusFilter.toUpperCase());
      }

      // Try multiple API endpoints for inwards data
      const endpoints = [
        `/api/warehouse/movements?${params.toString()}`,
        `/api/warehouse/inwards?${params.toString()}`,
        `/api/inwards?${params.toString()}`
      ];

      let success = false;
      let inwardData: any[] = [];

      for (const endpoint of endpoints) {
        try {
          console.log(`Fetching inwards from: ${endpoint}`);
          const response = await fetch(endpoint);

          if (response.ok) {
            const data = await response.json();
            console.log(`Inwards API response from ${endpoint}:`, data);

            // Handle different response formats
            if (data.movements && Array.isArray(data.movements)) {
              inwardData = data.movements;
            } else if (data.inwards && Array.isArray(data.inwards)) {
              inwardData = data.inwards;
            } else if (Array.isArray(data)) {
              inwardData = data;
            }

            // Transform the data to match our interface - only show products incoming to warehouse
            const transformedInwards = inwardData.map((item: any) => ({
              id: item.id,
              referenceNumber: item.referenceNumber,
              date: item.createdAt || item.date,
              supplier: item.sourceType === 'PURCHASE_ORDER' ? 'Purchase Order' :
                       item.sourceType === 'RETURN' ? 'Customer Return' :
                       item.sourceType === 'TRANSFER' ? 'Transfer from Store' :
                       item.sourceType === 'MANUAL' ? 'Manual Entry' :
                       item.supplier || item.sourceType || 'Unknown Source',
              status: item.status || 'PENDING',
              totalItems: item.totalItems || item.items?.length || 0,
              totalValue: item.totalValue || 0,
              hasDamagedItems: item.items?.some((i: any) => i.condition === 'DAMAGED') || false,
              warehouse: item.warehouse,
              items: item.items || []
            }));

            setInwards(transformedInwards);
            success = true;
            console.log(`Successfully fetched ${transformedInwards.length} inward movements`);
            break;
          }
        } catch (endpointError) {
          console.log(`Failed to fetch from ${endpoint}:`, endpointError);
          continue;
        }
      }

      if (!success) {
        console.log('All API endpoints failed, no inward movements found');
        setInwards([]);
        setError('No inward movements found. Database tables may not be set up yet.');
      }

    } catch (error) {
      console.error('Error fetching inwards:', error);
      setError('Failed to load inward movements');
      setInwards([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle status change for individual items
  const handleStatusChange = (inwardId: string, newStatus: string) => {
    setInwards(prevInwards =>
      prevInwards.map(inward =>
        inward.id === inwardId
          ? { ...inward, status: newStatus }
          : inward
      )
    );
  };

  // Toggle row expansion to show/hide products
  const toggleRowExpansion = (inwardId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(inwardId)) {
        newSet.delete(inwardId);
      } else {
        newSet.add(inwardId);
      }
      return newSet;
    });
  };

  // Filter inwards based on search query, status, and date
  const filteredInwards = inwards.filter(inward => {
    // Search filter
    const matchesSearch = searchQuery === "" ||
      inward.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inward.supplier.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus = statusFilter === "all" ||
      inward.status.toLowerCase() === statusFilter.toLowerCase();

    // Date filter
    const matchesDate = dateFilter === "all" || (() => {
      const inwardDate = new Date(inward.date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);

      switch (dateFilter) {
        case "today":
          return inwardDate.toDateString() === today.toDateString();
        case "yesterday":
          return inwardDate.toDateString() === yesterday.toDateString();
        case "last7days":
          return inwardDate >= lastWeek;
        default:
          return true;
      }
    })();

    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-100 text-green-800">Completed</Badge>;
      case "in progress":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
        <span className="ml-2">Loading inward movements...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Inward Movements</h2>
          <p className="text-gray-600">Products incoming to the warehouse from suppliers, returns, and transfers</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={fetchInwards} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <Input
                placeholder="Search inward movements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="in progress">In Progress</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
            <div>
              <Select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last7days">Last 7 Days</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inwards Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inward Movements ({filteredInwards.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredInwards.length > 0 ? (
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
                      <th className="px-4 py-2 w-8"></th>
                      <th className="px-4 py-2">Reference</th>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Supplier</th>
                      <th className="px-4 py-2">Items</th>
                      <th className="px-4 py-2">Total Value</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Damaged</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredInwards.map((inward) => (
                      <React.Fragment key={inward.id}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleRowExpansion(inward.id)}
                              className="p-1 h-6 w-6"
                            >
                              {expandedRows.has(inward.id) ? '−' : '+'}
                            </Button>
                          </td>
                          <td className="px-4 py-2 font-medium">
                            {inward.referenceNumber}
                          </td>
                          <td className="px-4 py-2">
                            {(() => {
                              try {
                                return format(new Date(inward.date), "MMM dd, yyyy");
                              } catch (e) {
                                return inward.date;
                              }
                            })()}
                          </td>
                          <td className="px-4 py-2">{inward.supplier}</td>
                          <td className="px-4 py-2">{inward.totalItems}</td>
                          <td className="px-4 py-2">${inward.totalValue.toFixed(2)}</td>
                          <td className="px-4 py-2">
                            <Select
                              value={inward.status}
                              onChange={(e) => handleStatusChange(inward.id, e.target.value)}
                              className="w-32"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Completed">Completed</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Cancelled">Cancelled</option>
                            </Select>
                          </td>
                          <td className="px-4 py-2">
                            {inward.hasDamagedItems ? (
                              <span className="text-red-600">Yes</span>
                            ) : (
                              <span className="text-green-600">No</span>
                            )}
                          </td>

                        </tr>

                        {/* Expanded Product Details Row */}
                        {expandedRows.has(inward.id) && (
                          <tr key={`${inward.id}-details`} className="bg-gray-50">
                            <td colSpan={8} className="px-4 py-4">
                              <div className="space-y-4">
                                <h4 className="font-semibold text-gray-800">Products Added to Warehouse:</h4>
                                {inward.items && inward.items.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm border border-gray-200 rounded-lg">
                                      <thead>
                                        <tr className="bg-gray-100 border-b">
                                          <th className="px-3 py-2 text-left">Product Name</th>
                                          <th className="px-3 py-2 text-left">SKU</th>
                                          <th className="px-3 py-2 text-left">Category</th>
                                          <th className="px-3 py-2 text-right">Quantity</th>
                                          <th className="px-3 py-2 text-right">Unit Cost</th>
                                          <th className="px-3 py-2 text-right">Total Cost</th>
                                          <th className="px-3 py-2 text-left">Condition</th>
                                          <th className="px-3 py-2 text-left">Batch</th>
                                          <th className="px-3 py-2 text-left">Expiry</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-200">
                                        {inward.items.map((item, index) => (
                                          <tr key={item.id || index} className="hover:bg-gray-50">
                                            <td className="px-3 py-2 font-medium">
                                              {item.product?.name || `Product ${item.productId}`}
                                            </td>
                                            <td className="px-3 py-2 text-gray-600">
                                              {item.product?.sku || 'N/A'}
                                            </td>
                                            <td className="px-3 py-2 text-gray-600">
                                              {item.product?.category || 'N/A'}
                                            </td>
                                            <td className="px-3 py-2 text-right font-medium">
                                              {item.quantity}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                              ${item.unitCost?.toFixed(2) || '0.00'}
                                            </td>
                                            <td className="px-3 py-2 text-right font-medium">
                                              ${item.totalCost?.toFixed(2) || (item.quantity * (item.unitCost || 0)).toFixed(2)}
                                            </td>
                                            <td className="px-3 py-2">
                                              <Badge
                                                variant={item.condition === 'DAMAGED' ? 'destructive' : 'default'}
                                                className={item.condition === 'DAMAGED' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}
                                              >
                                                {item.condition || 'NEW'}
                                              </Badge>
                                            </td>
                                            <td className="px-3 py-2 text-gray-600">
                                              {item.batchNumber || 'N/A'}
                                            </td>
                                            <td className="px-3 py-2 text-gray-600">
                                              {item.expiryDate ?
                                                (() => {
                                                  try {
                                                    return format(new Date(item.expiryDate), "MMM dd, yyyy");
                                                  } catch (e) {
                                                    return item.expiryDate;
                                                  }
                                                })()
                                                : 'N/A'
                                              }
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-gray-500 italic">No product details available for this inward movement.</p>
                                )}

                                {/* Summary */}
                                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <span className="font-medium text-gray-700">Total Items:</span>
                                      <span className="ml-2 font-semibold text-blue-600">{inward.totalItems}</span>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-700">Total Value:</span>
                                      <span className="ml-2 font-semibold text-blue-600">${inward.totalValue.toFixed(2)}</span>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-700">Warehouse:</span>
                                      <span className="ml-2 font-semibold text-blue-600">{inward.warehouse?.name || 'N/A'}</span>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-700">Damaged Items:</span>
                                      <span className={`ml-2 font-semibold ${inward.hasDamagedItems ? 'text-red-600' : 'text-green-600'}`}>
                                        {inward.hasDamagedItems ? 'Yes' : 'No'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">
                {error ? error : "No inward movements found. Products incoming to the warehouse will appear here."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
