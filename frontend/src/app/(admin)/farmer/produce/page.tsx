"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { ProduceListing } from "@/lib/types";
import { useT } from "@/context/LanguageContext";
import PageHeader from "@/components/agri/PageHeader";
import EmptyState from "@/components/agri/EmptyState";
import StatusBadge from "@/components/agri/StatusBadge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";

export default function MyProducePage() {
  const [listings, setListings] = useState<ProduceListing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  useEffect(() => {
    api
      .get<ProduceListing[]>("/produce/mine")
      .then(setListings)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load produce"));
  }, []);

  const columns = [
    t.farmer.cropLabel,
    t.farmer.quantity,
    t.farmer.quality,
    t.farmer.expectedPrice,
    t.farmer.aiPrice,
    t.farmer.status,
    "",
  ];

  return (
    <div>
      <PageHeader title={t.farmer.myProduce} ctaLabel={t.nav.addProduce} ctaHref="/farmer/produce/new" />

      {error && <EmptyState message={error} />}

      {listings && listings.length === 0 && <EmptyState message={t.farmer.noProduceYet} />}

      {listings && listings.length > 0 && (
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
              {listings.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="px-5 py-4 font-medium text-gray-800 dark:text-white/90">
                    {l.crop} {l.variety ? `(${l.variety})` : ""}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-600 dark:text-gray-300">
                    {l.remaining_quantity_kg} / {l.quantity_kg} {t.common.kg}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-600 dark:text-gray-300">{l.quality_grade}</TableCell>
                  <TableCell className="px-5 py-4 text-gray-600 dark:text-gray-300">
                    ₹{l.expected_price}{t.common.perKg}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-600 dark:text-gray-300">
                    {l.ai_recommended_price ? `₹${l.ai_recommended_price}${t.common.perKg}` : "—"}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <StatusBadge status={l.status} />
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right">
                    <Link
                      href={`/farmer/produce/${l.id}`}
                      className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                    >
                      {t.farmer.viewBestTrade} →
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
