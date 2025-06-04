"use client";

import { formatCurrency } from "@/lib/utils";

interface CartItem {
  inventoryItemId: string;
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  maxQuantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  unit: string;
}

interface POSCartProps {
  items: CartItem[];
  onUpdateItem: (index: number, quantity: number, discount: number) => void;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  onCheckout: () => void;
}

export function POSCart({
  items,
  onUpdateItem,
  onRemoveItem,
  onClearCart,
  subtotal,
  taxRate,
  taxAmount,
  total,
  onCheckout,
}: POSCartProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Shopping Cart</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-800">{items.length} items</span>
            <button
              onClick={onClearCart}
              disabled={items.length === 0}
              className="rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mb-2 h-12 w-12 text-gray-800">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
            <p className="text-gray-800">Your cart is empty</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{item.name}</h3>
                    <p className="text-xs text-gray-800">{item.sku}</p>
                  </div>
                  <button
                    onClick={() => onRemoveItem(index)}
                    className="rounded-full p-1 text-gray-800 hover:bg-gray-100 hover:text-gray-800"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <button
                      onClick={() => onUpdateItem(index, item.quantity - 1, item.discount)}
                      className="rounded-l-md border border-gray-300 bg-gray-50 px-2 py-1 text-gray-800 hover:bg-gray-100"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={item.maxQuantity}
                      value={item.quantity}
                      onChange={(e) => onUpdateItem(index, parseInt(e.target.value) || 1, item.discount)}
                      className="w-12 border-y border-gray-300 py-1 text-center text-sm"
                    />
                    <button
                      onClick={() => onUpdateItem(index, item.quantity + 1, item.discount)}
                      disabled={item.quantity >= item.maxQuantity}
                      className="rounded-r-md border border-gray-300 bg-gray-50 px-2 py-1 text-gray-800 hover:bg-gray-100 disabled:opacity-50"
                    >
                      +
                    </button>
                    <span className="ml-2 text-sm text-gray-800">{item.unit}</span>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(item.totalPrice)}</p>
                    <p className="text-xs text-gray-800">{formatCurrency(item.unitPrice)} each</p>
                  </div>
                </div>

                <div className="mt-2 flex items-center">
                  <label htmlFor={`discount-${index}`} className="mr-2 text-xs text-gray-800">
                    Discount:
                  </label>
                  <input
                    id={`discount-${index}`}
                    type="number"
                    min="0"
                    max="100"
                    value={item.discount}
                    onChange={(e) => onUpdateItem(index, item.quantity, parseInt(e.target.value) || 0)}
                    className="w-16 rounded-md border border-gray-300 py-1 text-center text-sm"
                  />
                  <span className="ml-1 text-xs text-gray-800">%</span>

                  {item.discount > 0 && (
                    <span className="ml-2 text-xs text-green-600">
                      Save {formatCurrency(item.quantity * item.unitPrice * (item.discount / 100))}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 bg-white p-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-800">Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-800">Tax ({taxRate}%)</span>
            <span className="font-medium">{formatCurrency(taxAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        <button
          onClick={onCheckout}
          disabled={items.length === 0}
          className="mt-4 w-full rounded-md bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Checkout
        </button>
      </div>
    </div>
  );
}

