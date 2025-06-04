"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Supplier {
  id: string;
  name: string;
}

interface PurchaseOrderFiltersProps {
  suppliers: Supplier[];
  currentSupplierId?: string;
  currentStatus?: string;
  currentSearch?: string;
}

export function PurchaseOrderFilters({
  suppliers,
  currentSupplierId,
  currentStatus,
  currentSearch,
}: PurchaseOrderFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [supplierId, setSupplierId] = useState(currentSupplierId || "");
  const [status, setStatus] = useState(currentStatus || "");
  const [search, setSearch] = useState(currentSearch || "");
  
  // Update state when props change
  useEffect(() => {
    setSupplierId(currentSupplierId || "");
    setStatus(currentStatus || "");
    setSearch(currentSearch || "");
  }, [currentSupplierId, currentStatus, currentSearch]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build query parameters
    const params = new URLSearchParams();
    if (supplierId) params.set("supplier", supplierId);
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    
    // Navigate to the same page with new filters
    router.push(`${pathname}?${params.toString()}`);
  };
  
  const handleReset = () => {
    setSupplierId("");
    setStatus("");
    setSearch("");
    router.push(pathname);
  };
  
  return (
    <div className="rounded-lg bg-white p-4 shadow-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="supplier" className="mb-1 block text-sm font-medium text-gray-800">
              Supplier
            </label>
            <select
              id="supplier"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Suppliers</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
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
              <option value="DRAFT">Draft</option>
              <option value="PENDING">Pending</option>
              <option value="ORDERED">Ordered</option>
              <option value="PARTIAL">Partially Received</option>
              <option value="RECEIVED">Received</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="search" className="mb-1 block text-sm font-medium text-gray-800">
              Search
            </label>
            <input
              id="search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order number or supplier"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
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
