"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export function QualityControlFallback() {
  // Always return null to never show the fallback
  return null;

  // The code below is kept for reference but will never execute
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    // Check if there was an error with quality control
    const hasError = sessionStorage.getItem("quality-control-error");

    if (hasError === "true") {
      setShowFallback(true);
    } else {
      // Don't show the fallback by default
      setShowFallback(false);
    }
  }, []);

  if (!showFallback) {
    return null;
  }

  return (
    <div className="QualityControlFallback p-8 bg-white rounded-lg shadow-md">
      <div className="flex flex-col items-center justify-center text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Quality Control Module Unavailable</h2>
        <p className="text-gray-600 mb-6">
          The quality control module is currently unavailable. This might be because the database schema needs to be updated.
        </p>
        <p className="text-gray-600 mb-6">
          Please contact your system administrator to ensure the database is properly set up for quality control.
        </p>
        <div className="flex gap-4">
          <Link href="/dashboard">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Return to Dashboard
            </Button>
          </Link>
          <Button
            onClick={() => {
              sessionStorage.removeItem("quality-control-error");
              window.location.reload();
            }}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800"
          >
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}
