from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import FeedbackPriority, FeedbackStatus, FeedbackType


class Feedback(Base):
    __tablename__ = "feedback"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    type: Mapped[FeedbackType] = mapped_column(Enum(FeedbackType), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(120), nullable=False)
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[FeedbackStatus] = mapped_column(
        Enum(FeedbackStatus), default=FeedbackStatus.pending, nullable=False, index=True
    )
    priority: Mapped[FeedbackPriority] = mapped_column(
        Enum(FeedbackPriority), default=FeedbackPriority.medium, nullable=False, index=True
    )
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    similarity_group: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    department: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    resolution_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    assigned_to_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    assigned_by_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    assigned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    overdue_alert_sent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    student = relationship("User", back_populates="submitted_feedback", foreign_keys=[student_id])
    assignee = relationship("User", back_populates="assigned_feedback", foreign_keys=[assigned_to_id])
    notes = relationship("InternalNote", back_populates="feedback", cascade="all, delete-orphan")
    status_history = relationship("StatusHistory", back_populates="feedback", cascade="all, delete-orphan")
    attachments = relationship("Attachment", cascade="all, delete-orphan")
