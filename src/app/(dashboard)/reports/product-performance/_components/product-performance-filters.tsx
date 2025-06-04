"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  category: {
    id: string;
    name: string;
  };
}

interface ProductPerformanceFiltersProps {
  categories: Category[];
  products: Product[];
  currentCategoryId?: string;
  currentProductId?: string;
  currentSortBy?: string;
}

export function ProductPerformanceFilters({
  categories,
  products,
  currentCategoryId,
  currentProductId,
  currentSortBy,
}: ProductPerformanceFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [categoryId, setCategoryId] = useState(currentCategoryId || "");
  const [productId, setProductId] = useState(currentProductId || "");
  const [sortBy, setSortBy] = useState(currentSortBy || "sales");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  
  // Update state when props change
  useEffect(() => {
    setCategoryId(currentCategoryId || "");
    setProductId(currentProductId || "");
    setSortBy(currentSortBy || "sales");
  }, [currentCategoryId, currentProductId, currentSortBy]);
  
  // Filter products based on selected category
  useEffect(() => {
    if (categoryId) {
      const filtered = products.filter(product => product.category.id === categoryId);
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [categoryId, products]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build query parameters
    const params = new URLSearchParams(searchParams.toString());
    
    // Update or remove parameters
    if (categoryId) {
      params.set("category", categoryId);
    } else {
      params.delete("category");
    }
    
    if (productId) {
      params.set("product", productId);
    } else {
      params.delete("product");
    }
    
    if (sortBy) {
      params.set("sortBy", sortBy);
    } else {
      params.delete("sortBy");
    }
    
    // Navigate to the same page with new filters
    router.push(`${pathname}?${params.toString()}`);
  };
  
  const handleReset = () => {
    setCategoryId("");
    setProductId("");
    setSortBy("sales");
    
    // Keep only date parameters
    const params = new URLSearchParams();
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    
    router.push(`${pathname}?${params.toString()}`);
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
              onChange={(e) => {
                setCategoryId(e.target.value);
                setProductId(""); // Reset product when category changes
              }}
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
            <label htmlFor="product" className="mb-1 block text-sm font-medium text-gray-800">
              Product
            </label>
            <select
              id="product"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Products</option>
              {filteredProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="sortBy" className="mb-1 block text-sm font-medium text-gray-800">
              Sort By
            </label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="sales">Total Sales</option>
              <option value="profit">Profit</option>
              <option value="margin">Profit Margin</option>
              <option value="quantity">Quantity Sold</option>
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
