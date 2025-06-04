import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { LoyaltyTransactionsClient } from "./_components/loyalty-transactions-client";

export default async function LoyaltyTransactionsPage() {
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
  });

  if (!loyaltyProgram) {
    redirect("/loyalty/setup");
  }

  // Get recent transactions
  const transactions = await prisma.loyaltyTransaction.findMany({
    include: {
      customer: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50, // Get the most recent 50 transactions
  });

  // Get all customers for filtering
  const customers = await prisma.customer.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      loyaltyPoints: true,
      loyaltyTier: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="space-y-6">
      <LoyaltyTransactionsClient 
        initialTransactions={transactions} 
        customers={customers}
        programId={loyaltyProgram.id}
      />
    </div>
  );
}
