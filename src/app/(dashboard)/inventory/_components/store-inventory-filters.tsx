"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface Store {
  id: string;
  name: string;
  code: string;
}

interface Category {
  id: string;
  name: string;
}

interface StoreInventoryFiltersProps {
  stores: Store[];
  categories: Category[];
  currentStoreId?: string;
  currentCategoryId?: string;
  currentSearch?: string;
  currentFilter?: string;
}

export function StoreInventoryFilters({
  stores,
  categories,
  currentStoreId,
  currentCategoryId,
  currentSearch,
  currentFilter,
}: StoreInventoryFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [storeId, setStoreId] = useState(currentStoreId || "");
  const [categoryId, setCategoryId] = useState(currentCategoryId || "");
  const [search, setSearch] = useState(currentSearch || "");
  const [filter, setFilter] = useState(currentFilter || "");
  
  // Update state when props change
  useEffect(() => {
    setStoreId(currentStoreId || "");
    setCategoryId(currentCategoryId || "");
    setSearch(currentSearch || "");
    setFilter(currentFilter || "");
  }, [currentStoreId, currentCategoryId, currentSearch, currentFilter]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build query parameters
    const params = new URLSearchParams();
    if (storeId) params.set("store", storeId);
    if (categoryId) params.set("category", categoryId);
    if (search) params.set("search", search);
    if (filter) params.set("filter", filter);
    
    // Navigate to the same page with new filters
    router.push(`${pathname}?${params.toString()}`);
  };
  
  const handleReset = () => {
    setStoreId("");
    setCategoryId("");
    setSearch("");
    setFilter("");
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
            <label htmlFor="search" className="mb-1 block text-sm font-medium text-gray-800">
              Search
            </label>
            <input
              id="search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="filter" className="mb-1 block text-sm font-medium text-gray-800">
              Filter
            </label>
            <select
              id="filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Stock</option>
              <option value="lowStock">Low Stock</option>
              <option value="outOfStock">Out of Stock</option>
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
