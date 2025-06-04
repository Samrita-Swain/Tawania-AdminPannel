import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { LoyaltyProgramClient } from "./_components/loyalty-program-client";

export default async function LoyaltyProgramPage() {
  const session = await getServerSession(authOptions);

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

  // Initialize empty arrays for models that might not exist
  let loyaltyRules = [];
  let promotions = [];
  let customerGroups = [];
  let recentTransactions = [];

  // Check if models exist in Prisma schema before querying
  try {
    // Get loyalty rules if the model exists
    if ('loyaltyProgramRule' in prisma) {
      // @ts-ignore - Dynamically access the model
      loyaltyRules = await prisma.loyaltyProgramRule.findMany({
        where: {
          programId: loyaltyProgram?.id,
          isActive: true,
        },
        orderBy: {
          name: "asc",
        },
      });
    }
  } catch (error) {
    console.error("Error fetching loyalty rules:", error);
  }

  try {
    // Get promotions if the model exists
    if ('customerPromotion' in prisma) {
      // @ts-ignore - Dynamically access the model
      promotions = await prisma.customerPromotion.findMany({
        where: {
          programId: loyaltyProgram?.id,
        },
        orderBy: {
          startDate: "desc",
        },
        take: 5,
      });
    }
  } catch (error) {
    console.error("Error fetching promotions:", error);
  }

  try {
    // Get customer groups if the model exists
    if ('customerGroup' in prisma) {
      // @ts-ignore - Dynamically access the model
      customerGroups = await prisma.customerGroup.findMany({
        orderBy: {
          name: "asc",
        },
        take: 5,
      });
    }
  } catch (error) {
    console.error("Error fetching customer groups:", error);
  }

  try {
    // Get recent loyalty transactions if the model exists
    if ('loyaltyTransaction' in prisma) {
      // @ts-ignore - Dynamically access the model
      recentTransactions = await prisma.loyaltyTransaction.findMany({
        include: {
          customer: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      });
    }
  } catch (error) {
    console.error("Error fetching loyalty transactions:", error);
  }

  return (
    <div className="space-y-6">
      {/* Client-side component for auto-saving loyalty program data */}
      <LoyaltyProgramClient
        initialLoyaltyProgram={loyaltyProgram}
        initialLoyaltyRules={loyaltyRules}
        initialRecentTransactions={recentTransactions}
      />

      {loyaltyProgram ? (
        <>

          {/* Loyalty Tiers */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Loyalty Tiers</h2>
              <Link
                href="/loyalty/tiers"
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Manage Tiers
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              {loyaltyProgram.tiers.map((tier) => (
                <div
                  key={tier.id}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <h3 className="font-medium text-gray-800">{tier.name}</h3>
                  <p className="mt-1 text-sm text-gray-800">{tier.description}</p>
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Required Points:</span> {tier.requiredPoints}
                  </div>
                  <div className="mt-1 text-sm">
                    <span className="font-medium">Points Multiplier:</span> {tier.pointsMultiplier}x
                  </div>
                  {tier.benefits && tier.benefits !== "null" && (
                    <div className="mt-2">
                      <span className="text-sm font-medium">Benefits:</span>
                      <ul className="mt-1 list-inside list-disc text-sm text-gray-800">
                        {(() => {
                          try {
                            const benefits = JSON.parse(tier.benefits);
                            return Array.isArray(benefits) ? benefits.map((benefit: string, index: number) => (
                              <li key={index}>{benefit}</li>
                            )) : null;
                          } catch (error) {
                            console.error("Error parsing benefits:", error);
                            return null;
                          }
                        })()}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Program Rules */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Program Rules</h2>
              <Link
                href="/loyalty/rules"
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Manage Rules
              </Link>
            </div>
            {loyaltyRules.length === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-800">No rules found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
                      <th className="px-4 py-2">Rule Name</th>
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2">Points</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loyaltyRules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-blue-600">
                          <Link href={`/loyalty/rules/${rule.id}`}>
                            {rule.name}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-800">
                          {rule.type}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-800">
                          {rule.pointsAwarded}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            rule.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}>
                            {rule.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-800">
                          {rule.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Recent Loyalty Transactions</h2>
              <Link
                href="/loyalty/transactions"
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                View All Transactions
              </Link>
            </div>
            {recentTransactions.length === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-800">No transactions found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Customer</th>
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2">Points</th>
                      <th className="px-4 py-2">Description</th>
                      <th className="px-4 py-2">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recentTransactions.map((transaction) => {
                      // Determine points class
                      const pointsClass = transaction.type === "EARN" || transaction.type === "BONUS"
                        ? "text-green-600"
                        : transaction.type === "REDEEM" || transaction.type === "EXPIRE"
                          ? "text-red-600"
                          : "text-gray-800";

                      // Format points
                      const formattedPoints = transaction.type === "EARN" || transaction.type === "BONUS"
                        ? `+${transaction.points}`
                        : transaction.type === "REDEEM" || transaction.type === "EXPIRE"
                          ? `-${transaction.points}`
                          : transaction.points;

                      return (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-800">
                            {format(new Date(transaction.createdAt), "MMM d, yyyy")}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-blue-600">
                            <Link href={`/customers/${transaction.customerId}`}>
                              {transaction.customer.name}
                            </Link>
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-sm">
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                              transaction.type === "EARN" || transaction.type === "BONUS"
                                ? "bg-green-100 text-green-800"
                                : transaction.type === "REDEEM"
                                  ? "bg-blue-100 text-blue-800"
                                  : transaction.type === "EXPIRE"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                            }`}>
                              {transaction.type}
                            </span>
                          </td>
                          <td className={`whitespace-nowrap px-4 py-2 text-sm font-medium ${pointsClass}`}>
                            {formattedPoints}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-800">
                            {transaction.description || "-"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-sm">
                            {transaction.referenceId ? (
                              <span className="text-gray-800">
                                {transaction.referenceId}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex flex-col items-center justify-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-16 w-16 text-gray-800 mb-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No Loyalty Program Found</h2>
            <p className="text-gray-800 mb-6">You haven't set up a loyalty program yet.</p>
            <Link
              href="/loyalty/setup"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Set Up Loyalty Program
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

