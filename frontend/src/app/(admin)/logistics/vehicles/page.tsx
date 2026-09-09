"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { LOCATIONS, findLocation } from "@/lib/locations";
import { Vehicle } from "@/lib/types";
import { useT } from "@/context/LanguageContext";
import PageHeader from "@/components/agri/PageHeader";
import EmptyState from "@/components/agri/EmptyState";
import StatusBadge from "@/components/agri/StatusBadge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";

export default function MyVehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [newLocation, setNewLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const t = useT();

  function load() {
    api
      .get<Vehicle[]>("/vehicles/mine")
      .then(setVehicles)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load vehicles"));
  }

  useEffect(load, []);

  const locationOptions = LOCATIONS.map((l) => ({ value: l.name, label: l.name }));

  function openEdit(vehicle: Vehicle) {
    setEditing(vehicle);
    setNewLocation("");
    setSaveError(null);
  }

  async function saveLocation() {
    if (!editing) return;
    const loc = findLocation(newLocation);
    if (!loc) {
      setSaveError(t.logistics.selectLocation);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await api.patch(`/vehicles/${editing.id}/location`, {
        location: loc.name,
        lat: loc.lat,
        lng: loc.lng,
      });
      setEditing(null);
      load();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Failed to update location");
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    t.logistics.typeCol,
    t.logistics.capacityCol,
    t.logistics.locationCol,
    t.logistics.costPerKmCol,
    t.logistics.statusCol,
    "",
  ];

  return (
    <div>
      <PageHeader title={t.logistics.myVehiclesTitle} ctaLabel={t.logistics.registerVehicleTitle} ctaHref="/logistics/vehicles/new" />

      {error && <EmptyState message={error} />}
      {vehicles && vehicles.length === 0 && <EmptyState message={t.logistics.noVehiclesYet} />}

      {vehicles && vehicles.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-gray-800">
              <TableRow>
                {columns.map((h, i) => (
                  <TableCell
                    key={i}
                    isHeader
                    className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400"
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {vehicles.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="px-5 py-4 font-medium text-gray-800 dark:text-white/90">
                    {v.vehicle_type}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-600 dark:text-gray-300">
                    {v.capacity_kg} {t.common.kg}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-600 dark:text-gray-300">{v.current_location}</TableCell>
                  <TableCell className="px-5 py-4 text-gray-600 dark:text-gray-300">₹{v.cost_per_km}/km</TableCell>
                  <TableCell className="px-5 py-4">
                    <StatusBadge status={v.status} />
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <Button size="sm" variant="outline" onClick={() => openEdit(v)}>
                      {t.logistics.updateLocationBtn}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} className="max-w-md p-6">
        <h4 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
          {t.logistics.updateLocationTitle}
        </h4>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">{t.logistics.updateLocationDesc}</p>

        {saveError && (
          <div className="mb-4 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/15 dark:text-error-400">
            {saveError}
          </div>
        )}

        <Label>{t.logistics.newLocationLabel}*</Label>
        <Select options={locationOptions} placeholder={t.logistics.selectLocation} onChange={setNewLocation} />

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setEditing(null)}>
            {t.logistics.cancelBtn}
          </Button>
          <Button onClick={saveLocation} disabled={saving}>
            {saving ? t.logistics.updatingBtn : t.logistics.saveBtn}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
