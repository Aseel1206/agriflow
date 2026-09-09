"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type FontScale = "normal" | "large" | "xlarge";

const SCALE_PERCENT: Record<FontScale, string> = {
  normal: "100%",
  large: "112.5%",
  xlarge: "125%",
};

const STORAGE_KEY = "agriflow_font_scale";

type Ctx = { fontScale: FontScale; setFontScale: (s: FontScale) => void };

const AccessibilityContext = createContext<Ctx | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [fontScale, setFontScaleState] = useState<FontScale>("normal");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as FontScale | null;
    if (saved) setFontScaleState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = SCALE_PERCENT[fontScale];
  }, [fontScale]);

  function setFontScale(scale: FontScale) {
    setFontScaleState(scale);
    localStorage.setItem(STORAGE_KEY, scale);
  }

  return (
    <AccessibilityContext.Provider value={{ fontScale, setFontScale }}>{children}</AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility must be used within AccessibilityProvider");
  return ctx;
}
