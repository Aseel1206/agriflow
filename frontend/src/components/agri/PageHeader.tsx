import React from "react";
import Link from "next/link";
import Button from "@/components/ui/button/Button";
import { PlusIcon } from "@/icons";

export default function PageHeader({
  title,
  subtitle,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
      {ctaLabel && ctaHref && (
        <Link href={ctaHref}>
          <Button startIcon={<PlusIcon />}>{ctaLabel}</Button>
        </Link>
      )}
    </div>
  );
}
