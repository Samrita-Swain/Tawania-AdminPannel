"use client";

interface UserRoleBadgeProps {
  role: string;
  small?: boolean;
}

export function UserRoleBadge({ role, small = false }: UserRoleBadgeProps) {
  const getRoleStyles = () => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-100 text-purple-800";
      case "MANAGER":
        return "bg-blue-100 text-blue-800";
      case "STAFF":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <span
      className={`inline-block rounded-full ${
        small ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-xs font-medium"
      } ${getRoleStyles()}`}
    >
      {role}
    </span>
  );
}
