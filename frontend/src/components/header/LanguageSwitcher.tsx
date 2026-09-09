"use client";

import React, { useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { useLanguage } from "@/context/LanguageContext";
import { LANGUAGES } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  const current = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  function toggleDropdown(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  }

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="dropdown-toggle flex h-11 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800"
        aria-label="Change language"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M10 1.667a8.333 8.333 0 100 16.667 8.333 8.333 0 000-16.667zM2.517 7.5h2.847a12.9 12.9 0 01.79-3.24A6.68 6.68 0 002.517 7.5zm0 5h2.847a12.9 12.9 0 00.79 3.24A6.68 6.68 0 012.517 12.5zM10 3.333c.5.75 1.02 2.09 1.22 4.167H8.78c.2-2.076.72-3.417 1.22-4.167zM8.588 9.167h2.824c.055.53.088 1.09.088 1.667s-.033 1.136-.088 1.666H8.588A15.87 15.87 0 018.5 10.834c0-.577.033-1.136.088-1.667zM10 16.667c-.5-.75-1.02-2.09-1.22-4.167h2.44c-.2 2.077-.72 3.417-1.22 4.167zm3.846-3.917c-.176 1.184-.44 2.263-.79 3.24a6.68 6.68 0 001.847-3.24h-1.057zm1.057-1.667a6.68 6.68 0 00-1.847-3.24c.35.977.614 2.056.79 3.24h1.057zM12.626 4.26c.35.977.614 2.056.79 3.24h2.067a6.68 6.68 0 00-2.857-3.24z"
            fill="currentColor"
          />
        </svg>
        <span>{current.nativeName}</span>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className="w-48 p-2"
      >
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => {
              setLanguage(lang.code);
              setIsOpen(false);
            }}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
              lang.code === language
                ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
            }`}
          >
            <span>{lang.nativeName}</span>
            {lang.nativeName !== lang.englishName && (
              <span className="text-xs text-gray-400">{lang.englishName}</span>
            )}
          </button>
        ))}
      </Dropdown>
    </div>
  );
}
