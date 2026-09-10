# AgriFlow Frontend

Next.js frontend for AgriFlow, an agricultural marketplace connecting farmers/FPOs
directly with buyers (SIH Problem Statement 26033). Role-based dashboards for
Farmer / Buyer / Logistics / Admin, a public landing page, a 6-language accessibility
suite, and an interactive voice-call demo — all backed by the FastAPI service in
`../backend`.

## Prerequisites

- Node.js 20.x or later
- The backend running first (see `../backend/README.md`) — this app has no
  functionality of its own without it.

## Setup

```bash
npm install
```

Create `frontend/.env.local` (gitignored — not in the repo):

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000

# Firebase — client config is not secret by design (security is enforced by
# Firebase's own rules/API-key restrictions, not by hiding these values).
# Ask a teammate for the project's values, or create your own Firebase project
# and enable Cloud Messaging if you don't have them — push notifications degrade
# gracefully to in-app-only if these are missing.
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
```

Then start the dev server:

```bash
npm run dev
```

Open http://localhost:3000.

## Demo credentials (password: `demo1234`)

Same accounts as the backend — click a role's demo button on the sign-in page, or
enter these directly:

| Role      | Email                          |
|-----------|---------------------------------|
| Farmer    | farmer.demo@agriflow.dev        |
| Buyer     | buyer.demo@agriflow.dev         |
| Logistics | logistics.demo@agriflow.dev     |
| Admin     | admin.demo@agriflow.dev         |

## Where things are

- `src/app/(marketing)/` — the public landing page and `/demo/voice-call`, the
  interactive simulated-phone-call demo (no login required).
- `src/app/(admin)/{farmer,buyer,logistics,admin}/` — the role-based dashboards.
- `src/lib/i18n/translations.ts` — all 6 languages (English, Hindi, Kannada, Telugu,
  Tamil, Marathi); every screen uses this, not just the landing page.
- `src/lib/speech.ts` — shared Web Speech API helper behind both the read-aloud
  button and the voice-call demo.
- `src/lib/voiceDemo/` — the voice-call demo's scripted step data (outbound
  confirmation call and inbound "list produce by keypad" call).
- `src/components/agri/MarketMap.tsx` — the satellite market map (Leaflet + Esri
  World Imagery tiles — free, no API key, unlike Google's tile servers).
- `src/context/AccessibilityContext.tsx` — font-size scaling, persisted per browser.

## Build

```bash
npm run build
```

Runs the TypeScript type-check as part of the build — treat a build failure as a
real error, not just a lint nit.

---

Built on the [TailAdmin Next.js](https://github.com/TailAdmin/free-nextjs-admin-dashboard)
template (MIT licensed, see `LICENSE`), heavily customized for AgriFlow. The original
template's own component showcase pages (`/alerts`, `/badge`, `/buttons`, etc.) are
still present but are template scaffolding, not part of the AgriFlow product.
