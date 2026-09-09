"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { BuyerDashboard } from "@/lib/types";
import { useT } from "@/context/LanguageContext";
import PageHeader from "@/components/agri/PageHeader";
import StatCard from "@/components/agri/StatCard";
import EmptyState from "@/components/agri/EmptyState";
import ComponentCard from "@/components/common/ComponentCard";
import { ListIcon, TaskIcon, DollarLineIcon } from "@/icons";

export default function BuyerDashboardPage() {
  const [data, setData] = useState<BuyerDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  useEffect(() => {
    api
      .get<BuyerDashboard>("/dashboard/buyer")
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load dashboard"));
  }, []);

  return (
    <div>
      <PageHeader
        title={t.buyer.dashboardTitle}
        subtitle={t.buyer.dashboardSubtitle}
        ctaLabel={t.nav.postRequirement}
        ctaHref="/buyer/requirements/new"
      />

      {error && <EmptyState message={error} />}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-3 mb-6">
            <StatCard icon={<ListIcon />} label={t.buyer.activeRequirements} value={data.active_requirements} />
            <StatCard icon={<TaskIcon />} label={t.common.orders} value={data.orders} />
            <StatCard
              icon={<DollarLineIcon />}
              label={t.buyer.expectedLandedCost}
              value={`₹${data.expected_landed_cost.toLocaleString()}`}
            />
          </div>

          <ComponentCard title={t.buyer.myRequirements} desc={t.buyer.tapRequirementHint}>
            {data.requirements.length === 0 ? (
              <EmptyState message={t.buyer.noRequirementsYet} />
            ) : (
              <div className="space-y-2">
                {data.requirements.map((r) => (
                  <Link
                    key={r.id}
                    href={`/buyer/requirements/${r.id}`}
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 hover:border-brand-300 hover:bg-brand-25 dark:border-gray-800 dark:hover:bg-white/[0.03]"
                  >
                    <span className="font-medium text-gray-800 dark:text-white/90">
                      {r.crop} — {r.quantity_kg} {t.common.kg}
                    </span>
                    <span className="text-sm text-brand-600 dark:text-brand-400">{t.buyer.viewPlanArrow}</span>
                  </Link>
                ))}
              </div>
            )}
          </ComponentCard>
        </>
      )}
    </div>
  );
}
