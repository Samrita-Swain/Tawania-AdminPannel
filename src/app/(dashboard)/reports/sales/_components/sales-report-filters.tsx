"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface SalesReportFiltersProps {
  stores: Store[];
  categories: Category[];
  products: Product[];
  currentStoreId?: string;
  currentCategoryId?: string;
  currentProductId?: string;
  currentGroupBy?: string;
}

export function SalesReportFilters({
  stores,
  categories,
  products,
  currentStoreId,
  currentCategoryId,
  currentProductId,
  currentGroupBy,
}: SalesReportFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [storeId, setStoreId] = useState(currentStoreId || "");
  const [categoryId, setCategoryId] = useState(currentCategoryId || "");
  const [productId, setProductId] = useState(currentProductId || "");
  const [groupBy, setGroupBy] = useState(currentGroupBy || "day");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  
  // Update state when props change
  useEffect(() => {
    setStoreId(currentStoreId || "");
    setCategoryId(currentCategoryId || "");
    setProductId(currentProductId || "");
    setGroupBy(currentGroupBy || "day");
  }, [currentStoreId, currentCategoryId, currentProductId, currentGroupBy]);
  
  // Filter products based on selected category
  useEffect(() => {
    if (categoryId) {
      const filtered = products.filter(product => {
        // We don't have direct access to product.categoryId here
        // This is a simplification - in a real app, you'd have the categoryId on the product
        // or you'd fetch the filtered products from the server
        return true;
      });
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
    if (storeId) {
      params.set("store", storeId);
    } else {
      params.delete("store");
    }
    
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
    
    if (groupBy) {
      params.set("groupBy", groupBy);
    } else {
      params.delete("groupBy");
    }
    
    // Navigate to the same page with new filters
    router.push(`${pathname}?${params.toString()}`);
  };
  
  const handleReset = () => {
    setStoreId("");
    setCategoryId("");
    setProductId("");
    setGroupBy("day");
    
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
            <label htmlFor="groupBy" className="mb-1 block text-sm font-medium text-gray-800">
              Group By
            </label>
            <select
              id="groupBy"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
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
