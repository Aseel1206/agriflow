"use client";

import React from "react";
import { useT } from "@/context/LanguageContext";

export default function SidebarWidget() {
  const t = useT();
  return (
    <div
      className={`
        mx-auto mb-10 w-full max-w-60 rounded-2xl bg-brand-50 px-4 py-5 text-center dark:bg-brand-500/10`}
    >
      <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
        {t.common.widgetTitle}
      </h3>
      <p className="text-gray-500 text-theme-sm dark:text-gray-400">
        {t.common.widgetDesc}
      </p>
    </div>
  );
}
