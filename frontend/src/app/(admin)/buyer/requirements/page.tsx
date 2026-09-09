"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { BuyerRequirement } from "@/lib/types";
import { useT } from "@/context/LanguageContext";
import PageHeader from "@/components/agri/PageHeader";
import EmptyState from "@/components/agri/EmptyState";
import StatusBadge from "@/components/agri/StatusBadge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";

export default function MyRequirementsPage() {
  const [requirements, setRequirements] = useState<BuyerRequirement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  useEffect(() => {
    api
      .get<BuyerRequirement[]>("/buyers/requirements/mine")
      .then(setRequirements)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load requirements"));
  }, []);

  const columns = [
    t.market.cropCol,
    t.buyer.quantityCol,
    t.buyer.maxPriceLabel,
    t.buyer.requiredByLabel,
    t.farmer.status,
    "",
  ];

  return (
    <div>
      <PageHeader title={t.buyer.myRequirements} ctaLabel={t.nav.postRequirement} ctaHref="/buyer/requirements/new" />

      {error && <EmptyState message={error} />}

      {requirements && requirements.length === 0 && <EmptyState message={t.buyer.noRequirementsYet} />}

      {requirements && requirements.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-gray-800">
              <TableRow>
                {columns.map((h, i) => (
                  <TableCell
                    key={`${h}-${i}`}
                    isHeader
                    className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400"
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {requirements.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="px-5 py-4 font-medium text-gray-800 dark:text-white/90">{r.crop}</TableCell>
                  <TableCell className="px-5 py-4 text-gray-600 dark:text-gray-300">
                    {r.remaining_quantity_kg} / {r.quantity_kg} {t.common.kg}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-600 dark:text-gray-300">
                    ₹{r.max_price}{t.common.perKg}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-600 dark:text-gray-300">{r.required_by}</TableCell>
                  <TableCell className="px-5 py-4">
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right">
                    <Link
                      href={`/buyer/requirements/${r.id}`}
                      className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                    >
                      {t.buyer.viewProcurementPlan} →
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
