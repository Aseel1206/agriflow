"use client";

import React from "react";
import { useAccessibility, FontScale } from "@/context/AccessibilityContext";
import { useT } from "@/context/LanguageContext";

export default function FontSizeControl() {
  const { fontScale, setFontScale } = useAccessibility();
  const t = useT();

  const OPTIONS: { value: FontScale; label: string; textClass: string; aria: string }[] = [
    { value: "normal", label: "A", textClass: "text-xs", aria: t.a11y.fontSizeNormal },
    { value: "large", label: "A", textClass: "text-sm", aria: t.a11y.fontSizeLarge },
    { value: "xlarge", label: "A", textClass: "text-base", aria: t.a11y.fontSizeXLarge },
  ];

  return (
    <div className="flex items-center h-11 overflow-hidden border border-gray-200 divide-x divide-gray-200 rounded-lg dark:border-gray-800 dark:divide-gray-800">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setFontScale(opt.value)}
          aria-label={opt.aria}
          aria-pressed={fontScale === opt.value}
          className={`flex h-full w-8 items-center justify-center font-semibold transition-colors ${opt.textClass} ${
            fontScale === opt.value
              ? "bg-brand-500 text-white"
              : "bg-white text-gray-500 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
