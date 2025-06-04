"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

// Define a flexible Transfer interface that can handle any structure
interface Transfer {
  id: string;
  transferNumber?: string;
  status?: string;
  type?: string;
  sourceWarehouseId?: string | null;
  destinationStoreId?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;

  // Any other fields that might exist
  [key: string]: any;
}

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch transfers from the database
  useEffect(() => {
    const fetchTransfers = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Fetching transfers from database...');

        // Use the working transfer API
        try {
          console.log('Fetching transfers from API...');
          const response = await fetch('/api/transfers/simple');

          if (response.ok) {
            const data = await response.json();
            console.log('Transfers data received:', data);

            if (data.transfers && Array.isArray(data.transfers)) {
              setTransfers(data.transfers);
              console.log(`Loaded ${data.transfers.length} transfers`);

              // Debug first transfer
              if (data.transfers.length > 0) {
                const firstTransfer = data.transfers[0];
                console.log('First transfer details:', {
                  id: firstTransfer.id,
                  transferNumber: firstTransfer.transferNumber,
                  fromWarehouseId: firstTransfer.fromWarehouseId,
                  toStoreId: firstTransfer.toStoreId,
                  warehouseName: firstTransfer.Warehouse_Transfer_fromWarehouseIdToWarehouse?.name,
                  storeName: firstTransfer.Store_Transfer_toStoreIdToStore?.name,
                  status: firstTransfer.status,
                  transferType: firstTransfer.transferType,
                  itemsCount: firstTransfer._count?.items,
                  itemsArray: firstTransfer.items?.length,
                  totalItems: firstTransfer.totalItems,
                  items: firstTransfer.items
                });
              }
            } else {
              setTransfers([]);
              console.log('No transfers found in response');
            }
          } else {
            const errorText = await response.text();
            console.error('API response error:', errorText);
            setError(`Failed to load transfers: ${response.status} ${response.statusText}`);
            setTransfers([]);
          }
        } catch (fetchError) {
          console.error('Fetch error:', fetchError);
          setError('Unable to load transfers. Please check your connection and try again.');
          setTransfers([]);
        }
      } catch (err) {
        console.error('Error fetching transfers:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setTransfers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTransfers();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transfers</h1>
        <Link
          href="/transfers/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create Transfer
        </Link>
      </div>

      <div className="rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
                <th className="px-6 py-3">Reference</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Source</th>
                <th className="px-6 py-3">Destination</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Items</th>
                <th className="px-6 py-3">Created</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-800">
                    Loading transfers...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center">
                    <div className="mx-auto max-w-lg rounded-md bg-red-50 p-4 text-red-800">
                      <h3 className="text-lg font-medium">Error loading transfers</h3>
                      <p className="mt-2 text-sm">{error}</p>
                      <div className="mt-4 flex justify-center gap-2">
                        <button
                          onClick={() => window.location.reload()}
                          className="rounded-md bg-red-100 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-200"
                        >
                          Try Again
                        </button>
                        <Link
                          href="/transfers/new"
                          className="rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-800 hover:bg-blue-200"
                        >
                          Create New Transfer
                        </Link>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : transfers.length > 0 ? (
                transfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-blue-600">
                      <Link href={`/transfers/${transfer.id}`}>
                        {transfer.transferNumber || transfer.id}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                      {formatTransferType(transfer)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                      {transfer.Warehouse_Transfer_fromWarehouseIdToWarehouse?.name ||
                       transfer.fromWarehouseId || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                      {transfer.Store_Transfer_toStoreIdToStore?.name ||
                       transfer.toStoreId || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <TransferStatusDropdown
                        transferId={transfer.id}
                        currentStatus={transfer.status}
                        onStatusChange={(newStatus) => {
                          setTransfers(prev => prev.map(t =>
                            t.id === transfer.id ? { ...t, status: newStatus } : t
                          ));
                        }}
                      />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                      {transfer._count?.items || transfer.items?.length || transfer.totalItems || 0}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                      {transfer.createdAt && formatDistanceToNow(new Date(transfer.createdAt), { addSuffix: true })}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/transfers/${transfer.id}`}
                          className="rounded bg-blue-50 p-1 text-blue-600 hover:bg-blue-100"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          </svg>
                        </Link>
                        {transfer.status === "DRAFT" && (
                          <Link
                            href={`/transfers/${transfer.id}/edit`}
                            className="rounded bg-green-50 p-1 text-green-600 hover:bg-green-100"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                            </svg>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-800">
                    No transfers found. <Link href="/transfers/new" className="text-blue-600 hover:underline">Create a new transfer</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function formatTransferType(transfer: any) {
  if (!transfer) return "Unknown";

  // Check if we have source and destination based on actual field values
  const hasSourceWarehouse = !!(transfer.fromWarehouseId);
  const hasDestinationWarehouse = !!(transfer.toWarehouseId);
  const hasSourceStore = !!(transfer.fromStoreId);
  const hasDestinationStore = !!(transfer.toStoreId);

  // Determine type based on source and destination
  if (hasSourceWarehouse && hasDestinationWarehouse) {
    return "Warehouse to Warehouse";
  } else if (hasSourceWarehouse && hasDestinationStore) {
    return "Warehouse to Store";
  } else if (hasSourceStore && hasDestinationWarehouse) {
    return "Store to Warehouse";
  } else if (hasSourceStore && hasDestinationStore) {
    return "Store to Store";
  }

  // Fallback to transferType field
  switch (transfer.transferType) {
    case "RESTOCK":
      return "Restock";
    case "RETURN":
      return "Return";
    case "RELOCATION":
      return "Relocation";
    case "ADJUSTMENT":
      return "Adjustment";
    case "INITIAL_STOCK":
      return "Initial Stock";
    default:
      return transfer.transferType || "Unknown";
  }
}

function TransferStatusDropdown({
  transferId,
  currentStatus,
  onStatusChange
}: {
  transferId: string;
  currentStatus: string;
  onStatusChange: (newStatus: string) => void;
}) {
  const [isUpdating, setIsUpdating] = useState(false);

  const statusOptions = [
    { value: "DRAFT", label: "Draft", color: "bg-gray-100 text-gray-800" },
    { value: "PENDING", label: "Pending", color: "bg-yellow-100 text-yellow-800" },
    { value: "APPROVED", label: "Approved", color: "bg-blue-100 text-blue-800" },
    { value: "REJECTED", label: "Rejected", color: "bg-red-100 text-red-800" },
    { value: "IN_TRANSIT", label: "In Transit", color: "bg-purple-100 text-purple-800" },
    { value: "COMPLETED", label: "Completed", color: "bg-green-100 text-green-800" },
    { value: "CANCELLED", label: "Cancelled", color: "bg-red-100 text-red-800" },
  ];

  const currentStatusOption = statusOptions.find(option => option.value === currentStatus) ||
    { value: currentStatus, label: currentStatus, color: "bg-gray-100 text-gray-800" };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus || isUpdating) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/transfers/${transferId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        onStatusChange(newStatus);
      } else {
        console.error('Failed to update status');
        alert('Failed to update status. Please try again.');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative">
      <select
        value={currentStatus}
        onChange={(e) => handleStatusChange(e.target.value)}
        disabled={isUpdating}
        className={`
          rounded-full px-3 py-1 text-xs font-medium border-0 cursor-pointer
          ${currentStatusOption.color}
          ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        `}
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {isUpdating && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
        </div>
      )}
    </div>
  );
}

function TransferStatusBadge({ status }: { status: string }) {
  let color;
  let label;

  if (!status) {
    color = "bg-gray-100 text-gray-800";
    label = "Unknown";
  } else {
    switch (status) {
      case "DRAFT":
        color = "bg-gray-100 text-gray-800";
        label = "Draft";
        break;
      case "PENDING":
        color = "bg-yellow-100 text-yellow-800";
        label = "Pending";
        break;
      case "APPROVED":
        color = "bg-blue-100 text-blue-800";
        label = "Approved";
        break;
      case "REJECTED":
        color = "bg-red-100 text-red-800";
        label = "Rejected";
        break;
      case "IN_TRANSIT":
        color = "bg-purple-100 text-purple-800";
        label = "In Transit";
        break;
      case "COMPLETED":
        color = "bg-green-100 text-green-800";
        label = "Completed";
        break;
      case "CANCELLED":
        color = "bg-red-100 text-red-800";
        label = "Cancelled";
        break;
      default:
        color = "bg-gray-100 text-gray-800";
        label = status;
    }
  }

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

