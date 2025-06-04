"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface QualityControlDetailProps {
  id: string;
}

export function QualityControlDetail({ id }: QualityControlDetailProps) {
  const router = useRouter();
  const [qualityControl, setQualityControl] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQualityControl = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch from API
        const response = await fetch(`/api/quality-control/${id}`);

        if (!response.ok) {
          throw new Error("Failed to fetch quality control");
        }

        const data = await response.json();
        setQualityControl(data);
      } catch (err) {
        console.error("Error in fetchQualityControl:", err);
        setError("Failed to load quality control details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchQualityControl();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !qualityControl) {
    // Redirect to the quality control list page
    router.push('/quality-control');
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Helper function to safely format dates
  const formatSafeDate = (dateValue: any, formatString: string = "MMMM d, yyyy") => {
    try {
      if (!dateValue) {
        return "Not specified";
      }

      const date = new Date(dateValue);

      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }

      return format(date, formatString);
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Invalid date";
    }
  };

  // Helper function to get status badge
  const getStatusBadge = (status: string) => {
    // Handle undefined or null status
    if (!status) {
      status = "UNKNOWN";
    }

    const statusClasses: any = {
      PENDING: "bg-yellow-100 text-yellow-800",
      COMPLETED: "bg-green-100 text-green-800",
      CANCELLED: "bg-red-100 text-red-800",
      UNKNOWN: "bg-gray-100 text-gray-800",
    };

    return (
      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${statusClasses[status] || "bg-gray-100 text-gray-800"}`}>
        {status.replace(/_/g, " ")}
      </span>
    );
  };

  // Helper function to get item status badge
  const getItemStatusBadge = (status: string) => {
    // Handle undefined or null status
    if (!status) {
      status = "UNKNOWN";
    }

    const statusClasses: any = {
      PENDING: "bg-yellow-100 text-yellow-800",
      PASSED: "bg-green-100 text-green-800",
      FAILED: "bg-red-100 text-red-800",
      PARTIALLY_PASSED: "bg-orange-100 text-orange-800",
      UNKNOWN: "bg-gray-100 text-gray-800",
    };

    return (
      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${statusClasses[status] || "bg-gray-100 text-gray-800"}`}>
        {status.replace(/_/g, " ")}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Quality Control: {qualityControl.referenceNumber}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            {getStatusBadge(qualityControl.status)}
            <span className="text-sm text-gray-500">
              Inspected on {formatSafeDate(qualityControl.inspectionDate)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/quality-control">
            <Button variant="outline">
              Back to Quality Controls
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Quality Control Details</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Reference Number</p>
                <p className="text-gray-800">{qualityControl.referenceNumber}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Type</p>
                <p className="text-gray-800">{qualityControl.type}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Warehouse</p>
                <p className="text-gray-800">{qualityControl.warehouse?.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className="text-gray-800">{getStatusBadge(qualityControl.status)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Inspection Date</p>
                <p className="text-gray-800">{formatSafeDate(qualityControl.inspectionDate)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Inspected By</p>
                <p className="text-gray-800">{qualityControl.inspectedBy?.name}</p>
              </div>
            </div>
            {qualityControl.notes && (
              <div>
                <p className="text-sm font-medium text-gray-500">Notes</p>
                <p className="text-gray-800">{qualityControl.notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Related Information</h2>
          <div className="space-y-3">
            {qualityControl.purchaseOrder && (
              <div>
                <p className="text-sm font-medium text-gray-500">Purchase Order</p>
                <Link href={`/purchase-orders/${qualityControl.purchaseOrder.id}`}>
                  <p className="text-blue-600 hover:underline">
                    {qualityControl.purchaseOrder.orderNumber} - {qualityControl.purchaseOrder.supplier?.name}
                  </p>
                </Link>
              </div>
            )}
            {qualityControl.return && (
              <div>
                <p className="text-sm font-medium text-gray-500">Return</p>
                <Link href={`/returns/${qualityControl.return.id}`}>
                  <p className="text-blue-600 hover:underline">
                    {qualityControl.return.returnNumber} - {qualityControl.return.store?.name}
                  </p>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Items</h2>
        <div className="overflow-x-auto">
          {qualityControl.items && qualityControl.items.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                    Product
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                    Passed
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                    Failed
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                    Pending
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {qualityControl.items.map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.product?.name}
                      <div className="text-xs text-gray-800">{item.product?.sku}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {item.passedQuantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {item.failedQuantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {item.pendingQuantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {getItemStatusBadge(item.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {item.action || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-500">No items found for this quality control.</p>
          )}
        </div>
      </div>
    </div>
  );
}
