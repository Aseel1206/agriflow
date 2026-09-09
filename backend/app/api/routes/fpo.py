from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import FarmerProfile, FPOProfile
from app.schemas import FPOCreate, FPOOut

router = APIRouter(prefix="/fpo", tags=["fpo"])


@router.post("", response_model=FPOOut, status_code=201)
def create_fpo(payload: FPOCreate, db: Session = Depends(get_db)):
    fpo = FPOProfile(**payload.model_dump())
    db.add(fpo)
    db.commit()
    db.refresh(fpo)
    return FPOOut(id=fpo.id, name=fpo.name, village=fpo.village, district=fpo.district, member_count=0)


@router.get("", response_model=list[FPOOut])
def list_fpos(db: Session = Depends(get_db)):
    stmt = (
        select(FPOProfile, func.count(FarmerProfile.id))
        .outerjoin(FarmerProfile, FarmerProfile.fpo_id == FPOProfile.id)
        .group_by(FPOProfile.id)
    )
    results = db.execute(stmt).all()
    return [
        FPOOut(id=fpo.id, name=fpo.name, village=fpo.village, district=fpo.district, member_count=count)
        for fpo, count in results
    ]


@router.get("/{fpo_id}/members")
def list_fpo_members(fpo_id: str, db: Session = Depends(get_db)):
    members = db.query(FarmerProfile).filter(FarmerProfile.fpo_id == fpo_id).all()
    return [
        {"farmer_id": str(m.id), "village": m.village, "district": m.district}
        for m in members
    ]
