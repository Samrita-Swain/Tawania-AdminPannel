"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProductStatusDropdownProps {
  productId: string;
  currentIsActive: boolean;
  currentCondition: string;
  productName: string;
}

const STATUS_OPTIONS = [
  { value: "ACTIVE_NEW", label: "Active - New", isActive: true, condition: "NEW", color: "bg-green-100 text-green-800" },
  { value: "ACTIVE_DAMAGED", label: "Active - Damaged", isActive: true, condition: "DAMAGED", color: "bg-yellow-100 text-yellow-800" },
  { value: "INACTIVE_NEW", label: "Inactive - New", isActive: false, condition: "NEW", color: "bg-gray-100 text-gray-800" },
  { value: "INACTIVE_DAMAGED", label: "Inactive - Damaged", isActive: false, condition: "DAMAGED", color: "bg-red-100 text-red-800" },
] as const;

export function ProductStatusDropdown({ 
  productId, 
  currentIsActive, 
  currentCondition, 
  productName 
}: ProductStatusDropdownProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Get current status value
  const getCurrentStatusValue = () => {
    if (currentIsActive && currentCondition === "NEW") return "ACTIVE_NEW";
    if (currentIsActive && currentCondition === "DAMAGED") return "ACTIVE_DAMAGED";
    if (!currentIsActive && currentCondition === "NEW") return "INACTIVE_NEW";
    if (!currentIsActive && currentCondition === "DAMAGED") return "INACTIVE_DAMAGED";
    return "ACTIVE_NEW"; // fallback
  };

  const [status, setStatus] = useState(getCurrentStatusValue());

  const handleStatusChange = async (newStatusValue: string) => {
    if (newStatusValue === status || isUpdating) return;

    const newStatusOption = STATUS_OPTIONS.find(option => option.value === newStatusValue);
    if (!newStatusOption) return;

    // Confirm status change for critical actions
    if (!newStatusOption.isActive) {
      const confirmMessage = `Are you sure you want to mark "${productName}" as inactive? This will affect inventory and sales.`;
      if (!confirm(confirmMessage)) {
        return;
      }
    }

    setIsUpdating(true);

    try {
      console.log("Updating product status:", { 
        productId, 
        newIsActive: newStatusOption.isActive, 
        newCondition: newStatusOption.condition, 
        productName 
      });

      const response = await fetch(`/api/products/${productId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: newStatusOption.isActive,
          condition: newStatusOption.condition,
          notes: `Status changed to ${newStatusOption.label} via dropdown`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }

      const result = await response.json();
      console.log('Product status updated successfully:', result);

      // Update local state
      setStatus(newStatusValue);

      // Refresh the page to show updated data
      router.refresh();
    } catch (error) {
      console.error('Error updating product status:', error);
      alert(`Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const getCurrentStatusOption = () => {
    return STATUS_OPTIONS.find(option => option.value === status) || STATUS_OPTIONS[0];
  };

  const currentStatusOption = getCurrentStatusOption();

  return (
    <div className="relative inline-block">
      <select
        value={status}
        onChange={(e) => handleStatusChange(e.target.value)}
        disabled={isUpdating}
        className={`
          appearance-none cursor-pointer text-xs font-medium px-2 py-1 rounded-full border
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
          ${currentStatusOption.color}
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

// Alternative simpler version that just handles Active/Inactive
export function ProductActiveStatusDropdown({ 
  productId, 
  currentIsActive, 
  productName 
}: Omit<ProductStatusDropdownProps, 'currentCondition'>) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isActive, setIsActive] = useState(currentIsActive);

  const handleStatusChange = async (newIsActive: boolean) => {
    if (newIsActive === isActive || isUpdating) return;

    // Confirm status change for deactivation
    if (!newIsActive) {
      const confirmMessage = `Are you sure you want to mark "${productName}" as inactive? This will affect inventory and sales.`;
      if (!confirm(confirmMessage)) {
        return;
      }
    }

    setIsUpdating(true);

    try {
      console.log("Updating product active status:", { productId, newIsActive, productName });

      const response = await fetch(`/api/products/${productId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: newIsActive,
          notes: `Status changed to ${newIsActive ? 'Active' : 'Inactive'} via dropdown`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }

      const result = await response.json();
      console.log('Product status updated successfully:', result);

      // Update local state
      setIsActive(newIsActive);

      // Refresh the page to show updated data
      router.refresh();
    } catch (error) {
      console.error('Error updating product status:', error);
      alert(`Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const getSelectStyles = (active: boolean) => {
    return active 
      ? "bg-green-100 text-green-800 border-green-300"
      : "bg-red-100 text-red-800 border-red-300";
  };

  return (
    <div className="relative inline-block">
      <select
        value={isActive ? "true" : "false"}
        onChange={(e) => handleStatusChange(e.target.value === "true")}
        disabled={isUpdating}
        className={`
          appearance-none cursor-pointer text-xs font-medium px-2 py-1 rounded-full border
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
          ${getSelectStyles(isActive)}
          ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}
          pr-6
        `}
      >
        <option value="true">Active</option>
        <option value="false">Inactive</option>
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
