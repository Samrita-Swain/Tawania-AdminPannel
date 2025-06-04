"use client";

import { formatCurrency } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  unit: string | null;
  // Removed category fields for simplified schema
}

interface InventoryItem {
  id: string;
  productId: string;
  storeId: string;
  quantity: number;
  reservedQuantity: number | null;
  costPrice: number | null;
  retailPrice: number | null;
  product: Product;
}

interface POSProductListProps {
  inventoryItems: InventoryItem[];
  onAddToCart: (item: InventoryItem) => void;
}

export function POSProductList({
  inventoryItems,
  onAddToCart,
}: POSProductListProps) {
  if (inventoryItems.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <p className="text-gray-800">No products found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {inventoryItems.map((item) => (
        <div
          key={item.id}
          className="flex cursor-pointer flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
          onClick={() => onAddToCart(item)}
        >
          <div className="mb-2 h-32 w-full bg-gray-100 flex items-center justify-center rounded">
            {/* Product image would go here */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-12 w-12 text-gray-800">
              <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
          </div>
          <h3 className="mb-1 text-sm font-medium text-gray-900 line-clamp-2">{item.product.name}</h3>
          <p className="mb-1 text-xs text-gray-800">{item.product.sku}</p>
          <div className="mt-auto flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900">
              {formatCurrency(item.retailPrice || 0)}
            </span>
            <span className="text-xs text-gray-800">
              {item.quantity - (item.reservedQuantity || 0)} {item.product.unit || 'each'}
            </span>
          </div>
          {/* Category display removed for simplified schema */}
        </div>
      ))}
    </div>
  );
}

