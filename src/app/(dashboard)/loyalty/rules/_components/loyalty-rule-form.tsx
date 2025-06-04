"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LoyaltyProgram {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  category: Category | null;
}

interface LoyaltyRule {
  id: string;
  name: string;
  description: string | null;
  type: string;
  pointsAwarded: number;
  isActive: boolean;
  conditions: string | null;
  minimumAmount: number | null;
  pointsPerCurrency: number | null;
}

interface LoyaltyRuleFormProps {
  loyaltyProgram: LoyaltyProgram;
  categories: Category[];
  products: Product[];
  rule?: LoyaltyRule;
  isEditing?: boolean;
}

export function LoyaltyRuleForm({
  loyaltyProgram,
  categories,
  products,
  rule,
  isEditing = false,
}: LoyaltyRuleFormProps) {
  const router = useRouter();

  // Form state
  const [name, setName] = useState(rule?.name || "");
  const [description, setDescription] = useState(rule?.description || "");
  const [type, setType] = useState(rule?.type || "PURCHASE");
  const [pointsAwarded, setPointsAwarded] = useState(rule?.pointsAwarded || 10);
  const [isActive, setIsActive] = useState(rule?.isActive !== false);
  const [minimumAmount, setMinimumAmount] = useState(rule?.minimumAmount || 0);
  const [pointsPerCurrency, setPointsPerCurrency] = useState(rule?.pointsPerCurrency || 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate form
      if (!name.trim()) {
        throw new Error("Rule name is required");
      }

      if (pointsAwarded <= 0) {
        throw new Error("Points awarded must be greater than 0");
      }

      // Prepare data based on rule type
      let conditions: any = {};

      if (type === "PURCHASE") {
        conditions = {
          minimumAmount,
          pointsPerCurrency,
        };
      }
      // Add other rule type conditions here

      // Create or update rule
      const url = isEditing ? `/api/loyalty/rules/${rule?.id}` : "/api/loyalty/rules";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          type,
          pointsAwarded,
          isActive,
          conditions: JSON.stringify(conditions),
          programId: loyaltyProgram.id,
          minimumAmount: type === "PURCHASE" ? minimumAmount : null,
          pointsPerCurrency: type === "PURCHASE" ? pointsPerCurrency : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save loyalty rule");
      }

      const data = await response.json();

      // Redirect to rule detail page
      router.push(`/loyalty/rules/${data.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred while saving the rule");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Rule Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Purchase Points, Birthday Bonus"
            required
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe how this rule works"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="type">Rule Type</Label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            required
          >
            <option value="PURCHASE">Purchase Rule</option>
            <option value="PRODUCT">Product Rule</option>
            <option value="CATEGORY">Category Rule</option>
            <option value="VISIT">Visit Rule</option>
            <option value="REFERRAL">Referral Rule</option>
            <option value="BIRTHDAY">Birthday Rule</option>
          </select>
        </div>

        <div>
          <Label htmlFor="pointsAwarded">Points Awarded</Label>
          <Input
            id="pointsAwarded"
            type="number"
            min="1"
            value={pointsAwarded}
            onChange={(e) => setPointsAwarded(parseInt(e.target.value))}
            required
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
          <Label htmlFor="isActive">Active</Label>
        </div>
      </div>

      <Tabs defaultValue={type} className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
          <TabsTrigger value="PURCHASE" onClick={() => setType("PURCHASE")}>Purchase</TabsTrigger>
          <TabsTrigger value="PRODUCT" onClick={() => setType("PRODUCT")}>Product</TabsTrigger>
          <TabsTrigger value="CATEGORY" onClick={() => setType("CATEGORY")}>Category</TabsTrigger>
          <TabsTrigger value="VISIT" onClick={() => setType("VISIT")}>Visit</TabsTrigger>
          <TabsTrigger value="REFERRAL" onClick={() => setType("REFERRAL")}>Referral</TabsTrigger>
          <TabsTrigger value="BIRTHDAY" onClick={() => setType("BIRTHDAY")}>Birthday</TabsTrigger>
        </TabsList>

        <TabsContent value="PURCHASE" className="space-y-4 pt-4">
          <div>
            <Label htmlFor="minimumAmount">Minimum Purchase Amount ($)</Label>
            <Input
              id="minimumAmount"
              type="number"
              min="0"
              step="0.01"
              value={minimumAmount}
              onChange={(e) => setMinimumAmount(parseFloat(e.target.value))}
            />
            <p className="mt-1 text-xs text-gray-800">
              Minimum purchase amount required to earn points
            </p>
          </div>

          <div>
            <Label htmlFor="pointsPerCurrency">Points per Currency Unit</Label>
            <Input
              id="pointsPerCurrency"
              type="number"
              min="0.01"
              step="0.01"
              value={pointsPerCurrency}
              onChange={(e) => setPointsPerCurrency(parseFloat(e.target.value))}
            />
            <p className="mt-1 text-xs text-gray-800">
              Number of points awarded per currency unit (e.g., 1 point per ₹1)
            </p>
          </div>
        </TabsContent>

        <TabsContent value="PRODUCT" className="space-y-4 pt-4">
          <p className="text-sm text-gray-800">
            Product rule configuration is coming soon.
          </p>
        </TabsContent>

        <TabsContent value="CATEGORY" className="space-y-4 pt-4">
          <p className="text-sm text-gray-800">
            Category rule configuration is coming soon.
          </p>
        </TabsContent>

        <TabsContent value="VISIT" className="space-y-4 pt-4">
          <p className="text-sm text-gray-800">
            Visit rule configuration is coming soon.
          </p>
        </TabsContent>

        <TabsContent value="REFERRAL" className="space-y-4 pt-4">
          <p className="text-sm text-gray-800">
            Referral rule configuration is coming soon.
          </p>
        </TabsContent>

        <TabsContent value="BIRTHDAY" className="space-y-4 pt-4">
          <p className="text-sm text-gray-800">
            Birthday rule configuration is coming soon.
          </p>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Saving..."
            : isEditing
              ? "Update Rule"
              : "Create Rule"}
        </Button>
      </div>
    </form>
  );
}