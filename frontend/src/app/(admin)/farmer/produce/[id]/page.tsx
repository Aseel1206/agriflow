"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { BestTrade, ProduceListing } from "@/lib/types";
import { useT } from "@/context/LanguageContext";
import PageHeader from "@/components/agri/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import EmptyState from "@/components/agri/EmptyState";
import StatusBadge from "@/components/agri/StatusBadge";
import BestTradeCard from "@/components/agri/BestTradeCard";

export default function ProduceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const [listing, setListing] = useState<ProduceListing | null>(null);
  const [trade, setTrade] = useState<BestTrade | null>(null);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [proposing, setProposing] = useState(false);
  const [proposed, setProposed] = useState(false);
  const [proposeError, setProposeError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ProduceListing[]>("/produce/mine")
      .then((listings) => {
        const found = listings.find((l) => l.id === id);
        setListing(found || null);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Failed to load listing"));

    api
      .get<BestTrade>(`/produce/${id}/best-trade`)
      .then(setTrade)
      .catch((err) =>
        setTradeError(err instanceof ApiError ? err.message : t.farmer.noMatchingBuyerDemand)
      );
  }, [id, t.farmer.noMatchingBuyerDemand]);

  async function proposeTrade() {
    if (!trade) return;
    setProposeError(null);
    setProposing(true);
    try {
      await api.post("/offers", {
        listing_id: trade.listing_id,
        requirement_id: trade.requirement_id,
        quantity_kg: trade.quantity_kg,
      });
      setProposed(true);
    } catch (err) {
      setProposeError(err instanceof ApiError ? err.message : "Failed to send offer");
    } finally {
      setProposing(false);
    }
  }

  const subtitle = listing
    ? t.farmer.remainingOfTemplate
        .replace("{remaining}", String(listing.remaining_quantity_kg))
        .replace("{total}", String(listing.quantity_kg))
    : undefined;

  return (
    <div>
      <PageHeader
        title={listing ? `${listing.crop}${listing.variety ? " — " + listing.variety : ""}` : t.farmer.listingDetailsTitleFallback}
        subtitle={subtitle}
      />

      {loadError && <EmptyState message={loadError} />}

      {listing && (
        <ComponentCard title={t.farmer.listingDetailsCard} className="mb-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <span className="block text-xs text-gray-500 dark:text-gray-400">{t.farmer.quality}</span>
              <span className="font-medium text-gray-800 dark:text-white/90">{listing.quality_grade}</span>
            </div>
            <div>
              <span className="block text-xs text-gray-500 dark:text-gray-400">{t.farmer.expectedPrice}</span>
              <span className="font-medium text-gray-800 dark:text-white/90">
                ₹{listing.expected_price}{t.common.perKg}
              </span>
            </div>
            <div>
              <span className="block text-xs text-gray-500 dark:text-gray-400">{t.farmer.aiPrice}</span>
              <span className="font-medium text-brand-600 dark:text-brand-400">
                {listing.ai_recommended_price ? `₹${listing.ai_recommended_price}${t.common.perKg}` : "—"}
              </span>
            </div>
            <div>
              <span className="block text-xs text-gray-500 dark:text-gray-400">{t.farmer.status}</span>
              <StatusBadge status={listing.status} />
            </div>
          </div>
        </ComponentCard>
      )}

      {trade && (
        <BestTradeCard trade={trade} onPropose={proposeTrade} proposing={proposing} proposed={proposed} />
      )}
      {proposeError && <p className="mt-2 text-sm text-error-500">{proposeError}</p>}
      {!trade && tradeError && <EmptyState message={tradeError} />}
    </div>
  );
}
