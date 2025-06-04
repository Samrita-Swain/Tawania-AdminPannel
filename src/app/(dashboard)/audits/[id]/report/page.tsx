"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { notFound } from "next/navigation";

interface AuditItem {
  id: string;
  productId: string;
  inventoryItemId: string;
  expectedQuantity: number;
  actualQuantity: number | null;
  status: string;
  notes: string | null;
  variance: number | null;
  countedById: string | null;
  countedAt: Date | null;
  product: {
    id: string;
    name: string;
    sku: string;
    costPrice?: number;
    inventoryItems?: Array<{
      costPrice: number;
    }>;
  };
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
          zoneId: string;
          zone?: {
            id: string;
            name: string;
          };
        };
      };
    } | null;
  };
}

interface Audit {
  id: string;
  referenceNumber: string;
  status: string;
  startDate: Date;
  endDate: Date | null;
  notes: string | null;
  createdAt: Date;
  warehouse: {
    id: string;
    name: string;
    address?: string;
  };
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
  items: AuditItem[];
}

export default function AuditReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAuditData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/audits/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            notFound();
          }
          throw new Error('Failed to fetch audit data');
        }

        const data = await response.json();
        setAudit(data.audit); // Extract audit from the response
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAuditData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading audit report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800">Error</h1>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  if (!audit) {
    notFound();
  }

  // Calculate report statistics
  const totalItems = audit.items.length;
  const countedItems = audit.items.filter(item => item.actualQuantity !== null).length;
  const discrepancyItems = audit.items.filter(item => item.status === "DISCREPANCY").length;
  const accuracyRate = countedItems > 0 ? ((countedItems - discrepancyItems) / countedItems) * 100 : 0;

  // Calculate value impact
  const totalVariance = audit.items.reduce((sum, item) => {
    const variance = item.actualQuantity !== null ? item.actualQuantity - item.expectedQuantity : 0;
    const costPrice = item.product.inventoryItems?.[0]?.costPrice || 0;
    if (variance !== 0 && costPrice && !isNaN(costPrice) && !isNaN(variance)) {
      const impact = variance * costPrice;
      return !isNaN(impact) ? sum + impact : sum;
    }
    return sum;
  }, 0);

  const positiveVariance = audit.items.reduce((sum, item) => {
    const variance = item.actualQuantity !== null ? item.actualQuantity - item.expectedQuantity : 0;
    const costPrice = item.product.inventoryItems?.[0]?.costPrice || 0;
    if (variance > 0 && costPrice && !isNaN(costPrice) && !isNaN(variance)) {
      const impact = variance * costPrice;
      return !isNaN(impact) ? sum + impact : sum;
    }
    return sum;
  }, 0);

  const negativeVariance = audit.items.reduce((sum, item) => {
    const variance = item.actualQuantity !== null ? item.actualQuantity - item.expectedQuantity : 0;
    const costPrice = item.product.inventoryItems?.[0]?.costPrice || 0;
    if (variance < 0 && costPrice && !isNaN(costPrice) && !isNaN(variance)) {
      const impact = Math.abs(variance * costPrice);
      return !isNaN(impact) ? sum + impact : sum;
    }
    return sum;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Audit Report: {audit.referenceNumber}
          </h1>
          <p className="text-gray-600">
            Generated on {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
          >
            Print Report
          </button>
          <Link
            href={`/audits/${audit.id}`}
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Back to Audit
          </Link>
        </div>
      </div>

      {/* Audit Information */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Audit Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Reference Number</p>
            <p className="font-medium text-gray-900">{audit.referenceNumber}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Warehouse</p>
            <p className="font-medium text-gray-900">{audit.warehouse.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Start Date</p>
            <p className="font-medium text-gray-900">
              {format(new Date(audit.startDate), "MMMM d, yyyy")}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">End Date</p>
            <p className="font-medium text-gray-900">
              {audit.endDate ? format(new Date(audit.endDate), "MMMM d, yyyy") : "Not specified"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Created By</p>
            <p className="font-medium text-gray-900">
              {audit.createdBy.name || audit.createdBy.email}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
              audit.status === "COMPLETED"
                ? "bg-green-100 text-green-800"
                : audit.status === "IN_PROGRESS"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-gray-100 text-gray-800"
            }`}>
              {audit.status.replace('_', ' ')}
            </span>
          </div>
        </div>
        {audit.notes && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">Notes</p>
            <p className="font-medium text-gray-900">{audit.notes}</p>
          </div>
        )}
      </div>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Items</p>
          <p className="text-2xl font-bold text-gray-800">{totalItems}</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Items Counted</p>
          <p className="text-2xl font-bold text-gray-800">{countedItems}</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Discrepancies</p>
          <p className="text-2xl font-bold text-red-600">{discrepancyItems}</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Accuracy Rate</p>
          <p className="text-2xl font-bold text-green-600">{isNaN(accuracyRate) ? '0.0' : accuracyRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Value Impact */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Financial Impact</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Variance Value</p>
            <p className={`text-2xl font-bold ${totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${isNaN(totalVariance) ? '0.00' : Math.abs(totalVariance).toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Positive Variance</p>
            <p className="text-2xl font-bold text-green-600">+${isNaN(positiveVariance) ? '0.00' : positiveVariance.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Negative Variance</p>
            <p className="text-2xl font-bold text-red-600">-${isNaN(negativeVariance) ? '0.00' : negativeVariance.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Discrepancies Table */}
      {discrepancyItems > 0 && (
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            Discrepancies ({discrepancyItems} items)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2">SKU</th>
                  <th className="px-4 py-2">Location</th>
                  <th className="px-4 py-2">Expected</th>
                  <th className="px-4 py-2">Actual</th>
                  <th className="px-4 py-2">Variance</th>
                  <th className="px-4 py-2">Value Impact</th>
                  <th className="px-4 py-2">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {audit.items
                  .filter(item => item.status === "DISCREPANCY")
                  .map((item) => {
                    const costPrice = item.product.inventoryItems?.[0]?.costPrice || 0;
                    const variance = item.actualQuantity !== null ? item.actualQuantity - item.expectedQuantity : 0;
                    const valueImpact = (!isNaN(variance) && !isNaN(costPrice)) ? variance * costPrice : 0;
                    const location = item.inventoryItem?.bin
                      ? `${item.inventoryItem.bin.shelf?.aisle?.zone?.name || 'Unknown'} - ${item.inventoryItem.bin.shelf?.aisle?.name || 'Unknown'} - ${item.inventoryItem.bin.shelf?.name || 'Unknown'} - ${item.inventoryItem.bin.name}`
                      : 'Unassigned';

                    return (
                      <tr key={item.id}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                          {item.product.name}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {item.product.sku}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {location}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.expectedQuantity}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.actualQuantity ?? 'Not counted'}
                        </td>
                        <td className={`px-4 py-2 text-sm font-medium ${
                          variance > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.actualQuantity !== null ? (variance > 0 ? `+${variance}` : variance) : '-'}
                        </td>
                        <td className={`px-4 py-2 text-sm font-medium ${
                          valueImpact > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {!isNaN(valueImpact) && valueImpact !== 0 ? (valueImpact > 0 ? `+$${valueImpact.toFixed(2)}` : `-$${Math.abs(valueImpact).toFixed(2)}`) : '$0.00'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {item.notes || '-'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All Items Summary */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          All Items Summary ({totalItems} items)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2">Location</th>
                <th className="px-4 py-2">Expected</th>
                <th className="px-4 py-2">Actual</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {audit.items.map((item) => {
                const variance = item.actualQuantity !== null ? item.actualQuantity - item.expectedQuantity : null;
                const location = item.inventoryItem?.bin
                  ? `${item.inventoryItem.bin.shelf?.aisle?.zone?.name || 'Unknown'} - ${item.inventoryItem.bin.shelf?.aisle?.name || 'Unknown'} - ${item.inventoryItem.bin.shelf?.name || 'Unknown'} - ${item.inventoryItem.bin.name}`
                  : 'Unassigned';

                return (
                  <tr key={item.id}>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                      {item.product.name}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {item.product.sku}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {location}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {item.expectedQuantity}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {item.actualQuantity ?? 'Not counted'}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        item.status === "COUNTED"
                          ? "bg-green-100 text-green-800"
                          : item.status === "DISCREPANCY"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                      }`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className={`px-4 py-2 text-sm font-medium ${
                      variance && variance > 0 ? 'text-green-600' : variance && variance < 0 ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {variance !== null && !isNaN(variance) ? (variance > 0 ? `+${variance}` : variance === 0 ? '0' : variance) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-600">
        <p>
          This report was generated on {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}
        </p>
        <p className="mt-1">
          Audit Reference: {audit.referenceNumber} | Warehouse: {audit.warehouse.name}
        </p>
      </div>
    </div>
  );
}
