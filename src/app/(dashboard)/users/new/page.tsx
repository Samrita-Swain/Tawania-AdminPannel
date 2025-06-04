import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserCreateForm } from "../_components/user-create-form";

export default async function NewUserPage() {
  const session = await getServerSession(authOptions);
  
  // Check if user has admin role
  if (!session?.user?.role || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Create New User</h1>
      
      <div className="rounded-lg bg-white p-6 shadow-md">
        <UserCreateForm />
      </div>
    </div>
  );
}
