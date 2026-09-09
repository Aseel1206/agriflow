"use client";

import React from "react";
import { useT } from "@/context/LanguageContext";
import Button from "@/components/ui/button/Button";

type Phase = "incoming" | "connected" | "ended";

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function CallScreenShell({
  phase,
  callerName,
  elapsedSec,
  onAnswer,
  onDecline,
  onHangUp,
  onTryAgain,
  onBack,
}: {
  phase: Phase;
  callerName: string;
  elapsedSec: number;
  onAnswer: () => void;
  onDecline: () => void;
  onHangUp: () => void;
  onTryAgain: () => void;
  onBack: () => void;
}) {
  const t = useT();

  const statusLabel =
    phase === "incoming" ? t.voiceDemo.incomingCallLabel : phase === "connected" ? t.voiceDemo.connected : t.voiceDemo.callEnded;

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/[0.03]">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">{statusLabel}</span>

      <div className="mt-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1C10.61 21 3 13.39 3 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.24.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z"
            fill="currentColor"
          />
        </svg>
      </div>

      <h3 className="mt-4 text-lg font-semibold text-gray-800 dark:text-white/90">{callerName}</h3>

      {phase === "connected" && (
        <span className="mt-1 text-sm text-gray-500 dark:text-gray-400">{formatTimer(elapsedSec)}</span>
      )}

      <div className="mt-8 flex items-center justify-center gap-6">
        {phase === "incoming" && (
          <>
            <button
              onClick={onDecline}
              aria-label={t.voiceDemo.decline}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-error-500 text-white transition-colors hover:bg-error-600"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <button
              onClick={onAnswer}
              aria-label={t.voiceDemo.answer}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white transition-colors hover:bg-brand-600"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1C10.61 21 3 13.39 3 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.24.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </>
        )}

        {phase === "connected" && (
          <button
            onClick={onHangUp}
            aria-label={t.voiceDemo.hangUp}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-error-500 text-white transition-colors hover:bg-error-600"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}

        {phase === "ended" && (
          <div className="flex gap-3">
            <Button onClick={onTryAgain}>{t.voiceDemo.tryAgain}</Button>
            <Button variant="outline" onClick={onBack}>
              {t.voiceDemo.backToScenarios}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
