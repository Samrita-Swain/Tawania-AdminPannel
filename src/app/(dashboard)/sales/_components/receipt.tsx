"use client";

import { useEffect } from "react";
import Image from "next/image";

interface Product {
  id: string;
  name: string;
  sku: string;
  unit?: string;
}

interface SaleItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product: Product;
}

interface Store {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
}

interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

interface User {
  id: string;
  name: string | null;
  email?: string;
}

interface Payment {
  id: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string | null;
  createdAt: Date;
}

// Updated Sale interface to match the actual structure from the database
interface Sale {
  id: string;
  receiptNumber: string;
  storeId: string;
  customerId: string | null;
  createdById: string;
  saleDate: Date;
  subtotalAmount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  notes: string | null;
  store: Store;
  customer: Customer | null;
  createdBy: User;
  items: SaleItem[];
  Payment: Payment[];
}

interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  taxId: string;
}

interface ReceiptProps {
  sale: Sale;
  companyInfo: CompanyInfo;
}

export function Receipt({ sale, companyInfo }: ReceiptProps) {
  // Auto-print when component loads in print mode
  useEffect(() => {
    const isPrintMode = window.matchMedia('print').matches;
    if (isPrintMode) {
      window.print();
    }
  }, []);

  // Calculate totals
  const subtotal = Number(sale.subtotalAmount);
  const tax = Number(sale.taxAmount);
  const total = Number(sale.totalAmount);

  // Calculate payment totals
  const totalPaid = sale.Payment.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const balance = total - totalPaid;

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString() + ' ' + new Date(date).toLocaleTimeString();
  };

  return (
    <div className="font-sans text-gray-900">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="mb-2 flex justify-center">
          {/* You can add your logo here */}
          {/* <Image src="/logo.png" alt="Company Logo" width={120} height={60} /> */}
        </div>
        <h1 className="text-xl font-bold">{companyInfo.name}</h1>
        <p className="text-sm text-gray-800">{companyInfo.address}</p>
        <p className="text-sm text-gray-800">
          {companyInfo.phone} | {companyInfo.email}
        </p>
        <p className="text-sm text-gray-800">{companyInfo.website}</p>
        <p className="text-sm text-gray-800">Tax ID: {companyInfo.taxId}</p>
      </div>

      {/* Receipt Info */}
      <div className="mb-6 border-b border-t border-gray-200 py-4">
        <div className="flex justify-between">
          <div>
            <p className="font-bold">Receipt #: {sale.receiptNumber}</p>
            <p className="text-sm">Date: {formatDate(sale.saleDate)}</p>
            <p className="text-sm">Store: {sale.store.name}</p>
            <p className="text-sm">Cashier: {sale.createdBy.name || "Unknown"}</p>
          </div>
          <div className="text-right">
            <p className="text-sm">
              Customer: {sale.customer ? sale.customer.name : "Walk-in Customer"}
            </p>
            {sale.customer?.email && (
              <p className="text-sm">Email: {sale.customer.email}</p>
            )}
            {sale.customer?.phone && (
              <p className="text-sm">Phone: {sale.customer.phone}</p>
            )}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="mb-6">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-200 text-sm">
              <th className="pb-2">Item</th>
              <th className="pb-2 text-center">Qty</th>
              <th className="pb-2 text-right">Price</th>
              <th className="pb-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item) => (
              <tr key={item.id} className="text-sm">
                <td className="py-2">
                  <div>{item.product.name}</div>
                  <div className="text-xs text-gray-800">{item.product.sku}</div>
                </td>
                <td className="py-2 text-center">
                  {item.quantity} {item.product.unit}
                </td>
                <td className="py-2 text-right">₹{Number(item.unitPrice).toFixed(2)}</td>
                <td className="py-2 text-right">₹{Number(item.totalPrice).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="mb-6 border-t border-gray-200 pt-4">
        <div className="flex justify-between text-sm">
          <span>Subtotal:</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Tax:</span>
          <span>₹{tax.toFixed(2)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 text-base font-bold">
          <span>Total:</span>
          <span>₹{total.toFixed(2)}</span>
        </div>

        {/* Payments */}
        {sale.Payment.length > 0 && (
          <div className="mt-4 border-t border-gray-200 pt-2">
            <p className="mb-2 text-sm font-semibold">Payment Information:</p>
            {sale.Payment.map((payment, index) => (
              <div key={payment.id} className="flex justify-between text-sm">
                <span>
                  {payment.paymentMethod.replace("_", " ")}
                  {payment.referenceNumber && ` (Ref: ${payment.referenceNumber})`}:
                </span>
                <span>₹{Number(payment.amount).toFixed(2)}</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 text-sm font-semibold">
              <span>Total Paid:</span>
              <span>₹{totalPaid.toFixed(2)}</span>
            </div>
            {balance > 0 && (
              <div className="flex justify-between text-sm font-semibold text-red-600">
                <span>Balance Due:</span>
                <span>₹{balance.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 border-t border-gray-200 pt-4 text-center text-sm text-gray-800">
        <p className="mb-2">{sale.notes}</p>
        <p className="font-semibold">Thank you for your business!</p>
        <p>For returns and exchanges, please bring this receipt within 30 days of purchase.</p>
      </div>
    </div>
  );
}
