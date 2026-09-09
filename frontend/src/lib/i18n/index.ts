import { dictionaries, Dictionary } from "./translations";

export type LanguageCode = keyof typeof dictionaries;

export const LANGUAGES: { code: LanguageCode; nativeName: string; englishName: string }[] = [
  { code: "en", nativeName: "English", englishName: "English" },
  { code: "kn", nativeName: "ಕನ್ನಡ", englishName: "Kannada" },
  { code: "hi", nativeName: "हिन्दी", englishName: "Hindi" },
  { code: "te", nativeName: "తెలుగు", englishName: "Telugu" },
  { code: "ta", nativeName: "தமிழ்", englishName: "Tamil" },
  { code: "mr", nativeName: "मराठी", englishName: "Marathi" },
];

export const DEFAULT_LANGUAGE: LanguageCode = "en";

export function getDictionary(code: LanguageCode): Dictionary {
  return dictionaries[code] || dictionaries[DEFAULT_LANGUAGE];
}

export type { Dictionary };
