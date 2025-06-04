import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { LoyaltyTiersClient } from "./_components/loyalty-tiers-client";

export default async function LoyaltyTiersPage() {
  const session = await getServerSession(authOptions);

  // Check if user is authenticated and is an admin
  if (!session || !session.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  // Get loyalty program data
  const loyaltyProgram = await prisma.loyaltyProgram.findFirst({
    where: {
      isActive: true,
    },
    include: {
      tiers: {
        orderBy: {
          requiredPoints: "asc",
        },
      },
    },
  });

  if (!loyaltyProgram) {
    redirect("/loyalty/setup");
  }

  return (
    <div className="space-y-6">
      <LoyaltyTiersClient initialLoyaltyProgram={loyaltyProgram} />
    </div>
  );
}
