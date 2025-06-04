import React from "react";

interface LoadingProps {
  size?: "small" | "medium" | "large";
  color?: "primary" | "secondary" | "white";
  text?: string;
  fullPage?: boolean;
}

export function Loading({
  size = "medium",
  color = "primary",
  text,
  fullPage = false,
}: LoadingProps) {
  const sizeClasses = {
    small: "h-4 w-4 border-2",
    medium: "h-8 w-8 border-2",
    large: "h-12 w-12 border-3",
  }[size];
  
  const colorClasses = {
    primary: "border-blue-600",
    secondary: "border-gray-600",
    white: "border-white",
  }[color];
  
  const spinner = (
    <div
      className={`animate-spin rounded-full border-solid border-t-transparent ${sizeClasses} ${colorClasses}`}
      role="status"
      aria-label="Loading"
    />
  );
  
  if (fullPage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
        <div className="text-center">
          {spinner}
          {text && <p className="mt-2 text-gray-800">{text}</p>}
        </div>
      </div>
    );
  }
  
  if (text) {
    return (
      <div className="flex items-center justify-center space-x-2">
        {spinner}
        <span className="text-gray-800">{text}</span>
      </div>
    );
  }
  
  return spinner;
}

export function LoadingOverlay({ text }: { text?: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10 rounded-md">
      <div className="text-center">
        <Loading size="large" color="primary" />
        {text && <p className="mt-2 text-gray-800">{text}</p>}
      </div>
    </div>
  );
}

export function LoadingPage({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
      <div className="text-center">
        <Loading size="large" color="primary" />
        <p className="mt-4 text-lg text-gray-800">{text}</p>
      </div>
    </div>
  );
}

export function LoadingSection({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-md border border-gray-200 bg-gray-50">
      <div className="text-center">
        <Loading size="medium" color="primary" />
        <p className="mt-2 text-sm text-gray-800">{text}</p>
      </div>
    </div>
  );
}

export function LoadingButton({
  loading,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading: boolean }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`relative inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        props.className || "bg-blue-600 text-white hover:bg-blue-700"
      } ${loading ? "cursor-not-allowed opacity-70" : ""}`}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loading size="small" color="white" />
        </span>
      )}
      <span className={loading ? "invisible" : ""}>{children}</span>
    </button>
  );
}
