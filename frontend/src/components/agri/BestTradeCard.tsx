"use client";

import React from "react";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { CheckCircleIcon } from "@/icons";
import EconomicsBreakdown from "./EconomicsBreakdown";
import InfoTooltip from "@/components/common/InfoTooltip";
import { BestTrade } from "@/lib/types";
import { useT } from "@/context/LanguageContext";

export default function BestTradeCard({
  trade,
  onPropose,
  proposing,
  proposed,
}: {
  trade: BestTrade;
  onPropose?: () => void;
  proposing?: boolean;
  proposed?: boolean;
}) {
  const t = useT();
  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-25 p-5 dark:border-brand-500/30 dark:bg-brand-500/5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">
          {t.farmer.bestTrade}
        </h3>
        <span className="flex items-center gap-2">
          <Badge color="success" size="sm">
            {Math.round(trade.confidence * 100)}% {t.farmer.confidence}
          </Badge>
          <InfoTooltip text={t.a11y.confidenceHelp} />
          {trade.farmer_reliability_pct !== null && (
            <Badge color="info" size="sm">
              {Math.round(trade.farmer_reliability_pct)}% {t.farmer.reliableLabel} ({trade.farmer_completed_trades}{" "}
              {t.farmer.trades})
            </Badge>
          )}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 sm:grid-cols-4">
        <div>
          <span className="block text-xs text-gray-500 dark:text-gray-400">{t.farmer.quantity}</span>
          <span className="font-semibold text-gray-800 dark:text-white/90">
            {trade.quantity_kg} {t.common.kg} {trade.crop}
          </span>
        </div>
        <div>
          <span className="block text-xs text-gray-500 dark:text-gray-400">{t.farmer.distance}</span>
          <span className="font-semibold text-gray-800 dark:text-white/90">{trade.distance_km} km</span>
        </div>
        <div>
          <span className="block text-xs text-gray-500 dark:text-gray-400">{t.farmer.delivery}</span>
          <span className="font-semibold text-gray-800 dark:text-white/90">{trade.delivery_estimate}</span>
        </div>
        <div>
          <span className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            {t.farmer.freshness}
            <InfoTooltip text={t.a11y.freshnessHelp} />
          </span>
          <span className="font-semibold text-gray-800 dark:text-white/90">{trade.freshness_score}%</span>
        </div>
      </div>

      <EconomicsBreakdown
        rows={[
          { label: t.farmer.salePrice, value: trade.sale_price_per_kg },
          { label: t.farmer.transport, value: trade.transport_cost_per_kg, sign: "-" },
          { label: t.farmer.handling, value: trade.handling_cost_per_kg, sign: "-" },
          { label: t.farmer.expectedSpoilage, value: trade.spoilage_cost_per_kg, sign: "-" },
        ]}
        totalLabel={t.farmer.netRealization}
        totalValue={trade.net_realization_per_kg}
        totalTooltip={t.a11y.netRealizationHelp}
      />

      {trade.why.length > 0 && (
        <div className="mt-4">
          <span className="block mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t.farmer.why}
          </span>
          <ul className="space-y-1">
            {trade.why.map((reason) => (
              <li key={reason} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <CheckCircleIcon className="text-success-500 shrink-0" />
                {t.reasons[reason as keyof typeof t.reasons] || reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {onPropose && (
        <div className="mt-5">
          <Button onClick={onPropose} disabled={proposing || proposed}>
            {proposed ? t.farmer.offerSent : proposing ? t.farmer.sendingOffer : t.farmer.proposeTrade}
          </Button>
        </div>
      )}
    </div>
  );
}
