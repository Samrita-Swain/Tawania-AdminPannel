"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

interface ReportDateFilterProps {
  startDate: string;
  endDate: string;
}

export function ReportDateFilter({ startDate, endDate }: ReportDateFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);
  
  // Update state when props change
  useEffect(() => {
    setStart(startDate);
    setEnd(endDate);
  }, [startDate, endDate]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build query parameters
    const params = new URLSearchParams();
    if (start) params.set("startDate", start);
    if (end) params.set("endDate", end);
    
    // Navigate to the same page with new filters
    router.push(`${pathname}?${params.toString()}`);
  };
  
  const handleReset = () => {
    // Reset to default dates (last 30 days)
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    
    setStart(startDate);
    setEnd(endDate);
    
    // Navigate to the page with default dates
    const params = new URLSearchParams();
    params.set("startDate", startDate);
    params.set("endDate", endDate);
    router.push(`${pathname}?${params.toString()}`);
  };
  
  const handleQuickFilter = (days: number) => {
    // Set date range based on days
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(new Date().setDate(new Date().getDate() - days)).toISOString().split('T')[0];
    
    setStart(startDate);
    setEnd(endDate);
    
    // Navigate to the page with new dates
    const params = new URLSearchParams();
    params.set("startDate", startDate);
    params.set("endDate", endDate);
    router.push(`${pathname}?${params.toString()}`);
  };
  
  return (
    <div className="rounded-lg bg-white p-4 shadow-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="startDate" className="text-sm font-medium text-gray-800">
              Start Date:
            </label>
            <input
              id="startDate"
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <label htmlFor="endDate" className="text-sm font-medium text-gray-800">
              End Date:
            </label>
            <input
              id="endDate"
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm">
              Apply
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-800">Quick Filters:</span>
          <button
            type="button"
            onClick={() => handleQuickFilter(7)}
            className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800 hover:bg-gray-200 transition-colors"
          >
            Last 7 Days
          </button>
          <button
            type="button"
            onClick={() => handleQuickFilter(30)}
            className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800 hover:bg-gray-200 transition-colors"
          >
            Last 30 Days
          </button>
          <button
            type="button"
            onClick={() => handleQuickFilter(90)}
            className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800 hover:bg-gray-200 transition-colors"
          >
            Last 90 Days
          </button>
          <button
            type="button"
            onClick={() => handleQuickFilter(365)}
            className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800 hover:bg-gray-200 transition-colors"
          >
            Last Year
          </button>
        </div>
      </form>
    </div>
  );
}
