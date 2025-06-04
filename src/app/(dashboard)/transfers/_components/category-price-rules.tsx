"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface Category {
  id: string;
  name: string;
}

interface PriceRule {
  id: string;
  categoryId: string;
  adjustmentType: string; // "percentage", "fixed", "margin"
  adjustmentValue: number;
}

interface CategoryPriceRulesProps {
  categories: Category[];
  onRulesChange: (rules: PriceRule[]) => void;
  initialRules?: PriceRule[];
}

export function CategoryPriceRules({
  categories,
  onRulesChange,
  initialRules = [],
}: CategoryPriceRulesProps) {
  const [rules, setRules] = useState<PriceRule[]>(initialRules);

  // Update parent component when rules change
  useEffect(() => {
    onRulesChange(rules);
  }, [rules, onRulesChange]);

  // Add a new rule
  const addRule = () => {
    // Find first category that doesn't have a rule yet
    const unusedCategories = categories.filter(
      (category) => !rules.some((rule) => rule.categoryId === category.id)
    );

    if (unusedCategories.length === 0) {
      return; // All categories have rules
    }

    const newRule: PriceRule = {
      id: `rule-${Date.now()}`,
      categoryId: unusedCategories[0].id,
      adjustmentType: "percentage",
      adjustmentValue: 30,
    };

    setRules([...rules, newRule]);
  };

  // Remove a rule
  const removeRule = (ruleId: string) => {
    setRules(rules.filter((rule) => rule.id !== ruleId));
  };

  // Update a rule
  const updateRule = (ruleId: string, field: string, value: string | number) => {
    setRules(
      rules.map((rule) => {
        if (rule.id === ruleId) {
          return { ...rule, [field]: value };
        }
        return rule;
      })
    );
  };

  return (
    <div className="space-y-4 rounded-md border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-md font-medium text-gray-800">Category-Specific Price Rules</h3>
        <Button
          onClick={addRule}
          disabled={categories.length === rules.length}
          className="rounded-md bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
        >
          Add Rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <p className="text-sm text-gray-800">No category-specific rules. Default pricing will be used.</p>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <div key={rule.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3">
                <label htmlFor={`category-${rule.id}`} className="block text-xs font-medium text-gray-800">
                  Category
                </label>
                <select
                  id={`category-${rule.id}`}
                  value={rule.categoryId}
                  onChange={(e) => updateRule(rule.id, "categoryId", e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {categories
                    .filter(
                      (category) =>
                        category.id === rule.categoryId ||
                        !rules.some((r) => r.id !== rule.id && r.categoryId === category.id)
                    )
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="col-span-3">
                <label htmlFor={`type-${rule.id}`} className="block text-xs font-medium text-gray-800">
                  Adjustment Type
                </label>
                <select
                  id={`type-${rule.id}`}
                  value={rule.adjustmentType}
                  onChange={(e) => updateRule(rule.id, "adjustmentType", e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="percentage">Percentage Markup</option>
                  <option value="fixed">Fixed Amount Markup</option>
                  <option value="margin">Target Margin</option>
                </select>
              </div>

              <div className="col-span-3">
                <label htmlFor={`value-${rule.id}`} className="block text-xs font-medium text-gray-800">
                  {rule.adjustmentType === "percentage"
                    ? "Markup %"
                    : rule.adjustmentType === "fixed"
                    ? "Markup Amount"
                    : "Target Margin %"}
                </label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  {rule.adjustmentType !== "fixed" && (
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-gray-800 sm:text-sm">%</span>
                    </div>
                  )}
                  {rule.adjustmentType === "fixed" && (
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-800 sm:text-sm">$</span>
                    </div>
                  )}
                  <input
                    type="number"
                    id={`value-${rule.id}`}
                    min="0"
                    step={rule.adjustmentType === "fixed" ? "0.01" : "1"}
                    value={rule.adjustmentValue}
                    onChange={(e) => updateRule(rule.id, "adjustmentValue", parseFloat(e.target.value) || 0)}
                    className={`block w-full rounded-md border border-gray-300 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      rule.adjustmentType === "fixed" ? "pl-7 pr-3" : "pl-3 pr-7"
                    }`}
                  />
                </div>
              </div>

              <div className="col-span-3 flex items-end justify-end">
                <Button
                  onClick={() => removeRule(rule.id)}
                  className="rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200 transition-colors"
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
