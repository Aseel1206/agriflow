"""Rule-based freshness/shelf-life service — idea.txt section 5.

Deliberately NOT an ML model for the MVP. Kept behind this interface so a
trained shelf-life model can replace the calculation later without callers
changing (same pattern as PriceTradeService).
"""

from datetime import date

from app.data.shelf_life import get_default_shelf_life


class FreshnessService:
    def remaining_shelf_life_days(
        self,
        crop: str,
        harvest_date: date,
        reference_date: date,
        estimated_transport_hours: float,
    ) -> float:
        default_shelf_life = get_default_shelf_life(crop)
        days_since_harvest = (reference_date - harvest_date).days
        transport_days = estimated_transport_hours / 24
        return default_shelf_life - days_since_harvest - transport_days

    def freshness_score(self, crop: str, remaining_shelf_life_days: float) -> float:
        default_shelf_life = get_default_shelf_life(crop)
        if default_shelf_life <= 0:
            return 0.0
        ratio = remaining_shelf_life_days / default_shelf_life
        score = max(0.0, min(1.0, ratio)) * 100
        return round(score, 1)

    def estimate_spoilage_cost_per_kg(
        self, sale_price_per_kg: float, freshness_score: float
    ) -> float:
        """Deterministic rule: spoilage risk scales inversely with freshness.

        A 100% fresh item has ~0 spoilage cost; a 0% fresh item risks losing
        the full sale value. Capped at a sensible max fraction for the MVP.
        """
        spoilage_fraction = max(0.0, (100 - freshness_score) / 100) * 0.15
        return round(sale_price_per_kg * spoilage_fraction, 2)

    def evaluate(
        self,
        crop: str,
        harvest_date: date,
        reference_date: date,
        estimated_transport_hours: float,
        sale_price_per_kg: float,
    ) -> dict:
        remaining = self.remaining_shelf_life_days(
            crop, harvest_date, reference_date, estimated_transport_hours
        )
        score = self.freshness_score(crop, remaining)
        spoilage_cost = self.estimate_spoilage_cost_per_kg(sale_price_per_kg, score)
        return {
            "remaining_shelf_life_days": round(remaining, 2),
            "freshness_score": score,
            "spoilage_cost_per_kg": spoilage_cost,
        }


freshness_service = FreshnessService()
