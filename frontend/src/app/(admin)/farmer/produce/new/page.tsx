"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { ProduceListing } from "@/lib/types";
import { CROPS, findLocation, LOCATIONS, QUALITY_GRADES } from "@/lib/locations";
import { useT } from "@/context/LanguageContext";
import PageHeader from "@/components/agri/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";

const LOCATION_OPTIONS = LOCATIONS.filter((l) => l.name !== "Bengaluru").map((l) => ({
  value: l.name,
  label: l.name,
}));

function todayPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function AddProducePage() {
  const t = useT();
  const CROP_OPTIONS = CROPS.map((c) => ({ value: c, label: c }));
  const QUALITY_OPTIONS = QUALITY_GRADES.map((q) => ({ value: q, label: q }));

  const [crop, setCrop] = useState("");
  const [variety, setVariety] = useState("");
  const [quantity, setQuantity] = useState("");
  const [location, setLocation] = useState("");
  const [harvestDate, setHarvestDate] = useState(todayPlus(0));
  const [quality, setQuality] = useState("Grade A");
  const [expectedPrice, setExpectedPrice] = useState("");
  const [availableFrom, setAvailableFrom] = useState(todayPlus(0));
  const [availableUntil, setAvailableUntil] = useState(todayPlus(5));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<ProduceListing | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const loc = findLocation(location);
    if (!crop || !loc || !quantity || !expectedPrice) {
      setError(t.farmer.fillRequiredFields);
      return;
    }

    setSubmitting(true);
    try {
      const listing = await api.post<ProduceListing>("/produce", {
        crop,
        variety: variety || undefined,
        quantity_kg: Number(quantity),
        unit: "kg",
        location: loc.name,
        lat: loc.lat,
        lng: loc.lng,
        harvest_date: harvestDate,
        quality_grade: quality,
        expected_price: Number(expectedPrice),
        available_from: availableFrom,
        available_until: availableUntil,
      });
      setCreated(listing);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div>
        <PageHeader
          title={t.farmer.produceListedTitle}
          subtitle={`${created.crop} — ${created.quantity_kg} ${t.common.kg}`}
        />
        <ComponentCard title={t.farmer.aiPriceRecommendation}>
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <span className="block text-xs text-gray-500 dark:text-gray-400">{t.farmer.yourExpectedPrice}</span>
              <span className="text-lg font-semibold text-gray-800 dark:text-white/90">
                ₹{created.expected_price}{t.common.perKg}
              </span>
            </div>
            <div>
              <span className="block text-xs text-gray-500 dark:text-gray-400">{t.farmer.aiRecommended}</span>
              <span className="text-lg font-semibold text-brand-600 dark:text-brand-400">
                ₹{created.ai_recommended_price}{t.common.perKg}
              </span>
            </div>
            <Badge color="success">{t.farmer.listed}</Badge>
          </div>
          <div className="flex gap-3 mt-6">
            <Link href={`/farmer/produce/${created.id}`}>
              <Button>{t.farmer.viewBestTrade}</Button>
            </Link>
            <Link href="/farmer/produce">
              <Button variant="outline">{t.farmer.backToMyProduce}</Button>
            </Link>
          </div>
        </ComponentCard>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={t.farmer.addProduceTitle} subtitle={t.farmer.addProduceSubtitle} />
      <ComponentCard title={t.farmer.produceDetailsCard}>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/15 dark:text-error-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Label>{t.farmer.cropLabel}*</Label>
              <Select options={CROP_OPTIONS} placeholder={t.farmer.selectCrop} onChange={setCrop} />
            </div>
            <div>
              <Label>{t.farmer.varietyLabel}</Label>
              <Input type="text" placeholder={t.farmer.varietyOptional} onChange={(e) => setVariety(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Label>{t.farmer.quantityKgLabel}*</Label>
              <Input type="number" placeholder="e.g. 800" onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div>
              <Label>{t.farmer.locationLabel}*</Label>
              <Select options={LOCATION_OPTIONS} placeholder={t.farmer.selectVillage} onChange={setLocation} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Label>{t.farmer.harvestDateLabel}</Label>
              <Input type="date" defaultValue={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} />
            </div>
            <div>
              <Label>{t.farmer.qualityLabel}*</Label>
              <Select options={QUALITY_OPTIONS} defaultValue="Grade A" onChange={setQuality} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Label>{t.farmer.availableFromLabel}</Label>
              <Input type="date" defaultValue={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} />
            </div>
            <div>
              <Label>{t.farmer.availableUntilLabel}</Label>
              <Input type="date" defaultValue={availableUntil} onChange={(e) => setAvailableUntil(e.target.value)} />
            </div>
          </div>

          <div className="sm:w-1/2 sm:pr-2.5">
            <Label>{t.farmer.expectedPriceLabel}*</Label>
            <Input type="number" placeholder="e.g. 35" onChange={(e) => setExpectedPrice(e.target.value)} />
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting ? t.farmer.listingBtn : t.farmer.listProduceBtn}
          </Button>
        </form>
      </ComponentCard>
    </div>
  );
}
