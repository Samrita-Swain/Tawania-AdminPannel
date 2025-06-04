"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface Category {
  id: string;
  name: string;
}

interface ProductFiltersProps {
  categories: Category[];
  currentCategoryId?: string;
  currentSearch?: string;
  currentStatus?: string;
}

export function ProductFilters({
  categories,
  currentCategoryId,
  currentSearch,
  currentStatus,
}: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [categoryId, setCategoryId] = useState(currentCategoryId || "");
  const [search, setSearch] = useState(currentSearch || "");
  const [status, setStatus] = useState(currentStatus || "");

  // Update state when props change
  useEffect(() => {
    setCategoryId(currentCategoryId || "");
    setSearch(currentSearch || "");
    setStatus(currentStatus || "");
  }, [currentCategoryId, currentSearch, currentStatus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Build query parameters
    const params = new URLSearchParams();
    if (categoryId) params.set("category", categoryId);
    if (search) params.set("search", search);
    if (status) params.set("status", status);

    // Navigate to the same page with new filters
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleReset = () => {
    setCategoryId("");
    setSearch("");
    setStatus("");
    router.push(pathname);
  };

  return (
    <div className="rounded-lg bg-white p-4 shadow-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
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
              {categories && categories.length > 0 ? (
                categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))
              ) : (
                <option value="" disabled>No categories available</option>
              )}
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
              placeholder="Search by product name or SKU"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
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
