"use client";

interface InventoryStatusBadgeProps {
  status: string;
  small?: boolean;
}

export function InventoryStatusBadge({ status, small = false }: InventoryStatusBadgeProps) {
  const getStatusStyles = () => {
    switch (status) {
      case "AVAILABLE":
        return "bg-green-100 text-green-800";
      case "RESERVED":
        return "bg-amber-100 text-amber-800";
      case "IN_TRANSIT":
        return "bg-blue-100 text-blue-800";
      case "DAMAGED":
        return "bg-red-100 text-red-800";
      case "EXPIRED":
        return "bg-gray-100 text-gray-800";
      case "QUARANTINED":
        return "bg-purple-100 text-purple-800";
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
