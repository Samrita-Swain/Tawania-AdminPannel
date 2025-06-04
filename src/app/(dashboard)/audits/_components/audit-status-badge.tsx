"use client";

interface AuditStatusBadgeProps {
  status: string;
}

export function AuditStatusBadge({ status }: AuditStatusBadgeProps) {
  const getStatusClass = (status: string): string => {
    switch (status) {
      case "PLANNED":
        return "bg-blue-100 text-blue-800";
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  const formatStatus = (status: string): string => {
    switch (status) {
      case "PLANNED":
        return "Planned";
      case "IN_PROGRESS":
        return "In Progress";
      case "COMPLETED":
        return "Completed";
      case "CANCELLED":
        return "Cancelled";
      default:
        return status;
    }
  };
  
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(status)}`}>
      {formatStatus(status)}
    </span>
  );
}
