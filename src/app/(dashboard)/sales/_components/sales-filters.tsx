"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LoyaltyTier } from "@prisma/client";

// Update the Customer interface to match the actual data structure
interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  loyaltyPoints: number;
  loyaltyTier: LoyaltyTier;
  createdAt: Date;
  updatedAt: Date;
}

interface Store {
  id: string;
  name: string;
  code: string;
}

interface SalesFiltersProps {
  currentStoreId?: string;
  currentCustomerId?: string;
  currentStartDate?: string;
  currentEndDate?: string;
  stores: Store[];
  customers: Customer[];
}

export function SalesFilters({
  stores,
  customers,
  currentStoreId,
  currentCustomerId,
  currentStartDate,
  currentEndDate,
}: SalesFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [storeId, setStoreId] = useState(currentStoreId || "");
  const [customerId, setCustomerId] = useState(currentCustomerId || "");
  const [startDate, setStartDate] = useState(currentStartDate || "");
  const [endDate, setEndDate] = useState(currentEndDate || "");
  
  // Update state when props change
  useEffect(() => {
    setStoreId(currentStoreId || "");
    setCustomerId(currentCustomerId || "");
    setStartDate(currentStartDate || "");
    setEndDate(currentEndDate || "");
  }, [currentStoreId, currentCustomerId, currentStartDate, currentEndDate]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build query parameters
    const params = new URLSearchParams();
    if (storeId) params.set("store", storeId);
    if (customerId) params.set("customer", customerId);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    
    // Navigate to the same page with new filters
    router.push(`${pathname}?${params.toString()}`);
  };
  
  const handleReset = () => {
    setStoreId("");
    setCustomerId("");
    setStartDate("");
    setEndDate("");
    router.push(pathname);
  };
  
  return (
    <div className="rounded-lg bg-white p-4 shadow-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label htmlFor="store" className="mb-1 block text-sm font-medium text-gray-800">
              Store
            </label>
            <select
              id="store"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Stores</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name} ({store.code})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="customer" className="mb-1 block text-sm font-medium text-gray-800">
              Customer
            </label>
            <select
              id="customer"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Customers</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="startDate" className="mb-1 block text-sm font-medium text-gray-800">
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="endDate" className="mb-1 block text-sm font-medium text-gray-800">
              End Date
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
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
