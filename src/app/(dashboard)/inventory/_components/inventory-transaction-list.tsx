"use client";

import Link from "next/link";

interface User {
  id: string;
  name: string | null;
  email: string | null;
}

interface InventoryTransaction {
  id: string;
  inventoryItemId: string;
  productId: string;
  transactionType: string;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
  notes: string | null;
  createdAt: Date;
  userId: string | null;
  user: User | null;
}

interface InventoryTransactionListProps {
  transactions: InventoryTransaction[];
}

export function InventoryTransactionList({ transactions }: InventoryTransactionListProps) {
  const getTransactionTypeStyles = (type: string) => {
    switch (type) {
      case "PURCHASE":
        return "bg-green-100 text-green-800";
      case "SALE":
        return "bg-blue-100 text-blue-800";
      case "TRANSFER_IN":
        return "bg-purple-100 text-purple-800";
      case "TRANSFER_OUT":
        return "bg-amber-100 text-amber-800";
      case "ADJUSTMENT":
        return "bg-gray-100 text-gray-800";
      case "RETURN":
        return "bg-indigo-100 text-indigo-800";
      case "DAMAGE":
        return "bg-red-100 text-red-800";
      case "EXPIRY":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    return type.replace("_", " ");
  };

  const getQuantityDisplay = (type: string, quantity: number) => {
    if (["SALE", "TRANSFER_OUT", "DAMAGE", "EXPIRY"].includes(type)) {
      return <span className="text-red-600">-{quantity}</span>;
    }
    return <span className="text-green-600">+{quantity}</span>;
  };

  if (transactions.length === 0) {
    return (
      <div className="py-8 text-center text-gray-800">
        No transaction history found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Quantity</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Notes</th>
            <th className="px-4 py-3">User</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-800">
                {new Date(transaction.createdAt).toLocaleString()}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${getTransactionTypeStyles(
                    transaction.transactionType
                  )}`}
                >
                  {getTransactionTypeLabel(transaction.transactionType)}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">
                {getQuantityDisplay(transaction.transactionType, transaction.quantity)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-800">
                {transaction.unitPrice
                  ? `$${transaction.unitPrice.toFixed(2)} × ${transaction.quantity} = $${transaction.totalPrice?.toFixed(2)}`
                  : "-"}
              </td>
              <td className="px-4 py-3 text-sm text-gray-800 max-w-xs truncate">
                {transaction.notes || "-"}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-800">
                {transaction.user?.name || "System"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

