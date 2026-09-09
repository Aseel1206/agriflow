"""Price / Trade engine — idea.txt sections 3-4 and 8-9.

Single service interface for the MVP (predict_price, calculate_match_score,
calculate_best_trade). Backed today by MockPriceTradeService, grounded in a
static real mandi-price snapshot. Swap in LightGBMPriceTradeService later
without touching callers (frontend or BestTradeService).
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass

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
    def predict_price(self, crop: str, quality_grade: str, farmer_expected_price: float | None = None) -> PricePrediction: ...

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
        self, crop: str, quality_grade: str, farmer_expected_price: float | None = None
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


def estimate_transport_cost_per_kg(distance_km: float, quantity_kg: float, cost_per_km: float = 20.0) -> float:
    if quantity_kg <= 0:
        return 0.0
    total_cost = distance_km * cost_per_km
    return round(total_cost / quantity_kg, 2)


def estimate_handling_cost_per_kg() -> float:
    # Flat rule-of-thumb handling cost for the MVP (loading/unloading, sorting).
    return 0.5


price_trade_service: PriceTradeService = MockPriceTradeService()
