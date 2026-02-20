from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, JSON, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import SurveyType


class Survey(Base):
    __tablename__ = "surveys"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    type: Mapped[SurveyType] = mapped_column(Enum(SurveyType), nullable=False, index=True)
    target_hostel: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    created_by_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    allow_anonymous_responses: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False, index=True)
    opens_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closes_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    questions = relationship("SurveyQuestion", back_populates="survey", cascade="all, delete-orphan")


class SurveyQuestion(Base):
    __tablename__ = "survey_questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    survey_id: Mapped[str] = mapped_column(String(36), ForeignKey("surveys.id"), nullable=False, index=True)
    prompt: Mapped[str] = mapped_column(String(300), nullable=False)
    max_score: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    requires_detail: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    detail_label: Mapped[str | None] = mapped_column(String(160), nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    survey = relationship("Survey", back_populates="questions")


class SurveyResponse(Base):
    __tablename__ = "survey_responses"
    __table_args__ = (UniqueConstraint("survey_id", "student_id", name="uq_survey_student"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    survey_id: Mapped[str] = mapped_column(String(36), ForeignKey("surveys.id"), nullable=False, index=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    answers: Mapped[list[dict]] = mapped_column(JSON, nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
