import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { LoyaltyRuleForm } from "../_components/loyalty-rule-form";

export default async function NewLoyaltyRulePage() {
  // Get active loyalty program
  const loyaltyProgram = await prisma.loyaltyProgram.findFirst({
    where: {
      isActive: true,
    },
  });

  // Get product categories for product/category rules
  let categories = [];
  try {
    // Use raw query to avoid schema mismatches
    categories = await prisma.$queryRaw`
      SELECT id, name
      FROM "Category"
      WHERE "isActive" = true OR "isActive" IS NULL
      ORDER BY name ASC
    `;
  } catch (error) {
    console.error("Error fetching categories:", error);
  }

  // Get products for product rules
  let products = [];
  try {
    if ('product' in prisma) {
      // @ts-ignore - Dynamically access the model
      products = await prisma.product.findMany({
        where: {
          isActive: true,
        },
        include: {
          category: true,
        },
        orderBy: {
          name: "asc",
        },
        take: 100, // Limit to 100 products for performance
      });
    }
  } catch (error) {
    console.error("Error fetching products:", error);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Create New Loyalty Rule</h1>
        <Link href="/loyalty/rules">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Rules
          </Button>
        </Link>
      </div>

      {!loyaltyProgram ? (
        <Card>
          <CardContent className="pt-6">
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
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Rule Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Coming Soon</h2>
              <p className="text-gray-800 mb-6">
                The loyalty rule creation form is under development.
              </p>
              <Link
                href="/loyalty/rules"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Back to Rules
              </Link>
            </div>
            {/* <LoyaltyRuleForm
              loyaltyProgram={loyaltyProgram}
              categories={categories}
              products={products}
            /> */}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
