"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, X, Printer } from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface ReturnItem {
  id: string;
  product: Product;
  quantity: number;
  reason: string;
  condition: string;
  unitPrice: number;
  totalPrice: number;
  notes: string | null;
}

interface Return {
  id: string;
  returnNumber: string;
  status: string;
  notes: string | null;
  reason: string | null;
  returnDate: string;
  refundStatus: string;
  refundMethod: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  store: {
    id: string;
    name: string;
  };
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  items: ReturnItem[];
  processedBy?: {
    id: string;
    name: string;
  } | null;
}

interface ReturnDetailsProps {
  returnData: Return;
  currentUserId: string;
}

export function ReturnDetails({ returnData, currentUserId }: ReturnDetailsProps) {
  const router = useRouter();

  // State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>(returnData.notes || "");

  // Calculate total refund amount
  const totalRefundAmount = returnData.items.reduce(
    (total, item) => total + (item.unitPrice || 0) * item.quantity,
    0
  );

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="warning">Pending</Badge>;
      case "APPROVED":
        return <Badge variant="success">Approved</Badge>;
      case "COMPLETED":
        return <Badge variant="success">Completed</Badge>;
      case "REJECTED":
        return <Badge variant="danger">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Update return status
  const updateStatus = async (newStatus: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/returns/${returnData.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          notes,
          userId: currentUserId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${newStatus.toLowerCase()} return`);
      }

      // Refresh the page
      router.refresh();
    } catch (error: any) {
      setError(error.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Print return
  const printReturn = () => {
    window.print();
  };



  return (
    <>
      {/* Print header - only visible when printing */}
      <div className="print-header">
        <h1 style={{ fontSize: '24pt', fontWeight: 'bold', margin: '0 0 10px 0' }}>
          Tawania Smart Bazar
        </h1>
        <p style={{ fontSize: '14pt', margin: '0' }}>
          Return Receipt
        </p>
      </div>

      <div className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 print-hide">
            {error}
          </div>
        )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Return Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-800">Status:</dt>
                <dd>{getStatusBadge(returnData.status)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-800">Return #:</dt>
                <dd className="text-sm">{returnData.returnNumber}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-800">Date:</dt>
                <dd className="text-sm">
                  {format(new Date(returnData.returnDate), "MMM d, yyyy h:mm a")}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-800">Store:</dt>
                <dd className="text-sm">{returnData.store.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-800">Processed By:</dt>
                <dd className="text-sm">{returnData.processedBy?.name || 'Unknown'}</dd>
              </div>
              {returnData.returnDate && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-800">Return Date:</dt>
                  <dd className="text-sm">
                    {format(new Date(returnData.returnDate), "MMM d, yyyy h:mm a")}
                  </dd>
                </div>
              )}
              {returnData.completedAt && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-800">Completed On:</dt>
                  <dd className="text-sm">
                    {format(new Date(returnData.completedAt), "MMM d, yyyy h:mm a")}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent>
            {returnData.customer ? (
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-800">Name:</dt>
                  <dd className="text-sm">{returnData.customer.name}</dd>
                </div>
                {returnData.customer.email && (
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-800">Email:</dt>
                    <dd className="text-sm">{returnData.customer.email}</dd>
                  </div>
                )}
                {returnData.customer.phone && (
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-800">Phone:</dt>
                    <dd className="text-sm">{returnData.customer.phone}</dd>
                  </div>
                )}
                <div className="mt-2">
                  <Link
                    href={`/customers/${returnData.customer.id}`}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    View Customer Profile
                  </Link>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-gray-800">Walk-in Customer</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this return"
              rows={5}
              disabled={returnData.status !== "PENDING"}
              className="print-hide"
            />
            {/* Show notes as text when printing */}
            <div className="hidden print:block">
              <p className="text-sm text-gray-800">
                {notes || "No notes added"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Return Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-800">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Refund Amount</th>
                  <th className="px-4 py-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {returnData.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {item.product ? (
                        <Link
                          href={`/products/${item.product.id}`}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          {item.product.name}
                        </Link>
                      ) : (
                        <span className="text-gray-500">Product not found</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {item.product?.sku || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {item.reason}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      ${item.unitPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium">
                      ${item.totalPrice.toFixed(2)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50">
                  <td colSpan={5} className="px-4 py-3 text-right font-bold">
                    Total Refund:
                  </td>
                  <td className="px-4 py-3 text-right font-bold">
                    ${totalRefundAmount.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between print-hide">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={printReturn}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>

          {returnData.status === "PENDING" && (
            <>
              <Button
                type="button"
                variant="outline"
                className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
                onClick={() => updateStatus("REJECTED")}
                disabled={isSubmitting}
              >
                <X className="mr-2 h-4 w-4" />
                Reject
              </Button>

              <Button
                type="button"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => updateStatus("APPROVED")}
                disabled={isSubmitting}
              >
                <Check className="mr-2 h-4 w-4" />
                Approve
              </Button>
            </>
          )}

          {returnData.status === "APPROVED" && (
            <Button
              type="button"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => updateStatus("COMPLETED")}
              disabled={isSubmitting}
            >
              <Check className="mr-2 h-4 w-4" />
              Mark as Completed
            </Button>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
