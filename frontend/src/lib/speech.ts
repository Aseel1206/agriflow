// Shared Web Speech API (SpeechSynthesis) helper. Used by ReadAloudButton
// (reads the whole page) and the voice-call demo (reads one scripted line
// per step) — both need identical language-tag mapping and cancel-before-
// speak discipline to avoid overlapping/garbled audio.

export const LANG_TAG: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  kn: "kn-IN",
  te: "te-IN",
  ta: "ta-IN",
  mr: "mr-IN",
};

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(
  text: string,
  language: string,
  opts?: { onend?: () => void; onerror?: () => void }
): void {
  if (!isSpeechSupported() || !text) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANG_TAG[language] || "en-IN";
  if (opts?.onend) utterance.onend = opts.onend;
  if (opts?.onerror) utterance.onerror = opts.onerror;

  window.speechSynthesis.speak(utterance);
}

export function cancelSpeech(): void {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}
