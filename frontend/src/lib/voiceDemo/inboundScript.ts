import type { CallStep, Vars } from "./types";
import { CROP_MENU_PAGE_1, CROP_MENU_PAGE_2 } from "./crops";

// Scenario B — "the farmer calls AgriFlow" to list new produce entirely by
// phone keypad: pick a crop from a numbered voice menu, then enter quantity
// and price via DTMF digits (like a real IVR's "enter amount, then press
// pound"). Nothing here touches the real API — purely illustrative.
export const INBOUND_SCRIPT: CallStep[] = [
  {
    id: "b1",
    kind: "info",
    next: "b2",
    say: (t) => t.voiceDemo.bGreet,
  },
  {
    id: "b2",
    kind: "menu",
    say: (t) => t.voiceDemo.bCropMenu1,
    options: [
      ...CROP_MENU_PAGE_1.map((crop, i) => ({
        digit: String(i + 1),
        label: () => crop,
        next: "b3",
        setVars: (v: Vars) => ({ ...v, crop }),
      })),
      { digit: "5", label: (t) => t.voiceDemo.moreCrops, next: "b2b" },
    ],
  },
  {
    id: "b2b",
    kind: "menu",
    say: (t) => t.voiceDemo.bCropMenu2,
    options: [
      ...CROP_MENU_PAGE_2.map((crop, i) => ({
        digit: String(i + 1),
        label: () => crop,
        next: "b3",
        setVars: (v: Vars) => ({ ...v, crop }),
      })),
      { digit: "*", label: (t) => t.voiceDemo.goBack, next: "b2" },
    ],
  },
  {
    id: "b3",
    kind: "info",
    next: "b4",
    say: (t, vars) => `${t.voiceDemo.bCropConfirmPrefix}: ${vars.crop}.`,
  },
  {
    id: "b4",
    kind: "numeric",
    field: "quantity",
    maxDigits: 4,
    next: "b5",
    say: (t) => t.voiceDemo.bQuantityPrompt,
  },
  {
    id: "b5",
    kind: "info",
    next: "b6",
    say: (t, vars) => `${t.voiceDemo.bQuantityEchoPrefix}: ${vars.quantity} ${t.voiceDemo.kilogramsWord}.`,
  },
  {
    id: "b6",
    kind: "numeric",
    field: "price",
    maxDigits: 3,
    next: "b7",
    say: (t) => t.voiceDemo.bPricePrompt,
  },
  {
    id: "b7",
    kind: "info",
    next: "b8",
    say: (t, vars) => `${t.voiceDemo.bPriceEchoPrefix}: ${vars.price} ${t.voiceDemo.rupeesPerKgWord}.`,
  },
  {
    id: "b8",
    kind: "menu",
    say: (t) => t.voiceDemo.bConfirmQuestion,
    options: [
      { digit: "1", label: (t) => t.voiceDemo.confirm, next: "b9" },
      {
        digit: "2",
        label: (t) => t.voiceDemo.startOver,
        next: "b1",
        setVars: () => ({}),
      },
    ],
  },
  {
    id: "b9",
    kind: "summary",
    say: (t, vars) =>
      `${t.voiceDemo.bSummaryIntro} ${t.voiceDemo.cropLabel}: ${vars.crop}. ${t.voiceDemo.quantityLabel}: ${vars.quantity} ${t.voiceDemo.kilogramsWord}. ${t.voiceDemo.priceLabel}: ${vars.price} ${t.voiceDemo.rupeesPerKgWord}. ${t.voiceDemo.bSummaryOutro}`,
  },
];
