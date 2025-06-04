"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface Store {
  id: string;
  name: string;
  code: string;
}

interface Category {
  id: string;
  name: string;
}

interface InventoryReportFiltersProps {
  warehouses: Warehouse[];
  stores: Store[];
  categories: Category[];
  currentWarehouseId?: string;
  currentStoreId?: string;
  currentCategoryId?: string;
  currentStockStatus?: string;
}

export function InventoryReportFilters({
  warehouses,
  stores,
  categories,
  currentWarehouseId,
  currentStoreId,
  currentCategoryId,
  currentStockStatus,
}: InventoryReportFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [warehouseId, setWarehouseId] = useState(currentWarehouseId || "");
  const [storeId, setStoreId] = useState(currentStoreId || "");
  const [categoryId, setCategoryId] = useState(currentCategoryId || "");
  const [stockStatus, setStockStatus] = useState(currentStockStatus || "");
  
  // Update state when props change
  useEffect(() => {
    setWarehouseId(currentWarehouseId || "");
    setStoreId(currentStoreId || "");
    setCategoryId(currentCategoryId || "");
    setStockStatus(currentStockStatus || "");
  }, [currentWarehouseId, currentStoreId, currentCategoryId, currentStockStatus]);
  
  // Reset store when warehouse is selected and vice versa
  useEffect(() => {
    if (warehouseId) {
      setStoreId("");
    }
  }, [warehouseId]);
  
  useEffect(() => {
    if (storeId) {
      setWarehouseId("");
    }
  }, [storeId]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build query parameters
    const params = new URLSearchParams();
    if (warehouseId) params.set("warehouse", warehouseId);
    if (storeId) params.set("store", storeId);
    if (categoryId) params.set("category", categoryId);
    if (stockStatus) params.set("status", stockStatus);
    
    // Navigate to the same page with new filters
    router.push(`${pathname}?${params.toString()}`);
  };
  
  const handleReset = () => {
    setWarehouseId("");
    setStoreId("");
    setCategoryId("");
    setStockStatus("");
    router.push(pathname);
  };
  
  return (
    <div className="rounded-lg bg-white p-4 shadow-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label htmlFor="warehouse" className="mb-1 block text-sm font-medium text-gray-800">
              Warehouse
            </label>
            <select
              id="warehouse"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={!!storeId}
            >
              <option value="">All Warehouses</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name} ({warehouse.code})
                </option>
              ))}
            </select>
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
              disabled={!!warehouseId}
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
            <label htmlFor="category" className="mb-1 block text-sm font-medium text-gray-800">
              Category
            </label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="stockStatus" className="mb-1 block text-sm font-medium text-gray-800">
              Stock Status
            </label>
            <select
              id="stockStatus"
              value={stockStatus}
              onChange={(e) => setStockStatus(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
              <option value="overstock">Overstock</option>
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
