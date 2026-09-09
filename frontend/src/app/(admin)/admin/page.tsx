"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { AdminDashboard } from "@/lib/types";
import { useT } from "@/context/LanguageContext";
import PageHeader from "@/components/agri/PageHeader";
import StatCard from "@/components/agri/StatCard";
import EmptyState from "@/components/agri/EmptyState";
import {
  GroupIcon,
  BoxCubeIcon,
  ListIcon,
  TaskIcon,
  DollarLineIcon,
  ShootingStarIcon,
} from "@/icons";

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  useEffect(() => {
    api
      .get<AdminDashboard>("/dashboard/admin")
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load dashboard"));
  }, []);

  return (
    <div>
      <PageHeader title={t.admin.dashboardTitle} subtitle={t.admin.dashboardSubtitle} />

      {error && <EmptyState message={error} />}

      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
          <StatCard icon={<GroupIcon />} label={t.admin.totalFarmers} value={data.total_farmers} />
          <StatCard icon={<GroupIcon />} label={t.admin.totalBuyers} value={data.total_buyers} />
          <StatCard icon={<BoxCubeIcon />} label={t.admin.totalLogisticsProviders} value={data.total_logistics_providers} />
          <StatCard icon={<ListIcon />} label={t.admin.activeProduce} value={data.active_produce} />
          <StatCard icon={<ListIcon />} label={t.admin.activeDemand} value={data.active_demand} />
          <StatCard icon={<TaskIcon />} label={t.admin.activeTransactions} value={data.active_transactions} />
          <StatCard
            icon={<DollarLineIcon />}
            label={t.admin.totalTransactionValue}
            value={`₹${data.total_transaction_value.toLocaleString()}`}
          />
          <StatCard
            icon={<BoxCubeIcon />}
            label={t.admin.totalProduceVolume}
            value={`${data.total_produce_volume_kg.toLocaleString()} ${t.common.kg}`}
          />
          <StatCard
            icon={<ShootingStarIcon />}
            label={t.admin.estimatedLogisticsSavings}
            value={`${data.estimated_logistics_savings_pct}%`}
            hint={t.admin.avgAcrossRoutes}
          />
          <StatCard
            icon={<DollarLineIcon />}
            label={t.admin.middlemanMarginSaved}
            value={`₹${data.total_middleman_margin_saved.toLocaleString()}`}
            hint={t.admin.vsTraditionalChain}
          />
        </div>
      )}
    </div>
  );
}
