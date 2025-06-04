"use client";

import { useState } from "react";

interface LoyaltyTier {
  id: string;
  name: string;
  description: string;
  requiredPoints: number;
  pointsMultiplier: number;
  benefits: string;
}

interface LoyaltyProgramProps {
  program: {
    id: string;
    name: string;
    description: string;
    tiers: LoyaltyTier[];
    pointsPerDollar: number;
    pointsRedemptionRate: number;
    minimumPointsRedemption: number;
    welcomeBonus: number;
    birthdayBonus: number;
    referralBonus: number;
  };
}

export function LoyaltyProgramOverview({ program }: LoyaltyProgramProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!program) return null;

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">
          Loyalty Program: {program.name}
        </h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          {isExpanded ? "Hide Details" : "Loyalty Program"}
        </button>
      </div>

      {isExpanded && (
        <>
          <p className="mb-4 mt-2 text-gray-800">{program.description}</p>
          <div className="grid gap-4 md:grid-cols-4">
            {program.tiers
              .sort((a, b) => a.requiredPoints - b.requiredPoints)
              .map((tier) => (
                <div key={tier.id} className="rounded-lg border border-gray-200 p-4">
                  <h3 className="font-medium text-gray-800">{tier.name}</h3>
                  <p className="mt-1 text-sm text-gray-800">{tier.description}</p>
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Required Points:</span> {tier.requiredPoints}
                  </div>
                  <div className="mt-1 text-sm">
                    <span className="font-medium">Points Multiplier:</span> {tier.pointsMultiplier}x
                  </div>
                  {tier.benefits && (
                    <div className="mt-2">
                      <span className="text-sm font-medium">Benefits:</span>
                      <ul className="mt-1 list-inside list-disc text-sm text-gray-800">
                        {(() => {
                          try {
                            const benefits = JSON.parse(tier.benefits);
                            return Array.isArray(benefits)
                              ? benefits.map((benefit, index) => (
                                  <li key={index}>{benefit}</li>
                                ))
                              : null;
                          } catch (error) {
                            return null;
                          }
                        })()}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
