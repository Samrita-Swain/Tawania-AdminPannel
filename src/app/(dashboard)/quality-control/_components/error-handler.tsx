"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ErrorHandlerProps {
  children: React.ReactNode;
}

export function ErrorHandler({ children }: ErrorHandlerProps) {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Override the fetch function to handle quality control API errors
  useEffect(() => {
    const originalFetch = window.fetch;
    
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      
      // Only intercept quality control API calls
      if (url.includes('/api/quality-control')) {
        try {
          const response = await originalFetch(input, init);
          
          // If the response is not ok, handle the error
          if (!response.ok) {
            const clonedResponse = response.clone();
            const errorData = await clonedResponse.json();
            setHasError(true);
            setErrorMessage(errorData.error || "Failed to fetch quality controls");
            
            // Return a mock successful response to prevent the app from crashing
            return new Response(JSON.stringify({
              qualityControls: [],
              totalItems: 0,
              page: 1,
              limit: 10,
              totalPages: 0
            }), {
              status: 200,
              headers: {
                'Content-Type': 'application/json'
              }
            });
          }
          
          return response;
        } catch (error) {
          console.error("Error in fetch:", error);
          setHasError(true);
          setErrorMessage("Failed to connect to quality control service");
          
          // Return a mock successful response to prevent the app from crashing
          return new Response(JSON.stringify({
            qualityControls: [],
            totalItems: 0,
            page: 1,
            limit: 10,
            totalPages: 0
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            }
          });
        }
      }
      
      // For all other requests, use the original fetch
      return originalFetch(input, init);
    };
    
    // Cleanup function to restore the original fetch
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  if (hasError) {
    return (
      <div className="p-8 bg-white rounded-lg shadow-md">
        <div className="flex flex-col items-center justify-center text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Quality Control Module Unavailable</h2>
          <p className="text-gray-600 mb-6">
            {errorMessage || "The quality control module is currently unavailable. This might be because the database schema needs to be updated."}
          </p>
          <p className="text-gray-600 mb-6">
            Please contact your system administrator to ensure the database is properly set up for quality control.
          </p>
          <Button 
            onClick={() => {
              setHasError(false);
              setErrorMessage(null);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
