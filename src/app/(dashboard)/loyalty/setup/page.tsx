import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LoyaltySetupForm } from "./_components/loyalty-setup-form";

export default async function LoyaltySetupPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  // Check if a loyalty program already exists
  const existingProgram = await prisma.loyaltyProgram.findFirst({
    where: { isActive: true },
  });

  if (existingProgram) {
    // If a program already exists, redirect to the loyalty page
    redirect("/loyalty");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Set Up Loyalty Program</h1>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <LoyaltySetupForm />
      </div>
    </div>
  );
}
