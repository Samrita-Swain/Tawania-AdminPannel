"use client";

import Link from "next/link";

interface TopSellingProduct {
  id: string;
  name: string;
  sku: string;
  unit: string;
  total_quantity: number;
  total_revenue: number;
}

interface TopSellingProductsProps {
  products: TopSellingProduct[];
}

export function TopSellingProducts({ products }: TopSellingProductsProps) {
  if (!products || products.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-800">No product sales data available</p>
      </div>
    );
  }

  // Calculate the highest quantity to determine the width of progress bars
  const maxQuantity = Math.max(...products.map(product => Number(product.total_quantity)));

  return (
    <div className="space-y-4">
      {products.map((product) => (
        <div key={product.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <Link href={`/products/${product.id}`} className="font-medium text-blue-600 hover:underline">
              {product.name}
            </Link>
            <span className="text-sm font-medium text-gray-900">
              {product.total_quantity} {product.unit}
            </span>
          </div>
          <div className="flex items-center">
            <div className="h-2 flex-grow rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-500"
                style={{
                  width: `${(Number(product.total_quantity) / maxQuantity) * 100}%`,
                }}
              ></div>
            </div>
            <span className="ml-2 text-xs text-gray-800">
              ${Number(product.total_revenue).toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-gray-800">{product.sku}</p>
        </div>
      ))}
    </div>
  );
}
