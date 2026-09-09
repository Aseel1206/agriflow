"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { ProcurementPlan } from "@/lib/types";
import { useT } from "@/context/LanguageContext";
import PageHeader from "@/components/agri/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import EmptyState from "@/components/agri/EmptyState";
import EconomicsBreakdown from "@/components/agri/EconomicsBreakdown";
import Badge from "@/components/ui/badge/Badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";

export default function ProcurementPlanPage() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const [plan, setPlan] = useState<ProcurementPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ProcurementPlan>(`/buyers/requirements/${id}/procurement-plan`)
      .then(setPlan)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load procurement plan"));
  }, [id]);

  return (
    <div>
      <PageHeader
        title={t.buyer.procurementPlanTitle}
        subtitle={plan ? `${plan.crop} — ${plan.requested_quantity_kg} ${t.buyer.kgRequested}` : undefined}
      />

      {error && <EmptyState message={error} />}

      {plan && (
        <div className="space-y-6">
          <ComponentCard title={t.buyer.recommendedSupply} desc={t.buyer.aggregatedDesc}>
            <div className="flex items-center gap-3 mb-4">
              <Badge color={plan.fully_fulfilled ? "success" : "warning"}>
                {plan.fully_fulfilled ? t.buyer.fullyFulfilled : t.buyer.partiallyFulfilled}
              </Badge>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {plan.fulfilled_quantity_kg} / {plan.requested_quantity_kg} {t.buyer.kgMatched}
              </span>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                  <TableRow>
                    {[t.buyer.farmerCol, t.buyer.quantityCol, t.buyer.priceCol, t.buyer.distanceCol].map((h) => (
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
                  {plan.contributions.map((c, i) => (
                    <TableRow key={c.listing_id}>
                      <TableCell className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">
                        {t.buyer.farmerCol} {i + 1}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {c.quantity_kg} {t.common.kg}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        ₹{c.price_per_kg}{t.common.perKg}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.distance_km} km</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="px-4 py-3 font-semibold text-gray-800 dark:text-white/90">
                      {t.buyer.total}
                    </TableCell>
                    <TableCell className="px-4 py-3 font-semibold text-gray-800 dark:text-white/90">
                      {plan.fulfilled_quantity_kg} {t.common.kg}
                    </TableCell>
                    <TableCell className="px-4 py-3">{""}</TableCell>
                    <TableCell className="px-4 py-3">{""}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </ComponentCard>

          <ComponentCard title={t.buyer.expectedLandedCostCard}>
            <EconomicsBreakdown
              rows={[
                { label: t.buyer.productCost, value: plan.product_cost },
                { label: t.buyer.transportCost, value: plan.transport_cost },
                { label: t.buyer.handlingCost, value: plan.handling_cost },
              ]}
              totalLabel={t.buyer.expectedLandedCostRow}
              totalTooltip={t.a11y.landedCostHelp}
              totalValue={plan.expected_landed_cost}
              unit="lot"
            />
          </ComponentCard>
        </div>
      )}
    </div>
  );
}
