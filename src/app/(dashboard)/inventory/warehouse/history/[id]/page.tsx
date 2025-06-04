"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface InventoryTransaction {
  id: string;
  type: string;
  quantity: number;
  reason: string;
  notes?: string;
  createdAt: string;
  user?: {
    name: string;
    email: string;
  };
}

interface InventoryItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    sku: string;
  };
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
}

export default function InventoryHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const inventoryId = params.id as string;

  const [inventoryItem, setInventoryItem] = useState<InventoryItem | null>(null);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch inventory item details
        const itemResponse = await fetch(`/api/inventory/items/${inventoryId}`);
        if (!itemResponse.ok) {
          throw new Error('Failed to fetch inventory item');
        }
        const itemData = await itemResponse.json();
        setInventoryItem(itemData);

        // Fetch transaction history
        const historyResponse = await fetch(`/api/inventory/items/${inventoryId}/history`);
        if (!historyResponse.ok) {
          throw new Error('Failed to fetch transaction history');
        }
        const historyData = await historyResponse.json();
        setTransactions(historyData);

      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    if (inventoryId) {
      fetchData();
    }
  }, [inventoryId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'add':
      case 'restock':
        return 'bg-green-100 text-green-800';
      case 'remove':
      case 'sale':
        return 'bg-red-100 text-red-800';
      case 'adjust':
      case 'correction':
        return 'bg-blue-100 text-blue-800';
      case 'transfer':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 mx-auto"></div>
          <p className="text-gray-800">Loading inventory history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Inventory History</h1>
          <Link
            href="/inventory/warehouse"
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 transition-colors"
          >
            Back to Inventory
          </Link>
        </div>
        <div className="rounded-lg bg-red-50 p-6">
          <h3 className="text-lg font-medium text-red-800">Error</h3>
          <p className="mt-2 text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Inventory History</h1>
        <Link
          href="/inventory/warehouse"
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 transition-colors"
        >
          Back to Inventory
        </Link>
      </div>

      {inventoryItem && (
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Item Details</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-gray-600">Product</p>
              <p className="font-medium text-gray-800">{inventoryItem.product.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">SKU</p>
              <p className="font-medium text-gray-800">{inventoryItem.product.sku}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Warehouse</p>
              <p className="font-medium text-gray-800">{inventoryItem.warehouse.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Current Quantity</p>
              <p className="font-medium text-gray-800">{inventoryItem.quantity}</p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg bg-white shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Transaction History</h2>
        </div>
        
        {transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Quantity</th>
                  <th className="px-6 py-3">Reason</th>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                      {formatDate(transaction.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${getTransactionTypeColor(transaction.type)}`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-800">
                      {transaction.quantity > 0 ? '+' : ''}{transaction.quantity}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                      {transaction.reason}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                      {transaction.user?.name || 'System'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {transaction.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <p className="text-gray-500">No transaction history found for this item.</p>
          </div>
        )}
      </div>
    </div>
  );
}
