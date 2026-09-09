import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Notification, PushToken, User
from app.schemas import NotificationOut, PushTokenRegister

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.post("/register-token", status_code=status.HTTP_204_NO_CONTENT)
def register_token(payload: PushTokenRegister, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    existing = db.query(PushToken).filter(PushToken.token == payload.token).first()
    if existing:
        existing.user_id = user.id
    else:
        db.add(PushToken(user_id=user.id, token=payload.token))
    db.commit()


@router.get("/mine", response_model=list[NotificationOut])
def my_notifications(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return (
        db.query(Notification)
        .filter(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_read(notification_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    notification = db.get(Notification, notification_id)
    if notification is None or notification.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found")
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


@router.post("/mark-all-read", status_code=status.HTTP_204_NO_CONTENT)
def mark_all_read(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(Notification).filter(Notification.user_id == user.id, Notification.is_read.is_(False)).update(
        {"is_read": True}
    )
    db.commit()
