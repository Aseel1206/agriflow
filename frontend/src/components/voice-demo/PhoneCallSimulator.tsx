"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage, useT } from "@/context/LanguageContext";
import { speak, cancelSpeech } from "@/lib/speech";
import { OUTBOUND_SCRIPT } from "@/lib/voiceDemo/outboundScript";
import { INBOUND_SCRIPT } from "@/lib/voiceDemo/inboundScript";
import type { CallStep, Vars } from "@/lib/voiceDemo/types";
import CallScreenShell from "./CallScreenShell";
import CaptionTranscript, { TranscriptLine } from "./CaptionTranscript";
import DtmfKeypad from "./DtmfKeypad";

type Phase = "incoming" | "connected" | "ended";

export default function PhoneCallSimulator({ scenario, onBack }: { scenario: "A" | "B"; onBack: () => void }) {
  const t = useT();
  const { language } = useLanguage();

  const script = scenario === "A" ? OUTBOUND_SCRIPT : INBOUND_SCRIPT;
  const stepsById = useMemo(() => {
    const map: Record<string, CallStep> = {};
    for (const s of script) map[s.id] = s;
    return map;
  }, [script]);

  const [phase, setPhase] = useState<Phase>("incoming");
  const [stepId, setStepId] = useState(script[0].id);
  const [vars, setVars] = useState<Vars>({});
  const [digitBuffer, setDigitBuffer] = useState("");
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [shakeKey, setShakeKey] = useState<string | null>(null);
  const lineCounter = useRef(0);

  const currentStep = stepsById[stepId];

  function pushLine(from: TranscriptLine["from"], text: string) {
    lineCounter.current += 1;
    setTranscript((prev) => [...prev, { id: `l${lineCounter.current}`, from, text }]);
  }

  function flash(digit: string) {
    setShakeKey(digit);
    window.setTimeout(() => setShakeKey(null), 400);
  }

  // Speak + caption whatever step we land on, and end the call as soon as a
  // summary step is reached — never gated on speech actually finishing, so a
  // silent/unsupported browser can't stall the demo.
  useEffect(() => {
    if (phase !== "connected") return;
    const step = stepsById[stepId];
    if (!step) return;

    const text = step.say(t, vars);
    pushLine("system", text);
    speak(text, language);

    if (step.kind === "summary") setPhase("ended");
    if (step.kind === "numeric") setDigitBuffer("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId, phase]);

  function goTo(nextId: string, nextVars?: Vars) {
    cancelSpeech();
    if (nextVars !== undefined) setVars(nextVars);
    setStepId(nextId);
  }

  function handleAnswer() {
    setPhase("connected");
  }

  function handleDecline() {
    cancelSpeech();
    setPhase("ended");
  }

  function handleHangUp() {
    cancelSpeech();
    setPhase("ended");
  }

  function handleTryAgain() {
    cancelSpeech();
    setStepId(script[0].id);
    setVars({});
    setDigitBuffer("");
    setTranscript([]);
    setElapsedSec(0);
    setPhase("incoming");
  }

  function handleBack() {
    cancelSpeech();
    onBack();
  }

  function handleMenuPress(digit: string) {
    if (currentStep.kind !== "menu") return;
    const option = currentStep.options.find((o) => o.digit === digit);
    if (!option) {
      flash(digit);
      return;
    }
    pushLine("user", `${t.voiceDemo.youPressedPrefix} ${digit} — ${option.label(t)}`);
    const nextVars = option.setVars ? option.setVars(vars) : vars;
    goTo(option.next, nextVars);
  }

  function handleNumericPress(digit: string) {
    if (currentStep.kind !== "numeric") return;
    if (digit === "#") {
      if (digitBuffer.length === 0) {
        flash(digit);
        return;
      }
      const unit = currentStep.field === "price" ? t.voiceDemo.rupeesPerKgWord : t.voiceDemo.kilogramsWord;
      pushLine("user", `${digitBuffer} ${unit}`);
      goTo(currentStep.next, { ...vars, [currentStep.field]: digitBuffer });
      return;
    }
    if (digit === "*") {
      setDigitBuffer((b) => b.slice(0, -1));
      return;
    }
    if (/^[0-9]$/.test(digit)) {
      setDigitBuffer((b) => (b.length < currentStep.maxDigits ? b + digit : b));
    } else {
      flash(digit);
    }
  }

  function handleKeypadPress(digit: string) {
    if (currentStep.kind === "menu") handleMenuPress(digit);
    else if (currentStep.kind === "numeric") handleNumericPress(digit);
    else flash(digit);
  }

  useEffect(() => {
    if (phase !== "connected") return;
    const id = window.setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => cancelSpeech, []);

  const callerName = scenario === "A" ? t.voiceDemo.callerOutboundName : t.voiceDemo.callerInboundName;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <div className="flex flex-col gap-6">
        <CallScreenShell
          phase={phase}
          callerName={callerName}
          elapsedSec={elapsedSec}
          onAnswer={handleAnswer}
          onDecline={handleDecline}
          onHangUp={handleHangUp}
          onTryAgain={handleTryAgain}
          onBack={handleBack}
        />

        {phase === "connected" && currentStep.kind === "menu" && (
          <div className="mx-auto grid w-full max-w-sm grid-cols-1 gap-2">
            {currentStep.options.map((opt) => (
              <button
                key={opt.digit}
                onClick={() => handleMenuPress(opt.digit)}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-left text-sm text-gray-700 hover:border-brand-300 hover:bg-brand-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-brand-500/10"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-400">
                  {opt.digit}
                </span>
                {opt.label(t)}
              </button>
            ))}
          </div>
        )}

        {phase === "connected" && currentStep.kind === "numeric" && (
          <div className="mx-auto text-center">
            <span className="font-mono text-2xl tracking-widest text-gray-800 dark:text-white/90">
              {digitBuffer || "_"}
            </span>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{t.voiceDemo.poundToConfirm}</p>
          </div>
        )}

        {phase === "connected" && currentStep.kind === "info" && (
          <button
            onClick={() => goTo(currentStep.next)}
            className="mx-auto rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            {t.voiceDemo.continueBtn}
          </button>
        )}

        {phase === "connected" && (currentStep.kind === "menu" || currentStep.kind === "numeric") && (
          <DtmfKeypad onPress={handleKeypadPress} shakeKey={shakeKey} />
        )}
      </div>

      <CaptionTranscript lines={transcript} />
    </div>
  );
}
