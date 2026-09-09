"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { LOCATIONS } from "@/lib/locations";
import { useT } from "@/context/LanguageContext";
import PageHeader from "@/components/agri/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";

const VEHICLE_TYPES = ["Tata Ace", "Mahindra Bolero Pickup", "Eicher Pro 1049", "Ashok Leyland Dost"].map((v) => ({
  value: v,
  label: v,
}));
const LOCATION_OPTIONS = LOCATIONS.map((l) => ({ value: l.name, label: l.name }));

export default function RegisterVehiclePage() {
  const t = useT();
  const [vehicleType, setVehicleType] = useState("");
  const [capacity, setCapacity] = useState("");
  const [location, setLocation] = useState("");
  const [costPerKm, setCostPerKm] = useState("20");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const loc = LOCATIONS.find((l) => l.name === location);
    if (!vehicleType || !loc || !capacity || !costPerKm) {
      setError(t.logistics.fillRequiredFields);
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/vehicles", {
        vehicle_type: vehicleType,
        capacity_kg: Number(capacity),
        current_location: loc.name,
        lat: loc.lat,
        lng: loc.lng,
        available_from: new Date().toISOString(),
        cost_per_km: Number(costPerKm),
      });
      router.push("/logistics/vehicles");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to register vehicle");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title={t.logistics.registerVehicleTitle} subtitle={t.logistics.registerVehicleSubtitle} />
      <ComponentCard title={t.logistics.vehicleDetailsCard}>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/15 dark:text-error-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Label>{t.logistics.vehicleTypeLabel}*</Label>
              <Select options={VEHICLE_TYPES} placeholder={t.logistics.selectVehicleType} onChange={setVehicleType} />
            </div>
            <div>
              <Label>{t.logistics.capacityLabel}*</Label>
              <Input type="number" placeholder="e.g. 1500" onChange={(e) => setCapacity(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Label>{t.logistics.currentLocationLabel}*</Label>
              <Select options={LOCATION_OPTIONS} placeholder={t.logistics.selectLocation} onChange={setLocation} />
            </div>
            <div>
              <Label>{t.logistics.costPerKmLabel}*</Label>
              <Input
                type="number"
                defaultValue={costPerKm}
                onChange={(e) => setCostPerKm(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting ? t.logistics.registeringBtn : t.logistics.registerVehicleBtn}
          </Button>
        </form>
      </ComponentCard>
    </div>
  );
}
