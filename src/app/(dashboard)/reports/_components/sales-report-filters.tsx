"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Store } from "@prisma/client";

interface SalesReportFiltersProps {
  currentStartDate: string;
  currentEndDate: string;
  currentStoreId?: string;
  currentGroupBy: string;
  stores: Store[];
}

export function SalesReportFilters({
  currentStartDate,
  currentEndDate,
  currentStoreId,
  currentGroupBy,
  stores,
}: SalesReportFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [startDate, setStartDate] = useState(currentStartDate);
  const [endDate, setEndDate] = useState(currentEndDate);
  const [storeId, setStoreId] = useState(currentStoreId || "");
  const [groupBy, setGroupBy] = useState(currentGroupBy);
  
  // Update state when props change
  useEffect(() => {
    setStartDate(currentStartDate);
    setEndDate(currentEndDate);
    setStoreId(currentStoreId || "");
    setGroupBy(currentGroupBy);
  }, [currentStartDate, currentEndDate, currentStoreId, currentGroupBy]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build query parameters
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (storeId) params.set("store", storeId);
    if (groupBy) params.set("groupBy", groupBy);
    
    // Navigate to the same page with new filters
    router.push(`${pathname}?${params.toString()}`);
  };
  
  const handleReset = () => {
    // Set default dates
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
    setStoreId("");
    setGroupBy("day");
    
    router.push(pathname);
  };
  
  // Quick date range selectors
  const setDateRange = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    setStartDate(startDate.toISOString().split('T')[0]);
    setEndDate(endDate.toISOString().split('T')[0]);
  };
  
  return (
    <div className="rounded-lg bg-white p-4 shadow-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
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
              required
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
              required
            />
          </div>
          
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
                  {store.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="groupBy" className="mb-1 block text-sm font-medium text-gray-800">
              Group By
            </label>
            <select
              id="groupBy"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="hour">Hour</option>
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-800">Quick Select:</span>
          <button
            type="button"
            onClick={() => setDateRange(7)}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-800 hover:bg-gray-50"
          >
            Last 7 Days
          </button>
          <button
            type="button"
            onClick={() => setDateRange(30)}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-800 hover:bg-gray-50"
          >
            Last 30 Days
          </button>
          <button
            type="button"
            onClick={() => setDateRange(90)}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-800 hover:bg-gray-50"
          >
            Last 90 Days
          </button>
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
              setStartDate(firstDay.toISOString().split('T')[0]);
              setEndDate(today.toISOString().split('T')[0]);
            }}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-800 hover:bg-gray-50"
          >
            This Month
          </button>
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              const firstDay = new Date(today.getFullYear(), 0, 1);
              setStartDate(firstDay.toISOString().split('T')[0]);
              setEndDate(today.toISOString().split('T')[0]);
            }}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-800 hover:bg-gray-50"
          >
            This Year
          </button>
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
            Generate Report
          </Button>
        </div>
      </form>
    </div>
  );
}
