"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Customer {
  id: string;
  isActive: boolean;
}

interface CustomerActionsProps {
  customer: Customer;
}

export function CustomerActions({ customer }: CustomerActionsProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleToggleStatus = async () => {
    if (!confirm(`Are you sure you want to ${customer.isActive ? 'deactivate' : 'activate'} this customer?`)) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !customer.isActive,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${customer.isActive ? 'deactivate' : 'activate'} customer`);
      }
      
      // Refresh the page
      router.refresh();
    } catch (error) {
      console.error('Error updating customer status:', error);
      alert('Failed to update customer status. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/customers/${customer.id}/edit`}
        className="rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
      >
        Edit
      </Link>
      <Button
        onClick={handleToggleStatus}
        isLoading={isSubmitting}
        disabled={isSubmitting}
        variant="outline"
        className={customer.isActive ? "text-red-600 border-red-200 hover:bg-red-50" : "text-green-600 border-green-200 hover:bg-green-50"}
      >
        {customer.isActive ? "Deactivate" : "Activate"}
      </Button>
    </div>
  );
}
