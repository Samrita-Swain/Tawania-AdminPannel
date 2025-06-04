"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Store, Customer } from "@prisma/client";

interface SaleFiltersProps {
  currentSearch?: string;
  currentStoreId?: string;
  currentCustomerId?: string;
  currentPaymentStatus?: string;
  currentPaymentMethod?: string;
  currentStartDate?: string;
  currentEndDate?: string;
  stores: Store[];
  customers: Customer[];
}

export function SaleFilters({
  currentSearch,
  currentStoreId,
  currentCustomerId,
  currentPaymentStatus,
  currentPaymentMethod,
  currentStartDate,
  currentEndDate,
  stores,
  customers,
}: SaleFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [search, setSearch] = useState(currentSearch || "");
  const [storeId, setStoreId] = useState(currentStoreId || "");
  const [customerId, setCustomerId] = useState(currentCustomerId || "");
  const [paymentStatus, setPaymentStatus] = useState(currentPaymentStatus || "");
  const [paymentMethod, setPaymentMethod] = useState(currentPaymentMethod || "");
  const [startDate, setStartDate] = useState(currentStartDate || "");
  const [endDate, setEndDate] = useState(currentEndDate || "");
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  
  // Update state when props change
  useEffect(() => {
    setSearch(currentSearch || "");
    setStoreId(currentStoreId || "");
    setCustomerId(currentCustomerId || "");
    setPaymentStatus(currentPaymentStatus || "");
    setPaymentMethod(currentPaymentMethod || "");
    setStartDate(currentStartDate || "");
    setEndDate(currentEndDate || "");
    
    // Open advanced filters if any of them are set
    if (currentCustomerId || currentPaymentStatus || currentPaymentMethod || currentStartDate || currentEndDate) {
      setIsAdvancedFiltersOpen(true);
    }
  }, [currentSearch, currentStoreId, currentCustomerId, currentPaymentStatus, currentPaymentMethod, currentStartDate, currentEndDate]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build query parameters
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (storeId) params.set("store", storeId);
    if (customerId) params.set("customer", customerId);
    if (paymentStatus) params.set("paymentStatus", paymentStatus);
    if (paymentMethod) params.set("paymentMethod", paymentMethod);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    
    // Navigate to the same page with new filters
    router.push(`${pathname}?${params.toString()}`);
  };
  
  const handleReset = () => {
    setSearch("");
    setStoreId("");
    setCustomerId("");
    setPaymentStatus("");
    setPaymentMethod("");
    setStartDate("");
    setEndDate("");
    router.push(pathname);
  };
  
  const toggleAdvancedFilters = () => {
    setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen);
  };
  
  return (
    <div className="rounded-lg bg-white p-4 shadow-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="search" className="mb-1 block text-sm font-medium text-gray-800">
              Search
            </label>
            <input
              id="search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by receipt #, customer, or notes"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              onClick={toggleAdvancedFilters}
              className="w-full"
            >
              {isAdvancedFiltersOpen ? "Hide Advanced Filters" : "Show Advanced Filters"}
            </Button>
          </div>
        </div>
        
        {isAdvancedFiltersOpen && (
          <div className="grid gap-4 md:grid-cols-3">
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
              <label htmlFor="paymentStatus" className="mb-1 block text-sm font-medium text-gray-800">
                Payment Status
              </label>
              <select
                id="paymentStatus"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="PAID">Paid</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="UNPAID">Unpaid</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="paymentMethod" className="mb-1 block text-sm font-medium text-gray-800">
                Payment Method
              </label>
              <select
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Methods</option>
                <option value="CASH">Cash</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="DEBIT_CARD">Debit Card</option>
                <option value="MOBILE_PAYMENT">Mobile Payment</option>
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
        )}
        
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
