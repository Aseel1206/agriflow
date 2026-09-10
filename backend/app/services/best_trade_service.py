"""BEST TRADE engine — idea.txt sections 7-8, 19, 21.

Orchestrates PriceTradeService + FreshnessService + LogisticsService (via
geo distance for a quick per-pair estimate) to answer: for this farmer's
produce, who is the best buyer to sell to — and for this buyer's
requirement, what is the cheapest way to fulfil it.

This does NOT introduce a new ML model — per idea.txt section 29, all of
this is deterministic calculation over the existing services.
"""

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import BuyerRequirement, ProduceListing, RequirementStatus
from app.services.aggregation_service import choose_allocation_order, find_candidate_listings
from app.services.freshness_service import freshness_service
from app.services.geo import estimate_transport_hours, haversine_km
from app.services.price_trade_service import (
    estimate_handling_cost_per_kg,
    estimate_transport_cost_per_kg,
    price_trade_service,
)
from app.services.trust_service import get_farmer_reliability

DEFAULT_COST_PER_KM = 20.0


def evaluate_pair(listing: ProduceListing, requirement: BuyerRequirement, db: Session | None = None) -> dict:
    distance_km = haversine_km(listing.lat, listing.lng, requirement.delivery_lat, requirement.delivery_lng)
    transport_hours = estimate_transport_hours(distance_km)

    matched_quantity_kg = min(listing.remaining_quantity_kg, requirement.remaining_quantity_kg)
    sale_price = min(listing.expected_price, requirement.max_price)
    transport_cost = estimate_transport_cost_per_kg(distance_km, matched_quantity_kg, DEFAULT_COST_PER_KM)
    handling_cost = estimate_handling_cost_per_kg()

    freshness = freshness_service.evaluate(
        crop=listing.crop,
        harvest_date=listing.harvest_date,
        reference_date=date.today(),
        estimated_transport_hours=transport_hours,
        sale_price_per_kg=sale_price,
    )

    trade = price_trade_service.calculate_best_trade(
        sale_price_per_kg=sale_price,
        transport_cost_per_kg=transport_cost,
        handling_cost_per_kg=handling_cost,
        spoilage_cost_per_kg=freshness["spoilage_cost_per_kg"],
    )

    days_to_deadline = (requirement.required_by - date.today()).days
    match_score = price_trade_service.calculate_match_score(
        max_price=requirement.max_price,
        offered_price=sale_price,
        distance_km=distance_km,
        quality_grade=listing.quality_grade,
        required_grade=requirement.quality_grade,
        days_to_deadline=days_to_deadline,
        freshness_score=freshness["freshness_score"],
    )

    reasons = []
    if trade["net_realization_per_kg"] >= sale_price * 0.9:
        reasons.append("High net realization")
    if distance_km <= 100:
        reasons.append("Short distance")
    reasons.append("Buyer demand confirmed")
    if freshness["freshness_score"] >= 70:
        reasons.append("Low spoilage risk")

    reliability = get_farmer_reliability(db, listing.farmer_id) if db is not None else {
        "completed_count": 0,
        "reliability_pct": None,
    }
    if reliability["reliability_pct"] is not None and reliability["reliability_pct"] >= 80:
        reasons.append("Reliable farmer")

    return {
        "listing_id": str(listing.id),
        "requirement_id": str(requirement.id),
        "farmer_id": str(listing.farmer_id),
        "buyer_id": str(requirement.buyer_id),
        "crop": listing.crop,
        "quantity_kg": matched_quantity_kg,
        "distance_km": round(distance_km, 1),
        "estimated_transport_hours": round(transport_hours, 1),
        "sale_price_per_kg": round(sale_price, 2),
        "transport_cost_per_kg": transport_cost,
        "handling_cost_per_kg": handling_cost,
        "spoilage_cost_per_kg": freshness["spoilage_cost_per_kg"],
        "net_realization_per_kg": trade["net_realization_per_kg"],
        "landed_cost_per_kg": trade["landed_cost_per_kg"],
        "freshness_score": freshness["freshness_score"],
        "match_score": match_score,
        "confidence": round(0.7 + match_score * 0.25, 2),
        "delivery_estimate": "Same day" if transport_hours <= 8 else f"~{round(transport_hours / 24, 1)} day(s)",
        "why": reasons,
        "farmer_reliability_pct": reliability["reliability_pct"],
        "farmer_completed_trades": reliability["completed_count"],
    }


def find_best_trade_for_listing(db: Session, listing: ProduceListing) -> dict | None:
    stmt = select(BuyerRequirement).where(
        BuyerRequirement.crop == listing.crop,
        BuyerRequirement.status == RequirementStatus.active,
        BuyerRequirement.remaining_quantity_kg > 0,
    )
    requirements = db.execute(stmt).scalars().all()
    if not requirements:
        return None

    evaluated = [evaluate_pair(listing, req, db) for req in requirements]
    evaluated.sort(key=lambda r: (r["net_realization_per_kg"], r["match_score"]), reverse=True)
    return evaluated[0]


def rank_best_trades_for_listing(db: Session, listing: ProduceListing, limit: int = 5) -> list[dict]:
    stmt = select(BuyerRequirement).where(
        BuyerRequirement.crop == listing.crop,
        BuyerRequirement.status == RequirementStatus.active,
        BuyerRequirement.remaining_quantity_kg > 0,
    )
    requirements = db.execute(stmt).scalars().all()
    evaluated = [evaluate_pair(listing, req, db) for req in requirements]
    evaluated.sort(key=lambda r: (r["net_realization_per_kg"], r["match_score"]), reverse=True)
    return evaluated[:limit]


def build_procurement_plan(db: Session, requirement: BuyerRequirement) -> dict | None:
    """idea.txt section 21 — BUYER PROCUREMENT PLAN.

    Preview only: does not persist a VirtualSupplyLot (call
    aggregation_service.build_virtual_supply_lot separately to commit one).
    """
    candidates = find_candidate_listings(db, requirement)
    if not candidates:
        return None

    ordered = choose_allocation_order(
        candidates, requirement.remaining_quantity_kg, requirement.delivery_lat, requirement.delivery_lng
    )

    remaining_needed = requirement.remaining_quantity_kg
    contributions = []
    product_cost = 0.0
    max_distance = 0.0

    for listing in ordered:
        if remaining_needed <= 0:
            break
        take = min(listing.remaining_quantity_kg, remaining_needed)
        if take <= 0:
            continue
        price = min(listing.expected_price, requirement.max_price)
        distance_km = haversine_km(listing.lat, listing.lng, requirement.delivery_lat, requirement.delivery_lng)
        max_distance = max(max_distance, distance_km)
        product_cost += price * take
        contributions.append(
            {
                "farmer_id": str(listing.farmer_id),
                "listing_id": str(listing.id),
                "crop": listing.crop,
                "quantity_kg": take,
                "price_per_kg": round(price, 2),
                "distance_km": round(distance_km, 1),
            }
        )
        remaining_needed -= take

    if not contributions:
        return None

    total_quantity = sum(c["quantity_kg"] for c in contributions)
    transport_cost = estimate_transport_cost_per_kg(max_distance, total_quantity, DEFAULT_COST_PER_KM) * total_quantity
    handling_cost = estimate_handling_cost_per_kg() * total_quantity
    landed_cost = product_cost + transport_cost + handling_cost

    return {
        "requirement_id": str(requirement.id),
        "crop": requirement.crop,
        "requested_quantity_kg": requirement.quantity_kg,
        "fulfilled_quantity_kg": total_quantity,
        "fully_fulfilled": remaining_needed <= 0,
        "contributions": contributions,
        "product_cost": round(product_cost, 2),
        "transport_cost": round(transport_cost, 2),
        "handling_cost": round(handling_cost, 2),
        "expected_landed_cost": round(landed_cost, 2),
    }
