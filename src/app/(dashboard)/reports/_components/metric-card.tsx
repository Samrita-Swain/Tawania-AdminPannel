"use client";

import React from "react";

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

export function MetricCard({ title, value, icon, color }: MetricCardProps) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-md">
      <div className="flex items-center gap-3">
        <div className={`rounded-full ${color} bg-opacity-10 p-3 text-lg`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-800">{title}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
