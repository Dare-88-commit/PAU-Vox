from datetime import datetime

from pydantic import BaseModel

from app.models.enums import NotificationType


class NotificationOut(BaseModel):
    id: str
    user_id: str
    feedback_id: str | None
    title: str
    message: str
    type: NotificationType
    read: bool
    created_at: datetime

    model_config = {"from_attributes": True}
