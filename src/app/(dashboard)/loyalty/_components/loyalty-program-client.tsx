"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

interface LoyaltyProgramTier {
  id: string;
  name: string;
  description: string | null;
  requiredPoints: number;
  pointsMultiplier: number;
  benefits: string | null;
}

interface LoyaltyRule {
  id: string;
  name: string;
  type: string;
  pointsAwarded: number;
  isActive: boolean;
  description: string | null;
}

interface LoyaltyTransaction {
  id: string;
  customerId: string;
  points: number;
  type: string;
  description: string | null;
  referenceId: string | null;
  createdAt: string;
  customer: {
    id: string;
    name: string;
  };
}

interface LoyaltyProgram {
  id: string;
  name: string;
  description: string | null;
  pointsPerCurrency: number;
  minimumPurchase: number | null;
  isActive: boolean;
  tiers: LoyaltyProgramTier[];
}

interface LoyaltyProgramClientProps {
  initialLoyaltyProgram: LoyaltyProgram | null;
  initialLoyaltyRules: LoyaltyRule[];
  initialRecentTransactions: LoyaltyTransaction[];
}

export function LoyaltyProgramClient({
  initialLoyaltyProgram,
  initialLoyaltyRules,
  initialRecentTransactions,
}: LoyaltyProgramClientProps) {
  const router = useRouter();
  const [loyaltyProgram, setLoyaltyProgram] = useState<LoyaltyProgram | null>(initialLoyaltyProgram);
  const [loyaltyRules, setLoyaltyRules] = useState<LoyaltyRule[]>(initialLoyaltyRules);
  const [recentTransactions, setRecentTransactions] = useState<LoyaltyTransaction[]>(initialRecentTransactions);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [programSettings, setProgramSettings] = useState({
    pointsPerDollar: 1,
    pointsRedemptionRate: 0.01,
    minimumPointsRedemption: 100,
    welcomeBonus: 50,
    birthdayBonus: 100,
    referralBonus: 50,
  });

  // Load settings from the loyalty program description
  useEffect(() => {
    if (loyaltyProgram?.description) {
      try {
        const parsedSettings = JSON.parse(loyaltyProgram.description);
        setProgramSettings({
          ...programSettings,
          ...parsedSettings,
        });
      } catch (e) {
        console.error("Error parsing loyalty program description:", e);
      }
    }
  }, [loyaltyProgram]);

  // Auto-save function
  const saveSettings = async () => {
    if (!loyaltyProgram) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/settings/loyalty", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(programSettings),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Settings saved successfully:", data);

        // Update the local state with the new settings
        setLoyaltyProgram({
          ...loyaltyProgram,
          description: JSON.stringify(programSettings),
        });
      } else {
        const error = await response.json();
        console.error("Error saving settings:", error);
      }
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle changes to program settings
  const handleSettingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newSettings = {
      ...programSettings,
      [name]: parseFloat(value),
    };

    setProgramSettings(newSettings);

    // Auto-save after a short delay
    const timeoutId = setTimeout(() => {
      saveSettings();
    }, 1000);

    return () => clearTimeout(timeoutId);
  };

  if (!loyaltyProgram) {
    return (
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
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Loyalty Program</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/loyalty/settings"
            className="rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
          >
            Program Settings
          </Link>
          <Link
            href="/loyalty/promotions"
            className="rounded-md bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-200 transition-colors"
          >
            Manage Promotions
          </Link>
        </div>
      </div>

      {/* Program Overview */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">{loyaltyProgram.name}</h2>
          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
            loyaltyProgram.isActive
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}>
            {loyaltyProgram.isActive ? "Active" : "Inactive"}
          </span>
        </div>
        {/* Description is stored as JSON, so we don't display it directly */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="font-medium text-gray-800">Points Earning</h3>
            <div className="mt-2 text-sm text-gray-800">
              <div className="flex items-center mb-2">
                <span className="mr-2">Points per currency:</span>
                <input
                  type="number"
                  name="pointsPerDollar"
                  min="0.1"
                  step="0.1"
                  value={programSettings.pointsPerDollar}
                  onChange={handleSettingChange}
                  className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
              <div className="flex items-center mb-2">
                <span className="mr-2">Redemption rate (₹/point):</span>
                <input
                  type="number"
                  name="pointsRedemptionRate"
                  min="0.001"
                  step="0.001"
                  value={programSettings.pointsRedemptionRate}
                  onChange={handleSettingChange}
                  className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
              <div className="flex items-center">
                <span className="mr-2">Min. points for redemption:</span>
                <input
                  type="number"
                  name="minimumPointsRedemption"
                  min="1"
                  step="1"
                  value={programSettings.minimumPointsRedemption}
                  onChange={handleSettingChange}
                  className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="font-medium text-gray-800">Bonus Points</h3>
            <div className="mt-2 text-sm text-gray-800">
              <div className="flex items-center mb-2">
                <span className="mr-2">Welcome bonus:</span>
                <input
                  type="number"
                  name="welcomeBonus"
                  min="0"
                  step="1"
                  value={programSettings.welcomeBonus}
                  onChange={handleSettingChange}
                  className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
              <div className="flex items-center mb-2">
                <span className="mr-2">Birthday bonus:</span>
                <input
                  type="number"
                  name="birthdayBonus"
                  min="0"
                  step="1"
                  value={programSettings.birthdayBonus}
                  onChange={handleSettingChange}
                  className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
              <div className="flex items-center">
                <span className="mr-2">Referral bonus:</span>
                <input
                  type="number"
                  name="referralBonus"
                  min="0"
                  step="1"
                  value={programSettings.referralBonus}
                  onChange={handleSettingChange}
                  className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="font-medium text-gray-800">Program Rules</h3>
            <div className="mt-2 text-sm text-gray-800">
              <p>Active rules: {loyaltyRules.filter(r => r.isActive).length}</p>
              <p>Total rules: {loyaltyRules.length}</p>
              <p>Number of tiers: {loyaltyProgram.tiers.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
