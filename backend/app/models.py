import enum
import uuid
from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Uuid,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.session import Base

# Cross-dialect types: native UUID/JSONB on Postgres (production, Docker),
# portable CHAR(32)/JSON elsewhere — lets the same models.py run against
# SQLite for a zero-install local dev path (see README) without touching
# the production schema.
GUID = Uuid(as_uuid=True, native_uuid=True)
PortableJSON = JSON().with_variant(JSONB(), "postgresql")


def uuid_pk():
    return mapped_column(GUID, primary_key=True, default=uuid.uuid4)


class UserRole(str, enum.Enum):
    farmer = "farmer"
    buyer = "buyer"
    logistics = "logistics"
    admin = "admin"


class ListingStatus(str, enum.Enum):
    active = "active"
    reserved = "reserved"
    sold = "sold"
    expired = "expired"


class RequirementStatus(str, enum.Enum):
    active = "active"
    fulfilled = "fulfilled"
    expired = "expired"


class OfferStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    expired = "expired"


class TransactionStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    in_transit = "in_transit"
    delivered = "delivered"
    completed = "completed"
    cancelled = "cancelled"


class VehicleStatus(str, enum.Enum):
    available = "available"
    assigned = "assigned"
    in_transit = "in_transit"
    offline = "offline"


class RouteStatus(str, enum.Enum):
    planned = "planned"
    active = "active"
    completed = "completed"


class StopType(str, enum.Enum):
    pickup = "pickup"
    dropoff = "dropoff"


class AIRecommendationType(str, enum.Enum):
    price = "price"
    trade = "trade"
    logistics = "logistics"
    freshness = "freshness"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = uuid_pk()
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role"))
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    farmer_profile: Mapped["FarmerProfile"] = relationship(back_populates="user", uselist=False)
    buyer_profile: Mapped["BuyerProfile"] = relationship(back_populates="user", uselist=False)
    logistics_profile: Mapped["LogisticsProfile"] = relationship(back_populates="user", uselist=False)
    notifications: Mapped[list["Notification"]] = relationship(back_populates="user")


class FPOProfile(Base):
    __tablename__ = "fpo_profiles"

    id: Mapped[uuid.UUID] = uuid_pk()
    name: Mapped[str] = mapped_column(String(255))
    registration_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    village: Mapped[str] = mapped_column(String(255))
    district: Mapped[str] = mapped_column(String(255))
    state: Mapped[str] = mapped_column(String(255), default="Karnataka")
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    members: Mapped[list["FarmerProfile"]] = relationship(back_populates="fpo")


class FarmerProfile(Base):
    __tablename__ = "farmer_profiles"

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), unique=True)
    fpo_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("fpo_profiles.id"), nullable=True)
    village: Mapped[str] = mapped_column(String(255))
    district: Mapped[str] = mapped_column(String(255))
    state: Mapped[str] = mapped_column(String(255), default="Karnataka")
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="farmer_profile")
    fpo: Mapped["FPOProfile | None"] = relationship(back_populates="members")
    listings: Mapped[list["ProduceListing"]] = relationship(back_populates="farmer")


class BuyerProfile(Base):
    __tablename__ = "buyer_profiles"

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), unique=True)
    business_name: Mapped[str] = mapped_column(String(255))
    buyer_type: Mapped[str] = mapped_column(String(50), default="retailer")
    location: Mapped[str] = mapped_column(String(255))
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="buyer_profile")
    requirements: Mapped[list["BuyerRequirement"]] = relationship(back_populates="buyer")


class LogisticsProfile(Base):
    __tablename__ = "logistics_profiles"

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), unique=True)
    company_name: Mapped[str] = mapped_column(String(255))
    location: Mapped[str] = mapped_column(String(255))
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="logistics_profile")
    vehicles: Mapped[list["Vehicle"]] = relationship(back_populates="logistics")


class ProduceListing(Base):
    __tablename__ = "produce_listings"

    id: Mapped[uuid.UUID] = uuid_pk()
    farmer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("farmer_profiles.id"), index=True)
    crop: Mapped[str] = mapped_column(String(100), index=True)
    variety: Mapped[str | None] = mapped_column(String(100), nullable=True)
    quantity_kg: Mapped[float] = mapped_column(Float)
    remaining_quantity_kg: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(20), default="kg")
    location: Mapped[str] = mapped_column(String(255))
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    harvest_date: Mapped[date] = mapped_column(Date)
    shelf_life_days: Mapped[int] = mapped_column(Integer)
    quality_grade: Mapped[str] = mapped_column(String(20), default="Grade A")
    expected_price: Mapped[float] = mapped_column(Float)
    ai_recommended_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    available_from: Mapped[date] = mapped_column(Date)
    available_until: Mapped[date] = mapped_column(Date)
    status: Mapped[ListingStatus] = mapped_column(Enum(ListingStatus, name="listing_status"), default=ListingStatus.active)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    farmer: Mapped["FarmerProfile"] = relationship(back_populates="listings")
    images: Mapped[list["ProduceImage"]] = relationship(back_populates="listing")
    lot_items: Mapped[list["VirtualSupplyLotItem"]] = relationship(back_populates="listing")


class ProduceImage(Base):
    __tablename__ = "produce_images"

    id: Mapped[uuid.UUID] = uuid_pk()
    listing_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("produce_listings.id"))
    url: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    listing: Mapped["ProduceListing"] = relationship(back_populates="images")


class BuyerRequirement(Base):
    __tablename__ = "buyer_requirements"

    id: Mapped[uuid.UUID] = uuid_pk()
    buyer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("buyer_profiles.id"), index=True)
    crop: Mapped[str] = mapped_column(String(100), index=True)
    quantity_kg: Mapped[float] = mapped_column(Float)
    remaining_quantity_kg: Mapped[float] = mapped_column(Float)
    max_price: Mapped[float] = mapped_column(Float)
    quality_grade: Mapped[str] = mapped_column(String(20), default="Grade A")
    required_by: Mapped[date] = mapped_column(Date)
    delivery_location: Mapped[str] = mapped_column(String(255))
    delivery_lat: Mapped[float] = mapped_column(Float)
    delivery_lng: Mapped[float] = mapped_column(Float)
    status: Mapped[RequirementStatus] = mapped_column(Enum(RequirementStatus, name="requirement_status"), default=RequirementStatus.active)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    buyer: Mapped["BuyerProfile"] = relationship(back_populates="requirements")
    virtual_lots: Mapped[list["VirtualSupplyLot"]] = relationship(back_populates="requirement")


class VirtualSupplyLot(Base):
    __tablename__ = "virtual_supply_lots"

    id: Mapped[uuid.UUID] = uuid_pk()
    requirement_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("buyer_requirements.id"), index=True)
    total_quantity_kg: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(20), default="proposed")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    requirement: Mapped["BuyerRequirement"] = relationship(back_populates="virtual_lots")
    items: Mapped[list["VirtualSupplyLotItem"]] = relationship(back_populates="lot")


class VirtualSupplyLotItem(Base):
    __tablename__ = "virtual_supply_lot_items"

    id: Mapped[uuid.UUID] = uuid_pk()
    lot_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("virtual_supply_lots.id"), index=True)
    listing_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("produce_listings.id"), index=True)
    quantity_kg: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    lot: Mapped["VirtualSupplyLot"] = relationship(back_populates="items")
    listing: Mapped["ProduceListing"] = relationship(back_populates="lot_items")


class Offer(Base):
    __tablename__ = "offers"

    id: Mapped[uuid.UUID] = uuid_pk()
    listing_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("produce_listings.id"), nullable=True)
    requirement_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("buyer_requirements.id"), nullable=True)
    lot_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("virtual_supply_lots.id"), nullable=True)
    farmer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("farmer_profiles.id"))
    buyer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("buyer_profiles.id"))
    crop: Mapped[str] = mapped_column(String(100))
    price_per_kg: Mapped[float] = mapped_column(Float)
    quantity_kg: Mapped[float] = mapped_column(Float)
    transport_cost_per_kg: Mapped[float] = mapped_column(Float, default=0)
    handling_cost_per_kg: Mapped[float] = mapped_column(Float, default=0)
    spoilage_cost_per_kg: Mapped[float] = mapped_column(Float, default=0)
    net_realization_per_kg: Mapped[float] = mapped_column(Float)
    landed_cost_per_kg: Mapped[float] = mapped_column(Float)
    freshness_score: Mapped[float] = mapped_column(Float, default=100)
    confidence: Mapped[float] = mapped_column(Float, default=0.8)
    status: Mapped[OfferStatus] = mapped_column(Enum(OfferStatus, name="offer_status"), default=OfferStatus.pending)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    transaction: Mapped["Transaction"] = relationship(back_populates="offer", uselist=False)


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = uuid_pk()
    offer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("offers.id"), unique=True)
    farmer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("farmer_profiles.id"))
    buyer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("buyer_profiles.id"))
    logistics_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("logistics_profiles.id"), nullable=True)
    route_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("routes.id"), nullable=True, index=True)
    crop: Mapped[str] = mapped_column(String(100))
    quantity_kg: Mapped[float] = mapped_column(Float)
    sale_price_per_kg: Mapped[float] = mapped_column(Float)
    transport_cost_per_kg: Mapped[float] = mapped_column(Float, default=0)
    handling_cost_per_kg: Mapped[float] = mapped_column(Float, default=0)
    spoilage_cost_per_kg: Mapped[float] = mapped_column(Float, default=0)
    net_realization_per_kg: Mapped[float] = mapped_column(Float)
    landed_cost_per_kg: Mapped[float] = mapped_column(Float)
    status: Mapped[TransactionStatus] = mapped_column(Enum(TransactionStatus, name="transaction_status"), default=TransactionStatus.pending)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    offer: Mapped["Offer"] = relationship(back_populates="transaction")
    transport_request: Mapped["TransportRequest"] = relationship(back_populates="transaction", uselist=False)


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[uuid.UUID] = uuid_pk()
    logistics_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("logistics_profiles.id"), index=True)
    vehicle_type: Mapped[str] = mapped_column(String(100))
    capacity_kg: Mapped[float] = mapped_column(Float)
    current_location: Mapped[str] = mapped_column(String(255))
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    available_from: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    cost_per_km: Mapped[float] = mapped_column(Float)
    status: Mapped[VehicleStatus] = mapped_column(Enum(VehicleStatus, name="vehicle_status"), default=VehicleStatus.available)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    logistics: Mapped["LogisticsProfile"] = relationship(back_populates="vehicles")
    routes: Mapped[list["Route"]] = relationship(back_populates="vehicle")


class TransportRequest(Base):
    __tablename__ = "transport_requests"

    id: Mapped[uuid.UUID] = uuid_pk()
    transaction_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("transactions.id"), unique=True)
    pickup_location: Mapped[str] = mapped_column(String(255))
    pickup_lat: Mapped[float] = mapped_column(Float)
    pickup_lng: Mapped[float] = mapped_column(Float)
    dropoff_location: Mapped[str] = mapped_column(String(255))
    dropoff_lat: Mapped[float] = mapped_column(Float)
    dropoff_lng: Mapped[float] = mapped_column(Float)
    quantity_kg: Mapped[float] = mapped_column(Float)
    deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20), default="unassigned")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    transaction: Mapped["Transaction"] = relationship(back_populates="transport_request")
    route_stops: Mapped[list["RouteStop"]] = relationship(back_populates="transport_request")


class Route(Base):
    __tablename__ = "routes"

    id: Mapped[uuid.UUID] = uuid_pk()
    vehicle_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("vehicles.id"), index=True)
    total_distance_km: Mapped[float] = mapped_column(Float)
    total_duration_min: Mapped[float] = mapped_column(Float)
    transport_cost: Mapped[float] = mapped_column(Float)
    vehicle_utilization_pct: Mapped[float] = mapped_column(Float)
    estimated_savings_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_backhaul: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[RouteStatus] = mapped_column(Enum(RouteStatus, name="route_status"), default=RouteStatus.planned)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    vehicle: Mapped["Vehicle"] = relationship(back_populates="routes")
    stops: Mapped[list["RouteStop"]] = relationship(back_populates="route", order_by="RouteStop.sequence")


class RouteStop(Base):
    __tablename__ = "route_stops"

    id: Mapped[uuid.UUID] = uuid_pk()
    route_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("routes.id"), index=True)
    transport_request_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("transport_requests.id"), nullable=True)
    sequence: Mapped[int] = mapped_column(Integer)
    stop_type: Mapped[StopType] = mapped_column(Enum(StopType, name="stop_type"))
    location: Mapped[str] = mapped_column(String(255))
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    eta: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    route: Mapped["Route"] = relationship(back_populates="stops")
    transport_request: Mapped["TransportRequest | None"] = relationship(back_populates="route_stops")


class MarketPrice(Base):
    __tablename__ = "market_prices"
    __table_args__ = (UniqueConstraint("crop", "market", "date", name="uq_market_price_crop_market_date"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    crop: Mapped[str] = mapped_column(String(100), index=True)
    market: Mapped[str] = mapped_column(String(255))
    state: Mapped[str] = mapped_column(String(100), default="Karnataka")
    district: Mapped[str] = mapped_column(String(100), default="Bengaluru")
    price_per_kg: Mapped[float] = mapped_column(Float)
    date: Mapped[date] = mapped_column(Date)
    source: Mapped[str] = mapped_column(String(100), default="agmarknet_snapshot")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AIRecommendation(Base):
    __tablename__ = "ai_recommendations"

    id: Mapped[uuid.UUID] = uuid_pk()
    listing_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("produce_listings.id"), nullable=True)
    requirement_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("buyer_requirements.id"), nullable=True)
    type: Mapped[AIRecommendationType] = mapped_column(Enum(AIRecommendationType, name="ai_recommendation_type"))
    input_json: Mapped[dict] = mapped_column(PortableJSON)
    output_json: Mapped[dict] = mapped_column(PortableJSON)
    confidence: Mapped[float] = mapped_column(Float)
    model_version: Mapped[str] = mapped_column(String(50), default="mock-v1")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="notifications")


class PushToken(Base):
    """FCM device tokens for web push. A user may have several (multiple
    browsers/devices); re-registering the same token just refreshes it.
    """

    __tablename__ = "push_tokens"
    __table_args__ = (UniqueConstraint("token", name="uq_push_tokens_token"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    token: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
