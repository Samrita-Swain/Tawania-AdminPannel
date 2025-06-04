"use client";

interface UserStatusBadgeProps {
  isActive: boolean;
  small?: boolean;
}

export function UserStatusBadge({ isActive, small = false }: UserStatusBadgeProps) {
  const getStatusStyles = () => {
    return isActive
      ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800";
  };

  const getStatusLabel = () => {
    return isActive ? "Active" : "Inactive";
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
