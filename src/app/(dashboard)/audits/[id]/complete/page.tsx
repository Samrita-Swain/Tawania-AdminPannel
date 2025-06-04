"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";

interface Audit {
  id: string;
  referenceNumber: string;
  status: string;
  warehouse: {
    id: string;
    name: string;
  };
}

interface AuditItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    sku: string;
    costPrice?: number;
    inventoryItems?: Array<{
      costPrice: number;
    }>;
  };
  inventoryItemId: string;
  inventoryItem: {
    id: string;
    quantity: number;
  };
  expectedQuantity: number;
  actualQuantity: number | null;
  variance: number | null;
  status: string;
}

export default function AuditCompletePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id: auditId } = use(params);

  const [audit, setAudit] = useState<Audit | null>(null);
  const [items, setItems] = useState<AuditItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch audit data
  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const response = await fetch(`/api/audits/${auditId}`);
        if (!response.ok) {
          if (response.status === 404) {
            notFound();
          }
          throw new Error('Failed to fetch audit');
        }

        const data = await response.json();
        setAudit(data.audit);

        // Check if audit can be completed
        if (data.audit.status !== "IN_PROGRESS") {
          alert('This audit is not in progress and cannot be completed.');
          router.push(`/audits/${auditId}`);
          return;
        }

        // Get items with discrepancies
        const discrepancyItems = data.audit.items.filter((item: AuditItem) =>
          item.status === "DISCREPANCY"
        );

        setItems(discrepancyItems);
      } catch (error) {
        console.error('Error fetching audit:', error);
        alert('Failed to load audit data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAudit();
  }, [auditId, router]);

  // Handle audit completion
  const handleCompleteAudit = async () => {
    if (!confirm("Are you sure you want to complete this audit? This will update inventory based on the audit findings.")) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/audits/${auditId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: "COMPLETED",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete audit');
      }

      alert('Audit completed successfully!');

      // Redirect to audit details page
      router.push(`/audits/${auditId}`);
      router.refresh();
    } catch (error) {
      console.error('Error completing audit:', error);
      alert('Failed to complete audit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !audit) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-white p-6 shadow-md">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 mx-auto"></div>
          <p className="text-gray-500">Loading audit data...</p>
        </div>
      </div>
    );
  }

  if (!audit) {
    return notFound();
  }

  // Calculate statistics
  const totalItems = items.length;
  const totalVariance = items.reduce((sum, item) => sum + (item.variance || 0), 0);
  const positiveVariance = items.filter(item => (item.variance || 0) > 0).length;
  const negativeVariance = items.filter(item => (item.variance || 0) < 0).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Complete Audit</h1>
          <p className="text-gray-500">
            Audit: {audit.referenceNumber} - {audit.warehouse.name}
          </p>
        </div>
        <Link
          href={`/audits/${auditId}`}
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Back to Audit
        </Link>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Audit Summary</h2>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Discrepancies</p>
            <p className="text-2xl font-bold text-gray-800">{totalItems}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Variance</p>
            <p className={`text-2xl font-bold ${totalVariance > 0 ? 'text-green-600' : totalVariance < 0 ? 'text-red-600' : 'text-gray-800'}`}>
              {totalVariance > 0 ? `+${totalVariance}` : totalVariance}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Positive Variances</p>
            <p className="text-2xl font-bold text-green-600">{positiveVariance}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Negative Variances</p>
            <p className="text-2xl font-bold text-red-600">{negativeVariance}</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="mb-2 text-md font-medium text-gray-700">Discrepancy Details</h3>

          {items.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-500">No discrepancies found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-2">Product</th>
                    <th className="px-4 py-2">Expected</th>
                    <th className="px-4 py-2">Actual</th>
                    <th className="px-4 py-2">Variance</th>
                    <th className="px-4 py-2">Value Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item) => {
                    // Determine variance class
                    const varianceClass = (item.variance || 0) > 0
                      ? "text-green-600"
                      : (item.variance || 0) < 0
                        ? "text-red-600"
                        : "text-gray-500";

                    // Calculate value impact using cost price if available
                    const costPrice = item.product.costPrice ||
                      (item.product.inventoryItems && item.product.inventoryItems.length > 0 ?
                        item.product.inventoryItems[0].costPrice : 0);
                    const valueImpact = (item.variance || 0) * costPrice;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-2 text-sm font-medium">
                          <div>{item.product.name}</div>
                          <div className="text-xs text-gray-500">{item.product.sku}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                          {item.expectedQuantity}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                          {item.actualQuantity !== null ? item.actualQuantity : "-"}
                        </td>
                        <td className={`whitespace-nowrap px-4 py-2 text-sm font-medium ${varianceClass}`}>
                          {item.variance !== null ? (item.variance > 0 ? `+${item.variance}` : item.variance) : "-"}
                        </td>
                        <td className={`whitespace-nowrap px-4 py-2 text-sm font-medium ${
                          valueImpact > 0 ? "text-green-600" : valueImpact < 0 ? "text-red-600" : "text-gray-500"
                        }`}>
                          {valueImpact !== 0 ? (valueImpact > 0 ? `+$${valueImpact.toFixed(2)}` : `-$${Math.abs(valueImpact).toFixed(2)}`) : "$0.00"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-lg bg-yellow-50 p-4 text-yellow-800">
          <h3 className="mb-2 font-medium">Important Note</h3>
          <p>
            Completing this audit will update your inventory quantities to match the counted values.
            This action cannot be undone. Make sure all counts are accurate before proceeding.
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/audits/${auditId}`)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCompleteAudit}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            Complete Audit
          </Button>
        </div>
      </div>
    </div>
  );
}
