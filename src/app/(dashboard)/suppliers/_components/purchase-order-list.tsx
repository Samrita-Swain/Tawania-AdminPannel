"use client";

import Link from "next/link";
import { format } from "date-fns";

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: Date;
}

interface PurchaseOrderListProps {
  purchaseOrders: PurchaseOrder[];
}

export function PurchaseOrderList({ purchaseOrders }: PurchaseOrderListProps) {
  if (purchaseOrders.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300">
        <p className="text-gray-800">No purchase orders found</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {purchaseOrders.map((order) => (
        <Link
          key={order.id}
          href={`/purchase-orders/${order.id}`}
          className="block rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-blue-600">{order.orderNumber}</p>
              <p className="text-xs text-gray-800">
                {format(new Date(order.createdAt), "MMM d, yyyy")}
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium">${order.total.toFixed(2)}</p>
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClass(order.status)}`}>
                {formatStatus(order.status)}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function getStatusClass(status: string): string {
  switch (status) {
    case "DRAFT":
      return "bg-gray-100 text-gray-800";
    case "PENDING":
      return "bg-yellow-100 text-yellow-800";
    case "ORDERED":
      return "bg-blue-100 text-blue-800";
    case "PARTIAL":
      return "bg-purple-100 text-purple-800";
    case "RECEIVED":
      return "bg-green-100 text-green-800";
    case "CANCELLED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function formatStatus(status: string): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "PENDING":
      return "Pending";
    case "ORDERED":
      return "Ordered";
    case "PARTIAL":
      return "Partially Received";
    case "RECEIVED":
      return "Received";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}
