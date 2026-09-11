# AgriFlow Backend (MVP)

FastAPI backend for the AgriFlow agricultural marketplace (SIH PS 26033). Implements
the spec in `../idea.txt`: Farmer / Buyer / Logistics roles, a mocked
`PriceTradeService` grounded in real mandi price data, rule-based freshness scoring,
OR-Tools shared-route optimization, dynamic farmer aggregation (Virtual Supply Lots +
FPOs), and the BEST TRADE engine.

## Stack

- FastAPI + Pydantic v2
- PostgreSQL in Docker/production; SQLite works too for local dev — `app/models.py`
  uses SQLAlchemy's cross-dialect `Uuid`/`JSON` types (native UUID/JSONB on Postgres,
  portable equivalents elsewhere), so the same schema runs on either with zero code changes.
- Google OR-Tools for vehicle routing
- JWT auth (python-jose + bcrypt)

## Fresh clone — fastest path (SQLite, no Postgres/Docker needed)

`.venv`, `.env` and the seeded database are all gitignored (as they should be — they're
either machine-specific or generated), so a fresh clone needs these four steps once:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
copy .env.example .env
.venv\Scripts\python.exe -m app.seed
```

Then run the API:

```powershell
.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs. Demo credentials below. On macOS/Linux, use
`python3 -m venv .venv`, `.venv/bin/python`, and `cp .env.example .env` instead.

`requirements.txt` includes `lightgbm` (~40MB with its `scipy` dependency) for the
demand-forecasting model — the rest is lightweight.

This SQLite path is for local development/demoing only — swap `DATABASE_URL` in `.env`
to Postgres (see below) before a real deploy, since idea.txt specifies PostgreSQL for
production.

## Run with Docker + PostgreSQL (production-parity)

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

Then seed demo data (one-time, once the containers are up):

```bash
docker compose exec backend python -m app.seed
```

API docs: http://localhost:8000/docs

## Run locally against PostgreSQL without Docker

For when you want Postgres specifically (matches idea.txt §25/§37 exactly) but still
don't want Docker. Uses the same `.venv` from the step above (Python 3.14-compatible
pins: `psycopg` v3 instead of `psycopg2`, current `pydantic`/`sqlalchemy` patch
releases — see requirements.txt for exact versions).

**1. Install PostgreSQL** (one-time, needs an elevated/Administrator shell —
this cannot be done from a non-admin terminal):

```powershell
choco install postgresql16 -y --params '/Password:postgres'
```

Open a **new** terminal afterwards so PATH picks up `psql`, then create the
role/database matching `.env.example`:

```powershell
$env:PGPASSWORD = "postgres"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h localhost -c "CREATE ROLE agriflow WITH LOGIN PASSWORD 'agriflow' CREATEDB;"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h localhost -c "CREATE DATABASE agriflow OWNER agriflow;"
```

**2. Point `.env` at Postgres instead of SQLite**, then run the API (from `backend/`):

```powershell
# edit .env: DATABASE_URL=postgresql+psycopg://agriflow:agriflow@localhost:5432/agriflow
.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

**3. Seed demo data** (in a second terminal, once the API is up):

```powershell
.venv\Scripts\python.exe -m app.seed
```

## Demo credentials (password: `demo1234`)

| Role      | Email                          |
|-----------|---------------------------------|
| Farmer    | farmer.demo@agriflow.dev        |
| Buyer     | buyer.demo@agriflow.dev         |
| Logistics | logistics.demo@agriflow.dev     |
| Admin     | admin.demo@agriflow.dev         |

Get a token: `POST /auth/login {"email": "...", "password": "demo1234"}`, then send
`Authorization: Bearer <token>` on subsequent requests.

## Architecture notes

- `app/models.py` — every table from idea.txt §25, plus `fpo_profiles` (§11a).
- `app/services/` — the core services, each behind a stable interface so a real
  ML model can replace the rule-based logic later without touching callers or the
  frontend (idea.txt §9, §37):
  - `price_trade_service.py` — `LightGBMPriceTradeService`, which blends a real
    trained next-day price forecast (`price_forecast_model.py`) with the platform's
    quality-grade/farmer-expectation logic. Falls back to `MockPriceTradeService`'s
    static Agmarknet/data.gov.in-derived snapshot (`app/data/mandi_prices.py` —
    **refresh before a real demo**) whenever no db session is available.
  - `price_forecast_model.py` — the second genuinely trained ML model in this app: a
    LightGBM regressor (162 trees, same ~638k-row mandi dataset as the demand model)
    forecasting tomorrow's mandi price. Training script + notes live in `/price_modal`
    at the repo root; the vendored model is `app/data/price_model.txt`. Same
    data-availability caveats as `demand_forecast_service.py` — read its docstring
    before trusting its output.
  - `freshness_service.py` — rule-based shelf life / spoilage, per `app/data/shelf_life.py`.
  - `logistics_service.py` — OR-Tools vehicle routing for shared pickups.
  - `best_trade_service.py` / `aggregation_service.py` — orchestrate the above into
    the BEST TRADE ranking and the dynamic farmer-aggregation (Virtual Supply Lot) flow.
    `aggregation_service.choose_allocation_order()` does an exhaustive search for small
    candidate pools to fill an order with the fewest farmers, falling back to a plain
    nearest-first greedy fill for larger pools.
  - `demand_forecast_service.py` — the first **genuinely trained ML model** in this app: a
    LightGBM regressor (748 trees, ~638k historical mandi rows, 2001–2021) forecasting
    regional market arrivals. Training script + notes live in `/demand_model` at the
    repo root; the vendored model is `app/data/demand_model.txt`. Read the module
    docstring before trusting its output — it documents exactly what the number does
    and doesn't mean, and a real data-availability caveat.
  - `trust_service.py` — a farmer/buyer reliability score derived from their own
    completed-vs-cancelled transaction history. No ML — same spirit as the other
    rule-based services.
- `app/api/routes/` — one router per domain area, matching the endpoint list in
  idea.txt §38, plus the `/ai/*` contract endpoints from §28 (already wired to the mock
  services so the ML team can swap in trained models behind the same request/response
  shape later — see `models_plan.txt` for the agreed scope split).
- No business logic lives in the frontend — every calculation (net realization,
  landed cost, freshness, route cost) is computed server-side and returned as data.

## Known MVP simplifications (by design, see idea.txt §29)

- No live payments/escrow — transaction `status` is tracked, no money moves.
- No PostGIS — distances use haversine on plain lat/lng columns.
- No Alembic migrations yet — `Base.metadata.create_all()` runs on startup.
- Price/trade and demand forecasting are both implemented, and both now backed by
  real trained models rather than mocks; farmer↔buyer matching-as-ML remains a
  stretch goal, built against the `/ai/*` contract (see `../models_plan.txt`).
