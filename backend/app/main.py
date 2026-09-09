from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401 - ensures models are registered on Base before create_all
from app.api.routes import ai, auth, buyers, dashboard, farmers, fpo, logistics, market, matching, notifications, offers, produce, transactions, vehicles
from app.db.session import Base, engine

app = FastAPI(title="AgriFlow API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(farmers.router)
app.include_router(fpo.router)
app.include_router(produce.router)
app.include_router(buyers.router)
app.include_router(matching.router)
app.include_router(offers.router)
app.include_router(transactions.router)
app.include_router(vehicles.router)
app.include_router(logistics.router)
app.include_router(dashboard.router)
app.include_router(market.router)
app.include_router(ai.router)
app.include_router(notifications.router)
