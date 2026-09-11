"""Price / Trade engine — idea.txt sections 3-4 and 8-9.

Single service interface for the MVP (predict_price, calculate_match_score,
calculate_best_trade). predict_price() is backed by LightGBMPriceTradeService,
which blends a genuinely trained next-day price forecast (see
price_forecast_model.py) with the platform's own quality-grade multiplier and
farmer-expectation logic — never a wholesale replacement of that logic, just a
trained baseline underneath it. MockPriceTradeService (grounded in a static
mandi-price snapshot) remains as the graceful fallback when no db session is
available, or as a lighter-weight implementation if ever needed again.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.data.mandi_prices import get_price_band


@dataclass
class PricePrediction:
    recommended_price: float
    range_low: float
    range_high: float
    confidence: float
    baseline_source: str


class PriceTradeService(ABC):
    @abstractmethod
    def predict_price(
        self,
        crop: str,
        quality_grade: str,
        farmer_expected_price: float | None = None,
        db: Session | None = None,
    ) -> PricePrediction: ...

    @abstractmethod
    def calculate_match_score(
        self,
        max_price: float,
        offered_price: float,
        distance_km: float,
        quality_grade: str,
        required_grade: str,
        days_to_deadline: float,
        freshness_score: float,
    ) -> float: ...

    @abstractmethod
    def calculate_best_trade(
        self,
        sale_price_per_kg: float,
        transport_cost_per_kg: float,
        handling_cost_per_kg: float,
        spoilage_cost_per_kg: float,
    ) -> dict: ...


QUALITY_RANK = {"Grade A": 3, "Grade B": 2, "Grade C": 1}


class MockPriceTradeService(PriceTradeService):
    """Deterministic rule-based implementation standing in for the future
    LightGBM model. The frontend/API contract is identical either way.
    """

    def predict_price(
        self,
        crop: str,
        quality_grade: str,
        farmer_expected_price: float | None = None,
        db: Session | None = None,
    ) -> PricePrediction:
        band = get_price_band(crop)
        quality_multiplier = {"Grade A": 1.05, "Grade B": 1.0, "Grade C": 0.9}.get(quality_grade, 1.0)
        recommended = round(band.avg * quality_multiplier, 2)

        if farmer_expected_price is not None:
            # nudge recommendation toward farmer's expectation, within the mandi band
            recommended = round((recommended * 0.6) + (farmer_expected_price * 0.4), 2)

        range_low = round(min(band.low, recommended) * 0.97, 2)
        range_high = round(max(band.high, recommended) * 1.03, 2)

        return PricePrediction(
            recommended_price=recommended,
            range_low=range_low,
            range_high=range_high,
            confidence=0.85,
            baseline_source=band.source,
        )

    def calculate_match_score(
        self,
        max_price: float,
        offered_price: float,
        distance_km: float,
        quality_grade: str,
        required_grade: str,
        days_to_deadline: float,
        freshness_score: float,
    ) -> float:
        if offered_price > max_price:
            price_score = max(0.0, 1 - ((offered_price - max_price) / max_price))
        else:
            price_score = 1.0

        distance_score = max(0.0, 1 - min(distance_km, 500) / 500)

        quality_score = 1.0 if QUALITY_RANK.get(quality_grade, 2) >= QUALITY_RANK.get(required_grade, 2) else 0.5

        deadline_score = 1.0 if days_to_deadline >= 0 else 0.0

        freshness_component = freshness_score / 100

        score = (
            price_score * 0.35
            + distance_score * 0.25
            + quality_score * 0.15
            + deadline_score * 0.10
            + freshness_component * 0.15
        )
        return round(min(1.0, max(0.0, score)), 3)

    def calculate_best_trade(
        self,
        sale_price_per_kg: float,
        transport_cost_per_kg: float,
        handling_cost_per_kg: float,
        spoilage_cost_per_kg: float,
    ) -> dict:
        net_realization = sale_price_per_kg - transport_cost_per_kg - handling_cost_per_kg - spoilage_cost_per_kg
        landed_cost = sale_price_per_kg + transport_cost_per_kg + handling_cost_per_kg
        return {
            "net_realization_per_kg": round(net_realization, 2),
            "landed_cost_per_kg": round(landed_cost, 2),
        }


class LightGBMPriceTradeService(MockPriceTradeService):
    """Same match-score / best-trade math as MockPriceTradeService, but
    predict_price() replaces the static mandi-average baseline with a
    genuinely trained next-day price forecast (price_forecast_model.py) when
    a db session is available. Falls back to the mandi-snapshot baseline
    otherwise (idea.txt section 37 — never crash just because the model
    input isn't available).
    """

    def predict_price(
        self,
        crop: str,
        quality_grade: str,
        farmer_expected_price: float | None = None,
        db: Session | None = None,
    ) -> PricePrediction:
        band = get_price_band(crop)
        current_avg = band.avg

        if db is None:
            return super().predict_price(crop, quality_grade, farmer_expected_price, db)

        from app.services.price_forecast_model import predict_next_day_price

        forecast = predict_next_day_price(db, crop)
        predicted = forecast["predicted_price_per_kg"]
        crop_recognized = forecast["crop_recognized"]

        # Blend the forecast with today's price (70/30, ported from the model
        # author's own post-processing) so a single noisy day can't swing the
        # recommendation too hard, then layer the platform's quality
        # multiplier and farmer-expectation nudge on top exactly as before.
        baseline = (0.7 * predicted) + (0.3 * current_avg)

        quality_multiplier = {"Grade A": 1.05, "Grade B": 1.0, "Grade C": 0.9}.get(quality_grade, 1.0)
        recommended = round(baseline * quality_multiplier, 2)

        if farmer_expected_price is not None:
            recommended = round((recommended * 0.6) + (farmer_expected_price * 0.4), 2)

        range_low = round(recommended * 0.97, 2)
        range_high = round(recommended * 1.03, 2)

        divergence_pct = abs(predicted - current_avg) / current_avg * 100 if current_avg else 0.0
        if not crop_recognized:
            confidence = 0.5
        elif divergence_pct <= 5:
            confidence = 0.85
        elif divergence_pct <= 10:
            confidence = 0.7
        else:
            confidence = 0.55

        source = (
            f"lightgbm-price-v1 next-day forecast blended with {band.source}"
            if crop_recognized
            else f"lightgbm-price-v1 blended with {band.source} (crop not in the price model's training "
            "data — low-confidence, no crop-specific signal)"
        )

        return PricePrediction(
            recommended_price=recommended,
            range_low=range_low,
            range_high=range_high,
            confidence=confidence,
            baseline_source=source,
        )


def estimate_transport_cost_per_kg(distance_km: float, quantity_kg: float, cost_per_km: float = 20.0) -> float:
    if quantity_kg <= 0:
        return 0.0
    total_cost = distance_km * cost_per_km
    return round(total_cost / quantity_kg, 2)


def estimate_handling_cost_per_kg() -> float:
    # Flat rule-of-thumb handling cost for the MVP (loading/unloading, sorting).
    return 0.5


price_trade_service: PriceTradeService = LightGBMPriceTradeService()
