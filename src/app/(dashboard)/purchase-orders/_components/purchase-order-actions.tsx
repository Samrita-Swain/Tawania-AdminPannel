"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PurchaseOrder {
  id: string;
  status: string;
}

interface PurchaseOrderActionsProps {
  purchaseOrder: PurchaseOrder;
}

export function PurchaseOrderActions({ purchaseOrder }: PurchaseOrderActionsProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitOrder = async () => {
    if (!confirm("Are you sure you want to submit this order? This will change the status to ORDERED.")) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/purchase-orders/${purchaseOrder.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit order');
      }

      // Refresh the page
      router.refresh();
    } catch (error) {
      console.error('Error submitting order:', error);
      alert('Failed to submit order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!confirm("Are you sure you want to cancel this order? This action cannot be undone.")) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/purchase-orders/${purchaseOrder.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel order');
      }

      // Refresh the page
      router.refresh();
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert('Failed to cancel order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {purchaseOrder.status === "DRAFT" && (
        <>
          <Link
            href={`/purchase-orders/${purchaseOrder.id}/edit`}
            className="rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
          >
            Edit
          </Link>
          <Button
            onClick={handleSubmitOrder}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            Submit Order
          </Button>
        </>
      )}

      {(purchaseOrder.status === "ORDERED" || purchaseOrder.status === "PARTIAL") && (
        <Link
          href={`/purchase-orders/${purchaseOrder.id}/receive`}
          className="rounded-md bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-200 transition-colors"
        >
          Receive Items
        </Link>
      )}

      {purchaseOrder.status !== "CANCELLED" && purchaseOrder.status !== "RECEIVED" && (
        <Button
          onClick={handleCancelOrder}
          isLoading={isSubmitting}
          disabled={isSubmitting}
          variant="outline"
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          Cancel
        </Button>
      )}
    </div>
  );
}
