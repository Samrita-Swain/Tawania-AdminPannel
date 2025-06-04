import React from "react";
import { AlertCircle, XCircle } from "lucide-react";

interface ErrorMessageProps {
  title?: string;
  message: string;
  onDismiss?: () => void;
  variant?: "error" | "warning" | "info";
}

export function ErrorMessage({
  title,
  message,
  onDismiss,
  variant = "error",
}: ErrorMessageProps) {
  const bgColor = {
    error: "bg-red-50",
    warning: "bg-yellow-50",
    info: "bg-blue-50",
  }[variant];
  
  const textColor = {
    error: "text-red-800",
    warning: "text-yellow-800",
    info: "text-blue-800",
  }[variant];
  
  const borderColor = {
    error: "border-red-200",
    warning: "border-yellow-200",
    info: "border-blue-200",
  }[variant];
  
  const iconColor = {
    error: "text-red-500",
    warning: "text-yellow-500",
    info: "text-blue-500",
  }[variant];
  
  return (
    <div className={`rounded-md ${bgColor} p-4 border ${borderColor} mb-4`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertCircle className={`h-5 w-5 ${iconColor}`} aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-medium ${textColor}`}>{title}</h3>
          )}
          <div className={`text-sm ${textColor} mt-1`}>
            {message}
          </div>
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onDismiss}
                className={`inline-flex rounded-md p-1.5 ${bgColor} ${textColor} hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-${variant}-50 focus:ring-${variant}-600`}
              >
                <span className="sr-only">Dismiss</span>
                <XCircle className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function FormErrorMessage({ message }: { message: string }) {
  return (
    <p className="mt-1 text-sm text-red-600">{message}</p>
  );
}

export function FieldErrorMessage({ message }: { message: string }) {
  return (
    <p className="mt-1 text-xs text-red-600">{message}</p>
  );
}
