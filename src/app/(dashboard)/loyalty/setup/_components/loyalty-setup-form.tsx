"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function LoyaltySetupForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  const [formData, setFormData] = useState({
    // Basic settings
    name: "Default Loyalty Program",
    pointsPerDollar: 1,
    pointsRedemptionRate: 0.01, // ₹0.01 per point
    minimumPointsRedemption: 100,

    // Bonus settings
    welcomeBonus: 50,
    birthdayBonus: 100,
    referralBonus: 50,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "name" ? value : parseFloat(value),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/settings/loyalty", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert("Loyalty program created successfully!");
        router.push("/loyalty");
        router.refresh();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || "Failed to create loyalty program"}`);
      }
    } catch (error) {
      console.error("Error creating loyalty program:", error);
      alert("An error occurred while creating the loyalty program");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger
            value="basic"
            onClick={() => setActiveTab("basic")}
            className={activeTab === "basic" ? "bg-background shadow-sm" : ""}
          >
            Basic Settings
          </TabsTrigger>
          <TabsTrigger
            value="bonus"
            onClick={() => setActiveTab("bonus")}
            className={activeTab === "bonus" ? "bg-background shadow-sm" : ""}
          >
            Bonus Points
          </TabsTrigger>
        </TabsList>

        {activeTab === "basic" && (
          <TabsContent value="basic" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Program Information</CardTitle>
                <CardDescription>
                  Configure the basic settings for your loyalty program
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Program Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="pointsPerDollar">Points Per Rupee</Label>
                  <Input
                    id="pointsPerDollar"
                    name="pointsPerDollar"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={formData.pointsPerDollar}
                    onChange={handleChange}
                    className="mt-1"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Number of points earned per ₹1 spent
                  </p>
                </div>

                <div>
                  <Label htmlFor="pointsRedemptionRate">Points Redemption Rate</Label>
                  <Input
                    id="pointsRedemptionRate"
                    name="pointsRedemptionRate"
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={formData.pointsRedemptionRate}
                    onChange={handleChange}
                    className="mt-1"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Value in rupees per point (e.g., 0.01 = ₹0.01 per point)
                  </p>
                </div>

                <div>
                  <Label htmlFor="minimumPointsRedemption">Minimum Points for Redemption</Label>
                  <Input
                    id="minimumPointsRedemption"
                    name="minimumPointsRedemption"
                    type="number"
                    min="1"
                    step="1"
                    value={formData.minimumPointsRedemption}
                    onChange={handleChange}
                    className="mt-1"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Minimum points required for redemption
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {activeTab === "bonus" && (
          <TabsContent value="bonus" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Bonus Points</CardTitle>
                <CardDescription>
                  Configure bonus points for different customer actions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="welcomeBonus">Welcome Bonus</Label>
                  <Input
                    id="welcomeBonus"
                    name="welcomeBonus"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.welcomeBonus}
                    onChange={handleChange}
                    className="mt-1"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Points awarded to new customers
                  </p>
                </div>

                <div>
                  <Label htmlFor="birthdayBonus">Birthday Bonus</Label>
                  <Input
                    id="birthdayBonus"
                    name="birthdayBonus"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.birthdayBonus}
                    onChange={handleChange}
                    className="mt-1"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Points awarded on customer's birthday
                  </p>
                </div>

                <div>
                  <Label htmlFor="referralBonus">Referral Bonus</Label>
                  <Input
                    id="referralBonus"
                    name="referralBonus"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.referralBonus}
                    onChange={handleChange}
                    className="mt-1"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Points awarded for referring a new customer
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/loyalty")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Create Loyalty Program"}
        </Button>
      </div>
    </form>
  );
}
