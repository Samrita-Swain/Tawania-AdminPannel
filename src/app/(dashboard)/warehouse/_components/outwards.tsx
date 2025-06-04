"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";

interface OutwardItem {
  id: string;
  referenceNumber: string;
  date: string;
  destination: string;
  status: string;
  totalItems: number;
  totalValue: number;
  transferType: string;
}

export default function OutwardsComponent() {
  const [outwards, setOutwards] = useState<OutwardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    fetchOutwards();
  }, [statusFilter]);

  // Separate effect for search and type filters (client-side filtering)
  useEffect(() => {
    // Client-side filtering is handled in the filteredOutwards computation
  }, [searchQuery, typeFilter]);

  const fetchOutwards = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('movementType', 'OUTWARD');

      if (statusFilter !== 'all') {
        params.append('status', statusFilter.toUpperCase());
      }

      // Try multiple API endpoints for outwards data
      const endpoints = [
        `/api/warehouse/movements?${params.toString()}`,
        `/api/warehouse/outwards?${params.toString()}`,
        `/api/outwards?${params.toString()}`
      ];

      let success = false;
      let outwardData: any[] = [];

      for (const endpoint of endpoints) {
        try {
          console.log(`Fetching outwards from: ${endpoint}`);
          const response = await fetch(endpoint);

          if (response.ok) {
            const data = await response.json();
            console.log(`Outwards API response from ${endpoint}:`, data);

            // Handle different response formats
            if (data.movements && Array.isArray(data.movements)) {
              outwardData = data.movements;
            } else if (data.outwards && Array.isArray(data.outwards)) {
              outwardData = data.outwards;
            } else if (Array.isArray(data)) {
              outwardData = data;
            }

            // Transform the data to match our interface - show transfers to inventory and returns to suppliers
            const transformedOutwards = outwardData.map((item: any) => ({
              id: item.id,
              referenceNumber: item.referenceNumber,
              date: item.createdAt || item.date,
              destination: item.destinationType === 'STORE' ?
                          `${item.destinationStore?.name || 'Store'} (Inventory)` :
                          item.destinationType === 'SUPPLIER' ?
                          `${item.supplier?.name || 'Supplier'} (Return)` :
                          item.destinationType === 'WAREHOUSE' ?
                          `${item.destinationWarehouse?.name || 'Warehouse'} (Transfer)` :
                          item.destination || 'Unknown Destination',
              status: item.status || 'PENDING',
              totalItems: item.totalItems || item.items?.length || 0,
              totalValue: item.totalValue || 0,
              transferType: item.destinationType === 'STORE' ? 'To Inventory' :
                           item.destinationType === 'SUPPLIER' ? 'Return to Supplier' :
                           item.destinationType === 'WAREHOUSE' ? 'Warehouse Transfer' :
                           item.transferType || 'Transfer',
              warehouse: item.warehouse,
              items: item.items || []
            }));

            setOutwards(transformedOutwards);
            success = true;
            console.log(`Successfully fetched ${transformedOutwards.length} outward movements`);
            break;
          }
        } catch (endpointError) {
          console.log(`Failed to fetch from ${endpoint}:`, endpointError);
          continue;
        }
      }

      if (!success) {
        console.log('All API endpoints failed, no outward movements found');
        setOutwards([]);
        setError('No outward movements found. Database tables may not be set up yet.');
      }

    } catch (error) {
      console.error('Error fetching outwards:', error);
      setError('Failed to load outward movements');
      setOutwards([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle status change for individual items
  const handleStatusChange = (outwardId: string, newStatus: string) => {
    setOutwards(prevOutwards =>
      prevOutwards.map(outward =>
        outward.id === outwardId
          ? { ...outward, status: newStatus }
          : outward
      )
    );
  };

  // Filter outwards based on search query, status, and type
  const filteredOutwards = outwards.filter(outward => {
    // Search filter
    const matchesSearch = searchQuery === "" ||
      outward.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      outward.destination.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus = statusFilter === "all" ||
      outward.status.toLowerCase() === statusFilter.toLowerCase();

    // Type filter
    const matchesType = typeFilter === "all" ||
      outward.transferType.toLowerCase() === typeFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-100 text-green-800">Completed</Badge>;
      case "in transit":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">In Transit</Badge>;
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
        <span className="ml-2">Loading outward movements...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Outward Movements</h2>
          <p className="text-gray-600">Products transferred to inventory or returned to suppliers</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={fetchOutwards} variant="outline">
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
                placeholder="Search outward movements..."
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
                <option value="in transit">In Transit</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
            <div>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="to inventory">To Inventory</option>
                <option value="return to supplier">Return to Supplier</option>
                <option value="warehouse transfer">Warehouse Transfer</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Outwards Table */}
      <Card>
        <CardHeader>
          <CardTitle>Outward Movements ({filteredOutwards.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredOutwards.length > 0 ? (
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
                      <th className="px-4 py-2">Reference</th>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2">Destination</th>
                      <th className="px-4 py-2">Items</th>
                      <th className="px-4 py-2">Total Value</th>
                      <th className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredOutwards.map((outward) => (
                      <tr key={outward.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">
                          {outward.referenceNumber}
                        </td>
                        <td className="px-4 py-2">
                          {(() => {
                            try {
                              return format(new Date(outward.date), "MMM dd, yyyy");
                            } catch (e) {
                              return outward.date;
                            }
                          })()}
                        </td>
                        <td className="px-4 py-2">{outward.transferType}</td>
                        <td className="px-4 py-2">{outward.destination}</td>
                        <td className="px-4 py-2">{outward.totalItems}</td>
                        <td className="px-4 py-2">${outward.totalValue.toFixed(2)}</td>
                        <td className="px-4 py-2">
                          <Select
                            value={outward.status}
                            onChange={(e) => handleStatusChange(outward.id, e.target.value)}
                            className="w-32"
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Transit">In Transit</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </Select>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">
                {error ? error : "No outward movements found. Products transferred to inventory or returned to suppliers will appear here."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
