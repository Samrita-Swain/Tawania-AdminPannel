"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface LoyaltySettingsProps {
  initialSettings: {
    pointsPerDollar: number;
    pointsRedemptionRate: number;
    minimumPointsRedemption: number;
    welcomeBonus: number;
    birthdayBonus: number;
    referralBonus: number;
  };
}

export function LoyaltySettings({ initialSettings }: LoyaltySettingsProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings({
      ...settings,
      [name]: parseFloat(value),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch("/api/settings/loyalty", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setIsEditing(false);
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || "Failed to update settings"}`);
      }
    } catch (error) {
      console.error("Error updating loyalty settings:", error);
      alert("An error occurred while updating the settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSettings(initialSettings);
    setIsEditing(false);
  };

  return (
    <div>
      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="pointsPerDollar" className="block text-sm font-medium text-gray-800">
                Points Per Dollar
              </label>
              <input
                type="number"
                id="pointsPerDollar"
                name="pointsPerDollar"
                min="0.1"
                step="0.1"
                value={settings.pointsPerDollar}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
              <p className="mt-1 text-xs text-gray-800">
                Number of points earned per ₹1 spent
              </p>
            </div>
            <div>
              <label htmlFor="pointsRedemptionRate" className="block text-sm font-medium text-gray-800">
                Points Redemption Rate
              </label>
              <input
                type="number"
                id="pointsRedemptionRate"
                name="pointsRedemptionRate"
                min="0.001"
                step="0.001"
                value={settings.pointsRedemptionRate}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
              <p className="mt-1 text-xs text-gray-800">
                Rupee value of each point (e.g., 0.01 = 1 paisa per point)
              </p>
            </div>
            <div>
              <label htmlFor="minimumPointsRedemption" className="block text-sm font-medium text-gray-800">
                Minimum Points for Redemption
              </label>
              <input
                type="number"
                id="minimumPointsRedemption"
                name="minimumPointsRedemption"
                min="1"
                step="1"
                value={settings.minimumPointsRedemption}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
              <p className="mt-1 text-xs text-gray-800">
                Minimum points required to redeem
              </p>
            </div>
            <div>
              <label htmlFor="welcomeBonus" className="block text-sm font-medium text-gray-800">
                Welcome Bonus
              </label>
              <input
                type="number"
                id="welcomeBonus"
                name="welcomeBonus"
                min="0"
                step="1"
                value={settings.welcomeBonus}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
              <p className="mt-1 text-xs text-gray-800">
                Points awarded to new customers
              </p>
            </div>
            <div>
              <label htmlFor="birthdayBonus" className="block text-sm font-medium text-gray-800">
                Birthday Bonus
              </label>
              <input
                type="number"
                id="birthdayBonus"
                name="birthdayBonus"
                min="0"
                step="1"
                value={settings.birthdayBonus}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
              <p className="mt-1 text-xs text-gray-800">
                Points awarded on customer's birthday
              </p>
            </div>
            <div>
              <label htmlFor="referralBonus" className="block text-sm font-medium text-gray-800">
                Referral Bonus
              </label>
              <input
                type="number"
                id="referralBonus"
                name="referralBonus"
                min="0"
                step="1"
                value={settings.referralBonus}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
              <p className="mt-1 text-xs text-gray-800">
                Points awarded for referring a new customer
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-800">Points Per Rupee</h3>
              <p className="mt-1 text-lg font-semibold text-gray-900">{settings.pointsPerDollar}</p>
              <p className="mt-1 text-xs text-gray-800">
                Customers earn {settings.pointsPerDollar} point(s) for every ₹1 spent
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-800">Points Redemption Rate</h3>
              <p className="mt-1 text-lg font-semibold text-gray-900">₹{settings.pointsRedemptionRate.toFixed(3)}</p>
              <p className="mt-1 text-xs text-gray-800">
                Each point is worth ₹{settings.pointsRedemptionRate.toFixed(2)} in store credit
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-800">Minimum Points for Redemption</h3>
              <p className="mt-1 text-lg font-semibold text-gray-900">{settings.minimumPointsRedemption}</p>
              <p className="mt-1 text-xs text-gray-800">
                Minimum points required to redeem for store credit
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-800">Welcome Bonus</h3>
              <p className="mt-1 text-lg font-semibold text-gray-900">{settings.welcomeBonus} points</p>
              <p className="mt-1 text-xs text-gray-800">
                Points awarded to new customers
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-800">Birthday Bonus</h3>
              <p className="mt-1 text-lg font-semibold text-gray-900">{settings.birthdayBonus} points</p>
              <p className="mt-1 text-xs text-gray-800">
                Points awarded on customer's birthday
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-800">Referral Bonus</h3>
              <p className="mt-1 text-lg font-semibold text-gray-900">{settings.referralBonus} points</p>
              <p className="mt-1 text-xs text-gray-800">
                Points awarded for referring a new customer
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
            >
              Edit Settings
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
