"use client";

import React from "react";
import Badge from "@/components/ui/badge/Badge";
import { useT } from "@/context/LanguageContext";

const COLOR_MAP: Record<string, "primary" | "success" | "error" | "warning" | "info" | "light"> = {
  active: "success",
  reserved: "warning",
  sold: "light",
  expired: "error",
  fulfilled: "success",
  pending: "warning",
  accepted: "success",
  rejected: "error",
  confirmed: "info",
  in_transit: "primary",
  delivered: "success",
  completed: "success",
  cancelled: "error",
  available: "success",
  assigned: "info",
  offline: "light",
  planned: "warning",
  SHORTAGE: "error",
  SURPLUS: "success",
  BALANCED: "light",
};

export default function StatusBadge({ status }: { status: string }) {
  const t = useT();
  const label = t.status[status as keyof typeof t.status] || status;
  return <Badge color={COLOR_MAP[status] || "light"}>{label}</Badge>;
}
