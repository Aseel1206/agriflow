import React from "react";
import InfoTooltip from "@/components/common/InfoTooltip";

export type BreakdownRow = {
  label: string;
  value: number;
  sign?: "+" | "-";
};

// idea.txt section 33: always show economic consequences, never just a
// single price number. Renders a Sale price -> costs -> Net realization (or
// Product + Transport + Handling = Landed cost) style breakdown.
export default function EconomicsBreakdown({
  rows,
  totalLabel,
  totalValue,
  totalTooltip,
  unit = "kg",
}: {
  rows: BreakdownRow[];
  totalLabel: string;
  totalValue: number;
  totalTooltip?: string;
  unit?: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{row.label}</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {row.sign === "-" ? "-" : row.sign === "+" ? "+" : ""}
              {"₹"}
              {Math.abs(row.value).toFixed(2)}/{unit}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
        <span className="flex items-center font-semibold text-gray-800 dark:text-white/90">
          {totalLabel}
          {totalTooltip && <InfoTooltip text={totalTooltip} />}
        </span>
        <span className="font-bold text-brand-600 dark:text-brand-400">
          {"₹"}
          {totalValue.toFixed(2)}/{unit}
        </span>
      </div>
    </div>
  );
}
