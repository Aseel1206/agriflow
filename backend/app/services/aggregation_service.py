"""Dynamic farmer aggregation — idea.txt section 11 (+ 11a for FPOs).

When one buyer requirement is larger than any single farmer's listing, this
combines multiple farmers' listings into one Virtual Supply Lot so the buyer
sees a single procurement plan. FPO membership needs no special handling
here — an FPO's farmers are just farmer_profiles rows that already
participate in this same aggregation.
"""

import itertools

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import BuyerRequirement, ListingStatus, ProduceListing, VirtualSupplyLot, VirtualSupplyLotItem
from app.services.geo import haversine_km
from app.services.price_trade_service import QUALITY_RANK

# Above this many candidates, an exhaustive subset search is skipped in
# favor of the plain nearest-first greedy fill — 2**14 subsets (~16k) is
# still fast for one request, but this keeps worst case bounded.
MAX_EXHAUSTIVE_CANDIDATES = 14


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


def _best_subset_by_farmer_count(
    candidates_with_distance: list[tuple[float, ProduceListing]], required_kg: float
) -> list[tuple[float, ProduceListing]] | None:
    """Exhaustively find the subset of listings whose combined supply meets
    required_kg using the fewest farmers, tie-broken by total distance.

    Because a farmer's contribution can be partial (we only ever take what's
    still needed), any subset whose total supply meets or exceeds
    required_kg can always be allocated with exactly zero excess — so
    "minimize excess" (as a naive combinatorial search might use) is
    vacuous here; farmer count and distance are the only real
    differentiators between qualifying subsets.
    """
    n = len(candidates_with_distance)
    best_subset: list[tuple[float, ProduceListing]] | None = None
    best_total_distance: float | None = None

    for r in range(1, n + 1):
        found_at_this_size = False
        for combo in itertools.combinations(candidates_with_distance, r):
            total_supply = sum(listing.remaining_quantity_kg for _, listing in combo)
            if total_supply < required_kg:
                continue
            found_at_this_size = True
            total_distance = sum(distance for distance, _ in combo)
            if best_total_distance is None or total_distance < best_total_distance:
                best_total_distance = total_distance
                best_subset = list(combo)
        if found_at_this_size:
            # Every combo at a larger r uses strictly more farmers, which
            # is already worse on our primary criterion — stop here.
            break

    return best_subset


def choose_allocation_order(
    candidates: list[ProduceListing], required_kg: float, delivery_lat: float, delivery_lng: float
) -> list[ProduceListing]:
    """Reorders candidates so that a simple greedy fill (take
    min(available, remaining) in this order) uses the fewest farmers
    possible, tie-broken by distance. For small candidate pools this is
    provably optimal via exhaustive search; for larger pools (where
    checking every combination would be too slow) it falls back to the
    existing nearest-first order unchanged.
    """
    if len(candidates) > MAX_EXHAUSTIVE_CANDIDATES:
        return candidates

    with_distance = [(haversine_km(l.lat, l.lng, delivery_lat, delivery_lng), l) for l in candidates]
    best_subset = _best_subset_by_farmer_count(with_distance, required_kg)
    if best_subset is None:
        return candidates

    chosen = [listing for _, listing in sorted(best_subset, key=lambda pair: pair[0])]
    leftover = [l for l in candidates if l not in chosen]
    return chosen + leftover


def build_virtual_supply_lot(db: Session, requirement: BuyerRequirement) -> tuple[VirtualSupplyLot | None, list[dict]]:
    """Assemble the fewest-farmer set of listings that meets the
    requirement's remaining quantity (see choose_allocation_order). Returns
    the persisted lot (or None if no supply exists) plus a per-farmer
    contribution breakdown.
    """
    candidates = find_candidate_listings(db, requirement)
    if not candidates:
        return None, []

    ordered = choose_allocation_order(
        candidates, requirement.remaining_quantity_kg, requirement.delivery_lat, requirement.delivery_lng
    )

    remaining_needed = requirement.remaining_quantity_kg
    contributions: list[dict] = []
    lot_items: list[tuple[ProduceListing, float]] = []

    for listing in ordered:
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
