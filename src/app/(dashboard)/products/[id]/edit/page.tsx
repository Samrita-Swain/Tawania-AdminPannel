"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import { use } from "react";

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  // Use React.use() to unwrap the params object
  const unwrappedParams = use(params);
  const productId = unwrappedParams.id;

  // Log the product ID to help with debugging
  console.log("Edit page - Product ID:", productId);

  // Check if the product ID is valid
  useEffect(() => {
    if (!productId || productId === "unknown" || productId === "undefined") {
      console.error("Invalid product ID:", productId);
      alert("Invalid product ID. Redirecting to products list.");
      router.push("/products");
    }
  }, [productId, router]);

  const [categories, setCategories] = useState<any[]>([]);
  const [product, setProduct] = useState<any>(null);
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

  // Fetch product and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch product
        console.log("Fetching product data for ID:", productId);

        // Create a clone of the response for debugging
        let responseClone;

        try {
          const productResponse = await fetch(`/api/products/${productId}`);
          responseClone = productResponse.clone(); // Clone for debugging

          console.log("Product response status:", productResponse.status);

          if (!productResponse.ok) {
            if (productResponse.status === 404) {
              console.error("Product not found with ID:", productId);
              notFound();
            }

            // Try to get more detailed error information
            let errorMessage = 'Failed to fetch product';
            try {
              const errorData = await responseClone.json();
              console.error("Error response data:", errorData);
              if (errorData.error) {
                errorMessage = errorData.error;
              }
            } catch (parseError) {
              console.error("Error parsing error response:", parseError);
            }

            throw new Error(errorMessage);
          }

          const productData = await productResponse.json();
          console.log("Successfully fetched product data:", productData);

          if (!productData.product) {
            console.error("Product data is missing or invalid:", productData);
            throw new Error('Invalid product data received');
          }

          setProduct(productData.product);

          // Set form state with null checks to avoid errors
          setName(productData.product.name || "");
          setSku(productData.product.sku || "");
          setDescription(productData.product.description || "");
          setCategoryId(productData.product.categoryId || "");
          setCostPrice(productData.product.costPrice || 0);
          setWholesalePrice(productData.product.wholesalePrice || 0);
          setRetailPrice(productData.product.retailPrice || 0);
          setMinStockLevel(productData.product.minStockLevel || 0);
          setReorderPoint(productData.product.reorderPoint || 0);
          setBarcode(productData.product.barcode || "");
          setIsActive(productData.product.isActive !== false); // Default to true if not explicitly false
          // Default to NEW since condition might not exist in the database
          setCondition("NEW");

          // Fetch categories
          const categoriesResponse = await fetch('/api/categories');
          if (!categoriesResponse.ok) {
            throw new Error('Failed to fetch categories');
          }

          const categoriesData = await categoriesResponse.json();
          setCategories(categoriesData.categories || []);
        } catch (fetchError) {
          console.error("Error in fetch operation:", fetchError);
          throw fetchError; // Re-throw to be caught by the outer try/catch
        }
      } catch (error) {
        console.error('Error fetching data:', error);

        // Show a more user-friendly error message
        if (error instanceof Error) {
          alert(`Error loading product data: ${error.message}. Please try again.`);
        } else {
          alert('Error loading product data. Please try again.');
        }

        // Navigate back to products list if we can't load the product
        router.push('/products');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [productId]);

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
        // Removed condition field since it might not exist in the database
      };

      console.log('Submitting product update with data:', productData);
      console.log('Product ID:', productId);

      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        let errorMessage = 'Failed to update product';
        try {
          const errorData = await response.json();
          console.error('Error response:', errorData);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Success response:', result);

      // Redirect to product details page
      // Use setTimeout to ensure the redirect happens after the state update
      setTimeout(() => {
        router.push(`/products/${productId}`);
      }, 100);
    } catch (error) {
      console.error('Error updating product:', error);

      // Show more detailed error message
      if (error instanceof Error) {
        alert(`Failed to update product: ${error.message}`);
      } else {
        alert('Failed to update product. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-white p-6 shadow-md">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 mx-auto"></div>
          <p className="text-gray-500">Loading data...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Edit Product</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/products/${productId}`}
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow-md">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
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
            <label htmlFor="sku" className="mb-1 block text-sm font-medium text-gray-700">
              SKU *
            </label>
            <input
              id="sku"
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="category" className="mb-1 block text-sm font-medium text-gray-700">
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
            <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700">
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
            <label htmlFor="costPrice" className="mb-1 block text-sm font-medium text-gray-700">
              Cost Price *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
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
            <label htmlFor="wholesalePrice" className="mb-1 block text-sm font-medium text-gray-700">
              Wholesale Price *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
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
            <label htmlFor="retailPrice" className="mb-1 block text-sm font-medium text-gray-700">
              Retail Price *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
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
            <label htmlFor="minStockLevel" className="mb-1 block text-sm font-medium text-gray-700">
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
            <label htmlFor="reorderPoint" className="mb-1 block text-sm font-medium text-gray-700">
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
            <label htmlFor="barcode" className="mb-1 block text-sm font-medium text-gray-700">
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
            <label htmlFor="isActive" className="mb-1 block text-sm font-medium text-gray-700">
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
            <label htmlFor="condition" className="mb-1 block text-sm font-medium text-gray-700">
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
            onClick={() => router.push(`/products/${productId}`)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Update Product
          </Button>
        </div>
      </form>
    </div>
  );
}
