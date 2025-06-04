"use client";

interface PaymentStatusBadgeProps {
  status: string;
  small?: boolean;
}

export function PaymentStatusBadge({ status, small = false }: PaymentStatusBadgeProps) {
  const getStatusStyles = () => {
    switch (status) {
      case "PAID":
        return "bg-green-100 text-green-800";
      case "PARTIALLY_PAID":
        return "bg-amber-100 text-amber-800";
      case "UNPAID":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = () => {
    return status.replace("_", " ");
  };

  return (
    <span
      className={`inline-block rounded-full ${
        small ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-xs font-medium"
      } ${getStatusStyles()}`}
    >
      {getStatusLabel()}
    </span>
  );
}
