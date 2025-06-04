"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NewProductPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [costPrice, setCostPrice] = useState(0);
  const [wholesalePrice, setWholesalePrice] = useState(0);
  const [retailPrice, setRetailPrice] = useState(0);
  const [minStockLevel, setMinStockLevel] = useState(10);
  const [reorderPoint, setReorderPoint] = useState(5);
  const [barcode, setBarcode] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [condition, setCondition] = useState("NEW");

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }

        const data = await response.json();
        setCategories(data.categories || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Generate SKU
  const generateSku = () => {
    if (!name) return;

    // Get category prefix
    const category = categories.find(c => c.id === categoryId);
    const prefix = category ? category.code : "PROD";

    // Generate random number
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

    // Create SKU
    const newSku = `${prefix}-${randomNum}`;
    setSku(newSku);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !sku || !categoryId || costPrice <= 0 || wholesalePrice <= 0 || retailPrice <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const productData = {
        name,
        sku,
        description,
        categoryId,
        costPrice,
        wholesalePrice,
        retailPrice,
        minStockLevel,
        reorderPoint,
        barcode: barcode || undefined,
        isActive,
        condition,
      };

      console.log("Submitting product data:", productData);

      // Add a delay to ensure the server is ready
      await new Promise(resolve => setTimeout(resolve, 500));

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      console.log("API response status:", response.status);

      if (!response.ok) {
        let errorMessage = 'Failed to create product';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          console.error("Error parsing error response:", jsonError);
        }
        throw new Error(errorMessage);
      }

      // If we get here, try to parse the response as JSON
      let result;
      try {
        result = await response.json();
        console.log("API response parsed successfully:", result);
      } catch (jsonError) {
        console.error("Error parsing success response:", jsonError);
        // Instead of using a dummy ID, redirect to the products list
        alert('Product was created, but there was an issue retrieving the details. Redirecting to products list.');
        router.push('/products');
        return; // Exit early to avoid the next check
      }

      if (!result.success) {
        // Handle error response
        const errorMessage = result.error || 'An unknown error occurred';
        const errorDetails = result.details ? `: ${result.details}` : '';
        alert(`Error: ${errorMessage}${errorDetails}`);
        return;
      }

      if (!result.product || !result.product.id) {
        console.error("Invalid product data in response:", result);
        // Instead of throwing an error, redirect to the products list
        alert('Product was created, but there was an issue retrieving the product ID. Redirecting to products list.');
        router.push('/products');
        return; // Exit early to avoid the next redirect
      }

      // Show success message
      alert('Product created successfully!');

      // Redirect to products list instead of product details
      router.push('/products');
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Failed to create product. Please try again. Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Add New Product</h1>
        <Link
          href="/products"
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 transition-colors"
        >
          Back to Products
        </Link>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-lg bg-white p-6 shadow-md">
          <div className="text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 mx-auto"></div>
            <p className="text-gray-800">Loading data...</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow-md">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-800">
                Product Name *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="sku" className="mb-1 block text-sm font-medium text-gray-800">
                SKU *
              </label>
              <div className="flex gap-2">
                <input
                  id="sku"
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={generateSku}
                  className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 transition-colors"
                >
                  Generate
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="category" className="mb-1 block text-sm font-medium text-gray-800">
                Category *
              </label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              >
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-800">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="costPrice" className="mb-1 block text-sm font-medium text-gray-800">
                Cost Price *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-800">₹</span>
                <input
                  id="costPrice"
                  type="number"
                  value={costPrice}
                  onChange={(e) => setCostPrice(Number(e.target.value))}
                  min="0"
                  step="0.01"
                  className="w-full rounded-md border border-gray-300 pl-8 pr-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="wholesalePrice" className="mb-1 block text-sm font-medium text-gray-800">
                Wholesale Price *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-800">₹</span>
                <input
                  id="wholesalePrice"
                  type="number"
                  value={wholesalePrice}
                  onChange={(e) => setWholesalePrice(Number(e.target.value))}
                  min="0"
                  step="0.01"
                  className="w-full rounded-md border border-gray-300 pl-8 pr-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="retailPrice" className="mb-1 block text-sm font-medium text-gray-800">
                Retail Price *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-800">₹</span>
                <input
                  id="retailPrice"
                  type="number"
                  value={retailPrice}
                  onChange={(e) => setRetailPrice(Number(e.target.value))}
                  min="0"
                  step="0.01"
                  className="w-full rounded-md border border-gray-300 pl-8 pr-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="minStockLevel" className="mb-1 block text-sm font-medium text-gray-800">
                Min Stock Level
              </label>
              <input
                id="minStockLevel"
                type="number"
                value={minStockLevel}
                onChange={(e) => setMinStockLevel(Number(e.target.value))}
                min="0"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="reorderPoint" className="mb-1 block text-sm font-medium text-gray-800">
                Reorder Point
              </label>
              <input
                id="reorderPoint"
                type="number"
                value={reorderPoint}
                onChange={(e) => setReorderPoint(Number(e.target.value))}
                min="0"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="barcode" className="mb-1 block text-sm font-medium text-gray-800">
                Barcode
              </label>
              <input
                id="barcode"
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="isActive" className="mb-1 block text-sm font-medium text-gray-800">
                Status
              </label>
              <select
                id="isActive"
                value={isActive ? "active" : "inactive"}
                onChange={(e) => setIsActive(e.target.value === "active")}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label htmlFor="condition" className="mb-1 block text-sm font-medium text-gray-800">
                Product Condition
              </label>
              <select
                id="condition"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="NEW">New Product</option>
                <option value="DAMAGED">Damaged Product</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/products')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              Create Product
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
