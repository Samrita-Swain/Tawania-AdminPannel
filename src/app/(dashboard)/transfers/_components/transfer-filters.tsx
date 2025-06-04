"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Warehouse, Store } from "@prisma/client";

interface TransferFiltersProps {
  currentSearch?: string;
  currentSourceId?: string;
  currentDestinationId?: string;
  currentStatus?: string;
  warehouses: Warehouse[];
  stores: Store[];
}

export function TransferFilters({
  currentSearch,
  currentSourceId,
  currentDestinationId,
  currentStatus,
  warehouses,
  stores,
}: TransferFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [search, setSearch] = useState(currentSearch || "");
  const [sourceId, setSourceId] = useState(currentSourceId || "");
  const [destinationId, setDestinationId] = useState(currentDestinationId || "");
  const [status, setStatus] = useState(currentStatus || "");
  
  // Update state when props change
  useEffect(() => {
    setSearch(currentSearch || "");
    setSourceId(currentSourceId || "");
    setDestinationId(currentDestinationId || "");
    setStatus(currentStatus || "");
  }, [currentSearch, currentSourceId, currentDestinationId, currentStatus]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build query parameters
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (sourceId) params.set("source", sourceId);
    if (destinationId) params.set("destination", destinationId);
    if (status) params.set("status", status);
    
    // Navigate to the same page with new filters
    router.push(`${pathname}?${params.toString()}`);
  };
  
  const handleReset = () => {
    setSearch("");
    setSourceId("");
    setDestinationId("");
    setStatus("");
    router.push(pathname);
  };
  
  return (
    <div className="rounded-lg bg-white p-4 shadow-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="search" className="mb-1 block text-sm font-medium text-gray-800">
              Search
            </label>
            <input
              id="search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by reference number or notes"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="source" className="mb-1 block text-sm font-medium text-gray-800">
              Source Warehouse
            </label>
            <select
              id="source"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Sources</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="destination" className="mb-1 block text-sm font-medium text-gray-800">
              Destination
            </label>
            <select
              id="destination"
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Destinations</option>
              <optgroup label="Warehouses">
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Stores">
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          
          <div>
            <label htmlFor="status" className="mb-1 block text-sm font-medium text-gray-800">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
          >
            Reset
          </Button>
          <Button type="submit">
            Apply Filters
          </Button>
        </div>
      </form>
    </div>
  );
}
