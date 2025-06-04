"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface InventoryItem {
  id: string;
  quantity: number;
  costPrice: number;
  retailPrice: number;
  status: string;
  product: {
    id: string;
    name: string;
    sku: string;
    reorderPoint: number | null;
    minStockLevel: number | null;
    category: {
      id: string;
      name: string;
    } | null;
  } | null;
  store: {
    id: string;
    name: string;
  } | null;
}

interface InventoryAdjustmentFormProps {
  inventoryItem: InventoryItem;
}

export default function InventoryAdjustmentForm({ inventoryItem }: InventoryAdjustmentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    adjustmentType: "",
    quantity: "",
    reason: "",
    notes: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate form data
      if (!formData.adjustmentType || !formData.quantity || !formData.reason) {
        setError("Please fill in all required fields");
        setIsSubmitting(false);
        return;
      }

      const quantity = parseInt(formData.quantity);
      if (isNaN(quantity) || quantity < 0) {
        setError("Please enter a valid quantity");
        setIsSubmitting(false);
        return;
      }

      // Map form values to API expected values
      let adjustmentType: string;
      switch (formData.adjustmentType) {
        case "increase":
          adjustmentType = "add";
          break;
        case "decrease":
          adjustmentType = "subtract";
          break;
        case "set":
          adjustmentType = "set";
          break;
        default:
          setError("Invalid adjustment type");
          setIsSubmitting(false);
          return;
      }

      // Submit to API
      const response = await fetch(`/api/inventory/${inventoryItem.id}/adjust`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adjustmentType,
          quantity,
          reasonId: formData.reason.toUpperCase(),
          notes: formData.notes || "No notes provided"
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("API Error Response:", data);
        throw new Error(data.message || data.error || "Failed to adjust inventory");
      }

      // Success
      setSuccess("Inventory adjusted successfully!");

      // Reset form
      setFormData({
        adjustmentType: "",
        quantity: "",
        reason: "",
        notes: ""
      });

      // Redirect back to inventory list after a short delay
      setTimeout(() => {
        router.push("/inventory/store");
        router.refresh(); // Refresh the page to show updated data
      }, 2000);

    } catch (error) {
      console.error("Error adjusting inventory:", error);
      setError(error instanceof Error ? error.message : "Failed to adjust inventory");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Adjust Quantity</h2>

      {/* Success Message */}
      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-4 border border-green-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{success}</p>
              <p className="text-sm text-green-700 mt-1">Redirecting to inventory list...</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="adjustmentType" className="block text-sm font-medium text-gray-700 mb-1">
              Adjustment Type <span className="text-red-500">*</span>
            </label>
            <select
              id="adjustmentType"
              name="adjustmentType"
              value={formData.adjustmentType}
              onChange={handleInputChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
              disabled={isSubmitting}
            >
              <option value="">Select adjustment type</option>
              <option value="increase">Increase Stock</option>
              <option value="decrease">Decrease Stock</option>
              <option value="set">Set Exact Quantity</option>
            </select>
          </div>

          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              value={formData.quantity}
              onChange={handleInputChange}
              min="0"
              step="1"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter quantity"
              required
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
            Reason for Adjustment <span className="text-red-500">*</span>
          </label>
          <select
            id="reason"
            name="reason"
            value={formData.reason}
            onChange={handleInputChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
            disabled={isSubmitting}
          >
            <option value="">Select reason</option>
            <option value="damage">Damaged Items</option>
            <option value="expiry">Expired Items</option>
            <option value="theft">Theft/Loss</option>
            <option value="recount">Physical Recount</option>
            <option value="return">Customer Return</option>
            <option value="supplier_return">Return to Supplier</option>
            <option value="transfer">Store Transfer</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Additional Notes (Optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Enter any additional notes..."
            disabled={isSubmitting}
          />
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4">
          <Link
            href="/inventory/store"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white transition-colors ${
              isSubmitting
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isSubmitting ? "Applying..." : "Apply Adjustment"}
          </button>
        </div>
      </form>
    </div>
  );
}
