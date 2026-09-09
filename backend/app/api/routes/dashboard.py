from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_buyer, get_current_farmer, get_current_logistics, require_role
from app.db.session import get_db
from app.models import (
    BuyerProfile,
    BuyerRequirement,
    FarmerProfile,
    ListingStatus,
    LogisticsProfile,
    Offer,
    OfferStatus,
    ProduceListing,
    RequirementStatus,
    Route,
    Transaction,
    TransactionStatus,
    UserRole,
    Vehicle,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/farmer")
def farmer_dashboard(farmer: FarmerProfile = Depends(get_current_farmer), db: Session = Depends(get_db)):
    listings = db.query(ProduceListing).filter(ProduceListing.farmer_id == farmer.id).all()
    active_listings = [l for l in listings if l.status == ListingStatus.active]
    offers = db.query(Offer).filter(Offer.farmer_id == farmer.id).all()
    transactions = db.query(Transaction).filter(Transaction.farmer_id == farmer.id).all()

    expected_earnings = sum(t.net_realization_per_kg * t.quantity_kg for t in transactions if t.status != TransactionStatus.cancelled)

    return {
        "my_produce": len(listings),
        "active_listings": len(active_listings),
        "buyer_offers": len([o for o in offers if o.status == OfferStatus.pending]),
        "orders": len(transactions),
        "expected_earnings": round(expected_earnings, 2),
        "listings": [{"id": str(l.id), "crop": l.crop, "quantity_kg": l.remaining_quantity_kg, "ai_recommended_price": l.ai_recommended_price} for l in listings],
    }


@router.get("/buyer")
def buyer_dashboard(buyer: BuyerProfile = Depends(get_current_buyer), db: Session = Depends(get_db)):
    requirements = db.query(BuyerRequirement).filter(BuyerRequirement.buyer_id == buyer.id).all()
    active_requirements = [r for r in requirements if r.status == RequirementStatus.active]
    transactions = db.query(Transaction).filter(Transaction.buyer_id == buyer.id).all()

    expected_landed_cost = sum(t.landed_cost_per_kg * t.quantity_kg for t in transactions if t.status != TransactionStatus.cancelled)

    return {
        "my_requirements": len(requirements),
        "active_requirements": len(active_requirements),
        "orders": len(transactions),
        "expected_landed_cost": round(expected_landed_cost, 2),
        "requirements": [{"id": str(r.id), "crop": r.crop, "quantity_kg": r.remaining_quantity_kg} for r in requirements],
    }


@router.get("/logistics")
def logistics_dashboard(logistics: LogisticsProfile = Depends(get_current_logistics), db: Session = Depends(get_db)):
    vehicles = db.query(Vehicle).filter(Vehicle.logistics_id == logistics.id).all()
    routes = db.query(Route).join(Vehicle).filter(Vehicle.logistics_id == logistics.id).all()
    earnings = sum(r.transport_cost for r in routes)

    return {
        "available_vehicles": len([v for v in vehicles if v.status.value == "available"]),
        "active_routes": len([r for r in routes if r.status.value == "active"]),
        "earnings": round(earnings, 2),
        "vehicles": [{"id": str(v.id), "vehicle_type": v.vehicle_type, "status": v.status.value} for v in vehicles],
    }


@router.get("/admin", dependencies=[Depends(require_role(UserRole.admin))])
def admin_dashboard(db: Session = Depends(get_db)):
    total_farmers = db.query(func.count(FarmerProfile.id)).scalar()
    total_buyers = db.query(func.count(BuyerProfile.id)).scalar()
    total_logistics = db.query(func.count(LogisticsProfile.id)).scalar()
    active_produce = db.query(func.count(ProduceListing.id)).filter(ProduceListing.status == ListingStatus.active).scalar()
    active_demand = db.query(func.count(BuyerRequirement.id)).filter(BuyerRequirement.status == RequirementStatus.active).scalar()
    active_transactions = db.query(func.count(Transaction.id)).filter(Transaction.status.notin_([TransactionStatus.completed, TransactionStatus.cancelled])).scalar()

    transactions = db.query(Transaction).all()
    total_volume = sum(t.quantity_kg for t in transactions)
    total_value = sum(t.sale_price_per_kg * t.quantity_kg for t in transactions)

    routes = db.query(Route).all()
    logistics_savings = [r.estimated_savings_pct for r in routes if r.estimated_savings_pct is not None]
    avg_logistics_savings = round(sum(logistics_savings) / len(logistics_savings), 1) if logistics_savings else 0.0

    # Impact/sustainability tiles (idea.txt section 35 addition) — all
    # derived from data already computed above, no new models required.
    middleman_margin_saved = sum(max(0.0, get_mandi_margin_saved(t)) for t in transactions)

    return {
        "total_farmers": total_farmers,
        "total_buyers": total_buyers,
        "total_logistics_providers": total_logistics,
        "active_produce": active_produce,
        "active_demand": active_demand,
        "active_transactions": active_transactions,
        "total_produce_volume_kg": round(total_volume, 1),
        "total_transaction_value": round(total_value, 2),
        "estimated_logistics_savings_pct": avg_logistics_savings,
        "total_middleman_margin_saved": round(middleman_margin_saved, 2),
    }


def get_mandi_margin_saved(transaction: Transaction) -> float:
    """Rough proxy for margin saved vs. a traditional multi-intermediary
    chain: net realization vs. sale price already nets out transport/
    handling/spoilage, so anything the farmer keeps above a notional 70%
    of sale price (typical mandi-chain farmer share) counts as saved.
    """
    baseline_farmer_share = transaction.sale_price_per_kg * 0.7
    saved_per_kg = transaction.net_realization_per_kg - baseline_farmer_share
    return saved_per_kg * transaction.quantity_kg
