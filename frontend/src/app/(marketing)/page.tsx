"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, dashboardPathForRole } from "@/context/AuthContext";
import { useT } from "@/context/LanguageContext";
import { api, ApiError } from "@/lib/api";
import { MapPoint, SupplyDemandRow } from "@/lib/types";
import Button from "@/components/ui/button/Button";
import StatusBadge from "@/components/agri/StatusBadge";
import MarketMap from "@/components/agri/MarketMap";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { BoxCubeIcon, ListIcon, TableIcon, PieChartIcon } from "@/icons";

export default function LandingPage() {
  const { role, loading } = useAuth();
  const router = useRouter();
  const t = useT();

  const [rows, setRows] = useState<SupplyDemandRow[] | null>(null);
  const [points, setPoints] = useState<MapPoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && role) {
      router.replace(dashboardPathForRole(role));
    }
  }, [loading, role, router]);

  useEffect(() => {
    api
      .get<SupplyDemandRow[]>("/market/supply-demand")
      .then(setRows)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load live market data"));
    api
      .get<MapPoint[]>("/market/map")
      .then(setPoints)
      .catch(() => {});
  }, []);

  const FEATURES = [
    { icon: <BoxCubeIcon />, title: t.common.widgetTitle, desc: t.common.widgetDesc },
    { icon: <ListIcon />, title: t.landing.feature2Title, desc: t.landing.feature2Desc },
    { icon: <TableIcon />, title: t.landing.feature3Title, desc: t.landing.feature3Desc },
    { icon: <PieChartIcon />, title: t.landing.feature4Title, desc: t.landing.feature4Desc },
  ];

  const ROLES = [
    { role: "farmer", label: t.auth.roleFarmer, blurb: t.auth.roleFarmerBlurb },
    { role: "buyer", label: t.auth.roleBuyer, blurb: t.auth.roleBuyerBlurb },
    { role: "logistics", label: t.auth.roleLogistics, blurb: t.auth.roleLogisticsBlurb },
  ];

  // Still resolving auth state, or about to redirect an already-logged-in
  // visitor — avoid flashing marketing content in that split second.
  if (loading || role) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-gray-500 dark:text-gray-400">
        {t.common.loading}
      </div>
    );
  }

  return (
    <main>
      {/* Hero */}
      <section className="mx-auto max-w-(--breakpoint-2xl) px-4 pb-16 pt-14 text-center md:px-6 md:pt-20">
        <h1 className="mx-auto max-w-3xl text-3xl font-bold text-gray-800 dark:text-white/90 sm:text-4xl md:text-5xl">
          {t.landing.heroTitle}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-gray-500 dark:text-gray-400 sm:text-lg">
          {t.auth.tagline}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup">
            <Button size="md">{t.landing.getStarted}</Button>
          </Link>
          <a href="#live">
            <Button size="md" variant="outline">
              {t.landing.browseAsGuest}
            </Button>
          </a>
        </div>
      </section>

      {/* Voice demo callout */}
      <section className="mx-auto max-w-(--breakpoint-2xl) px-4 pb-16 md:px-6">
        <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-brand-200 bg-brand-50 p-6 dark:border-brand-500/30 dark:bg-brand-500/10 sm:flex-row">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-white/90">{t.landing.voiceDemoTitle}</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{t.landing.voiceDemoDesc}</p>
          </div>
          <Link href="/demo/voice-call">
            <Button variant="outline">{t.landing.voiceDemoCta}</Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-(--breakpoint-2xl) px-4 pb-16 md:px-6">
        <h2 className="mb-8 text-center text-2xl font-bold text-gray-800 dark:text-white/90">
          {t.landing.featuresTitle}
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                {f.icon}
              </div>
              <h3 className="mt-4 font-semibold text-gray-800 dark:text-white/90">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section className="mx-auto max-w-(--breakpoint-2xl) px-4 pb-16 md:px-6">
        <h2 className="mb-8 text-center text-2xl font-bold text-gray-800 dark:text-white/90">
          {t.landing.rolesTitle}
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {ROLES.map((r) => (
            <div
              key={r.role}
              className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{r.label}</h3>
              <p className="mt-2 mb-6 text-sm text-gray-500 dark:text-gray-400">{r.blurb}</p>
              <Link href={`/signup?role=${r.role}`} className="mt-auto w-full">
                <Button className="w-full" variant="outline">
                  {t.landing.getStarted}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Live market */}
      <section id="live" className="mx-auto max-w-(--breakpoint-2xl) px-4 pb-20 md:px-6">
        <h2 className="mb-2 text-center text-2xl font-bold text-gray-800 dark:text-white/90">
          {t.landing.liveTitle}
        </h2>
        <p className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400">{t.landing.liveDesc}</p>

        {error && <p className="text-center text-sm text-error-500">{error}</p>}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
            {rows && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                    <TableRow>
                      {[t.market.cropCol, t.market.supplyCol, t.market.demandCol, t.market.statusCol].map((h) => (
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
                        <TableCell className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">
                          {r.crop}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-600 dark:text-gray-300">
                          {r.supply_kg.toLocaleString()} {t.common.kg}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-600 dark:text-gray-300">
                          {r.demand_kg.toLocaleString()} {t.common.kg}
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
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
            {points && <MarketMap points={points} />}
          </div>
        </div>
      </section>
    </main>
  );
}
