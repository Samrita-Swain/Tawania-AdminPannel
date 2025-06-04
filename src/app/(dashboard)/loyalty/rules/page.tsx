import { format } from "date-fns";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";

export default async function LoyaltyRulesPage() {
  // Get active loyalty program
  const loyaltyProgram = await prisma.loyaltyProgram.findFirst({
    where: {
      isActive: true,
    },
  });

  // Initialize empty array for loyalty rules
  let loyaltyRules = [];

  // Get loyalty rules if the model exists and a program is found
  try {
    if (loyaltyProgram && 'loyaltyRule' in prisma) {
      // @ts-ignore - Dynamically access the model
      loyaltyRules = await prisma.loyaltyRule.findMany({
        where: {
          programId: loyaltyProgram.id,
        },
        orderBy: {
          name: "asc",
        },
      });
    }
  } catch (error) {
    console.error("Error fetching loyalty rules:", error);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Loyalty Program Rules</h1>
        <Link href="/loyalty/rules/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add New Rule
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage Rules</CardTitle>
        </CardHeader>
        <CardContent>
          {!loyaltyProgram ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-yellow-100 p-3 text-yellow-600 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">No Loyalty Program Found</h2>
              <p className="text-gray-800 mb-6 text-center max-w-md">
                You need to set up a loyalty program before you can create rules.
              </p>
              <Link
                href="/loyalty/setup"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Set Up Loyalty Program
              </Link>
            </div>
          ) : loyaltyRules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-blue-100 p-3 text-blue-600 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">No Rules Found</h2>
              <p className="text-gray-800 mb-6 text-center max-w-md">
                You haven't created any loyalty rules yet. Rules define how customers earn points.
              </p>
              <Link
                href="/loyalty/rules/new"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Create First Rule
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
                    <th className="px-4 py-3">Rule Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Points</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loyaltyRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-blue-600">
                        <Link href={`/loyalty/rules/${rule.id}`}>
                          {rule.name}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-800">
                        {rule.type}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-800">
                        {rule.pointsAwarded}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          rule.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {rule.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-800">
                        {format(new Date(rule.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-800 max-w-xs truncate">
                        {rule.description}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right text-sm">
                        <Link
                          href={`/loyalty/rules/${rule.id}/edit`}
                          className="text-blue-600 hover:text-blue-800 mr-4"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/loyalty/rules/${rule.id}`}
                          className="text-gray-800 hover:text-gray-800"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg bg-blue-50 p-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">About Loyalty Rules</h2>
        <p className="text-blue-700 mb-4">
          Loyalty rules define how customers earn points in your loyalty program. You can create different types of rules:
        </p>
        <ul className="list-disc list-inside text-blue-700 space-y-2">
          <li><span className="font-medium">Purchase Rules:</span> Award points based on purchase amount</li>
          <li><span className="font-medium">Product Rules:</span> Award points for purchasing specific products</li>
          <li><span className="font-medium">Category Rules:</span> Award points for purchasing products in specific categories</li>
          <li><span className="font-medium">Visit Rules:</span> Award points for store visits</li>
          <li><span className="font-medium">Referral Rules:</span> Award points for referring new customers</li>
          <li><span className="font-medium">Birthday Rules:</span> Award points on customer birthdays</li>
        </ul>
      </div>
    </div>
  );
}

