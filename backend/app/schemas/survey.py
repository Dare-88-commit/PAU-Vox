from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import SurveyType


class SurveyQuestionCreate(BaseModel):
    prompt: str = Field(min_length=3, max_length=300)
    max_score: int = Field(default=10, ge=2, le=10)
    requires_detail: bool = False
    detail_label: str | None = Field(default=None, max_length=160)
    position: int = Field(default=0, ge=0)


class SurveyCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str | None = Field(default=None, max_length=3000)
    type: SurveyType
    target_hostel: str | None = Field(default=None, max_length=120)
    allow_anonymous_responses: bool = False
    opens_at: datetime | None = None
    closes_at: datetime | None = None
    questions: list[SurveyQuestionCreate] = Field(min_length=1)


class SurveyQuestionOut(BaseModel):
    id: str
    prompt: str
    max_score: int
    requires_detail: bool
    detail_label: str | None
    position: int

    model_config = {"from_attributes": True}


class SurveyOut(BaseModel):
    id: str
    title: str
    description: str | None
    type: SurveyType
    target_hostel: str | None
    allow_anonymous_responses: bool
    is_active: bool
    opens_at: datetime | None
    closes_at: datetime | None
    created_at: datetime
    is_creator: bool = False
    questions: list[SurveyQuestionOut]

    model_config = {"from_attributes": True}


class SurveyAnswerInput(BaseModel):
    question_id: str
    score: int = Field(ge=0, le=10)
    detail: str | None = Field(default=None, max_length=1000)


class SurveySubmitRequest(BaseModel):
    answers: list[SurveyAnswerInput] = Field(min_length=1)
    anonymous: bool = False


class SurveyAggregate(BaseModel):
    response_count: int
    average_percent: float
    star_rating: float


class HostelRatingOut(BaseModel):
    hostel: str
    response_count: int
    average_percent: float
    star_rating: float


class SurveyMyResponseOut(BaseModel):
    survey_id: str
    submitted_at: datetime
    can_edit: bool
    can_edit_until: datetime
    answers: list[SurveyAnswerInput]
    anonymous: bool


class SurveyResponseAnswerOut(BaseModel):
    question_id: str
    question_prompt: str
    score: int
    detail: str | None = None


class SurveyResponseDetailOut(BaseModel):
    response_id: str
    submitted_at: datetime
    anonymous: bool
    respondent_name: str | None = None
    answers: list[SurveyResponseAnswerOut]
