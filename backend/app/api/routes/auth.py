from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models import BuyerProfile, FarmerProfile, LogisticsProfile, User, UserRole
from app.schemas import LoginRequest, RegisterRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email already registered")

    user = User(
        email=payload.email,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
    )
    db.add(user)
    db.flush()

    if payload.role == UserRole.farmer:
        db.add(
            FarmerProfile(
                user_id=user.id,
                fpo_id=payload.fpo_id,
                village=payload.village or "",
                district=payload.district or "",
                state=payload.state,
                lat=payload.lat,
                lng=payload.lng,
            )
        )
    elif payload.role == UserRole.buyer:
        db.add(
            BuyerProfile(
                user_id=user.id,
                business_name=payload.business_name or payload.full_name,
                buyer_type=payload.buyer_type or "retailer",
                location=payload.village or payload.district or "",
                lat=payload.lat,
                lng=payload.lng,
            )
        )
    elif payload.role == UserRole.logistics:
        db.add(
            LogisticsProfile(
                user_id=user.id,
                company_name=payload.company_name or payload.full_name,
                location=payload.village or payload.district or "",
                lat=payload.lat,
                lng=payload.lng,
            )
        )

    db.commit()

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return TokenResponse(access_token=token, role=user.role, user_id=user.id)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return TokenResponse(access_token=token, role=user.role, user_id=user.id)
