"""Seed realistic demo data — idea.txt section 26 (+ 11a FPOs, +9 mandi data).

Run with: python -m app.seed
"""

import random
from datetime import date, datetime, timedelta, timezone

from app.core.security import hash_password
from app.data.mandi_prices import MANDI_PRICE_SNAPSHOT
from app.data.shelf_life import CROPS, get_default_shelf_life
from app.db.session import Base, SessionLocal, engine
from app.models import (
    BuyerProfile,
    BuyerRequirement,
    FarmerProfile,
    FPOProfile,
    ListingStatus,
    LogisticsProfile,
    MarketPrice,
    ProduceListing,
    RequirementStatus,
    User,
    UserRole,
    Vehicle,
    VehicleStatus,
)

random.seed(42)

# Rough bounding box around Bengaluru/Ramanagara/Mysore region for demo coords.
LAT_RANGE = (12.6, 13.2)
LNG_RANGE = (77.0, 77.8)

VILLAGES = [
    "Ramanagara", "Channapatna", "Magadi", "Kanakapura", "Devanahalli",
    "Doddaballapura", "Hoskote", "Nelamangala", "Anekal", "Bidadi",
]

QUALITY_GRADES = ["Grade A", "Grade A", "Grade B", "Grade C"]


def rand_coord():
    return round(random.uniform(*LAT_RANGE), 5), round(random.uniform(*LNG_RANGE), 5)


def get_or_create_user(db, email, role, full_name, password="demo1234", is_demo=False):
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        return existing
    user = User(
        email=email,
        password_hash=hash_password(password),
        full_name=full_name,
        role=role,
        is_demo=is_demo,
    )
    db.add(user)
    db.flush()
    return user


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            print("Database already has data — skipping seed. Drop tables first to reseed.")
            return

        # ---- Market prices (real snapshot, idea.txt section 9) ----
        for band in MANDI_PRICE_SNAPSHOT.values():
            db.add(
                MarketPrice(
                    crop=band.crop,
                    market=band.market,
                    price_per_kg=band.avg,
                    date=date.today(),
                    source=band.source,
                )
            )

        # ---- Demo accounts (idea.txt section 36) ----
        demo_farmer_user = get_or_create_user(db, "farmer.demo@agriflow.dev", UserRole.farmer, "Ravi Kumar", is_demo=True)
        demo_buyer_user = get_or_create_user(db, "buyer.demo@agriflow.dev", UserRole.buyer, "Bengaluru Retail Market", is_demo=True)
        demo_logistics_user = get_or_create_user(db, "logistics.demo@agriflow.dev", UserRole.logistics, "Swift Transport Co.", is_demo=True)
        demo_admin_user = get_or_create_user(db, "admin.demo@agriflow.dev", UserRole.admin, "Admin", is_demo=True)

        lat, lng = rand_coord()
        demo_farmer = FarmerProfile(user_id=demo_farmer_user.id, village="Ramanagara", district="Ramanagara", lat=lat, lng=lng)
        db.add(demo_farmer)

        lat, lng = rand_coord()
        demo_buyer = BuyerProfile(
            user_id=demo_buyer_user.id, business_name="Bengaluru Retail Market", buyer_type="retailer",
            location="Bengaluru", lat=lat, lng=lng,
        )
        db.add(demo_buyer)

        lat, lng = rand_coord()
        demo_logistics = LogisticsProfile(user_id=demo_logistics_user.id, company_name="Swift Transport Co.", location="Ramanagara", lat=lat, lng=lng)
        db.add(demo_logistics)
        db.flush()

        db.add(Vehicle(
            logistics_id=demo_logistics.id, vehicle_type="Tata Ace", capacity_kg=1500,
            current_location="Ramanagara", lat=demo_logistics.lat, lng=demo_logistics.lng,
            available_from=datetime.now(timezone.utc), cost_per_km=20.0,
        ))

        # ---- FPOs (idea.txt section 11a) ----
        fpos = []
        for i, name in enumerate(["Ramanagara Farmers Producer Company", "Channapatna Agri FPO", "Kanakapura Growers Collective"]):
            village = VILLAGES[i]
            lat, lng = rand_coord()
            fpo = FPOProfile(name=name, village=village, district=village, lat=lat, lng=lng)
            db.add(fpo)
            fpos.append(fpo)
        db.flush()

        # ---- 50 farmers (idea.txt section 26), ~40% belong to an FPO ----
        farmers = [demo_farmer]
        for i in range(50):
            village = random.choice(VILLAGES)
            lat, lng = rand_coord()
            user = get_or_create_user(db, f"farmer{i}@agriflow.dev", UserRole.farmer, f"Farmer {i} ({village})")
            fpo = random.choice(fpos) if random.random() < 0.4 else None
            farmer = FarmerProfile(user_id=user.id, fpo_id=fpo.id if fpo else None, village=village, district=village, lat=lat, lng=lng)
            db.add(farmer)
            farmers.append(farmer)
        db.flush()

        # ---- 20 buyers ----
        buyers = [demo_buyer]
        buyer_types = ["retailer", "wholesaler", "bulk_buyer"]
        for i in range(20):
            lat, lng = rand_coord()
            user = get_or_create_user(db, f"buyer{i}@agriflow.dev", UserRole.buyer, f"Buyer {i}")
            buyer = BuyerProfile(
                user_id=user.id, business_name=f"Buyer {i} Enterprises", buyer_type=random.choice(buyer_types),
                location="Bengaluru", lat=lat, lng=lng,
            )
            db.add(buyer)
            buyers.append(buyer)
        db.flush()

        # ---- 10 logistics providers + 20 vehicles ----
        logistics_providers = [demo_logistics]
        vehicle_types = ["Tata Ace", "Mahindra Bolero Pickup", "Eicher Pro 1049", "Ashok Leyland Dost"]
        for i in range(10):
            lat, lng = rand_coord()
            user = get_or_create_user(db, f"logistics{i}@agriflow.dev", UserRole.logistics, f"Transport Co {i}")
            lp = LogisticsProfile(user_id=user.id, company_name=f"Transport Co {i}", location=random.choice(VILLAGES), lat=lat, lng=lng)
            db.add(lp)
            logistics_providers.append(lp)
        db.flush()

        for i in range(19):
            provider = random.choice(logistics_providers)
            db.add(Vehicle(
                logistics_id=provider.id, vehicle_type=random.choice(vehicle_types),
                capacity_kg=random.choice([1000, 1500, 2500, 5000]),
                current_location=provider.location, lat=provider.lat, lng=provider.lng,
                available_from=datetime.now(timezone.utc), cost_per_km=round(random.uniform(15, 25), 1),
                status=VehicleStatus.available,
            ))

        # ---- Produce listings, grounded in real mandi price snapshot ----
        for i in range(80):
            farmer = random.choice(farmers)
            crop = random.choice(CROPS)
            band = MANDI_PRICE_SNAPSHOT[crop]
            quantity = round(random.uniform(200, 1000), 0)
            harvest_date = date.today() - timedelta(days=random.randint(0, 3))
            shelf_life = get_default_shelf_life(crop)
            quality = random.choice(QUALITY_GRADES)
            expected_price = round(band.avg * random.uniform(0.95, 1.1), 2)

            db.add(ProduceListing(
                farmer_id=farmer.id, crop=crop, variety=None,
                quantity_kg=quantity, remaining_quantity_kg=quantity, location=farmer.village,
                lat=farmer.lat, lng=farmer.lng, harvest_date=harvest_date, shelf_life_days=shelf_life,
                quality_grade=quality, expected_price=expected_price,
                ai_recommended_price=round(band.avg * random.uniform(0.98, 1.05), 2),
                available_from=date.today(), available_until=date.today() + timedelta(days=shelf_life),
                status=ListingStatus.active,
            ))

        # ---- Buyer requirements ----
        # Spread creation timestamps across the last two weeks (rather than
        # all "now") so /market/supply-demand's week-over-week demand trend
        # has something real to compare against on a fresh seed.
        now = datetime.now(timezone.utc)
        for i in range(30):
            buyer = random.choice(buyers)
            crop = random.choice(CROPS)
            band = MANDI_PRICE_SNAPSHOT[crop]
            quantity = round(random.uniform(500, 2500), 0)
            days_ago = random.randint(0, 13)
            db.add(BuyerRequirement(
                buyer_id=buyer.id, crop=crop, quantity_kg=quantity, remaining_quantity_kg=quantity,
                max_price=round(band.high * random.uniform(1.0, 1.15), 2), quality_grade=random.choice(QUALITY_GRADES),
                required_by=date.today() + timedelta(days=random.randint(1, 5)),
                delivery_location=buyer.location, delivery_lat=buyer.lat, delivery_lng=buyer.lng,
                status=RequirementStatus.active,
                created_at=now - timedelta(days=days_ago, hours=random.randint(0, 23)),
            ))

        db.commit()
        print("Seed complete.")
        print("Demo credentials (password: demo1234):")
        print("  Farmer:    farmer.demo@agriflow.dev")
        print("  Buyer:     buyer.demo@agriflow.dev")
        print("  Logistics: logistics.demo@agriflow.dev")
        print("  Admin:     admin.demo@agriflow.dev")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
