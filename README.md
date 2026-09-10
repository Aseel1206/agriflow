# AgriFlow

A digital marketplace connecting farmers/FPOs directly with buyers and logistics
providers — built for **Smart India Hackathon 2026, Problem Statement 26033**
(Ministry of Consumer Affairs, Food & Public Distribution: *"Multiple intermediaries
reduce farmers' earnings and increase consumer prices"*).

Two services, run together:

- **`backend/`** — FastAPI + SQLAlchemy. Auth, produce listings, buyer requirements,
  the Best Trade matching engine, OR-Tools shared-route logistics, a real trained
  LightGBM demand-forecasting model, FCM notifications.
- **`frontend/`** — Next.js 16 + React 19. Role-based dashboards, a public landing
  page, an interactive voice-call demo, a 6-language accessibility suite.

Full setup instructions for each are in their own READMEs — this page is just the
map. **Start the backend first**, then the frontend.

## Quick start

```bash
# 1. Backend (see backend/README.md for the full walkthrough)
cd backend
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt   # .venv/bin/python on macOS/Linux
copy .env.example .env                                        # cp on macOS/Linux
.venv\Scripts\python.exe -m app.seed
.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

```bash
# 2. Frontend, in a second terminal (see frontend/README.md for env var setup)
cd frontend
npm install
npm run dev
```

Then open **http://localhost:3000** and sign in with any demo account (password
`demo1234`): `farmer.demo@agriflow.dev`, `buyer.demo@agriflow.dev`,
`logistics.demo@agriflow.dev`, `admin.demo@agriflow.dev`. Backend API docs live at
http://localhost:8000/docs.

## What makes this different from a typical listing app

- **Best Trade Engine** — ranks matches by net realization (price minus transport,
  handling, spoilage), not just the highest quoted price, plus a reliability score
  from a farmer's real delivery history.
- **Virtual Supply Lot** — pools several small farmers' listings to fill one bulk
  order automatically, with zero excess, using the fewest farmers possible.
- **Voice Call Demo** (`/demo/voice-call`, public, no login) — a working simulation
  of automated phone access for farmers without smartphones: an outbound call
  confirming a deal, and an inbound call-in flow to list produce entirely by keypad.
- **Regional Market Outlook** — a genuinely trained LightGBM model (748 trees,
  ~638k historical mandi records) forecasting regional arrivals, clearly separated
  from the platform's live supply/demand data. See `backend/README.md` and
  `/demand_model` for how it was trained and its honesty caveats.
- **Shared logistics** — Google OR-Tools solves a real vehicle-routing problem for
  multi-farmer pickups, not a fake heuristic.
- **6 languages + accessibility** — every screen (not just the landing page) works
  in English, Hindi, Kannada, Telugu, Tamil and Marathi, with font scaling and
  read-aloud support.

## Project docs

- `ps.txt` — the official problem statement.
- `idea.txt` — the full product spec this build follows.
- `models_plan.txt` — the ML scope decisions (what's a real trained model vs.
  rule-based logic, and why).
- `demand_model/` — training script and notes for the demand-forecasting model.
