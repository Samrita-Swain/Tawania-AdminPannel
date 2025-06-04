"use client";

import { useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { TransferStatusBadge } from "./transfer-status-badge";

interface Product {
  id: string;
  name: string;
  sku: string;
  category: {
    id: string;
    name: string;
  } | null;
}

interface TransferItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  sourceCostPrice: number;
  sourceRetailPrice: number;
  targetCostPrice: number;
  targetRetailPrice: number;
}

interface Transfer {
  id: string;
  transferNumber: string;
  status: string;
  transferType: string;
  priority: string;
  requestedDate: string | Date;
  expectedDeliveryDate: string | Date | null;
  notes: string | null;
  createdAt: string | Date;
  approvedDate: string | Date | null;
  actualDeliveryDate: string | Date | null;
  completedDate: string | Date | null;
  approvedAt: string | Date | null;
  shippedAt: string | Date | null;
  receivedAt: string | Date | null;
  fromWarehouseId: string | null;
  fromWarehouse: {
    id: string;
    name: string;
    address: string | null;
  } | null;
  toStoreId: string | null;
  toStore: {
    id: string;
    name: string;
    address: string | null;
  } | null;
  toWarehouseId: string | null;
  toWarehouse: {
    id: string;
    name: string;
    address: string | null;
  } | null;
  items: TransferItem[];
  totalItems: number;
  totalCost: number;
  totalRetail: number;
}

interface PrintTransferDocumentProps {
  transfer: Transfer;
}

export function PrintTransferDocument({ transfer }: PrintTransferDocumentProps) {
  // Auto-print when component loads
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Format date
  const formatDate = (date: string | Date | null) => {
    if (!date) return "N/A";
    return format(new Date(date), "MMM d, yyyy");
  };

  // Get destination name
  const getDestinationName = () => {
    if (transfer.toStore) {
      return transfer.toStore.name;
    } else if (transfer.toWarehouse) {
      return transfer.toWarehouse.name;
    }
    return "Unknown";
  };

  // Get destination address
  const getDestinationAddress = () => {
    if (transfer.toStore && transfer.toStore.address) {
      return transfer.toStore.address;
    } else if (transfer.toWarehouse && transfer.toWarehouse.address) {
      return transfer.toWarehouse.address;
    }
    return "No address provided";
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold">Transfer Document</h1>
        <div className="flex gap-2">
          <Button onClick={() => window.print()}>Print Document</Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            Back
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 border-b border-gray-200 pb-8">
          <div className="flex justify-between">
            <div>
              <h1 className="text-3xl font-bold">Transfer #{transfer.transferNumber}</h1>
              <div className="mt-2">
                <TransferStatusBadge status={transfer.status} />
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-800">Created Date:</p>
              <p className="font-medium">{formatDate(transfer.createdAt)}</p>
              {transfer.expectedDeliveryDate && (
                <>
                  <p className="mt-2 text-sm text-gray-800">Expected Delivery:</p>
                  <p className="font-medium">{formatDate(transfer.expectedDeliveryDate)}</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* From/To Information */}
        <div className="mb-8 grid grid-cols-2 gap-8">
          <div>
            <h2 className="mb-2 text-lg font-semibold">From</h2>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="font-medium">{transfer.fromWarehouse?.name || "Unknown"}</p>
              <p className="text-sm text-gray-800">
                {transfer.fromWarehouse?.address || "No address provided"}
              </p>
            </div>
          </div>
          <div>
            <h2 className="mb-2 text-lg font-semibold">To</h2>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="font-medium">{getDestinationName()}</p>
              <p className="text-sm text-gray-800">{getDestinationAddress()}</p>
            </div>
          </div>
        </div>

        {/* Transfer Details */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold">Transfer Details</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-800">Transfer Type</p>
              <p className="font-medium">{transfer.transferType}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-800">Priority</p>
              <p className="font-medium">{transfer.priority}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-800">Total Items</p>
              <p className="font-medium">{transfer.totalItems}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-800">Total Value</p>
              <p className="font-medium">${transfer.totalCost.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold">Items</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm font-medium text-gray-800">
                  <th className="px-4 py-2">Item</th>
                  <th className="px-4 py-2">SKU</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2 text-right">Quantity</th>
                  <th className="px-4 py-2 text-right">Unit Cost</th>
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {transfer.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200">
                    <td className="px-4 py-3 font-medium">{item.product.name}</td>
                    <td className="px-4 py-3 text-sm">{item.product.sku}</td>
                    <td className="px-4 py-3 text-sm">
                      {item.product.category?.name || "Uncategorized"}
                    </td>
                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">
                      ${Number(item.sourceCostPrice).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      ${(Number(item.sourceCostPrice) * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-300 font-medium">
                  <td colSpan={5} className="px-4 py-3 text-right">
                    Total:
                  </td>
                  <td className="px-4 py-3 text-right">
                    ${transfer.totalCost.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Notes */}
        {transfer.notes && (
          <div className="mb-8">
            <h2 className="mb-2 text-lg font-semibold">Notes</h2>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="whitespace-pre-wrap text-sm">{transfer.notes}</p>
            </div>
          </div>
        )}

        {/* Signatures */}
        <div className="mb-8 grid grid-cols-3 gap-8">
          <div>
            <h2 className="mb-4 text-sm font-semibold">Prepared By</h2>
            <div className="h-20 border-b border-gray-300"></div>
            <p className="mt-2 text-sm text-gray-800">Date: _______________</p>
          </div>
          <div>
            <h2 className="mb-4 text-sm font-semibold">Shipped By</h2>
            <div className="h-20 border-b border-gray-300"></div>
            <p className="mt-2 text-sm text-gray-800">Date: _______________</p>
          </div>
          <div>
            <h2 className="mb-4 text-sm font-semibold">Received By</h2>
            <div className="h-20 border-b border-gray-300"></div>
            <p className="mt-2 text-sm text-gray-800">Date: _______________</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 border-t border-gray-200 pt-8 text-center text-sm text-gray-800">
          <p>This document was generated on {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</p>
          <p className="mt-1">Transfer #{transfer.transferNumber}</p>
        </div>
      </div>
    </div>
  );
}
