"""idea.txt section 28 — FUTURE MODEL API CONTRACT.

These endpoints are stable regardless of what's behind them. Today they call
MockPriceTradeService / FreshnessService / LogisticsService directly; a
trained model can be swapped in behind the same request/response shape
later without the frontend changing (idea.txt section 37: never crash just
because a real model isn't connected — these always have a rule-based
fallback since that IS the current implementation).
"""

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas import (
    AIDemandPredictRequest,
    AIFreshnessRequest,
    AILogisticsOptimizeRequest,
    AIPricePredictRequest,
    AITradeBestRequest,
    AITradeScoreRequest,
)
from app.services.demand_forecast_service import predict_arrivals
from app.services.freshness_service import freshness_service
from app.services.logistics_service import logistics_service
from app.services.price_trade_service import price_trade_service

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/price/predict")
def predict_price(payload: AIPricePredictRequest):
    prediction = price_trade_service.predict_price(
        crop=payload.crop,
        quality_grade=payload.quality_grade,
        farmer_expected_price=payload.farmer_expected_price,
    )
    return {
        "recommended_price": prediction.recommended_price,
        "range_low": prediction.range_low,
        "range_high": prediction.range_high,
        "confidence": prediction.confidence,
        "model": "mock-price-trade-v1",
    }


@router.post("/trade/score")
def trade_score(payload: AITradeScoreRequest):
    score = price_trade_service.calculate_match_score(
        max_price=payload.max_price,
        offered_price=payload.offered_price,
        distance_km=payload.distance_km,
        quality_grade=payload.quality_grade,
        required_grade=payload.required_grade,
        days_to_deadline=payload.days_to_deadline,
        freshness_score=payload.freshness_score,
    )
    return {"match_score": score, "model": "mock-price-trade-v1"}


@router.post("/trade/best")
def trade_best(payload: AITradeBestRequest):
    result = price_trade_service.calculate_best_trade(
        sale_price_per_kg=payload.sale_price_per_kg,
        transport_cost_per_kg=payload.transport_cost_per_kg,
        handling_cost_per_kg=payload.handling_cost_per_kg,
        spoilage_cost_per_kg=payload.spoilage_cost_per_kg,
    )
    return {**result, "model": "mock-price-trade-v1"}


@router.post("/logistics/optimize")
def optimize_logistics(payload: AILogisticsOptimizeRequest):
    result = logistics_service.optimize_route(
        pickup_locations=[(s.label, s.lat, s.lng) for s in payload.pickup_stops],
        pickup_quantities=[s.quantity_kg for s in payload.pickup_stops],
        vehicle_capacity=payload.vehicle_capacity_kg,
        buyer_location=(payload.buyer_location.label, payload.buyer_location.lat, payload.buyer_location.lng),
        cost_per_km=payload.cost_per_km,
    )
    return {
        "stops": [{"label": s.label, "lat": s.lat, "lng": s.lng, "quantity_kg": s.quantity_kg} for s in result.stops],
        "distance_km": result.distance_km,
        "duration_min": result.duration_min,
        "transport_cost": result.transport_cost,
        "vehicle_utilization_pct": result.vehicle_utilization_pct,
        "estimated_savings_pct": result.estimated_savings_pct,
        "notes": result.notes,
        "model": "ortools-vrp-v1",
    }


@router.post("/freshness/predict")
def predict_freshness(payload: AIFreshnessRequest):
    result = freshness_service.evaluate(
        crop=payload.crop,
        harvest_date=payload.harvest_date,
        reference_date=date.today(),
        estimated_transport_hours=payload.estimated_transport_hours,
        sale_price_per_kg=payload.sale_price_per_kg,
    )
    return {**result, "model": "rule-based-freshness-v1"}


@router.post("/demand/predict")
def predict_demand(payload: AIDemandPredictRequest, db: Session = Depends(get_db)):
    """The one genuinely-trained-ML endpoint in this router — see
    app/services/demand_forecast_service.py for the honesty caveats on
    what this number does and doesn't mean.
    """
    return predict_arrivals(db, crop=payload.crop, state=payload.state, target_date=payload.target_date)
