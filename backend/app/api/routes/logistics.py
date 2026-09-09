import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_logistics, require_role
from app.db.session import get_db
from app.models import (
    UserRole,
    BuyerProfile,
    FarmerProfile,
    LogisticsProfile,
    Route,
    RouteStatus,
    RouteStop,
    StopType,
    Transaction,
    TransactionStatus,
    TransportRequest,
    Vehicle,
    VehicleStatus,
)
from app.schemas import RouteOptimizeRequest, RouteOut, RouteStopOut, VehicleOut
from app.services.logistics_service import logistics_service
from app.services.notifications_service import notify_user

router = APIRouter(prefix="/logistics", tags=["logistics"])


@router.get("/loads")
def available_loads(db: Session = Depends(get_db)):
    """idea.txt section 12/22 — loads awaiting a transporter: confirmed
    transactions with no vehicle assigned yet.
    """
    transactions = (
        db.query(Transaction)
        .filter(Transaction.status == TransactionStatus.confirmed, Transaction.logistics_id.is_(None))
        .all()
    )

    loads = []
    for txn in transactions:
        farmer = db.get(FarmerProfile, txn.farmer_id)
        buyer = db.get(BuyerProfile, txn.buyer_id)
        loads.append(
            {
                "transaction_id": str(txn.id),
                "crop": txn.crop,
                "quantity_kg": txn.quantity_kg,
                "pickup_location": farmer.village if farmer else None,
                "pickup_lat": farmer.lat if farmer else None,
                "pickup_lng": farmer.lng if farmer else None,
                "dropoff_location": buyer.location if buyer else None,
                "dropoff_lat": buyer.lat if buyer else None,
                "dropoff_lng": buyer.lng if buyer else None,
            }
        )
    return loads


@router.post("/optimize", response_model=RouteOut, dependencies=[Depends(require_role(UserRole.logistics))])
def optimize(payload: RouteOptimizeRequest, db: Session = Depends(get_db)):
    """idea.txt sections 13-15 — combine multiple farmer pickups going to
    the same buyer into one shared route using OR-Tools.
    """
    vehicle = db.get(Vehicle, payload.vehicle_id)
    if vehicle is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vehicle not found")

    transactions = db.query(Transaction).filter(Transaction.id.in_(payload.transaction_ids)).all()
    if not transactions:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No matching transactions found")

    buyer_ids = {t.buyer_id for t in transactions}
    if len(buyer_ids) > 1:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Shared route optimization currently supports one buyer per route")

    buyer = db.get(BuyerProfile, transactions[0].buyer_id)
    pickups = []
    quantities = []
    for txn in transactions:
        farmer = db.get(FarmerProfile, txn.farmer_id)
        pickups.append((farmer.village, farmer.lat, farmer.lng))
        quantities.append(txn.quantity_kg)

    result = logistics_service.optimize_route(
        pickup_locations=pickups,
        pickup_quantities=quantities,
        vehicle_capacity=vehicle.capacity_kg,
        buyer_location=(buyer.location, buyer.lat, buyer.lng),
        cost_per_km=vehicle.cost_per_km,
    )

    route = Route(
        vehicle_id=vehicle.id,
        total_distance_km=result.distance_km,
        total_duration_min=result.duration_min,
        transport_cost=result.transport_cost,
        vehicle_utilization_pct=result.vehicle_utilization_pct,
        estimated_savings_pct=result.estimated_savings_pct,
    )
    db.add(route)
    db.flush()

    for i, stop in enumerate(result.stops):
        stop_type = StopType.dropoff if i == len(result.stops) - 1 else StopType.pickup
        db.add(RouteStop(route_id=route.id, sequence=i, stop_type=stop_type, location=stop.label, lat=stop.lat, lng=stop.lng))

    for txn in transactions:
        txn.logistics_id = vehicle.logistics_id
        txn.route_id = route.id
        txn.status = TransactionStatus.in_transit
        farmer = db.get(FarmerProfile, txn.farmer_id)
        db.add(
            TransportRequest(
                transaction_id=txn.id,
                pickup_location=farmer.village if farmer else "",
                pickup_lat=farmer.lat if farmer else 0,
                pickup_lng=farmer.lng if farmer else 0,
                dropoff_location=buyer.location,
                dropoff_lat=buyer.lat,
                dropoff_lng=buyer.lng,
                quantity_kg=txn.quantity_kg,
                deadline=txn.created_at,
                status="assigned",
            )
        )
        if farmer:
            notify_user(
                db, farmer.user_id, "Pickup scheduled",
                f"A vehicle has been assigned to pick up your {txn.crop} ({txn.quantity_kg}kg).",
            )

    vehicle.status = VehicleStatus.assigned
    db.commit()

    return RouteOut(
        id=route.id,
        stops=[RouteStopOut(label=s.label, lat=s.lat, lng=s.lng, quantity_kg=s.quantity_kg) for s in result.stops],
        distance_km=result.distance_km,
        duration_min=result.duration_min,
        transport_cost=result.transport_cost,
        vehicle_utilization_pct=result.vehicle_utilization_pct,
        estimated_savings_pct=result.estimated_savings_pct,
        baseline_cost=result.baseline_cost,
        notes=result.notes,
    )


@router.get("/routes/mine", dependencies=[Depends(require_role(UserRole.logistics))])
def my_routes(logistics: LogisticsProfile = Depends(get_current_logistics), db: Session = Depends(get_db)):
    routes = (
        db.query(Route)
        .join(Vehicle, Route.vehicle_id == Vehicle.id)
        .filter(Vehicle.logistics_id == logistics.id)
        .order_by(Route.created_at.desc())
        .all()
    )
    return [
        {
            "id": str(r.id),
            "vehicle_id": str(r.vehicle_id),
            "status": r.status.value,
            "distance_km": r.total_distance_km,
            "transport_cost": r.transport_cost,
            "estimated_savings_pct": r.estimated_savings_pct,
            "stops": [{"label": s.location, "lat": s.lat, "lng": s.lng, "stop_type": s.stop_type.value} for s in r.stops],
        }
        for r in routes
    ]


@router.post("/routes/{route_id}/complete", response_model=VehicleOut)
def complete_route(route_id: uuid.UUID, logistics: LogisticsProfile = Depends(get_current_logistics), db: Session = Depends(get_db)):
    """Marks the route delivered: every transaction it carried moves to
    'delivered', the vehicle becomes available again, and — this is the
    actual location update — the vehicle's location becomes wherever the
    route's last stop (the buyer's dropoff) physically was. That's the
    truck's real position now, not a snap back to wherever it was registered.

    If the truck then heads to a different depot/godown than where it
    started, that's what PATCH /vehicles/{id}/location is for — the owner
    corrects it, since there's no live GPS feed in this MVP to know that on
    its own.
    """
    route = db.get(Route, route_id)
    if route is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Route not found")

    vehicle = db.get(Vehicle, route.vehicle_id)
    if vehicle is None or vehicle.logistics_id != logistics.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Route not found")

    if route.status == RouteStatus.completed:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Route already completed")

    transactions = db.query(Transaction).filter(Transaction.route_id == route.id).all()
    for txn in transactions:
        txn.status = TransactionStatus.delivered
        farmer = db.get(FarmerProfile, txn.farmer_id)
        buyer = db.get(BuyerProfile, txn.buyer_id)
        if farmer:
            notify_user(db, farmer.user_id, "Delivered", f"Your {txn.crop} ({txn.quantity_kg}kg) has been delivered.")
        if buyer:
            notify_user(db, buyer.user_id, "Order delivered", f"Your {txn.crop} order ({txn.quantity_kg}kg) has arrived.")

    dropoff = next((s for s in route.stops if s.stop_type == StopType.dropoff), None)
    if dropoff:
        vehicle.current_location = dropoff.location
        vehicle.lat = dropoff.lat
        vehicle.lng = dropoff.lng

    vehicle.status = VehicleStatus.available
    route.status = RouteStatus.completed
    db.commit()
    db.refresh(vehicle)
    return vehicle
