"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Route } from "@/lib/types";
import { useT } from "@/context/LanguageContext";
import PageHeader from "@/components/agri/PageHeader";
import EmptyState from "@/components/agri/EmptyState";
import StatusBadge from "@/components/agri/StatusBadge";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";

export default function MyRoutesPage() {
  const t = useT();
  const [routes, setRoutes] = useState<Route[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  function load() {
    api
      .get<Route[]>("/logistics/routes/mine")
      .then(setRoutes)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load routes"));
  }

  useEffect(load, []);

  async function complete(routeId: string) {
    setCompletingId(routeId);
    setError(null);
    try {
      await api.post(`/logistics/routes/${routeId}/complete`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to complete route");
    } finally {
      setCompletingId(null);
    }
  }

  return (
    <div>
      <PageHeader title={t.logistics.myRoutesTitle} subtitle={t.logistics.myRoutesSubtitle} />

      {error && <EmptyState message={error} />}
      {routes && routes.length === 0 && <EmptyState message={t.logistics.noRoutesYet} />}

      {routes && routes.length > 0 && (
        <div className="space-y-5">
          {routes.map((r) => (
            <ComponentCard key={r.id} title={`${r.stops[0]?.label ?? ""} → ${r.stops[r.stops.length - 1]?.label ?? ""}`}>
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{t.logistics.routeStatusCol}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{t.logistics.distance}</span>
                  <span className="font-semibold text-gray-800 dark:text-white/90">{r.distance_km} km</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{t.logistics.transportCost}</span>
                  <span className="font-semibold text-gray-800 dark:text-white/90">₹{r.transport_cost}</span>
                </div>
              </div>

              <span className="mt-4 block mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t.logistics.stopsLabel}
              </span>
              <ol className="space-y-1">
                {r.stops.map((s, i) => (
                  <li key={i} className="text-sm text-gray-700 dark:text-gray-300">
                    {i + 1}. {s.label} {s.stop_type === "dropoff" ? `(${t.logistics.dropoff})` : ""}
                  </li>
                ))}
              </ol>

              {r.status !== "completed" && (
                <div className="mt-5">
                  <Button size="sm" onClick={() => complete(r.id)} disabled={completingId === r.id}>
                    {completingId === r.id ? t.logistics.updatingBtn : t.logistics.markDeliveredBtn}
                  </Button>
                </div>
              )}
            </ComponentCard>
          ))}
        </div>
      )}
    </div>
  );
}
