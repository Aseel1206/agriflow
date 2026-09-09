"use client";

import React, { useEffect, useState } from "react";
import { useLanguage, useT } from "@/context/LanguageContext";
import { isSpeechSupported, speak, cancelSpeech } from "@/lib/speech";

export default function ReadAloudButton() {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const { language } = useLanguage();
  const t = useT();

  useEffect(() => {
    setSupported(isSpeechSupported());
    return () => cancelSpeech();
  }, []);

  function toggle() {
    if (!supported) return;

    if (speaking) {
      cancelSpeech();
      setSpeaking(false);
      return;
    }

    const main = document.querySelector("main") || document.body;
    const text = (main as HTMLElement).innerText.trim().slice(0, 4000);
    if (!text) return;

    speak(text, language, {
      onend: () => setSpeaking(false),
      onerror: () => setSpeaking(false),
    });
    setSpeaking(true);
  }

  if (!supported) return null;

  return (
    <button
      onClick={toggle}
      aria-label={speaking ? t.a11y.stopReading : t.a11y.readAloud}
      title={speaking ? t.a11y.stopReading : t.a11y.readAloud}
      className={`relative flex items-center justify-center rounded-full border h-11 w-11 transition-colors ${
        speaking
          ? "border-brand-500 bg-brand-500 text-white"
          : "border-gray-200 bg-white text-gray-500 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
      }`}
    >
      {speaking ? (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="5" y="5" width="10" height="10" rx="1.5" fill="currentColor" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M2.5 7.5H5.5L9 4V16L5.5 12.5H2.5V7.5Z"
            fill="currentColor"
          />
          <path
            d="M12.5 6.5C13.5 7.3 14 8.5 14 10C14 11.5 13.5 12.7 12.5 13.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path
            d="M14.8 4.5C16.3 5.8 17 7.8 17 10C17 12.2 16.3 14.2 14.8 15.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}
