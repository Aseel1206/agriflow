import uuid
from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field

from app.models import ListingStatus, OfferStatus, RequirementStatus, TransactionStatus, UserRole, VehicleStatus


# ---------- Auth ----------

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str | None = None
    role: UserRole

    village: str | None = None
    district: str | None = None
    state: str = "Karnataka"
    lat: float
    lng: float

    # buyer-specific
    business_name: str | None = None
    buyer_type: str | None = None

    # logistics-specific
    company_name: str | None = None

    # farmer-specific
    fpo_id: uuid.UUID | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    user_id: uuid.UUID


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: UserRole

    class Config:
        from_attributes = True


# ---------- FPO ----------

class FPOCreate(BaseModel):
    name: str
    registration_number: str | None = None
    village: str
    district: str
    state: str = "Karnataka"
    lat: float
    lng: float


class FPOOut(BaseModel):
    id: uuid.UUID
    name: str
    village: str
    district: str
    member_count: int = 0

    class Config:
        from_attributes = True


# ---------- Produce ----------

class ProduceCreate(BaseModel):
    crop: str
    variety: str | None = None
    quantity_kg: float = Field(gt=0)
    unit: str = "kg"
    location: str
    lat: float
    lng: float
    harvest_date: date
    shelf_life_days: int | None = None
    quality_grade: str = "Grade A"
    expected_price: float = Field(gt=0)
    available_from: date
    available_until: date


class ProduceOut(BaseModel):
    id: uuid.UUID
    farmer_id: uuid.UUID
    crop: str
    variety: str | None
    quantity_kg: float
    remaining_quantity_kg: float
    location: str
    harvest_date: date
    shelf_life_days: int
    quality_grade: str
    expected_price: float
    ai_recommended_price: float | None
    available_from: date
    available_until: date
    status: ListingStatus
    created_at: datetime

    class Config:
        from_attributes = True


class PriceRecommendationOut(BaseModel):
    expected_price: float
    ai_recommended_price: float
    recommended_range_low: float
    recommended_range_high: float
    confidence: float


# ---------- Buyer requirements ----------

class RequirementCreate(BaseModel):
    crop: str
    quantity_kg: float = Field(gt=0)
    max_price: float = Field(gt=0)
    quality_grade: str = "Grade A"
    required_by: date
    delivery_location: str
    delivery_lat: float
    delivery_lng: float


class RequirementOut(BaseModel):
    id: uuid.UUID
    buyer_id: uuid.UUID
    crop: str
    quantity_kg: float
    remaining_quantity_kg: float
    max_price: float
    quality_grade: str
    required_by: date
    delivery_location: str
    status: RequirementStatus
    created_at: datetime

    class Config:
        from_attributes = True


class ProcurementPlanOut(BaseModel):
    requirement_id: uuid.UUID
    crop: str
    requested_quantity_kg: float
    fulfilled_quantity_kg: float
    fully_fulfilled: bool
    contributions: list[dict]
    product_cost: float
    transport_cost: float
    handling_cost: float
    expected_landed_cost: float


# ---------- Best trade / matching ----------

class BestTradeOut(BaseModel):
    listing_id: uuid.UUID
    requirement_id: uuid.UUID
    farmer_id: uuid.UUID
    buyer_id: uuid.UUID
    crop: str
    quantity_kg: float
    distance_km: float
    sale_price_per_kg: float
    transport_cost_per_kg: float
    handling_cost_per_kg: float
    spoilage_cost_per_kg: float
    net_realization_per_kg: float
    landed_cost_per_kg: float
    freshness_score: float
    match_score: float
    confidence: float
    delivery_estimate: str
    why: list[str]
    farmer_reliability_pct: float | None = None
    farmer_completed_trades: int = 0


# ---------- Offers / transactions ----------

class OfferCreate(BaseModel):
    listing_id: uuid.UUID
    requirement_id: uuid.UUID
    quantity_kg: float = Field(gt=0)


class OfferOut(BaseModel):
    id: uuid.UUID
    listing_id: uuid.UUID | None
    requirement_id: uuid.UUID | None
    farmer_id: uuid.UUID
    buyer_id: uuid.UUID
    crop: str
    price_per_kg: float
    quantity_kg: float
    net_realization_per_kg: float
    landed_cost_per_kg: float
    freshness_score: float
    confidence: float
    status: OfferStatus
    created_at: datetime

    class Config:
        from_attributes = True


class TransactionOut(BaseModel):
    id: uuid.UUID
    offer_id: uuid.UUID
    farmer_id: uuid.UUID
    buyer_id: uuid.UUID
    logistics_id: uuid.UUID | None
    crop: str
    quantity_kg: float
    sale_price_per_kg: float
    net_realization_per_kg: float
    landed_cost_per_kg: float
    status: TransactionStatus
    created_at: datetime

    class Config:
        from_attributes = True


class TransactionStatusUpdate(BaseModel):
    status: TransactionStatus
    logistics_id: uuid.UUID | None = None


# ---------- Vehicles / logistics ----------

class VehicleCreate(BaseModel):
    vehicle_type: str
    capacity_kg: float = Field(gt=0)
    current_location: str
    lat: float
    lng: float
    available_from: datetime
    cost_per_km: float = Field(gt=0)


class VehicleLocationUpdate(BaseModel):
    location: str
    lat: float
    lng: float


class VehicleOut(BaseModel):
    id: uuid.UUID
    logistics_id: uuid.UUID
    vehicle_type: str
    capacity_kg: float
    current_location: str
    lat: float
    lng: float
    cost_per_km: float
    status: VehicleStatus

    class Config:
        from_attributes = True


class RouteOptimizeRequest(BaseModel):
    vehicle_id: uuid.UUID
    transaction_ids: list[uuid.UUID]


class RouteStopOut(BaseModel):
    label: str
    lat: float
    lng: float
    quantity_kg: float


class RouteOut(BaseModel):
    id: uuid.UUID | None = None
    stops: list[RouteStopOut]
    distance_km: float
    duration_min: float
    transport_cost: float
    vehicle_utilization_pct: float
    estimated_savings_pct: float | None
    baseline_cost: float | None
    notes: list[str]


# ---------- Dashboards / market ----------

class SupplyDemandRow(BaseModel):
    crop: str
    supply_kg: float
    demand_kg: float
    gap_kg: float
    status: str
    demand_trend_pct: float | None = None


class MandiPriceOut(BaseModel):
    crop: str
    market: str
    state: str
    district: str
    price_per_kg: float
    date: date
    source: str

    class Config:
        from_attributes = True


class MapPoint(BaseModel):
    id: uuid.UUID
    type: str
    label: str
    lat: float
    lng: float


# ---------- AI contract endpoints (idea.txt section 28) ----------

class AIPricePredictRequest(BaseModel):
    crop: str
    quality_grade: str = "Grade A"
    farmer_expected_price: float | None = None


class AITradeScoreRequest(BaseModel):
    max_price: float
    offered_price: float
    distance_km: float
    quality_grade: str
    required_grade: str
    days_to_deadline: float
    freshness_score: float


class AIFreshnessRequest(BaseModel):
    crop: str
    harvest_date: date
    estimated_transport_hours: float
    sale_price_per_kg: float


class AIDemandPredictRequest(BaseModel):
    crop: str
    state: str = "Karnataka"
    target_date: date | None = None


class DemandForecastOut(BaseModel):
    crop: str
    state: str
    date: date
    predicted_arrivals_tonnes: float
    is_festival: bool
    nearest_festival: str | None
    days_to_nearest_festival: int
    crop_recognized: bool
    note: str


class AITradeBestRequest(BaseModel):
    sale_price_per_kg: float
    transport_cost_per_kg: float
    handling_cost_per_kg: float
    spoilage_cost_per_kg: float


class AILogisticsStop(BaseModel):
    label: str
    lat: float
    lng: float
    quantity_kg: float = 0.0


class AILogisticsOptimizeRequest(BaseModel):
    pickup_stops: list[AILogisticsStop]
    vehicle_capacity_kg: float
    buyer_location: AILogisticsStop
    cost_per_km: float = 20.0


# ---------- Notifications ----------

class PushTokenRegister(BaseModel):
    token: str


class NotificationOut(BaseModel):
    id: uuid.UUID
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
