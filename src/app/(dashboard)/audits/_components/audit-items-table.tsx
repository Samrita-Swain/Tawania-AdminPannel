"use client";

import Link from "next/link";
import { format } from "date-fns";
import { AuditItemStatusDropdown } from "./audit-item-status-dropdown";

interface AuditItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    sku: string;
    costPrice?: number;
  };
  inventoryItemId: string;
  inventoryItem: {
    id: string;
    quantity: number;
    bin?: {
      id: string;
      name: string;
      shelf?: {
        id: string;
        name: string;
        aisle?: {
          id: string;
          name: string;
          zone?: {
            id: string;
            name: string;
          };
        };
      };
    } | null;
  };
  expectedQuantity: number;
  countedQuantity: number | null;
  discrepancy: number | null;
  status: string;
  notes: string | null;
  countedById: string | null;
  countedBy?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  countedAt: Date | null;
}

interface AuditItemsTableProps {
  items: AuditItem[];
  auditId: string;
  onStatusChange?: (newStatus: string) => void;
}

export function AuditItemsTable({ items, auditId, onStatusChange }: AuditItemsTableProps) {
  if (items.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300">
        <p className="text-gray-800">No items found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
            <th className="px-4 py-2">Product</th>
            <th className="px-4 py-2">Location</th>
            <th className="px-4 py-2">Expected</th>
            <th className="px-4 py-2">Actual</th>
            <th className="px-4 py-2">Variance</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Counted By</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {items.map((item) => {
            // Format location
            const bin = item.inventoryItem?.bin?.name || "Unassigned";
            const shelf = item.inventoryItem?.bin?.shelf?.name || "";
            const aisle = item.inventoryItem?.bin?.shelf?.aisle?.name || "";
            const zone = item.inventoryItem?.bin?.shelf?.aisle?.zone?.name || "";

            const location = zone
              ? `${zone} / ${aisle} / ${shelf} / ${bin}`
              : bin;

            // Determine discrepancy class
            let discrepancyClass = "text-gray-800";
            if (item.discrepancy) {
              discrepancyClass = item.discrepancy > 0 ? "text-green-600" : "text-red-600";
            }

            // Determine status class
            let statusClass = "bg-gray-100 text-gray-800";
            switch (item.status) {
              case "PENDING":
                statusClass = "bg-gray-100 text-gray-800";
                break;
              case "COUNTED":
                statusClass = "bg-blue-100 text-blue-800";
                break;
              case "DISCREPANCY":
                statusClass = "bg-red-100 text-red-800";
                break;
              case "RECONCILED":
                statusClass = "bg-green-100 text-green-800";
                break;
            }

            return (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-2 text-sm font-medium">
                  <Link href={`/products/${item.productId}`} className="text-blue-600 hover:underline">
                    {item.product.name}
                  </Link>
                  <div className="text-xs text-gray-800">{item.product.sku}</div>
                </td>
                <td className="px-4 py-2 text-sm text-gray-800">
                  {location}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-800">
                  {item.expectedQuantity}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-800">
                  {item.countedQuantity !== null ? item.countedQuantity : "-"}
                </td>
                <td className={`whitespace-nowrap px-4 py-2 text-sm font-medium ${discrepancyClass}`}>
                  {item.discrepancy !== null ? (item.discrepancy > 0 ? `+${item.discrepancy}` : item.discrepancy) : "-"}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-sm">
                  <AuditItemStatusDropdown
                    auditId={auditId}
                    itemId={item.id}
                    currentStatus={item.status}
                    productName={item.product.name}
                    expectedQuantity={item.expectedQuantity}
                    actualQuantity={item.countedQuantity}
                    onStatusChange={onStatusChange}
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-800">
                  {item.countedBy ? (
                    <div>
                      <div>{item.countedBy.name || item.countedBy.email}</div>
                      {item.countedAt && (
                        <div className="text-xs text-gray-800">
                          {format(new Date(item.countedAt), "MMM d, yyyy h:mm a")}
                        </div>
                      )}
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatStatus(status: string): string {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "COUNTED":
      return "Counted";
    case "DISCREPANCY":
      return "Discrepancy";
    case "RECONCILED":
      return "Reconciled";
    default:
      return status;
  }
}

