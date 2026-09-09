"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { LogisticsDashboard } from "@/lib/types";
import { useT } from "@/context/LanguageContext";
import PageHeader from "@/components/agri/PageHeader";
import StatCard from "@/components/agri/StatCard";
import EmptyState from "@/components/agri/EmptyState";
import ComponentCard from "@/components/common/ComponentCard";
import StatusBadge from "@/components/agri/StatusBadge";
import Button from "@/components/ui/button/Button";
import { BoxCubeIcon, TableIcon, DollarLineIcon } from "@/icons";

export default function LogisticsDashboardPage() {
  const [data, setData] = useState<LogisticsDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  useEffect(() => {
    api
      .get<LogisticsDashboard>("/dashboard/logistics")
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load dashboard"));
  }, []);

  return (
    <div>
      <PageHeader
        title={t.logistics.dashboardTitle}
        subtitle={t.logistics.dashboardSubtitle}
        ctaLabel={t.logistics.registerVehicleTitle}
        ctaHref="/logistics/vehicles/new"
      />

      {error && <EmptyState message={error} />}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-3 mb-6">
            <StatCard icon={<BoxCubeIcon />} label={t.logistics.availableVehicles} value={data.available_vehicles} />
            <StatCard icon={<TableIcon />} label={t.logistics.activeRoutes} value={data.active_routes} />
            <StatCard icon={<DollarLineIcon />} label={t.logistics.earnings} value={`₹${data.earnings.toLocaleString()}`} />
          </div>

          <ComponentCard title={t.logistics.myVehicles}>
            {data.vehicles.length === 0 ? (
              <EmptyState message={t.logistics.noVehiclesYet} />
            ) : (
              <div className="space-y-2">
                {data.vehicles.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-800"
                  >
                    <span className="font-medium text-gray-800 dark:text-white/90">{v.vehicle_type}</span>
                    <StatusBadge status={v.status} />
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4">
              <Link href="/logistics/loads">
                <Button variant="outline">{t.logistics.findLoadBtn}</Button>
              </Link>
            </div>
          </ComponentCard>
        </>
      )}
    </div>
  );
}
