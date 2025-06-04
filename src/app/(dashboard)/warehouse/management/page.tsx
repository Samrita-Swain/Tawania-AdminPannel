"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import InwardsComponent from "../_components/inwards";
import OutwardsComponent from "../_components/outwards";
import OutOfStockComponent from "../_components/out-of-stock";
import ClosingStockComponent from "../_components/closing-stock";

function WarehouseManagementContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const refreshParam = searchParams.get("refresh");
  const [activeTab, setActiveTab] = useState(tabParam || "out-of-stock");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Update active tab when URL parameter changes
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Handle refresh parameter
  useEffect(() => {
    if (refreshParam === "true") {
      // Trigger a refresh by updating the refresh trigger
      setRefreshTrigger(prev => prev + 1);

      // Clean up the URL by removing the refresh parameter
      const url = new URL(window.location.href);
      url.searchParams.delete("refresh");
      window.history.replaceState({}, "", url.toString());
    }
  }, [refreshParam]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Warehouse Management</h1>
        <p className="text-gray-800">
          Manage warehouse inventory, transfers, and stock levels
        </p>
      </div>

      <div>
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {[
              // { id: "inwards", name: "Inwards", description: "Products coming into warehouse" },
              // { id: "outwards", name: "Outwards", description: "Products going out to inventory" },
              { id: "out-of-stock", name: "Out of Stock", description: "Products that are finished" },
              { id: "closing-stock", name: "Closing Stock", description: "Final stock status" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-800 hover:border-gray-300 hover:text-gray-800"
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === "out-of-stock" && <OutOfStockComponent key={`out-of-stock-${refreshTrigger}`} />}
          {activeTab === "closing-stock" && <ClosingStockComponent key={`closing-stock-${refreshTrigger}`} />}
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Warehouse Management</h1>
        <p className="text-gray-800">
          Manage warehouse inventory, transfers, and stock levels
        </p>
      </div>
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Loading warehouse management...</p>
        </div>
      </div>
    </div>
  );
}

export default function WarehouseManagementPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <WarehouseManagementContent />
    </Suspense>
  );
}
