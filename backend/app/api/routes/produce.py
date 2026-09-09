import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_farmer
from app.data.shelf_life import get_default_shelf_life
from app.db.session import get_db
from app.models import AIRecommendationType, FarmerProfile, ListingStatus, ProduceListing
from app.schemas import BestTradeOut, PriceRecommendationOut, ProduceCreate, ProduceOut
from app.services.ai_log import log_recommendation
from app.services.best_trade_service import find_best_trade_for_listing, rank_best_trades_for_listing
from app.services.price_trade_service import price_trade_service

router = APIRouter(prefix="/produce", tags=["produce"])


@router.post("", response_model=ProduceOut, status_code=status.HTTP_201_CREATED)
def create_produce(
    payload: ProduceCreate,
    farmer: FarmerProfile = Depends(get_current_farmer),
    db: Session = Depends(get_db),
):
    shelf_life = payload.shelf_life_days or get_default_shelf_life(payload.crop)

    prediction = price_trade_service.predict_price(
        crop=payload.crop,
        quality_grade=payload.quality_grade,
        farmer_expected_price=payload.expected_price,
    )

    listing = ProduceListing(
        farmer_id=farmer.id,
        crop=payload.crop,
        variety=payload.variety,
        quantity_kg=payload.quantity_kg,
        remaining_quantity_kg=payload.quantity_kg,
        unit=payload.unit,
        location=payload.location,
        lat=payload.lat,
        lng=payload.lng,
        harvest_date=payload.harvest_date,
        shelf_life_days=shelf_life,
        quality_grade=payload.quality_grade,
        expected_price=payload.expected_price,
        ai_recommended_price=prediction.recommended_price,
        available_from=payload.available_from,
        available_until=payload.available_until,
    )
    db.add(listing)
    db.flush()

    log_recommendation(
        db,
        type=AIRecommendationType.price,
        input_data={"crop": payload.crop, "quality_grade": payload.quality_grade, "farmer_expected_price": payload.expected_price},
        output_data={"recommended_price": prediction.recommended_price, "range_low": prediction.range_low, "range_high": prediction.range_high},
        confidence=prediction.confidence,
        listing_id=listing.id,
    )

    db.commit()
    db.refresh(listing)
    return listing


@router.get("", response_model=list[ProduceOut])
def list_produce(
    crop: str | None = None,
    status_filter: ListingStatus | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(ProduceListing)
    if crop:
        stmt = stmt.where(ProduceListing.crop == crop)
    if status_filter:
        stmt = stmt.where(ProduceListing.status == status_filter)
    else:
        stmt = stmt.where(ProduceListing.status == ListingStatus.active)
    return db.execute(stmt).scalars().all()


@router.get("/mine", response_model=list[ProduceOut])
def my_produce(farmer: FarmerProfile = Depends(get_current_farmer), db: Session = Depends(get_db)):
    return db.query(ProduceListing).filter(ProduceListing.farmer_id == farmer.id).all()


@router.get("/{listing_id}/price-recommendation", response_model=PriceRecommendationOut)
def price_recommendation(listing_id: uuid.UUID, db: Session = Depends(get_db)):
    listing = db.get(ProduceListing, listing_id)
    if listing is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Listing not found")

    prediction = price_trade_service.predict_price(
        crop=listing.crop,
        quality_grade=listing.quality_grade,
        farmer_expected_price=listing.expected_price,
    )
    return PriceRecommendationOut(
        expected_price=listing.expected_price,
        ai_recommended_price=prediction.recommended_price,
        recommended_range_low=prediction.range_low,
        recommended_range_high=prediction.range_high,
        confidence=prediction.confidence,
    )


@router.get("/{listing_id}/best-trade", response_model=BestTradeOut)
def best_trade(listing_id: uuid.UUID, db: Session = Depends(get_db)):
    listing = db.get(ProduceListing, listing_id)
    if listing is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Listing not found")

    trade = find_best_trade_for_listing(db, listing)
    if trade is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No matching buyer demand found yet")

    log_recommendation(
        db,
        type=AIRecommendationType.trade,
        input_data={"listing_id": str(listing.id)},
        output_data=trade,
        confidence=trade["confidence"],
        listing_id=listing.id,
        requirement_id=uuid.UUID(trade["requirement_id"]),
    )
    db.commit()

    return trade


@router.get("/{listing_id}/best-trades", response_model=list[BestTradeOut])
def best_trades(listing_id: uuid.UUID, limit: int = 5, db: Session = Depends(get_db)):
    listing = db.get(ProduceListing, listing_id)
    if listing is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Listing not found")
    return rank_best_trades_for_listing(db, listing, limit=limit)
