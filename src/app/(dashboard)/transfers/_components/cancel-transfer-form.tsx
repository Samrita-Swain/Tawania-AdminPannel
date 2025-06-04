"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Ban } from "lucide-react";
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
}

interface Transfer {
  id: string;
  transferNumber: string;
  status: string;
  transferType: string;
  priority: string;
  fromWarehouseId: string | null;  // Make nullable to match Prisma model
  fromWarehouse: {
    id: string;
    name: string;
  } | null;
  toStoreId: string | null;
  toStore: {
    id: string;
    name: string;
  } | null;
  toWarehouseId: string | null;
  toWarehouse: {
    id: string;
    name: string;
  } | null;
  items: TransferItem[];
}

interface CancelTransferFormProps {
  transfer: Transfer;
}

export function CancelTransferForm({ transfer }: CancelTransferFormProps) {
  const router = useRouter();

  // Form state
  const [cancellationReason, setCancellationReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get destination name
  const getDestinationName = () => {
    if (transfer.toStore && transfer.toStore.name) {
      return transfer.toStore.name;
    } else if (transfer.toWarehouse && transfer.toWarehouse.name) {
      return transfer.toWarehouse.name;
    }
    return "Unknown";
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cancellationReason.trim()) {
      setError("Please provide a reason for cancellation");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/transfers/${transfer.id}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cancellationReason,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel transfer");
      }

      // Redirect to the transfer details page
      router.push(`/transfers/${transfer.id}`);
      router.refresh();
    } catch (error: any) {
      setError(error.message || "An error occurred while cancelling the transfer");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Transfer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-800">Transfer Number</Label>
                <p className="font-medium">{transfer.transferNumber}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-800">Status</Label>
                <div className="mt-1">
                  <TransferStatusBadge status={transfer.status} />
                </div>
              </div>
              <div>
                <Label className="text-sm text-gray-800">From</Label>
                <p className="font-medium">{transfer.fromWarehouse?.name || "Unknown"}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-800">To</Label>
                <p className="font-medium">{getDestinationName()}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-800">Transfer Type</Label>
                <p className="font-medium">{transfer.transferType}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-800">Priority</Label>
                <p className="font-medium">{transfer.priority}</p>
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="cancellationReason" className="text-red-600">
                Cancellation Reason (Required)
              </Label>
              <Textarea
                id="cancellationReason"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Please provide a reason for cancelling this transfer"
                rows={5}
                required
                className="border-red-200 focus:border-red-500 focus:ring-red-500"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Items in Transfer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transfer.items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <div className="font-medium text-gray-900">
                          {item.product.name}
                        </div>
                        <div className="text-xs text-gray-800">
                          {item.product.sku}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-900">
                        ${(item.sourceCostPrice * item.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-300 font-medium">
                    <td colSpan={2} className="px-4 py-3 text-right">
                      Total:
                    </td>
                    <td className="px-4 py-3 text-right">
                      $
                      {transfer.items
                        .reduce(
                          (sum, item) => sum + item.sourceCostPrice * item.quantity,
                          0
                        )
                        .toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-6 rounded-md bg-red-50 p-4 text-sm text-red-800">
              <p>
                <strong>Warning:</strong> Cancelling this transfer will:
              </p>
              <ul className="mt-2 list-inside list-disc">
                <li>Permanently mark this transfer as CANCELLED</li>
                <li>
                  Prevent any further processing or modifications to this transfer
                </li>
                <li>
                  Record the cancellation reason and user information
                </li>
              </ul>
              <p className="mt-2">This action cannot be undone.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Button
          type="submit"
          variant="danger"
          disabled={isSubmitting || !cancellationReason.trim()}
        >
          {isSubmitting ? (
            <>Processing...</>
          ) : (
            <>
              <Ban className="mr-2 h-4 w-4" />
              Cancel Transfer
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
