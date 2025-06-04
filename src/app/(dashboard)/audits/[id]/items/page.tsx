"use client";

import { useState, useEffect, use, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import { AuditItemsTable } from "../../_components/audit-items-table";

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

function AuditItemsContent({ auditId }: { auditId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [audit, setAudit] = useState<Audit | null>(null);
  const [items, setItems] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get filter parameters
  const statusFilter = searchParams.get("status");
  const zoneFilter = searchParams.get("zone");
  const searchFilter = searchParams.get("search") || "";

  useEffect(() => {
    fetchAuditAndItems();
  }, [auditId, statusFilter, zoneFilter, searchFilter]);

  const fetchAuditAndItems = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch audit details
      const auditResponse = await fetch(`/api/audits/${auditId}`);
      if (!auditResponse.ok) {
        if (auditResponse.status === 404) {
          notFound();
        }
        throw new Error("Failed to fetch audit");
      }
      const auditData = await auditResponse.json();
      setAudit(auditData.audit);

      // Build query parameters for items
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (zoneFilter) params.append("zone", zoneFilter);
      if (searchFilter) params.append("search", searchFilter);

      // Fetch audit items
      const itemsResponse = await fetch(
        `/api/audits/${auditId}/items?${params.toString()}`
      );
      if (!itemsResponse.ok) {
        throw new Error("Failed to fetch audit items");
      }
      const itemsData = await itemsResponse.json();
      setItems(itemsData.items);
    } catch (err) {
      console.error("Error fetching audit items:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Loading audit items...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4">
        <p className="text-red-800">Error: {error}</p>
        <Button
          onClick={fetchAuditAndItems}
          className="mt-2"
          variant="outline"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (!audit) {
    return notFound();
  }

  // Get page title based on filters
  const getPageTitle = () => {
    if (statusFilter === "DISCREPANCY") {
      return "Audit Discrepancies";
    }
    if (zoneFilter) {
      return "Zone Items";
    }
    return "All Audit Items";
  };

  // Get filter description
  const getFilterDescription = () => {
    const filters = [];
    if (statusFilter === "DISCREPANCY") {
      filters.push("showing discrepancies only");
    }
    if (zoneFilter) {
      filters.push(`filtered by zone`);
    }
    if (searchFilter) {
      filters.push(`search: "${searchFilter}"`);
    }
    return filters.length > 0 ? `(${filters.join(", ")})` : "";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Link
              href={`/audits/${audit.id}`}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Audit
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {getPageTitle()}
          </h1>
          <p className="text-gray-600">
            {audit.referenceNumber} - {audit.warehouse.name} {getFilterDescription()}
          </p>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/audits/${audit.id}/items`}
          className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
            !statusFilter && !zoneFilter
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All Items ({items.length})
        </Link>
        <Link
          href={`/audits/${audit.id}/items?status=DISCREPANCY`}
          className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
            statusFilter === "DISCREPANCY"
              ? "bg-red-100 text-red-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Discrepancies
        </Link>
      </div>

      {/* Items Table */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        {items.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-500">
              {statusFilter === "DISCREPANCY"
                ? "No discrepancies found"
                : "No items found"}
            </p>
          </div>
        ) : (
          <AuditItemsTable items={items} auditId={auditId} />
        )}
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <p className="mt-2 text-gray-600">Loading audit items...</p>
      </div>
    </div>
  );
}

export default function AuditItemsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const auditId = resolvedParams.id;

  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuditItemsContent auditId={auditId} />
    </Suspense>
  );
}
