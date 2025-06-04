import { format } from "date-fns";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Edit, Trash } from "lucide-react";

export default async function LoyaltyRuleDetailPage({
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">{rule.name}</h1>
        <div className="flex items-center gap-2">
          <Link href="/loyalty/rules">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Rules
            </Button>
          </Link>
          <Link href={`/loyalty/rules/${rule.id}/edit`}>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Edit Rule
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rule Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Rule Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{rule.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Rule Type</dt>
                  <dd className="mt-1 text-sm text-gray-900">{rule.type}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Points Awarded</dt>
                  <dd className="mt-1 text-sm text-gray-900">{rule.pointsAwarded}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1 text-sm">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      rule.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {rule.isActive ? "Active" : "Inactive"}
                    </span>
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Description</dt>
                  <dd className="mt-1 text-sm text-gray-900">{rule.description || "No description provided."}</dd>
                </div>
                {rule.conditions && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Conditions</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <pre className="whitespace-pre-wrap rounded-md bg-gray-50 p-3 text-xs">
                        {JSON.stringify(JSON.parse(rule.conditions), null, 2)}
                      </pre>
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rule Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              {rule.type === "PURCHASE" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700">Purchase Rule Configuration</h3>
                  <p className="text-sm text-gray-600">
                    This rule awards points based on purchase amount.
                  </p>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Minimum Purchase Amount</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        ${rule.minimumAmount ? rule.minimumAmount.toFixed(2) : "0.00"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Points per Currency Unit</dt>
                      <dd className="mt-1 text-sm text-gray-900">{rule.pointsPerCurrency || "1"}</dd>
                    </div>
                  </dl>
                </div>
              )}

              {rule.type === "PRODUCT" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700">Product Rule Configuration</h3>
                  <p className="text-sm text-gray-600">
                    This rule awards points for purchasing specific products.
                  </p>
                  {/* Product-specific configuration would go here */}
                </div>
              )}

              {rule.type === "CATEGORY" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700">Category Rule Configuration</h3>
                  <p className="text-sm text-gray-600">
                    This rule awards points for purchasing products in specific categories.
                  </p>
                  {/* Category-specific configuration would go here */}
                </div>
              )}

              {rule.type === "VISIT" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700">Visit Rule Configuration</h3>
                  <p className="text-sm text-gray-600">
                    This rule awards points for store visits.
                  </p>
                  {/* Visit-specific configuration would go here */}
                </div>
              )}

              {rule.type === "REFERRAL" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700">Referral Rule Configuration</h3>
                  <p className="text-sm text-gray-600">
                    This rule awards points for referring new customers.
                  </p>
                  {/* Referral-specific configuration would go here */}
                </div>
              )}

              {rule.type === "BIRTHDAY" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700">Birthday Rule Configuration</h3>
                  <p className="text-sm text-gray-600">
                    This rule awards points on customer birthdays.
                  </p>
                  {/* Birthday-specific configuration would go here */}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rule Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-gray-500">Created</dt>
                  <dd className="font-medium text-gray-900">
                    {format(new Date(rule.createdAt), "MMM d, yyyy")}
                  </dd>
                </div>
                {rule.updatedAt && (
                  <div>
                    <dt className="text-gray-500">Last Updated</dt>
                    <dd className="font-medium text-gray-900">
                      {format(new Date(rule.updatedAt), "MMM d, yyyy")}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-gray-500">Rule ID</dt>
                  <dd className="font-mono text-xs text-gray-900">{rule.id}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card className="border-red-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Deactivate Rule</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Temporarily disable this rule without deleting it.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-2 w-full"
                    disabled={!rule.isActive}
                  >
                    {rule.isActive ? "Deactivate" : "Already Inactive"}
                  </Button>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-red-600">Delete Rule</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Permanently delete this rule. This action cannot be undone.
                  </p>
                  <Button
                    variant="danger"
                    className="mt-2 w-full"
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Delete Rule
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
