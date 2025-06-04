"use client";

interface LoyaltyTierBadgeProps {
  tier: string;
}

export function LoyaltyTierBadge({ tier }: LoyaltyTierBadgeProps) {
  const getTierClass = (tier: string): string => {
    switch (tier) {
      case "STANDARD":
        return "bg-gray-100 text-gray-800";
      case "SILVER":
        return "bg-slate-100 text-slate-800";
      case "GOLD":
        return "bg-yellow-100 text-yellow-800";
      case "PLATINUM":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  const formatTier = (tier: string): string => {
    return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
  };
  
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getTierClass(tier)}`}
    >
      {formatTier(tier)}
    </span>
  );
}
