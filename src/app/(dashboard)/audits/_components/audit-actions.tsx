"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Audit {
  id: string;
  status: string;
}

interface AuditActionsProps {
  audit: Audit;
}

export function AuditActions({ audit }: AuditActionsProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStartAudit = async () => {
    if (!confirm("Are you sure you want to start this audit? This will generate audit items from current inventory.")) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/audits/${audit.id}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start audit');
      }

      const result = await response.json();
      console.log('Audit started successfully:', result);

      // Redirect to counting page
      router.push(`/audits/${audit.id}/count`);
    } catch (error) {
      console.error('Error starting audit:', error);
      alert('Failed to start audit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteAudit = async () => {
    if (!confirm("Are you sure you want to complete this audit? This will update inventory based on the audit findings.")) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/audits/${audit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: "COMPLETED",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete audit');
      }

      // Refresh the page
      router.refresh();
    } catch (error) {
      console.error('Error completing audit:', error);
      alert('Failed to complete audit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelAudit = async () => {
    if (!confirm("Are you sure you want to cancel this audit? This action cannot be undone.")) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/audits/${audit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: "CANCELLED",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel audit');
      }

      // Refresh the page
      router.refresh();
    } catch (error) {
      console.error('Error cancelling audit:', error);
      alert('Failed to cancel audit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {audit.status === "PLANNED" && (
        <>
          <Link
            href={`/audits/${audit.id}/edit`}
            className="rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
          >
            Edit
          </Link>
          <Button
            onClick={handleStartAudit}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            Start Audit
          </Button>
        </>
      )}

      {audit.status === "IN_PROGRESS" && (
        <>
          <Link
            href={`/audits/${audit.id}/count`}
            className="rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
          >
            Continue Counting
          </Link>
          <Button
            onClick={handleCompleteAudit}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            Complete
          </Button>
        </>
      )}

      {(audit.status === "PLANNED" || audit.status === "IN_PROGRESS") && (
        <Button
          onClick={handleCancelAudit}
          isLoading={isSubmitting}
          disabled={isSubmitting}
          variant="outline"
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          Cancel
        </Button>
      )}
    </div>
  );
}
