"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { BuyerRequirement } from "@/lib/types";
import { CROPS, findLocation, LOCATIONS, QUALITY_GRADES } from "@/lib/locations";
import { useT } from "@/context/LanguageContext";
import PageHeader from "@/components/agri/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";

const LOCATION_OPTIONS = LOCATIONS.map((l) => ({ value: l.name, label: l.name }));

function todayPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function PostRequirementPage() {
  const t = useT();
  const CROP_OPTIONS = CROPS.map((c) => ({ value: c, label: c }));
  const QUALITY_OPTIONS = QUALITY_GRADES.map((q) => ({ value: q, label: q }));

  const [crop, setCrop] = useState("");
  const [quantity, setQuantity] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [quality, setQuality] = useState("Grade A");
  const [requiredBy, setRequiredBy] = useState(todayPlus(2));
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<BuyerRequirement | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const loc = findLocation(location);
    if (!crop || !loc || !quantity || !maxPrice) {
      setError(t.buyer.fillRequiredFields);
      return;
    }

    setSubmitting(true);
    try {
      const requirement = await api.post<BuyerRequirement>("/buyers/requirements", {
        crop,
        quantity_kg: Number(quantity),
        max_price: Number(maxPrice),
        quality_grade: quality,
        required_by: requiredBy,
        delivery_location: loc.name,
        delivery_lat: loc.lat,
        delivery_lng: loc.lng,
      });
      setCreated(requirement);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to post requirement");
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div>
        <PageHeader
          title={t.buyer.requirementPostedTitle}
          subtitle={`${created.crop} — ${created.quantity_kg} ${t.common.kg}`}
        />
        <ComponentCard title={t.buyer.whatHappensNext}>
          <p className="text-sm text-gray-600 dark:text-gray-300">{t.buyer.whatHappensNextText}</p>
          <Badge color="success" size="sm">
            {t.buyer.active}
          </Badge>
          <div className="flex gap-3 mt-4">
            <Link href={`/buyer/requirements/${created.id}`}>
              <Button>{t.buyer.viewProcurementPlan}</Button>
            </Link>
            <Link href="/buyer/requirements">
              <Button variant="outline">{t.buyer.backToMyRequirements}</Button>
            </Link>
          </div>
        </ComponentCard>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={t.buyer.postRequirementTitle} subtitle={t.buyer.postRequirementSubtitle} />
      <ComponentCard title={t.buyer.requirementDetailsCard}>
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
              <Label>{t.buyer.quantityKgLabel}*</Label>
              <Input type="number" placeholder="e.g. 2000" onChange={(e) => setQuantity(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Label>{t.buyer.maxPriceLabel}*</Label>
              <Input type="number" placeholder="e.g. 38" onChange={(e) => setMaxPrice(e.target.value)} />
            </div>
            <div>
              <Label>{t.buyer.qualityLabel}*</Label>
              <Select options={QUALITY_OPTIONS} defaultValue="Grade A" onChange={setQuality} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Label>{t.buyer.requiredByLabel}</Label>
              <Input type="date" defaultValue={requiredBy} onChange={(e) => setRequiredBy(e.target.value)} />
            </div>
            <div>
              <Label>{t.buyer.deliveryLocationLabel}*</Label>
              <Select options={LOCATION_OPTIONS} placeholder={t.buyer.selectDeliveryLocation} onChange={setLocation} />
            </div>
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting ? t.buyer.postingBtn : t.buyer.postRequirementBtn}
          </Button>
        </form>
      </ComponentCard>
    </div>
  );
}
