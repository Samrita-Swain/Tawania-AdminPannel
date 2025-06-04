"use client";

import Link from "next/link";
import { format } from "date-fns";

interface LoyaltyTransaction {
  id: string;
  points: number;
  type: string;
  description: string | null;
  createdAt: Date;
  sale?: {
    id: string;
    receiptNumber: string;
  } | null;
  program: {
    id: string;
    name: string;
  };
}

interface LoyaltyTransactionsListProps {
  transactions: LoyaltyTransaction[];
}

export function LoyaltyTransactionsList({ transactions }: LoyaltyTransactionsListProps) {
  if (transactions.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300">
        <p className="text-gray-800">No loyalty transactions found</p>
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
            <th className="px-4 py-2">Date</th>
            <th className="px-4 py-2">Type</th>
            <th className="px-4 py-2">Points</th>
            <th className="px-4 py-2">Description</th>
            <th className="px-4 py-2">Reference</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {transactions.map((transaction) => {
            // Determine points class
            const pointsClass = transaction.type === "EARN" || transaction.type === "BONUS"
              ? "text-green-600"
              : transaction.type === "REDEEM" || transaction.type === "EXPIRE"
                ? "text-red-600"
                : "text-gray-800";
            
            // Format points
            const formattedPoints = transaction.type === "EARN" || transaction.type === "BONUS"
              ? `+${transaction.points}`
              : transaction.type === "REDEEM" || transaction.type === "EXPIRE"
                ? `-${transaction.points}`
                : transaction.points;
            
            // Format type
            const formattedType = transaction.type.charAt(0) + transaction.type.slice(1).toLowerCase();
            
            return (
              <tr key={transaction.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-800">
                  {format(new Date(transaction.createdAt), "MMM d, yyyy")}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-sm">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                    transaction.type === "EARN" || transaction.type === "BONUS"
                      ? "bg-green-100 text-green-800"
                      : transaction.type === "REDEEM"
                        ? "bg-blue-100 text-blue-800"
                        : transaction.type === "EXPIRE"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                  }`}>
                    {formattedType}
                  </span>
                </td>
                <td className={`whitespace-nowrap px-4 py-2 text-sm font-medium ${pointsClass}`}>
                  {formattedPoints}
                </td>
                <td className="px-4 py-2 text-sm text-gray-800">
                  {transaction.description || "-"}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-sm">
                  {transaction.sale ? (
                    <Link
                      href={`/sales/${transaction.sale.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {transaction.sale.receiptNumber}
                    </Link>
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

