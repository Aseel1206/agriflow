"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LANGUAGE, getDictionary, LanguageCode } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n";

type LanguageContextValue = {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  dict: Dictionary;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const STORAGE_KEY = "agriflow_language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
    if (saved) setLanguageState(saved);
  }, []);

  function setLanguage(lang: LanguageCode) {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }

  const dict = useMemo(() => getDictionary(language), [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, dict }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

/** Shorthand for the translation dictionary: const t = useT(); t.farmer.dashboardTitle */
export function useT() {
  return useLanguage().dict;
}
