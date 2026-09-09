"""In-app notifications + push delivery via Firebase Cloud Messaging.

Every notification is always persisted to the `notifications` table first —
that's the source of truth the frontend's notification dropdown reads from.
The FCM push is a best-effort extra: if the Admin SDK isn't configured yet
(no service account key on disk) or a send fails, we log it and move on —
the in-app notification still exists either way (idea.txt section 37: never
break the core flow because an external service isn't connected).
"""

import logging
import os

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Notification, PushToken

logger = logging.getLogger(__name__)

_firebase_app = None
_firebase_init_attempted = False


def _get_firebase_app():
    global _firebase_app, _firebase_init_attempted
    if _firebase_init_attempted:
        return _firebase_app

    _firebase_init_attempted = True
    path = settings.firebase_service_account_path
    if not os.path.exists(path):
        logger.info("Firebase service account key not found at %s — push notifications disabled (in-app notifications still work).", path)
        return None

    try:
        import firebase_admin
        from firebase_admin import credentials

        cred = credentials.Certificate(path)
        _firebase_app = firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK initialized — push notifications enabled.")
    except Exception:
        logger.exception("Failed to initialize Firebase Admin SDK")
        _firebase_app = None

    return _firebase_app


def _send_push(tokens: list[str], title: str, message: str) -> None:
    app = _get_firebase_app()
    if app is None or not tokens:
        return

    from firebase_admin import messaging

    for token in tokens:
        try:
            messaging.send(
                messaging.Message(
                    notification=messaging.Notification(title=title, body=message),
                    token=token,
                ),
                app=app,
            )
        except Exception:
            logger.exception("Failed to send push notification to a device token")


def notify_user(db: Session, user_id, title: str, message: str) -> Notification:
    """Persist a notification and best-effort push it. Does not commit —
    caller controls the transaction so this can be batched with other writes.
    """
    notification = Notification(user_id=user_id, title=title, message=message)
    db.add(notification)
    db.flush()

    tokens = [t.token for t in db.query(PushToken).filter(PushToken.user_id == user_id).all()]
    _send_push(tokens, title, message)

    return notification
