from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import AccountDeletionStatus


class AccountDeletionRequestCreate(BaseModel):
    reason: str | None = Field(default=None, max_length=2000)


class AccountDeletionRequestOut(BaseModel):
    id: str
    requester_id: str
    requester_email: str
    requester_name: str
    status: AccountDeletionStatus
    reason: str | None
    review_note: str | None
    reviewed_by_id: str | None
    reviewed_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AccountDeletionReviewRequest(BaseModel):
    approve: bool
    review_note: str | None = Field(default=None, max_length=2000)
