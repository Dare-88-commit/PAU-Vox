from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.notification import Notification
from app.models.push_subscription import PushSubscription
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.notification import (
    NotificationOut,
    NotificationPreferencesOut,
    NotificationPreferencesUpdate,
    PushSubscriptionIn,
)

router = APIRouter()


@router.get("/", response_model=list[NotificationOut])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[NotificationOut]:
    rows = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    return [NotificationOut.model_validate(row) for row in rows]


@router.patch("/{notification_id}/read", response_model=MessageResponse)
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    row = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    row.read = True
    db.commit()
    return MessageResponse(message="Notification marked as read")


@router.patch("/read-all", response_model=MessageResponse)
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    rows = db.query(Notification).filter(Notification.user_id == current_user.id, Notification.read.is_(False)).all()
    for row in rows:
        row.read = True
    db.commit()
    return MessageResponse(message="All notifications marked as read")


@router.get("/preferences", response_model=NotificationPreferencesOut)
def get_notification_preferences(
    current_user: User = Depends(get_current_user),
) -> NotificationPreferencesOut:
    return NotificationPreferencesOut(
        email_notifications_enabled=current_user.email_notifications_enabled,
        push_notifications_enabled=current_user.push_notifications_enabled,
        high_priority_alerts_enabled=current_user.high_priority_alerts_enabled,
        weekly_digest_enabled=current_user.weekly_digest_enabled,
    )


@router.patch("/preferences", response_model=NotificationPreferencesOut)
def update_notification_preferences(
    payload: NotificationPreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationPreferencesOut:
    current_user.email_notifications_enabled = payload.email_notifications_enabled
    current_user.push_notifications_enabled = payload.push_notifications_enabled
    current_user.high_priority_alerts_enabled = payload.high_priority_alerts_enabled
    current_user.weekly_digest_enabled = payload.weekly_digest_enabled
    db.commit()
    db.refresh(current_user)
    return NotificationPreferencesOut(
        email_notifications_enabled=current_user.email_notifications_enabled,
        push_notifications_enabled=current_user.push_notifications_enabled,
        high_priority_alerts_enabled=current_user.high_priority_alerts_enabled,
        weekly_digest_enabled=current_user.weekly_digest_enabled,
    )


@router.get("/push/vapid-public-key", response_model=dict[str, str])
def get_push_vapid_public_key() -> dict[str, str]:
    if not settings.push_vapid_public_key:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Web push is not configured")
    return {"public_key": settings.push_vapid_public_key}


@router.post("/push-subscriptions", response_model=MessageResponse)
def upsert_push_subscription(
    payload: PushSubscriptionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    row = (
        db.query(PushSubscription)
        .filter(PushSubscription.user_id == current_user.id, PushSubscription.endpoint == payload.endpoint)
        .first()
    )
    if row:
        row.p256dh = payload.p256dh
        row.auth = payload.auth
    else:
        db.add(
            PushSubscription(
                user_id=current_user.id,
                endpoint=payload.endpoint,
                p256dh=payload.p256dh,
                auth=payload.auth,
            )
        )
    db.commit()
    return MessageResponse(message="Push subscription saved")


@router.delete("/push-subscriptions", response_model=MessageResponse)
def delete_push_subscription(
    payload: PushSubscriptionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    row = (
        db.query(PushSubscription)
        .filter(PushSubscription.user_id == current_user.id, PushSubscription.endpoint == payload.endpoint)
        .first()
    )
    if row:
        db.delete(row)
        db.commit()
    return MessageResponse(message="Push subscription removed")
