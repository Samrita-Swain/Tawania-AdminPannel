"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [errorDescription, setErrorDescription] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams?.get("error");

    if (errorParam) {
      setError(errorParam);

      // Set error description based on error type
      switch (errorParam) {
        case "Configuration":
          setErrorDescription("There is a problem with the server configuration. Please contact support.");
          break;
        case "AccessDenied":
          setErrorDescription("You do not have permission to sign in.");
          break;
        case "Verification":
          setErrorDescription("The verification link is invalid or has expired.");
          break;
        case "OAuthSignin":
        case "OAuthCallback":
        case "OAuthCreateAccount":
        case "EmailCreateAccount":
        case "Callback":
        case "OAuthAccountNotLinked":
        case "EmailSignin":
        case "CredentialsSignin":
          setErrorDescription("There was a problem with your authentication. Please try again.");
          break;
        case "SessionRequired":
          setErrorDescription("You must be signed in to access this page.");
          break;
        default:
          setErrorDescription("An unknown error occurred. Please try again.");
      }
    }
  }, [searchParams]);

  return (
    <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-6 shadow-md">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Authentication Error</h1>
        {error && (
          <p className="mt-2 text-sm text-red-600">Error: {error}</p>
        )}
        {errorDescription && (
          <p className="mt-4 text-gray-600">{errorDescription}</p>
        )}
        <div className="mt-8">
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Return to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-6 shadow-md">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Authentication Error</h1>
        <div className="mt-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mt-2"></div>
        </div>
        <div className="mt-8">
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Return to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <Suspense fallback={<LoadingFallback />}>
        <AuthErrorContent />
      </Suspense>
    </div>
  );
}
