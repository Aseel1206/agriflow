import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_buyer
from app.db.session import get_db
from app.models import BuyerProfile, BuyerRequirement, RequirementStatus
from app.schemas import ProcurementPlanOut, RequirementCreate, RequirementOut
from app.services.best_trade_service import build_procurement_plan

router = APIRouter(prefix="/buyers", tags=["buyers"])


@router.post("/requirements", response_model=RequirementOut, status_code=status.HTTP_201_CREATED)
def create_requirement(
    payload: RequirementCreate,
    buyer: BuyerProfile = Depends(get_current_buyer),
    db: Session = Depends(get_db),
):
    requirement = BuyerRequirement(
        buyer_id=buyer.id,
        crop=payload.crop,
        quantity_kg=payload.quantity_kg,
        remaining_quantity_kg=payload.quantity_kg,
        max_price=payload.max_price,
        quality_grade=payload.quality_grade,
        required_by=payload.required_by,
        delivery_location=payload.delivery_location,
        delivery_lat=payload.delivery_lat,
        delivery_lng=payload.delivery_lng,
    )
    db.add(requirement)
    db.commit()
    db.refresh(requirement)
    return requirement


@router.get("/requirements", response_model=list[RequirementOut])
def list_requirements(crop: str | None = None, db: Session = Depends(get_db)):
    stmt = select(BuyerRequirement).where(BuyerRequirement.status == RequirementStatus.active)
    if crop:
        stmt = stmt.where(BuyerRequirement.crop == crop)
    return db.execute(stmt).scalars().all()


@router.get("/requirements/mine", response_model=list[RequirementOut])
def my_requirements(buyer: BuyerProfile = Depends(get_current_buyer), db: Session = Depends(get_db)):
    return db.query(BuyerRequirement).filter(BuyerRequirement.buyer_id == buyer.id).all()


@router.get("/requirements/{requirement_id}/procurement-plan", response_model=ProcurementPlanOut)
def procurement_plan(requirement_id: uuid.UUID, db: Session = Depends(get_db)):
    requirement = db.get(BuyerRequirement, requirement_id)
    if requirement is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Requirement not found")

    plan = build_procurement_plan(db, requirement)
    if plan is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No matching supply found yet")
    return plan
