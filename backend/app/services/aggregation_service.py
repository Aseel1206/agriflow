"""Dynamic farmer aggregation — idea.txt section 11 (+ 11a for FPOs).

When one buyer requirement is larger than any single farmer's listing, this
greedily combines multiple farmers' listings into one Virtual Supply Lot so
the buyer sees a single procurement plan. FPO membership needs no special
handling here — an FPO's farmers are just farmer_profiles rows that already
participate in this same aggregation.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import BuyerRequirement, ListingStatus, ProduceListing, VirtualSupplyLot, VirtualSupplyLotItem
from app.services.geo import haversine_km
from app.services.price_trade_service import QUALITY_RANK


def find_candidate_listings(db: Session, requirement: BuyerRequirement, max_distance_km: float = 400.0) -> list[ProduceListing]:
    stmt = select(ProduceListing).where(
        ProduceListing.crop == requirement.crop,
        ProduceListing.status == ListingStatus.active,
        ProduceListing.remaining_quantity_kg > 0,
    )
    candidates = db.execute(stmt).scalars().all()

    required_rank = QUALITY_RANK.get(requirement.quality_grade, 2)
    filtered = []
    for listing in candidates:
        if QUALITY_RANK.get(listing.quality_grade, 2) < required_rank:
            continue
        distance = haversine_km(listing.lat, listing.lng, requirement.delivery_lat, requirement.delivery_lng)
        if distance <= max_distance_km:
            filtered.append((distance, listing))

    filtered.sort(key=lambda pair: pair[0])
    return [listing for _, listing in filtered]


def build_virtual_supply_lot(db: Session, requirement: BuyerRequirement) -> tuple[VirtualSupplyLot | None, list[dict]]:
    """Greedily assemble the cheapest-to-reach listings until the
    requirement's remaining quantity is met. Returns the persisted lot (or
    None if no supply exists) plus a per-farmer contribution breakdown.
    """
    candidates = find_candidate_listings(db, requirement)
    if not candidates:
        return None, []

    remaining_needed = requirement.remaining_quantity_kg
    contributions: list[dict] = []
    lot_items: list[tuple[ProduceListing, float]] = []

    for listing in candidates:
        if remaining_needed <= 0:
            break
        take = min(listing.remaining_quantity_kg, remaining_needed)
        if take <= 0:
            continue
        lot_items.append((listing, take))
        contributions.append(
            {
                "farmer_id": str(listing.farmer_id),
                "listing_id": str(listing.id),
                "quantity_kg": take,
            }
        )
        remaining_needed -= take

    if not lot_items:
        return None, []

    lot = VirtualSupplyLot(
        requirement_id=requirement.id,
        total_quantity_kg=sum(qty for _, qty in lot_items),
        status="proposed",
    )
    db.add(lot)
    db.flush()

    for listing, qty in lot_items:
        db.add(VirtualSupplyLotItem(lot_id=lot.id, listing_id=listing.id, quantity_kg=qty))

    return lot, contributions
