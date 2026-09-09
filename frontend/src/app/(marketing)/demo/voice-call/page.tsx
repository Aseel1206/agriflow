"use client";

import { useState } from "react";
import { useT } from "@/context/LanguageContext";
import Button from "@/components/ui/button/Button";
import PhoneCallSimulator from "@/components/voice-demo/PhoneCallSimulator";

export default function VoiceCallDemoPage() {
  const t = useT();
  const [scenario, setScenario] = useState<"A" | "B" | null>(null);

  return (
    <main>
      <section className="mx-auto max-w-(--breakpoint-2xl) px-4 py-12 md:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90 sm:text-3xl">{t.voiceDemo.pageTitle}</h1>
          <p className="mt-3 text-gray-500 dark:text-gray-400">{t.voiceDemo.pageSubtitle}</p>
        </div>

        <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-brand-200 bg-brand-50 p-4 text-center text-sm text-gray-600 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-gray-300">
          {t.voiceDemo.disclaimer}
        </div>

        {!scenario && (
          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="font-semibold text-gray-800 dark:text-white/90">{t.voiceDemo.scenarioAName}</h3>
              <p className="mt-2 mb-6 text-sm text-gray-500 dark:text-gray-400">{t.voiceDemo.scenarioADesc}</p>
              <Button className="mt-auto" onClick={() => setScenario("A")}>
                {t.voiceDemo.startCall}
              </Button>
            </div>
            <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="font-semibold text-gray-800 dark:text-white/90">{t.voiceDemo.scenarioBName}</h3>
              <p className="mt-2 mb-6 text-sm text-gray-500 dark:text-gray-400">{t.voiceDemo.scenarioBDesc}</p>
              <Button className="mt-auto" onClick={() => setScenario("B")}>
                {t.voiceDemo.startCall}
              </Button>
            </div>
          </div>
        )}

        {scenario && (
          <div className="mt-10">
            <PhoneCallSimulator scenario={scenario} onBack={() => setScenario(null)} />
          </div>
        )}
      </section>
    </main>
  );
}
