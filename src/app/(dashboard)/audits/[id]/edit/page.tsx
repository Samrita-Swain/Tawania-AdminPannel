"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";

interface Audit {
  id: string;
  referenceNumber: string;
  warehouseId: string;
  status: string;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  warehouse: {
    id: string;
    name: string;
  };
}

export default function EditAuditPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: auditId } = use(params);
  const [audit, setAudit] = useState<Audit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch audit details
  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const response = await fetch(`/api/audits/${auditId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch audit details");
        }

        const data = await response.json();
        setAudit(data.audit);

        // Initialize form values
        setStartDate(data.audit.startDate ? format(new Date(data.audit.startDate), "yyyy-MM-dd") : "");
        setEndDate(data.audit.endDate ? format(new Date(data.audit.endDate), "yyyy-MM-dd") : "");
        setNotes(data.audit.notes || "");
      } catch (error) {
        console.error("Error fetching audit:", error);
        setError("Failed to load audit details. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAudit();
  }, [auditId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!audit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/audits/${audit.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate,
          endDate: endDate || null,
          notes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update audit");
      }

      // Redirect to audit details page
      router.push(`/audits/${audit.id}`);
      router.refresh();
    } catch (error: any) {
      console.error("Error updating audit:", error);
      setError(error.message || "Failed to update audit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading audit details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-red-800">Error</h2>
        <p className="mt-2 text-red-600">{error}</p>
        <Link
          href={`/audits/${auditId}`}
          className="mt-4 inline-block rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
        >
          Back to Audit Details
        </Link>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="rounded-lg bg-yellow-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-yellow-800">Audit Not Found</h2>
        <p className="mt-2 text-yellow-600">The requested audit could not be found.</p>
        <Link
          href="/audits"
          className="mt-4 inline-block rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
        >
          Back to Audits
        </Link>
      </div>
    );
  }

  // Only allow editing of PLANNED audits
  if (audit.status !== "PLANNED") {
    return (
      <div className="rounded-lg bg-yellow-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-yellow-800">Cannot Edit Audit</h2>
        <p className="mt-2 text-yellow-600">
          Only planned audits can be edited. This audit is currently in {audit.status.toLowerCase()} status.
        </p>
        <Link
          href={`/audits/${audit.id}`}
          className="mt-4 inline-block rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
        >
          Back to Audit Details
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Edit Audit: {audit.referenceNumber}</h1>
        <Link
          href={`/audits/${audit.id}`}
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Cancel
        </Link>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="referenceNumber" className="block text-sm font-medium text-gray-700">
                Reference Number
              </label>
              <input
                type="text"
                id="referenceNumber"
                value={audit.referenceNumber}
                disabled
                className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="warehouse" className="block text-sm font-medium text-gray-700">
                Warehouse
              </label>
              <input
                type="text"
                id="warehouse"
                value={audit.warehouse.name}
                disabled
                className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            ></textarea>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Link
              href={`/audits/${audit.id}`}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors ${
                isSubmitting ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
