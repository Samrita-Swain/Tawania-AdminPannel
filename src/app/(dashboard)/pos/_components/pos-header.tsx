"use client";

import Link from "next/link";

interface Store {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
}

interface TaxRate {
  id: string;
  name: string;
  rate: number;
}

interface POSHeaderProps {
  store: Store;
  stores: Store[];
  onStoreChange: (storeId: string) => void;
  customer: Customer | null;
  customers: Customer[];
  onCustomerChange: (customerId: string | null) => void;
  taxRate: TaxRate;
  taxRates: TaxRate[];
  onTaxRateChange: (taxRateId: string) => void;
  barcodeInput: string;
  onBarcodeInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBarcodeInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBarcodeScan: (barcode: string) => void;
}

export function POSHeader({
  store,
  stores,
  onStoreChange,
  customer,
  customers,
  onCustomerChange,
  taxRate,
  taxRates,
  onTaxRateChange,
  barcodeInput,
  onBarcodeInputChange,
  onBarcodeInputKeyDown,
  onBarcodeScan,
}: POSHeaderProps) {
  return (
    <div className="border-b border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-800 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </Link>

          <h1 className="text-xl font-bold text-gray-800">Point of Sale</h1>

          <div className="ml-4">
            <label htmlFor="store" className="mr-2 text-sm font-medium text-gray-800">
              Store:
            </label>
            <select
              id="store"
              value={store.id}
              onChange={(e) => onStoreChange(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div>
            <label htmlFor="barcode" className="mr-2 text-sm font-medium text-gray-800">
              Barcode:
            </label>
            <input
              id="barcode"
              type="text"
              value={barcodeInput}
              onChange={onBarcodeInputChange}
              onKeyDown={onBarcodeInputKeyDown}
              placeholder="Scan or enter barcode"
              className="w-48 rounded-md border border-gray-300 px-3 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={() => onBarcodeScan(barcodeInput)}
              disabled={!barcodeInput}
              className="ml-1 rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 disabled:opacity-50"
            >
              Add
            </button>
          </div>

          <div>
            <label htmlFor="customer" className="mr-2 text-sm font-medium text-gray-800">
              Customer:
            </label>
            <select
              id="customer"
              value={customer?.id || ""}
              onChange={(e) => onCustomerChange(e.target.value || null)}
              className="w-48 rounded-md border border-gray-300 px-3 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Walk-in Customer</option>
              {Array.isArray(customers) && customers.length > 0 ? (
                customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || "Customer"}
                  </option>
                ))
              ) : (
                <option value="guest">Guest Customer</option>
              )}
            </select>
          </div>

          <div>
            <label htmlFor="taxRate" className="mr-2 text-sm font-medium text-gray-800">
              Tax Rate:
            </label>
            <select
              id="taxRate"
              value={taxRate.id}
              onChange={(e) => onTaxRateChange(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {taxRates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.rate}%)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
