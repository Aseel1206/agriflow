from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.data.shelf_life import CROPS
from app.db.session import get_db
from app.models import (
    BuyerProfile,
    BuyerRequirement,
    FarmerProfile,
    ListingStatus,
    LogisticsProfile,
    MarketPrice,
    ProduceListing,
    RequirementStatus,
)
from app.schemas import DemandForecastOut, MandiPriceOut, MapPoint, SupplyDemandRow
from app.services.demand_forecast_service import predict_arrivals

router = APIRouter(prefix="/market", tags=["market"])


def _posted_demand_kg(db: Session, crop: str, since: datetime, until: datetime | None = None) -> float:
    stmt = select(func.coalesce(func.sum(BuyerRequirement.quantity_kg), 0.0)).where(
        BuyerRequirement.crop == crop, BuyerRequirement.created_at >= since
    )
    if until is not None:
        stmt = stmt.where(BuyerRequirement.created_at < until)
    return db.execute(stmt).scalar_one()


@router.get("/supply-demand", response_model=list[SupplyDemandRow])
def supply_demand(db: Session = Depends(get_db)):
    """idea.txt section 23 — derived purely from current listings and buyer
    requirements. No forecasting model.

    demand_trend_pct is a cheap, non-ML signal (this week's newly posted
    demand vs. last week's) — not a forecast, just a "is demand rising"
    read on data we already have, in the spirit of the PS's demand-AI ask
    without building an actual forecasting model (idea.txt section 29).
    """
    now = datetime.now(timezone.utc)
    one_week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)

    rows = []
    for crop in CROPS:
        supply = db.execute(
            select(func.coalesce(func.sum(ProduceListing.remaining_quantity_kg), 0.0)).where(
                ProduceListing.crop == crop, ProduceListing.status == ListingStatus.active
            )
        ).scalar_one()
        demand = db.execute(
            select(func.coalesce(func.sum(BuyerRequirement.remaining_quantity_kg), 0.0)).where(
                BuyerRequirement.crop == crop, BuyerRequirement.status == RequirementStatus.active
            )
        ).scalar_one()
        gap = supply - demand
        status = "SHORTAGE" if gap < 0 else ("SURPLUS" if gap > 0 else "BALANCED")

        recent_demand = _posted_demand_kg(db, crop, one_week_ago)
        prior_demand = _posted_demand_kg(db, crop, two_weeks_ago, one_week_ago)
        demand_trend_pct = round((recent_demand - prior_demand) / prior_demand * 100, 1) if prior_demand > 0 else None

        rows.append(
            SupplyDemandRow(
                crop=crop,
                supply_kg=round(supply, 1),
                demand_kg=round(demand, 1),
                gap_kg=round(gap, 1),
                status=status,
                demand_trend_pct=demand_trend_pct,
            )
        )
    return rows


@router.get("/mandi-prices", response_model=list[MandiPriceOut])
def mandi_prices(db: Session = Depends(get_db)):
    """idea.txt section 9 — the real mandi price snapshot the price engine
    is grounded in, surfaced directly so it's checkable rather than only
    baked invisibly into AI price recommendations.
    """
    return db.query(MarketPrice).order_by(MarketPrice.crop).all()


@router.get("/demand-forecast", response_model=list[DemandForecastOut])
def demand_forecast(db: Session = Depends(get_db)):
    """Regional market-arrival forecast per seed crop, from a real trained
    LightGBM model — see app/services/demand_forecast_service.py for what
    this number does and doesn't mean. Deliberately a separate endpoint
    from /supply-demand: that one is live platform data, this one is a
    forecast, and the two should never be visually conflated in the UI.
    """
    return [predict_arrivals(db, crop=crop) for crop in CROPS]


@router.get("/map", response_model=list[MapPoint])
def market_map(db: Session = Depends(get_db)):
    """idea.txt section 24 — farmer/buyer/logistics locations for the map."""
    points: list[MapPoint] = []

    for f in db.query(FarmerProfile).all():
        points.append(MapPoint(id=f.id, type="farmer", label=f.village, lat=f.lat, lng=f.lng))
    for b in db.query(BuyerProfile).all():
        points.append(MapPoint(id=b.id, type="buyer", label=b.business_name, lat=b.lat, lng=b.lng))
    for lp in db.query(LogisticsProfile).all():
        points.append(MapPoint(id=lp.id, type="logistics", label=lp.company_name, lat=lp.lat, lng=lp.lng))

    return points
