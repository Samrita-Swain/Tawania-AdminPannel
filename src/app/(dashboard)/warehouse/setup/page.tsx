import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WarehouseSetupForm } from "./_components/warehouse-setup-form";

export default async function WarehouseSetupPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  // Check if user is admin
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    redirect("/dashboard");
  }

  // Check if a warehouse already exists
  const existingWarehouse = await prisma.warehouse.findFirst({
    where: { isActive: true },
  });

  if (existingWarehouse) {
    redirect("/warehouse");
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Warehouse Setup</h1>
        <p className="mt-2 text-gray-800">
          Set up your main warehouse to start managing your inventory.
        </p>
      </div>

      <div className="mx-auto max-w-2xl">
        <WarehouseSetupForm />
      </div>
    </div>
  );
}
