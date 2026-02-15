from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import FeedbackPriority, FeedbackStatus, FeedbackType


class InternalNoteOut(BaseModel):
    id: str
    author_id: str
    text: str
    created_at: datetime

    model_config = {"from_attributes": True}


class StatusHistoryOut(BaseModel):
    id: str
    status: FeedbackStatus
    updated_by_id: str
    note: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class FeedbackCreate(BaseModel):
    type: FeedbackType
    category: str = Field(min_length=2, max_length=120)
    subject: str = Field(min_length=4, max_length=200)
    description: str = Field(min_length=10, max_length=5000)
    is_anonymous: bool = False
    department: str | None = Field(default=None, max_length=120)


class FeedbackUpdateByStudent(BaseModel):
    category: str | None = Field(default=None, min_length=2, max_length=120)
    subject: str | None = Field(default=None, min_length=4, max_length=200)
    description: str | None = Field(default=None, min_length=10, max_length=5000)
    is_anonymous: bool | None = None
    department: str | None = Field(default=None, max_length=120)


class FeedbackStatusUpdate(BaseModel):
    status: FeedbackStatus
    note: str | None = Field(default=None, max_length=2000)
    resolution_summary: str | None = Field(default=None, max_length=3000)


class FeedbackAssignRequest(BaseModel):
    assignee_id: str
    note: str | None = Field(default=None, max_length=2000)


class InternalNoteCreate(BaseModel):
    text: str = Field(min_length=3, max_length=2000)


class FeedbackOut(BaseModel):
    id: str
    type: FeedbackType
    category: str
    subject: str
    description: str
    status: FeedbackStatus
    priority: FeedbackPriority
    is_anonymous: bool
    student_id: str
    student_name: str | None
    assigned_to_id: str | None
    department: str | None
    resolution_summary: str | None
    similarity_group: str | None
    created_at: datetime
    updated_at: datetime
    notes: list[InternalNoteOut] = []
    status_history: list[StatusHistoryOut] = []

    model_config = {"from_attributes": True}


class FeedbackListResponse(BaseModel):
    items: list[FeedbackOut]
    total: int
