"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { LogisticsLoad, RouteResult, Vehicle } from "@/lib/types";
import { useT } from "@/context/LanguageContext";
import PageHeader from "@/components/agri/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import EmptyState from "@/components/agri/EmptyState";
import Checkbox from "@/components/form/input/Checkbox";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";

export default function FindLoadPage() {
  const t = useT();
  const [loads, setLoads] = useState<LogisticsLoad[] | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [vehicleId, setVehicleId] = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<LogisticsLoad[]>("/logistics/loads")
      .then(setLoads)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load available loads"));
    api
      .get<Vehicle[]>("/vehicles/mine")
      .then(setVehicles)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load vehicles"));
  }, []);

  // Backend currently optimizes one buyer (dropoff) per route, so group
  // loads by dropoff location — matches idea.txt section 13's "3 pickups,
  // 1 buyer" shared-truck scenario.
  const groups = useMemo(() => {
    if (!loads) return {};
    return loads.reduce<Record<string, LogisticsLoad[]>>((acc, l) => {
      const key = l.dropoff_location || "Unknown buyer";
      acc[key] = acc[key] || [];
      acc[key].push(l);
      return acc;
    }, {});
  }, [loads]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setResult(null);
  }

  async function optimize() {
    if (!vehicleId || selected.size === 0) {
      setOptimizeError(t.logistics.selectVehicleAndLoad);
      return;
    }
    setOptimizeError(null);
    setOptimizing(true);
    try {
      const res = await api.post<RouteResult>("/logistics/optimize", {
        vehicle_id: vehicleId,
        transaction_ids: Array.from(selected),
      });
      setResult(res);
    } catch (err) {
      setOptimizeError(err instanceof ApiError ? err.message : "Failed to optimize route");
    } finally {
      setOptimizing(false);
    }
  }

  const vehicleOptions = (vehicles || []).map((v) => ({
    value: v.id,
    label: `${v.vehicle_type} (${v.capacity_kg}kg, ${v.current_location})`,
  }));

  return (
    <div>
      <PageHeader title={t.logistics.findLoadTitle} subtitle={t.logistics.findLoadSubtitle} />

      {error && <EmptyState message={error} />}

      {loads && loads.length === 0 && <EmptyState message={t.logistics.noLoadsAvailable} />}

      {loads && loads.length > 0 && (
        <div className="space-y-6">
          {Object.entries(groups).map(([buyer, group]) => (
            <ComponentCard
              key={buyer}
              title={`${t.logistics.to}: ${buyer}`}
              desc={`${group.length} ${t.logistics.pickupsAvailable}`}
            >
              <div className="space-y-2">
                {group.map((l) => (
                  <div
                    key={l.transaction_id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-800"
                  >
                    <Checkbox
                      checked={selected.has(l.transaction_id)}
                      onChange={() => toggle(l.transaction_id)}
                      label={`${l.crop} — ${l.quantity_kg} ${t.common.kg} ${t.logistics.fromLocation} ${l.pickup_location}`}
                    />
                  </div>
                ))}
              </div>
            </ComponentCard>
          ))}

          <ComponentCard title={t.logistics.optimizeSharedRoute}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Select
                  options={vehicleOptions}
                  placeholder={t.logistics.selectVehiclePlaceholder}
                  onChange={setVehicleId}
                />
              </div>
              <Button onClick={optimize} disabled={optimizing}>
                {optimizing ? t.logistics.optimizing : `${t.logistics.optimizeRouteBtn} (${selected.size} ${t.logistics.selected})`}
              </Button>
            </div>
            {optimizeError && <p className="mt-3 text-sm text-error-500">{optimizeError}</p>}

            {result && (
              <div className="mt-6 rounded-xl border border-brand-200 bg-brand-25 p-5 dark:border-brand-500/30 dark:bg-brand-500/5">
                <div className="flex flex-wrap items-center gap-6 mb-4">
                  <div>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">{t.logistics.distance}</span>
                    <span className="font-semibold text-gray-800 dark:text-white/90">{result.distance_km} km</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">{t.logistics.transportCost}</span>
                    <span className="font-semibold text-gray-800 dark:text-white/90">₹{result.transport_cost}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">{t.logistics.vehicleUtilization}</span>
                    <span className="font-semibold text-gray-800 dark:text-white/90">
                      {result.vehicle_utilization_pct}%
                    </span>
                  </div>
                  {result.estimated_savings_pct !== null && (
                    <div>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">{t.logistics.estimatedSavings}</span>
                      <Badge color="success">
                        {result.estimated_savings_pct}% {t.logistics.vsSeparateTrucks}
                      </Badge>
                    </div>
                  )}
                </div>

                <span className="block mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t.logistics.route}
                </span>
                <ol className="space-y-1">
                  {result.stops.map((s, i) => (
                    <li key={i} className="text-sm text-gray-700 dark:text-gray-300">
                      {i + 1}. {s.label} {s.quantity_kg > 0 ? `(${s.quantity_kg} ${t.common.kg})` : `(${t.logistics.dropoff})`}
                    </li>
                  ))}
                </ol>

                {result.notes.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {result.notes.map((n, i) => (
                      <p key={i} className="text-xs text-warning-600 dark:text-orange-400">
                        {n}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </ComponentCard>
        </div>
      )}
    </div>
  );
}
