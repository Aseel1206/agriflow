from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import BuyerProfile, FarmerProfile, ListingStatus, ProduceListing, RequirementStatus, User, UserRole, BuyerRequirement
from app.services.best_trade_service import build_procurement_plan, rank_best_trades_for_listing

router = APIRouter(prefix="/matching", tags=["matching"])


@router.get("/recommendations")
def get_recommendations(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role == UserRole.farmer:
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == user.id).first()
        if farmer is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Farmer profile not found")
        listings = (
            db.query(ProduceListing)
            .filter(ProduceListing.farmer_id == farmer.id, ProduceListing.status == ListingStatus.active)
            .all()
        )
        return {
            "role": "farmer",
            "recommendations": [
                {"listing_id": str(listing.id), "crop": listing.crop, "best_trades": rank_best_trades_for_listing(db, listing, limit=3)}
                for listing in listings
            ],
        }

    if user.role == UserRole.buyer:
        buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == user.id).first()
        if buyer is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Buyer profile not found")
        requirements = (
            db.query(BuyerRequirement)
            .filter(BuyerRequirement.buyer_id == buyer.id, BuyerRequirement.status == RequirementStatus.active)
            .all()
        )
        return {
            "role": "buyer",
            "recommendations": [
                {"requirement_id": str(req.id), "crop": req.crop, "procurement_plan": build_procurement_plan(db, req)}
                for req in requirements
            ],
        }

    raise HTTPException(status.HTTP_400_BAD_REQUEST, "Recommendations are only available for farmer/buyer roles")
