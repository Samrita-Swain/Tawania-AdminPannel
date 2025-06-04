import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { UserDeleteConfirmation } from "../../_components/user-delete-confirmation";

export default async function UserDeletePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  
  // Check if user has admin role
  if (!session?.user?.role || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }
  
  const userId = params.id;
  
  // Prevent deleting self
  if (userId === session.user.id) {
    redirect(`/users/${userId}`);
  }
  
  // Get user details
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  
  if (!user) {
    notFound();
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Delete User</h1>
      
      <div className="rounded-lg bg-white p-6 shadow-md">
        <UserDeleteConfirmation user={user} />
      </div>
    </div>
  );
}
