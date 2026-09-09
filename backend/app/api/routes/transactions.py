import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import BuyerProfile, FarmerProfile, Offer, OfferStatus, ProduceListing, Transaction, User, UserRole
from app.schemas import TransactionOut, TransactionStatusUpdate
from app.services.notifications_service import notify_user

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _notify_transaction_parties(db: Session, transaction: Transaction, actor: User, title: str, message: str) -> None:
    farmer = db.get(FarmerProfile, transaction.farmer_id)
    buyer = db.get(BuyerProfile, transaction.buyer_id)
    for uid in (farmer.user_id if farmer else None, buyer.user_id if buyer else None):
        if uid and uid != actor.id:
            notify_user(db, uid, title, message)


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(offer_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """idea.txt section 34: Farmer accepts -> Buyer confirms -> ... A
    transaction is created once an offer has been accepted, and reserves
    the sold quantity against the listing.
    """
    offer = db.get(Offer, offer_id)
    if offer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offer not found")
    if offer.status != OfferStatus.accepted:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Offer must be accepted before creating a transaction")

    listing = db.get(ProduceListing, offer.listing_id) if offer.listing_id else None
    if listing is not None:
        if listing.remaining_quantity_kg < offer.quantity_kg:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Not enough remaining supply on this listing")
        listing.remaining_quantity_kg -= offer.quantity_kg

    transaction = Transaction(
        offer_id=offer.id,
        farmer_id=offer.farmer_id,
        buyer_id=offer.buyer_id,
        crop=listing.crop if listing else "",
        quantity_kg=offer.quantity_kg,
        sale_price_per_kg=offer.price_per_kg,
        transport_cost_per_kg=offer.transport_cost_per_kg,
        handling_cost_per_kg=offer.handling_cost_per_kg,
        spoilage_cost_per_kg=offer.spoilage_cost_per_kg,
        net_realization_per_kg=offer.net_realization_per_kg,
        landed_cost_per_kg=offer.landed_cost_per_kg,
    )
    db.add(transaction)
    db.flush()
    _notify_transaction_parties(
        db, transaction, user, "Transaction created",
        f"A transaction for {transaction.quantity_kg}kg of {transaction.crop} has been created.",
    )
    db.commit()
    db.refresh(transaction)
    return transaction


@router.get("", response_model=list[TransactionOut])
def list_transactions(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role == UserRole.farmer:
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == user.id).first()
        if farmer is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Farmer profile not found")
        return db.query(Transaction).filter(Transaction.farmer_id == farmer.id).all()

    if user.role == UserRole.buyer:
        buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == user.id).first()
        if buyer is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Buyer profile not found")
        return db.query(Transaction).filter(Transaction.buyer_id == buyer.id).all()

    return db.query(Transaction).all()


@router.patch("/{transaction_id}/status", response_model=TransactionOut)
def update_status(
    transaction_id: uuid.UUID,
    payload: TransactionStatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    transaction = db.get(Transaction, transaction_id)
    if transaction is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found")

    transaction.status = payload.status
    if payload.logistics_id is not None:
        transaction.logistics_id = payload.logistics_id

    _notify_transaction_parties(
        db, transaction, user, "Transaction status updated",
        f"Your {transaction.crop} transaction is now {payload.status.value}.",
    )

    db.commit()
    db.refresh(transaction)
    return transaction
