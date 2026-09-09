import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import BuyerProfile, BuyerRequirement, FarmerProfile, Offer, OfferStatus, ProduceListing, User, UserRole
from app.schemas import OfferCreate, OfferOut
from app.services.best_trade_service import evaluate_pair
from app.services.notifications_service import notify_user

router = APIRouter(prefix="/offers", tags=["offers"])


def _farmer_user_id(db: Session, farmer_id) -> uuid.UUID | None:
    farmer = db.get(FarmerProfile, farmer_id)
    return farmer.user_id if farmer else None


def _buyer_user_id(db: Session, buyer_id) -> uuid.UUID | None:
    buyer = db.get(BuyerProfile, buyer_id)
    return buyer.user_id if buyer else None


@router.post("", response_model=OfferOut, status_code=status.HTTP_201_CREATED)
def create_offer(payload: OfferCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    listing = db.get(ProduceListing, payload.listing_id)
    requirement = db.get(BuyerRequirement, payload.requirement_id)
    if listing is None or requirement is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Listing or requirement not found")
    if payload.quantity_kg > min(listing.remaining_quantity_kg, requirement.remaining_quantity_kg):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Quantity exceeds available supply or remaining requirement")

    evaluation = evaluate_pair(listing, requirement)

    offer = Offer(
        listing_id=listing.id,
        requirement_id=requirement.id,
        farmer_id=listing.farmer_id,
        buyer_id=requirement.buyer_id,
        crop=listing.crop,
        price_per_kg=evaluation["sale_price_per_kg"],
        quantity_kg=payload.quantity_kg,
        transport_cost_per_kg=evaluation["transport_cost_per_kg"],
        handling_cost_per_kg=evaluation["handling_cost_per_kg"],
        spoilage_cost_per_kg=evaluation["spoilage_cost_per_kg"],
        net_realization_per_kg=evaluation["net_realization_per_kg"],
        landed_cost_per_kg=evaluation["landed_cost_per_kg"],
        freshness_score=evaluation["freshness_score"],
        confidence=evaluation["confidence"],
    )
    db.add(offer)
    db.flush()

    buyer_user_id = _buyer_user_id(db, offer.buyer_id)
    if buyer_user_id:
        notify_user(
            db,
            buyer_user_id,
            "New offer received",
            f"A farmer proposed {offer.quantity_kg}kg of {offer.crop} at ₹{offer.price_per_kg}/kg.",
        )

    db.commit()
    db.refresh(offer)
    return offer


@router.get("/mine", response_model=list[OfferOut])
def my_offers(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role == UserRole.farmer:
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == user.id).first()
        if farmer is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Farmer profile not found")
        return db.query(Offer).filter(Offer.farmer_id == farmer.id).all()

    if user.role == UserRole.buyer:
        buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == user.id).first()
        if buyer is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Buyer profile not found")
        return db.query(Offer).filter(Offer.buyer_id == buyer.id).all()

    return db.query(Offer).all()


def _assert_party_to_offer(offer: Offer, user: User, db: Session) -> None:
    if user.role == UserRole.farmer:
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == user.id).first()
        if farmer is None or offer.farmer_id != farmer.id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a party to this offer")
    elif user.role == UserRole.buyer:
        buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == user.id).first()
        if buyer is None or offer.buyer_id != buyer.id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a party to this offer")
    elif user.role != UserRole.admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a party to this offer")


def _notify_counterparty(db: Session, offer: Offer, actor: User, title: str, message: str) -> None:
    """Notify whichever side of the offer did NOT just perform this action."""
    farmer_user_id = _farmer_user_id(db, offer.farmer_id)
    buyer_user_id = _buyer_user_id(db, offer.buyer_id)
    for uid in (farmer_user_id, buyer_user_id):
        if uid and uid != actor.id:
            notify_user(db, uid, title, message)


@router.post("/{offer_id}/accept", response_model=OfferOut)
def accept_offer(offer_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    offer = db.get(Offer, offer_id)
    if offer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offer not found")
    _assert_party_to_offer(offer, user, db)
    offer.status = OfferStatus.accepted
    _notify_counterparty(
        db, offer, user, "Offer accepted",
        f"Your offer for {offer.quantity_kg}kg of {offer.crop} was accepted.",
    )
    db.commit()
    db.refresh(offer)
    return offer


@router.post("/{offer_id}/reject", response_model=OfferOut)
def reject_offer(offer_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    offer = db.get(Offer, offer_id)
    if offer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offer not found")
    _assert_party_to_offer(offer, user, db)
    offer.status = OfferStatus.rejected
    _notify_counterparty(
        db, offer, user, "Offer rejected",
        f"Your offer for {offer.quantity_kg}kg of {offer.crop} was rejected.",
    )
    db.commit()
    db.refresh(offer)
    return offer
