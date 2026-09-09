"use client";

import "leaflet/dist/leaflet.css";
import React, { useEffect, useRef } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import { MapPoint } from "@/lib/types";
import { useT } from "@/context/LanguageContext";

const COLORS: Record<MapPoint["type"], string> = {
  farmer: "#1F9D5A",
  buyer: "#3B82F6",
  logistics: "#F59E0B",
};

// Esri World Imagery — free satellite tiles, no API key or billing account
// required (unlike Google's tile servers). Fine for demo-scale traffic; see
// https://www.esri.com/en-us/legal/terms/data-attributions for attribution.
const SATELLITE_TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const LABEL_TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

export default function MarketMap({ points }: { points: MapPoint[] }) {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LayerGroup | null>(null);

  const LABELS: Record<MapPoint["type"], string> = {
    farmer: t.market.legendFarmer,
    buyer: t.market.legendBuyer,
    logistics: t.market.legendLogistics,
  };

  // Init the map once. Leaflet touches `window`/`document`, so it's loaded
  // dynamically here rather than as a static import — this component still
  // gets server-rendered once for the initial HTML shell.
  useEffect(() => {
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [12.9716, 77.5946],
        zoom: 9,
        scrollWheelZoom: false,
      });

      L.tileLayer(SATELLITE_TILES, {
        maxZoom: 18,
        attribution: "Tiles &copy; Esri",
      }).addTo(map);

      L.tileLayer(LABEL_TILES, { maxZoom: 18 }).addTo(map);

      markersRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw markers whenever the points change.
  useEffect(() => {
    if (points.length === 0) return;

    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled) return;
      const map = mapRef.current;
      const group = markersRef.current;
      if (!map || !group) return;

      group.clearLayers();

      points.forEach((p) => {
        L.circleMarker([p.lat, p.lng], {
          radius: 7,
          color: "white",
          weight: 1.5,
          fillColor: COLORS[p.type],
          fillOpacity: 0.9,
        })
          .bindPopup(`${LABELS[p.type]}: ${p.label}`)
          .addTo(group);
      });

      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-500 dark:text-gray-400">
        {t.market.noLocationsYet}
      </div>
    );
  }

  return (
    <div>
      <div ref={containerRef} className="h-[420px] w-full rounded-xl" />
      <div className="flex flex-wrap gap-4 mt-3">
        {(Object.keys(COLORS) as MapPoint["type"][]).map((type) => (
          <div key={type} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[type] }} />
            {LABELS[type]}
          </div>
        ))}
      </div>
    </div>
  );
}
