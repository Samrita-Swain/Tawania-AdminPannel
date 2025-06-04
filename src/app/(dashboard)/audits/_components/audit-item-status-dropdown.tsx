"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AuditItemStatusDropdownProps {
  auditId: string;
  itemId: string;
  currentStatus: string;
  productName: string;
  expectedQuantity: number;
  actualQuantity?: number | null;
  onStatusChange?: (newStatus: string) => void;
}

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending", color: "bg-gray-100 text-gray-800" },
  { value: "COUNTED", label: "Counted", color: "bg-blue-100 text-blue-800" },
  { value: "DISCREPANCY", label: "Discrepancy", color: "bg-red-100 text-red-800" },
  { value: "RECONCILED", label: "Reconciled", color: "bg-green-100 text-green-800" },
] as const;

export function AuditItemStatusDropdown({
  auditId,
  itemId,
  currentStatus,
  productName,
  expectedQuantity,
  actualQuantity,
  onStatusChange
}: AuditItemStatusDropdownProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [showQuantityInput, setShowQuantityInput] = useState(false);
  const [showDiscrepancyInput, setShowDiscrepancyInput] = useState(false);
  const [inputQuantity, setInputQuantity] = useState(actualQuantity?.toString() || "");
  const [missingQuantity, setMissingQuantity] = useState("");

  const handleQuantitySubmit = async () => {
    const quantity = parseInt(inputQuantity);
    if (isNaN(quantity) || quantity < 0) {
      alert("Please enter a valid quantity (0 or greater)");
      return;
    }

    setIsUpdating(true);

    try {
      console.log("Updating audit item with quantity:", {
        auditId,
        itemId,
        expectedQuantity,
        actualQuantity: quantity,
        productName
      });

      const response = await fetch(`/api/audits/${auditId}/items/${itemId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actualQuantity: quantity,
          notes: `Counted quantity: ${quantity} (Expected: ${expectedQuantity})`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update quantity');
      }

      const result = await response.json();
      console.log('Audit item quantity updated successfully:', result);

      // Update local state
      setStatus(result.auditItem.status);
      setShowQuantityInput(false);

      // Call callback if provided (for progress updates)
      if (onStatusChange) {
        onStatusChange(result.auditItem.status);
      }

      // Refresh the page to show updated data and progress
      router.refresh();
    } catch (error) {
      console.error('Error updating audit item quantity:', error);
      alert(`Failed to update quantity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDiscrepancySubmit = async () => {
    const missing = parseInt(missingQuantity);
    if (isNaN(missing) || missing < 0 || missing > expectedQuantity) {
      alert(`Please enter a valid missing quantity (0 to ${expectedQuantity})`);
      return;
    }

    const actualCounted = expectedQuantity - missing;

    setIsUpdating(true);

    try {
      console.log("Updating audit item with discrepancy:", {
        auditId,
        itemId,
        expectedQuantity,
        missing: missing,
        actualCounted: actualCounted,
        productName
      });

      const response = await fetch(`/api/audits/${auditId}/items/${itemId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actualQuantity: actualCounted,
          notes: `Discrepancy found: ${missing} items missing, ${actualCounted} items counted (Expected: ${expectedQuantity})`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update discrepancy');
      }

      const result = await response.json();
      console.log('Audit item discrepancy updated successfully:', result);

      // Update local state
      setStatus(result.auditItem.status);
      setShowDiscrepancyInput(false);
      setMissingQuantity("");

      // Call callback if provided (for progress updates)
      if (onStatusChange) {
        onStatusChange(result.auditItem.status);
      }

      // Refresh the page to show updated data and progress
      router.refresh();
    } catch (error) {
      console.error('Error updating audit item discrepancy:', error);
      alert(`Failed to update discrepancy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === status || isUpdating) return;

    // If changing to COUNTED, show quantity input modal
    if (newStatus === "COUNTED") {
      setShowQuantityInput(true);
      return;
    }

    // If changing to DISCREPANCY, show discrepancy input modal
    if (newStatus === "DISCREPANCY") {
      setShowDiscrepancyInput(true);
      return;
    }

    // Confirm status change for critical actions
    if (newStatus === "RECONCILED" && currentStatus === "DISCREPANCY") {
      const confirmMessage = `Are you sure you want to mark "${productName}" as reconciled? This will resolve the discrepancy.`;
      if (!confirm(confirmMessage)) {
        return;
      }
    }

    setIsUpdating(true);

    try {
      console.log("Updating audit item status:", {
        auditId,
        itemId,
        newStatus,
        productName
      });

      const response = await fetch(`/api/audits/${auditId}/items/${itemId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          notes: `Status changed to ${newStatus} via dropdown`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }

      const result = await response.json();
      console.log('Audit item status updated successfully:', result);

      // Update local state
      setStatus(newStatus);

      // Call callback if provided (for progress updates)
      if (onStatusChange) {
        onStatusChange(newStatus);
      }

      // Refresh the page to show updated data and progress
      router.refresh();
    } catch (error) {
      console.error('Error updating audit item status:', error);
      alert(`Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const getCurrentStatusOption = () => {
    return STATUS_OPTIONS.find(option => option.value === status) || STATUS_OPTIONS[0];
  };

  const currentStatusOption = getCurrentStatusOption();

  // Check if item status is COUNTED (disable dropdown only for COUNTED status)
  const isItemCounted = status === "COUNTED";

  return (
    <>
      <div className="relative inline-block">
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={isUpdating || isItemCounted}
          className={`
            appearance-none cursor-pointer text-xs font-medium px-2 py-1 rounded-full border
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
            ${currentStatusOption.color}
            ${isUpdating || isItemCounted ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}
            pr-6
          `}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-1 pointer-events-none">
          <svg
            className="w-3 h-3 text-current opacity-60"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>

        {/* Loading indicator */}
        {isUpdating && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-full">
            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Quantity Input Modal */}
      {showQuantityInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Count Item: {productName}</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Expected Quantity: <span className="font-medium">{expectedQuantity}</span></p>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Actual Counted Quantity:
              </label>
              <input
                type="number"
                min="0"
                value={inputQuantity}
                onChange={(e) => setInputQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter counted quantity"
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowQuantityInput(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                onClick={handleQuantitySubmit}
                disabled={isUpdating || !inputQuantity}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? 'Updating...' : 'Submit Count'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discrepancy Input Modal */}
      {showDiscrepancyInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-red-600 break-words">Report Discrepancy: {productName}</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Expected Quantity: <span className="font-medium">{expectedQuantity}</span></p>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How many items are missing/not found?
              </label>
              <input
                type="number"
                min="0"
                max={expectedQuantity}
                value={missingQuantity}
                onChange={(e) => setMissingQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Enter missing quantity"
                autoFocus
              />
              {missingQuantity && !isNaN(parseInt(missingQuantity)) && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800 break-words">
                    <strong>Calculation:</strong> {expectedQuantity} expected - {missingQuantity} missing = <span className="font-bold text-green-600">{expectedQuantity - parseInt(missingQuantity)} items actually counted</span>
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDiscrepancyInput(false);
                  setMissingQuantity("");
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                onClick={handleDiscrepancySubmit}
                disabled={isUpdating || !missingQuantity}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? 'Updating...' : 'Report Discrepancy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Helper function to get status color class
export function getStatusColorClass(status: string): string {
  const statusOption = STATUS_OPTIONS.find(option => option.value === status);
  return statusOption ? statusOption.color : "bg-gray-100 text-gray-800";
}

// Helper function to format status text
export function formatStatusText(status: string): string {
  const statusOption = STATUS_OPTIONS.find(option => option.value === status);
  return statusOption ? statusOption.label : status;
}
