import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_logistics
from app.db.session import get_db
from app.models import LogisticsProfile, Vehicle
from app.schemas import VehicleCreate, VehicleLocationUpdate, VehicleOut

router = APIRouter(prefix="/vehicles", tags=["vehicles"])


@router.post("", response_model=VehicleOut, status_code=status.HTTP_201_CREATED)
def register_vehicle(
    payload: VehicleCreate,
    logistics: LogisticsProfile = Depends(get_current_logistics),
    db: Session = Depends(get_db),
):
    vehicle = Vehicle(logistics_id=logistics.id, **payload.model_dump())
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.get("", response_model=list[VehicleOut])
def list_vehicles(db: Session = Depends(get_db)):
    return db.query(Vehicle).all()


@router.get("/mine", response_model=list[VehicleOut])
def my_vehicles(logistics: LogisticsProfile = Depends(get_current_logistics), db: Session = Depends(get_db)):
    return db.query(Vehicle).filter(Vehicle.logistics_id == logistics.id).all()


@router.patch("/{vehicle_id}/location", response_model=VehicleOut)
def update_vehicle_location(
    vehicle_id: uuid.UUID,
    payload: VehicleLocationUpdate,
    logistics: LogisticsProfile = Depends(get_current_logistics),
    db: Session = Depends(get_db),
):
    """Manual correction, for whenever the truck ends up somewhere other
    than where a route/delivery would have placed it — e.g. it returns to a
    different depot/godown than the one it was registered at. There's no
    live GPS feed in this MVP, so the owner is the source of truth.
    """
    vehicle = db.get(Vehicle, vehicle_id)
    if vehicle is None or vehicle.logistics_id != logistics.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vehicle not found")

    vehicle.current_location = payload.location
    vehicle.lat = payload.lat
    vehicle.lng = payload.lng
    db.commit()
    db.refresh(vehicle)
    return vehicle
