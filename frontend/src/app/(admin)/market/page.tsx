"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { MandiPrice, MapPoint, SupplyDemandRow } from "@/lib/types";
import { useT } from "@/context/LanguageContext";
import PageHeader from "@/components/agri/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import EmptyState from "@/components/agri/EmptyState";
import StatusBadge from "@/components/agri/StatusBadge";
import MarketMap from "@/components/agri/MarketMap";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";

export default function MarketPage() {
  const [rows, setRows] = useState<SupplyDemandRow[] | null>(null);
  const [points, setPoints] = useState<MapPoint[] | null>(null);
  const [mandiPrices, setMandiPrices] = useState<MandiPrice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  useEffect(() => {
    api
      .get<SupplyDemandRow[]>("/market/supply-demand")
      .then(setRows)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load supply/demand"));
    api
      .get<MapPoint[]>("/market/map")
      .then(setPoints)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load map"));
    api
      .get<MandiPrice[]>("/market/mandi-prices")
      .then(setMandiPrices)
      .catch(() => {});
  }, []);

  const columns = [t.market.cropCol, t.market.supplyCol, t.market.demandCol, t.market.gapCol, t.market.statusCol];

  return (
    <div>
      <PageHeader title={t.market.title} subtitle={t.market.subtitle} />

      {error && <EmptyState message={error} />}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ComponentCard title={t.market.supplyVsDemand} desc={t.market.derivedDesc}>
          {rows && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                  <TableRow>
                    {columns.map((h) => (
                      <TableCell
                        key={h}
                        isHeader
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400"
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {rows.map((r) => (
                    <TableRow key={r.crop}>
                      <TableCell className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">{r.crop}</TableCell>
                      <TableCell className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {r.supply_kg.toLocaleString()} {t.common.kg}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {r.demand_kg.toLocaleString()} {t.common.kg}
                        {r.demand_trend_pct !== null && (
                          <span
                            className={`ml-2 text-xs font-medium ${
                              r.demand_trend_pct >= 0 ? "text-success-600 dark:text-success-400" : "text-error-500"
                            }`}
                            title={t.market.vsLastWeek}
                          >
                            {r.demand_trend_pct >= 0 ? "↑" : "↓"}{" "}
                            {Math.min(Math.abs(Math.round(r.demand_trend_pct)), 200)}
                            {Math.abs(r.demand_trend_pct) > 200 ? "%+" : "%"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {r.gap_kg > 0 ? "+" : ""}
                        {r.gap_kg.toLocaleString()} {t.common.kg}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </ComponentCard>

        <ComponentCard title={t.market.mapTitle} desc={t.market.mapDesc}>
          {points && <MarketMap points={points} />}
        </ComponentCard>
      </div>

      {mandiPrices && mandiPrices.length > 0 && (
        <div className="mt-6">
          <ComponentCard title={t.market.mandiPricesTitle} desc={t.market.mandiPricesDesc}>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                  <TableRow>
                    {[t.market.cropCol, t.market.priceCol, t.market.sourceCol, t.market.dateCol].map((h) => (
                      <TableCell
                        key={h}
                        isHeader
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400"
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {mandiPrices.map((m) => (
                    <TableRow key={m.crop}>
                      <TableCell className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">{m.crop}</TableCell>
                      <TableCell className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        ₹{m.price_per_kg}{t.common.perKg}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500">{m.source}</TableCell>
                      <TableCell className="px-4 py-3 text-gray-600 dark:text-gray-300">{m.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ComponentCard>
        </div>
      )}
    </div>
  );
}
