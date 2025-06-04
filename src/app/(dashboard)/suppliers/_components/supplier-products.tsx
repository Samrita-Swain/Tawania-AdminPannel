"use client";

import Link from "next/link";

interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string | null;
  category: {
    id: string;
    name: string;
  } | null;
  costPrice: number;
  retailPrice: number;
  isActive: boolean;
  // Add other properties as needed
}

interface SupplierProductsProps {
  products: Product[];
}

export function SupplierProducts({ products }: SupplierProductsProps) {
  if (products.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300">
        <p className="text-gray-800">No products found for this supplier</p>
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-800">
            <th className="px-4 py-2">Product</th>
            <th className="px-4 py-2">SKU</th>
            <th className="px-4 py-2">Category</th>
            <th className="px-4 py-2">Cost Price</th>
            <th className="px-4 py-2">Retail Price</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {products.map((product) => (
            <tr key={product.id} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-blue-600">
                <Link href={`/products/${product.id}`}>
                  {product.name}
                </Link>
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                {product.sku}
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                {product.category?.name || "Uncategorized"}
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                ${product.costPrice.toFixed(2)}
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                ${product.retailPrice.toFixed(2)}
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-sm">
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${product.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                  {product.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-sm">
                <div className="flex items-center space-x-2">
                  <Link
                    href={`/products/${product.id}`}
                    className="rounded bg-blue-50 p-1 text-blue-600 hover:bg-blue-100"
                    title="View Product"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  </Link>
                  <Link
                    href={`/products/${product.id}/edit`}
                    className="rounded bg-green-50 p-1 text-green-600 hover:bg-green-100"
                    title="Edit Product"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
