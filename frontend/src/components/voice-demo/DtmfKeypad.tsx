"use client";

import React from "react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

export default function DtmfKeypad({
  onPress,
  shakeKey,
}: {
  onPress: (digit: string) => void;
  shakeKey: string | null;
}) {
  return (
    <div className="mx-auto grid w-fit grid-cols-3 gap-3">
      {KEYS.map((key) => (
        <button
          key={key}
          onClick={() => onPress(key)}
          className={`flex h-14 w-14 items-center justify-center rounded-full border text-lg font-semibold transition-colors ${
            shakeKey === key
              ? "border-error-400 bg-error-50 text-error-600 dark:border-error-500 dark:bg-error-500/10 dark:text-error-400"
              : "border-gray-200 bg-white text-gray-800 hover:border-brand-300 hover:bg-brand-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-brand-500/10"
          }`}
        >
          {key}
        </button>
      ))}
    </div>
  );
}
