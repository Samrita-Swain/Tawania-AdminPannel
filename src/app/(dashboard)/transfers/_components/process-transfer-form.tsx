"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Check, Truck } from "lucide-react";
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

interface InventoryItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  warehouseId: string;
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
  fromWarehouseId: string;
  fromWarehouse: {
    id: string;
    name: string;
  };
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

interface ProcessTransferFormProps {
  transfer: Transfer;
  inventoryItems: InventoryItem[];
}

export function ProcessTransferForm({
  transfer,
  inventoryItems,
}: ProcessTransferFormProps) {
  const router = useRouter();

  // Form state
  const [processingNotes, setProcessingNotes] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shippingMethod, setShippingMethod] = useState("STANDARD");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create a map of product IDs to inventory quantities
  const inventoryMap = new Map();
  inventoryItems.forEach((item) => {
    inventoryMap.set(item.productId, item.quantity);
  });

  // Get destination name
  const getDestinationName = () => {
    if (transfer.toStore) {
      return transfer.toStore.name;
    } else if (transfer.toWarehouse) {
      return transfer.toWarehouse.name;
    }
    return "Unknown";
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/transfers/${transfer.id}/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          processingNotes,
          trackingNumber,
          shippingMethod,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process transfer");
      }

      // Redirect to the transfer details page
      router.push(`/transfers/${transfer.id}`);
      router.refresh();
    } catch (error: any) {
      setError(error.message || "An error occurred while processing the transfer");
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
                <p className="font-medium">{transfer.fromWarehouse.name}</p>
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
              <Label htmlFor="processingNotes">Processing Notes</Label>
              <Textarea
                id="processingNotes"
                value={processingNotes}
                onChange={(e) => setProcessingNotes(e.target.value)}
                placeholder="Add any notes about processing this transfer"
                rows={3}
              />
            </div>

            <div className="mt-4">
              <Label htmlFor="trackingNumber">Tracking Number</Label>
              <Input
                id="trackingNumber"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number if applicable"
              />
            </div>

            <div className="mt-4">
              <Label htmlFor="shippingMethod">Shipping Method</Label>
              <select
                id="shippingMethod"
                value={shippingMethod}
                onChange={(e) => setShippingMethod(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="STANDARD">Standard</option>
                <option value="EXPRESS">Express</option>
                <option value="OVERNIGHT">Overnight</option>
                <option value="INTERNAL">Internal Transfer</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Items to Process</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Available</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transfer.items.map((item) => {
                    const availableQuantity = inventoryMap.get(item.productId) || 0;
                    const isAvailable = availableQuantity >= item.quantity;

                    return (
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
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                          {availableQuantity}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          {isAvailable ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                              <Check className="mr-1 h-3 w-3" />
                              Available
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                              Insufficient
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 rounded-md bg-yellow-50 p-4 text-sm text-yellow-800">
              <p>
                <strong>Important:</strong> Processing this transfer will:
              </p>
              <ul className="mt-2 list-inside list-disc">
                <li>
                  Deduct the items from {transfer.fromWarehouse.name} inventory
                </li>
                <li>Change the transfer status to IN_TRANSIT</li>
                <li>
                  Record the processing date and user information
                </li>
              </ul>
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
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>Processing...</>
          ) : (
            <>
              <Truck className="mr-2 h-4 w-4" />
              Process Transfer
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
