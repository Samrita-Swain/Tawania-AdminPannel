"use client";

import { useState, useRef, useEffect } from "react";

interface StatusDropdownProps {
  orderId: string;
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
}

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft", color: "bg-gray-100 text-gray-800" },
  { value: "SUBMITTED", label: "Submitted", color: "bg-yellow-100 text-yellow-800" },
  { value: "APPROVED", label: "Approved", color: "bg-blue-100 text-blue-800" },
  { value: "ORDERED", label: "Ordered", color: "bg-indigo-100 text-indigo-800" },
  { value: "PARTIALLY_RECEIVED", label: "Partially Received", color: "bg-purple-100 text-purple-800" },
  { value: "RECEIVED", label: "Received", color: "bg-green-100 text-green-800" },
  { value: "CANCELLED", label: "Cancelled", color: "bg-red-100 text-red-800" },
];

export function StatusDropdown({ orderId, currentStatus, onStatusChange }: StatusDropdownProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentStatusOption = STATUS_OPTIONS.find(option => option.value === currentStatus);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX
      });
    }
  }, [isOpen]);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) {
      setIsOpen(false);
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/purchase-orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const data = await response.json();
        onStatusChange?.(newStatus);
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(`Failed to update status: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status. Please try again.");
    } finally {
      setIsUpdating(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className={`inline-flex items-center justify-between gap-2 rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 min-w-[120px] ${
          currentStatusOption?.color || "bg-gray-100 text-gray-800"
        } ${isUpdating ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-105"}`}
      >
        <span className="truncate">
          {isUpdating ? "Updating..." : currentStatusOption?.label || currentStatus}
        </span>
        <svg
          className={`h-3 w-3 flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[99999]"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="fixed z-[100000] w-56 rounded-lg bg-white shadow-xl border border-gray-200"
               style={{
                 top: `${dropdownPosition.top}px`,
                 left: `${dropdownPosition.left}px`,
                 minWidth: '220px'
               }}>
            <div className="py-2 max-h-64 overflow-y-auto">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleStatusChange(option.value)}
                  className={`flex items-center w-full px-4 py-2 text-left text-sm transition-all duration-150 hover:bg-gray-50 hover:pl-6 ${
                    option.value === currentStatus ? "bg-blue-50 border-r-2 border-blue-500 font-medium" : ""
                  }`}
                >
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${option.color} shadow-sm`}>
                    {option.label}
                  </span>
                  {option.value === currentStatus && (
                    <svg className="ml-auto h-4 w-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
