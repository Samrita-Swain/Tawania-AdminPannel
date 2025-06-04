"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface UserDeleteConfirmationProps {
  user: User;
}

export function UserDeleteConfirmation({ user }: UserDeleteConfirmationProps) {
  const router = useRouter();
  
  // State
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Handle user deletion
  const handleDeleteUser = async () => {
    setIsDeleting(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete user");
      }
      
      // Redirect to users list on success
      router.push("/users");
      router.refresh();
    } catch (error) {
      console.error("Error deleting user:", error);
      setError((error as Error).message || "An error occurred while deleting the user");
      setIsDeleting(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <Alert variant="destructive">
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          You are about to delete this user. This action cannot be undone.
        </AlertDescription>
      </Alert>
      
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="rounded-md border border-gray-200 p-4">
        <h2 className="text-lg font-medium text-gray-900">User Information</h2>
        <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Name</dt>
            <dd className="mt-1 text-sm text-gray-900">{user.name || "N/A"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Role</dt>
            <dd className="mt-1 text-sm text-gray-900">{user.role}</dd>
          </div>
        </dl>
      </div>
      
      <div className="flex justify-end gap-4">
        <Link href={`/users/${user.id}`}>
          <Button variant="outline" disabled={isDeleting}>
            Cancel
          </Button>
        </Link>
        <Button 
          variant="destructive" 
          onClick={handleDeleteUser} 
          disabled={isDeleting}
        >
          {isDeleting ? "Deleting..." : "Delete User"}
        </Button>
      </div>
    </div>
  );
}
