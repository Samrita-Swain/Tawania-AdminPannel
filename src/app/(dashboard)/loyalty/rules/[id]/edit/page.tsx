import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default async function EditLoyaltyRulePage({
  params,
}: {
  params: { id: string };
}) {
  const ruleId = params.id;

  // Initialize rule as null
  let rule = null;

  // Get loyalty rule if the model exists
  try {
    if ('loyaltyRule' in prisma) {
      // @ts-ignore - Dynamically access the model
      rule = await prisma.loyaltyRule.findUnique({
        where: {
          id: ruleId,
        },
      });
    }
  } catch (error) {
    console.error("Error fetching loyalty rule:", error);
  }

  // If rule not found, return 404
  if (!rule) {
    notFound();
  }

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
        <h1 className="text-2xl font-bold text-gray-800">Edit Loyalty Rule</h1>
        <Link href={`/loyalty/rules/${rule.id}`}>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Rule
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Rule: {rule.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Coming Soon</h2>
            <p className="text-gray-600 mb-6">
              The loyalty rule editing form is under development.
            </p>
            <Link
              href={`/loyalty/rules/${rule.id}`}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Back to Rule Details
            </Link>
          </div>
          {/* <LoyaltyRuleForm
            loyaltyProgram={loyaltyProgram}
            categories={categories}
            products={products}
            rule={rule}
            isEditing={true}
          /> */}
        </CardContent>
      </Card>
    </div>
  );
}
