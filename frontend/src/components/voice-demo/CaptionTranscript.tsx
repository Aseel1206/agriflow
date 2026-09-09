"use client";

import React, { useEffect, useRef } from "react";
import { useT } from "@/context/LanguageContext";

export type TranscriptLine = { id: string; from: "system" | "user"; text: string };

export default function CaptionTranscript({ lines }: { lines: TranscriptLine[] }) {
  const t = useT();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [lines.length]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-3">
        <h4 className="font-semibold text-gray-800 dark:text-white/90">{t.voiceDemo.transcriptTitle}</h4>
        <p className="text-xs text-gray-400 dark:text-gray-500">{t.voiceDemo.audioNote}</p>
      </div>
      <div aria-live="polite" className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {lines.map((line) => (
          <div
            key={line.id}
            className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
              line.from === "system"
                ? "rounded-bl-sm bg-brand-50 text-gray-800 dark:bg-brand-500/10 dark:text-white/90"
                : "ml-auto rounded-br-sm bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300"
            }`}
          >
            {line.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
