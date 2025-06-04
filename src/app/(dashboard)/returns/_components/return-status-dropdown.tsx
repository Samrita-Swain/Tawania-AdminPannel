"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

interface ReturnStatusDropdownProps {
  returnId: string;
  currentStatus: string;
  returnNumber: string;
}

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending", color: "warning" },
  { value: "APPROVED", label: "Approved", color: "success" },
  { value: "REJECTED", label: "Rejected", color: "danger" },
  { value: "COMPLETED", label: "Completed", color: "success" },
  { value: "CANCELLED", label: "Cancelled", color: "secondary" },
] as const;

export function ReturnStatusDropdown({
  returnId,
  currentStatus,
  returnNumber
}: ReturnStatusDropdownProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [status, setStatus] = useState(currentStatus);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === status || isUpdating) return;

    // Confirm status change for critical actions
    if (newStatus === "COMPLETED" || newStatus === "REJECTED" || newStatus === "CANCELLED") {
      const confirmMessage = `Are you sure you want to change the status to ${newStatus}? This action may affect inventory and cannot be easily undone.`;
      if (!confirm(confirmMessage)) {
        return;
      }
    }

    setIsUpdating(true);

    try {
      console.log("Updating return status:", { returnId, newStatus, returnNumber });

      const response = await fetch(`/api/returns/${returnId}/status`, {
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
      console.log('Status updated successfully:', result);

      // Update local state
      setStatus(newStatus);

      // Refresh the page to show updated data
      router.refresh();
    } catch (error) {
      console.error('Error updating return status:', error);
      alert(`Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (statusValue: string) => {
    const statusOption = STATUS_OPTIONS.find(option => option.value === statusValue);
    if (!statusOption) {
      return <Badge>{statusValue}</Badge>;
    }

    switch (statusOption.color) {
      case "warning":
        return <Badge variant="warning">{statusOption.label}</Badge>;
      case "success":
        return <Badge variant="success">{statusOption.label}</Badge>;
      case "danger":
        return <Badge variant="danger">{statusOption.label}</Badge>;
      case "secondary":
        return <Badge variant="secondary">{statusOption.label}</Badge>;
      default:
        return <Badge>{statusOption.label}</Badge>;
    }
  };

  return (
    <div className="relative">
      <select
        value={status}
        onChange={(e) => handleStatusChange(e.target.value)}
        disabled={isUpdating}
        className={`
          appearance-none bg-transparent border-0 text-sm font-medium cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
          rounded px-2 py-1 pr-6
          ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}
        `}
        style={{
          background: 'transparent',
          color: 'inherit',
        }}
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Custom dropdown arrow */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-1 pointer-events-none">
        <svg
          className="w-3 h-3 text-gray-400"
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
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
}

// Alternative version that shows the badge with dropdown
export function ReturnStatusBadgeDropdown({
  returnId,
  currentStatus,
  returnNumber
}: ReturnStatusDropdownProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [status, setStatus] = useState(currentStatus);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === status || isUpdating) return;

    // Confirm status change for critical actions
    if (newStatus === "COMPLETED" || newStatus === "REJECTED" || newStatus === "CANCELLED") {
      const confirmMessage = `Are you sure you want to change the status to ${newStatus}? This action may affect inventory and cannot be easily undone.`;
      if (!confirm(confirmMessage)) {
        return;
      }
    }

    setIsUpdating(true);

    try {
      console.log("Updating return status:", { returnId, newStatus, returnNumber });

      const response = await fetch(`/api/returns/${returnId}/status`, {
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
      console.log('Status updated successfully:', result);

      // Update local state
      setStatus(newStatus);

      // Refresh the page to show updated data
      router.refresh();
    } catch (error) {
      console.error('Error updating return status:', error);
      alert(`Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (statusValue: string) => {
    const statusOption = STATUS_OPTIONS.find(option => option.value === statusValue);
    if (!statusOption) {
      return <Badge>{statusValue}</Badge>;
    }

    switch (statusOption.color) {
      case "warning":
        return <Badge variant="warning">{statusOption.label}</Badge>;
      case "success":
        return <Badge variant="success">{statusOption.label}</Badge>;
      case "danger":
        return <Badge variant="danger">{statusOption.label}</Badge>;
      case "secondary":
        return <Badge variant="secondary">{statusOption.label}</Badge>;
      default:
        return <Badge>{statusOption.label}</Badge>;
    }
  };

  const getSelectStyles = (statusValue: string) => {
    const statusOption = STATUS_OPTIONS.find(option => option.value === statusValue);
    if (!statusOption) {
      return "bg-gray-100 text-gray-800 border-gray-300";
    }

    switch (statusOption.color) {
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "success":
        return "bg-green-100 text-green-800 border-green-300";
      case "danger":
        return "bg-red-100 text-red-800 border-red-300";
      case "secondary":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <div className="relative inline-block">
      <select
        value={status}
        onChange={(e) => handleStatusChange(e.target.value)}
        disabled={isUpdating}
        className={`
          appearance-none cursor-pointer text-xs font-medium px-2 py-1 rounded-full border
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
          ${getSelectStyles(status)}
          ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}
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
  );
}
