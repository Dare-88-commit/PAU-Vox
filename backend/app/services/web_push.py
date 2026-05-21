from __future__ import annotations

import json
import logging

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.push_subscription import PushSubscription

logger = logging.getLogger(__name__)

try:
    from pywebpush import WebPushException, webpush
except Exception:  # pragma: no cover - optional dependency fallback
    WebPushException = Exception  # type: ignore[assignment]
    webpush = None


def is_push_configured() -> bool:
    return bool(
        webpush
        and settings.push_vapid_public_key
        and settings.push_vapid_private_key
        and settings.push_vapid_claims_email
    )


def send_web_push_to_user(
    db: Session,
    user_id: str,
    title: str,
    message: str,
    url: str = "/",
) -> None:
    if not is_push_configured():
        return

    subscriptions = db.query(PushSubscription).filter(PushSubscription.user_id == user_id).all()
    if not subscriptions:
        return

    payload = json.dumps({"title": title, "body": message, "url": url})
    vapid_claims = {"sub": settings.push_vapid_claims_email}

    for sub in subscriptions:
        subscription_info = {
            "endpoint": sub.endpoint,
            "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
        }
        try:
            webpush(
                subscription_info=subscription_info,
                data=payload,
                vapid_private_key=settings.push_vapid_private_key,
                vapid_claims=vapid_claims,
                ttl=60,
            )
        except WebPushException:
            logger.warning("Removing invalid push subscription for user %s", user_id)
            db.delete(sub)
        except Exception:
            logger.exception("Unexpected push delivery error")

