"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface PriceAdjustmentFormProps {
  originalCostPrice: number;
  originalRetailPrice: number;
  onPriceChange: (newCostPrice: number, newRetailPrice: number) => void;
  showCostAdjustment?: boolean;
}

export function PriceAdjustmentForm({
  originalCostPrice,
  originalRetailPrice,
  onPriceChange,
  showCostAdjustment = false,
}: PriceAdjustmentFormProps) {
  // State for form values
  const [adjustmentType, setAdjustmentType] = useState<string>("percentage");
  const [retailAdjustmentValue, setRetailAdjustmentValue] = useState<number>(30); // Default 30% markup
  const [costAdjustmentValue, setCostAdjustmentValue] = useState<number>(10); // Default 10% markup
  const [customRetailPrice, setCustomRetailPrice] = useState<number>(originalRetailPrice);
  const [customCostPrice, setCustomCostPrice] = useState<number>(originalCostPrice);
  const [useCustomPrices, setUseCustomPrices] = useState<boolean>(false);

  // Calculate adjusted prices based on adjustment type and value
  useEffect(() => {
    if (useCustomPrices) {
      onPriceChange(customCostPrice, customRetailPrice);
      return;
    }

    let newRetailPrice = originalRetailPrice;
    let newCostPrice = originalCostPrice;

    if (adjustmentType === "percentage") {
      // Apply percentage markup
      newRetailPrice = Number((originalRetailPrice * (1 + retailAdjustmentValue / 100)).toFixed(2));
      if (showCostAdjustment) {
        newCostPrice = Number((originalCostPrice * (1 + costAdjustmentValue / 100)).toFixed(2));
      }
    } else if (adjustmentType === "fixed") {
      // Apply fixed amount markup
      newRetailPrice = Number((originalRetailPrice + retailAdjustmentValue).toFixed(2));
      if (showCostAdjustment) {
        newCostPrice = Number((originalCostPrice + costAdjustmentValue).toFixed(2));
      }
    } else if (adjustmentType === "margin") {
      // Set price to achieve target margin
      // Margin = (Retail - Cost) / Retail
      // Retail = Cost / (1 - Margin)
      const targetMargin = retailAdjustmentValue / 100;
      newRetailPrice = Number((originalCostPrice / (1 - targetMargin)).toFixed(2));
    }

    onPriceChange(newCostPrice, newRetailPrice);
  }, [
    adjustmentType,
    retailAdjustmentValue,
    costAdjustmentValue,
    originalCostPrice,
    originalRetailPrice,
    useCustomPrices,
    customRetailPrice,
    customCostPrice,
    showCostAdjustment,
    onPriceChange,
  ]);

  return (
    <div className="space-y-4 rounded-md border border-gray-200 p-4">
      <h3 className="text-md font-medium text-gray-800">Price Adjustment</h3>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="useCustomPrices"
          checked={useCustomPrices}
          onChange={(e) => setUseCustomPrices(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="useCustomPrices" className="text-sm text-gray-800">
          Use custom prices
        </label>
      </div>

      {useCustomPrices ? (
        <div className="grid grid-cols-2 gap-4">
          {showCostAdjustment && (
            <div>
              <label htmlFor="customCostPrice" className="block text-sm font-medium text-gray-800">
                Custom Cost Price
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-gray-800 sm:text-sm">₹</span>
                </div>
                <input
                  type="number"
                  id="customCostPrice"
                  min="0"
                  step="0.01"
                  value={customCostPrice}
                  onChange={(e) => setCustomCostPrice(parseFloat(e.target.value) || 0)}
                  className="block w-full rounded-md border border-gray-300 pl-7 pr-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
          <div>
            <label htmlFor="customRetailPrice" className="block text-sm font-medium text-gray-800">
              Custom Retail Price
            </label>
            <div className="relative mt-1 rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-gray-800 sm:text-sm">₹</span>
              </div>
              <input
                type="number"
                id="customRetailPrice"
                min="0"
                step="0.01"
                value={customRetailPrice}
                onChange={(e) => setCustomRetailPrice(parseFloat(e.target.value) || 0)}
                className="block w-full rounded-md border border-gray-300 pl-7 pr-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="adjustmentType" className="block text-sm font-medium text-gray-800">
              Adjustment Type
            </label>
            <select
              id="adjustmentType"
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="percentage">Percentage Markup</option>
              <option value="fixed">Fixed Amount Markup</option>
              <option value="margin">Target Margin</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="retailAdjustmentValue" className="block text-sm font-medium text-gray-800">
                {adjustmentType === "percentage"
                  ? "Retail Markup %"
                  : adjustmentType === "fixed"
                  ? "Retail Markup Amount"
                  : "Target Margin %"}
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                {adjustmentType !== "fixed" && (
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-800 sm:text-sm">%</span>
                  </div>
                )}
                {adjustmentType === "fixed" && (
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-gray-800 sm:text-sm">₹</span>
                  </div>
                )}
                <input
                  type="number"
                  id="retailAdjustmentValue"
                  min="0"
                  step={adjustmentType === "fixed" ? "0.01" : "1"}
                  value={retailAdjustmentValue}
                  onChange={(e) => setRetailAdjustmentValue(parseFloat(e.target.value) || 0)}
                  className={`block w-full rounded-md border border-gray-300 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    adjustmentType === "fixed" ? "pl-7 pr-3" : "pl-3 pr-7"
                  }`}
                />
              </div>
            </div>

            {showCostAdjustment && adjustmentType !== "margin" && (
              <div>
                <label htmlFor="costAdjustmentValue" className="block text-sm font-medium text-gray-800">
                  {adjustmentType === "percentage" ? "Cost Markup %" : "Cost Markup Amount"}
                </label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  {adjustmentType !== "fixed" && (
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-gray-800 sm:text-sm">%</span>
                    </div>
                  )}
                  {adjustmentType === "fixed" && (
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-800 sm:text-sm">₹</span>
                    </div>
                  )}
                  <input
                    type="number"
                    id="costAdjustmentValue"
                    min="0"
                    step={adjustmentType === "fixed" ? "0.01" : "1"}
                    value={costAdjustmentValue}
                    onChange={(e) => setCostAdjustmentValue(parseFloat(e.target.value) || 0)}
                    className={`block w-full rounded-md border border-gray-300 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      adjustmentType === "fixed" ? "pl-7 pr-3" : "pl-3 pr-7"
                    }`}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            {showCostAdjustment && (
              <div>
                <p className="text-sm text-gray-800">Original Cost: ₹{originalCostPrice.toFixed(2)}</p>
                <p className="text-sm font-medium text-gray-800">
                  New Cost: ₹{(originalCostPrice * (1 + costAdjustmentValue / 100)).toFixed(2)}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-800">Original Retail: ₹{originalRetailPrice.toFixed(2)}</p>
              <p className="text-sm font-medium text-gray-800">
                New Retail: ₹
                {adjustmentType === "percentage"
                  ? (originalRetailPrice * (1 + retailAdjustmentValue / 100)).toFixed(2)
                  : adjustmentType === "fixed"
                  ? (originalRetailPrice + retailAdjustmentValue).toFixed(2)
                  : (originalCostPrice / (1 - retailAdjustmentValue / 100)).toFixed(2)}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
