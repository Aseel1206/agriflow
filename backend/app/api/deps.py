import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import BuyerProfile, FarmerProfile, LogisticsProfile, User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    user = db.get(User, uuid.UUID(payload["sub"]))
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


def require_role(*roles: UserRole):
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"Requires role in {[r.value for r in roles]}")
        return user

    return checker


def get_current_farmer(user: User = Depends(require_role(UserRole.farmer)), db: Session = Depends(get_db)) -> FarmerProfile:
    profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == user.id).first()
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Farmer profile not found")
    return profile


def get_current_buyer(user: User = Depends(require_role(UserRole.buyer)), db: Session = Depends(get_db)) -> BuyerProfile:
    profile = db.query(BuyerProfile).filter(BuyerProfile.user_id == user.id).first()
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Buyer profile not found")
    return profile


def get_current_logistics(user: User = Depends(require_role(UserRole.logistics)), db: Session = Depends(get_db)) -> LogisticsProfile:
    profile = db.query(LogisticsProfile).filter(LogisticsProfile.user_id == user.id).first()
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Logistics profile not found")
    return profile
