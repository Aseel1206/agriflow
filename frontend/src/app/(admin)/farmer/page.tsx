"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { FarmerDashboard } from "@/lib/types";
import { useT } from "@/context/LanguageContext";
import PageHeader from "@/components/agri/PageHeader";
import StatCard from "@/components/agri/StatCard";
import EmptyState from "@/components/agri/EmptyState";
import ComponentCard from "@/components/common/ComponentCard";
import { BoxCubeIcon, TaskIcon, DollarLineIcon, MailIcon } from "@/icons";

export default function FarmerDashboardPage() {
  const [data, setData] = useState<FarmerDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  useEffect(() => {
    api
      .get<FarmerDashboard>("/dashboard/farmer")
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load dashboard"));
  }, []);

  return (
    <div>
      <PageHeader
        title={t.farmer.dashboardTitle}
        subtitle={t.farmer.dashboardSubtitle}
        ctaLabel={t.nav.addProduce}
        ctaHref="/farmer/produce/new"
      />

      {error && <EmptyState message={error} />}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4 mb-6">
            <StatCard icon={<BoxCubeIcon />} label={t.farmer.activeListings} value={data.active_listings} />
            <StatCard icon={<MailIcon />} label={t.farmer.buyerOffers} value={data.buyer_offers} />
            <StatCard icon={<TaskIcon />} label={t.common.orders} value={data.orders} />
            <StatCard
              icon={<DollarLineIcon />}
              label={t.farmer.expectedEarnings}
              value={`₹${data.expected_earnings.toLocaleString()}`}
            />
          </div>

          <ComponentCard title={t.farmer.myProduce} desc={t.farmer.tapListingHint}>
            {data.listings.length === 0 ? (
              <EmptyState message={t.farmer.noProduceYet} />
            ) : (
              <div className="space-y-2">
                {data.listings.map((l) => (
                  <Link
                    key={l.id}
                    href={`/farmer/produce/${l.id}`}
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 hover:border-brand-300 hover:bg-brand-25 dark:border-gray-800 dark:hover:bg-white/[0.03]"
                  >
                    <span className="font-medium text-gray-800 dark:text-white/90">
                      {l.crop} — {l.quantity_kg} {t.common.kg}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {l.ai_recommended_price ? `${t.farmer.aiPrice} ₹${l.ai_recommended_price}${t.common.perKg}` : ""}
                    </span>
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
