import type { CallStep } from "./types";

// Scenario A — "AgriFlow calls the farmer" to confirm a buyer's price offer,
// then the pickup time and location. Fictional sample data (Ramesh /
// Hoskote / 80kg Tomato / ₹21/kg) — this page never calls the real API.
export const OUTBOUND_SCRIPT: CallStep[] = [
  {
    id: "a1",
    kind: "info",
    next: "a2",
    say: (t) =>
      `${t.voiceDemo.aGreet} ${t.voiceDemo.farmerLabel}: Ramesh. ${t.voiceDemo.locationLabel}: Hoskote.`,
  },
  {
    id: "a2",
    kind: "info",
    next: "a3",
    say: (t) =>
      `${t.voiceDemo.aOfferIntro} ${t.voiceDemo.cropLabel}: Tomato. ${t.voiceDemo.quantityLabel}: 80 ${t.voiceDemo.kilogramsWord}. ${t.voiceDemo.priceLabel}: 21 ${t.voiceDemo.rupeesPerKgWord}.`,
  },
  {
    id: "a3",
    kind: "menu",
    say: (t) => t.voiceDemo.aOfferQuestion,
    options: [
      { digit: "1", label: (t) => t.voiceDemo.accept, next: "a4" },
      { digit: "2", label: (t) => t.voiceDemo.decline, next: "a_declined" },
      { digit: "3", label: (t) => t.voiceDemo.hearAgain, next: "a2" },
    ],
  },
  {
    id: "a4",
    kind: "info",
    next: "a5",
    say: (t) =>
      `${t.voiceDemo.aAccepted} ${t.voiceDemo.priceLabel}: 21 ${t.voiceDemo.rupeesPerKgWord}.`,
  },
  {
    id: "a5",
    kind: "menu",
    say: (t) => t.voiceDemo.aPickupTimeQuestion,
    options: [
      {
        digit: "1",
        label: (t) => t.voiceDemo.aPickupTimeOpt1,
        next: "a6",
        setVars: (v) => ({ ...v, pickupTime: "Tomorrow, 8:00 AM" }),
      },
      {
        digit: "2",
        label: (t) => t.voiceDemo.aPickupTimeOpt2,
        next: "a6",
        setVars: (v) => ({ ...v, pickupTime: "Tomorrow, 5:00 PM" }),
      },
      {
        digit: "3",
        label: (t) => t.voiceDemo.aPickupTimeOpt3,
        next: "a6",
        setVars: (v) => ({ ...v, pickupTime: "Day after tomorrow, 8:00 AM" }),
      },
    ],
  },
  {
    id: "a6",
    kind: "menu",
    say: (t) => t.voiceDemo.aPickupLocationQuestion,
    options: [
      {
        digit: "1",
        label: (t) => t.voiceDemo.aPickupLocationOpt1,
        next: "a7",
        setVars: (v) => ({ ...v, pickupLocation: "Farm gate" }),
      },
      {
        digit: "2",
        label: (t) => t.voiceDemo.aPickupLocationOpt2,
        next: "a7",
        setVars: (v) => ({ ...v, pickupLocation: "Village collection center" }),
      },
    ],
  },
  {
    id: "a7",
    kind: "summary",
    say: (t, vars) =>
      `${t.voiceDemo.aSummaryIntro} ${t.voiceDemo.cropLabel}: Tomato. ${t.voiceDemo.quantityLabel}: 80 ${t.voiceDemo.kilogramsWord}. ${t.voiceDemo.priceLabel}: 21 ${t.voiceDemo.rupeesPerKgWord}. ${t.voiceDemo.pickupTimeLabel}: ${vars.pickupTime}. ${t.voiceDemo.pickupLocationLabel}: ${vars.pickupLocation}. ${t.voiceDemo.aSummaryThanks}`,
  },
  {
    id: "a_declined",
    kind: "summary",
    say: (t) => t.voiceDemo.aDeclined,
  },
];
