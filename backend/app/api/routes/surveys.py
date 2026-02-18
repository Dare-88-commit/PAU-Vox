from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.enums import SurveyType, UserRole
from app.models.survey import Survey, SurveyQuestion, SurveyResponse
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.survey import (
    HostelRatingOut,
    SurveyAggregate,
    SurveyCreate,
    SurveyOut,
    SurveySubmitRequest,
)

router = APIRouter()


def _can_view_survey_results(user: User, survey: Survey) -> bool:
    manager_roles = {UserRole.department_head, UserRole.student_affairs, UserRole.university_management}
    return user.role in manager_roles or survey.created_by_id == user.id


@router.post("/", response_model=SurveyOut, status_code=status.HTTP_201_CREATED)
def create_survey(
    payload: SurveyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SurveyOut:
    if payload.type == SurveyType.hostel and not payload.target_hostel:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="target_hostel is required for hostel survey")

    survey = Survey(
        title=payload.title,
        description=payload.description,
        type=payload.type,
        target_hostel=payload.target_hostel,
        created_by_id=current_user.id,
        allow_anonymous_responses=payload.allow_anonymous_responses,
        opens_at=payload.opens_at,
        closes_at=payload.closes_at,
        is_active=True,
    )
    db.add(survey)
    db.flush()

    for question in payload.questions:
        db.add(
            SurveyQuestion(
                survey_id=survey.id,
                prompt=question.prompt,
                max_score=question.max_score,
                position=question.position,
            )
        )

    db.commit()
    created = db.query(Survey).options(joinedload(Survey.questions)).filter(Survey.id == survey.id).first()
    return SurveyOut.model_validate(created)


@router.get("/", response_model=list[SurveyOut])
def list_surveys(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SurveyOut]:
    now = datetime.now(timezone.utc)
    query = db.query(Survey).options(joinedload(Survey.questions))

    if current_user.role == UserRole.student:
        query = query.filter(
            Survey.is_active.is_(True),
            (Survey.opens_at.is_(None) | (Survey.opens_at <= now)),
            (Survey.closes_at.is_(None) | (Survey.closes_at >= now)),
        )

    surveys = query.order_by(Survey.created_at.desc()).all()
    return [SurveyOut.model_validate(item) for item in surveys]


@router.post("/{survey_id}/submit", response_model=MessageResponse)
def submit_survey(
    survey_id: str,
    payload: SurveySubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can submit survey responses")

    survey = db.query(Survey).options(joinedload(Survey.questions)).filter(Survey.id == survey_id, Survey.is_active.is_(True)).first()
    if not survey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Survey not found")

    now = datetime.now(timezone.utc)
    if survey.opens_at and survey.opens_at > now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Survey is not open yet")
    if survey.closes_at and survey.closes_at < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Survey is closed")

    existing = db.query(SurveyResponse).filter(SurveyResponse.survey_id == survey_id, SurveyResponse.student_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You have already submitted this survey")

    if payload.anonymous and not survey.allow_anonymous_responses:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This survey does not allow anonymous responses")

    question_map = {q.id: q for q in survey.questions}
    answers_out: list[dict] = []
    for answer in payload.answers:
        question = question_map.get(answer.question_id)
        if not question:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid question id")
        if answer.score > question.max_score:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Score exceeds question maximum")
        answers_out.append({"question_id": answer.question_id, "score": answer.score})

    db.add(
        SurveyResponse(
            survey_id=survey_id,
            student_id=current_user.id,
            is_anonymous=payload.anonymous,
            answers=answers_out,
        )
    )
    db.commit()
    return MessageResponse(message="Survey submitted successfully")


@router.get("/{survey_id}/results", response_model=SurveyAggregate)
def survey_results(
    survey_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SurveyAggregate:
    survey = db.query(Survey).options(joinedload(Survey.questions)).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Survey not found")

    if not _can_view_survey_results(current_user, survey):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    responses = db.query(SurveyResponse).filter(SurveyResponse.survey_id == survey_id).all()
    if not responses:
        return SurveyAggregate(response_count=0, average_percent=0.0, star_rating=0.0)

    question_max = {q.id: q.max_score for q in survey.questions}
    max_total = sum(question_max.values())
    if max_total <= 0:
        return SurveyAggregate(response_count=len(responses), average_percent=0.0, star_rating=0.0)

    percent_scores: list[float] = []
    for response in responses:
        score_total = 0
        for item in response.answers:
            qid = item.get("question_id")
            score = item.get("score", 0)
            if qid in question_max:
                score_total += min(score, question_max[qid])
        percent_scores.append((score_total / max_total) * 100)

    average_percent = round(sum(percent_scores) / len(percent_scores), 2)
    star_rating = round((average_percent / 100) * 5, 1)
    return SurveyAggregate(response_count=len(responses), average_percent=average_percent, star_rating=star_rating)


@router.get("/hostels/ratings", response_model=list[HostelRatingOut])
def hostel_ratings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[HostelRatingOut]:
    _ = current_user
    surveys = db.query(Survey).options(joinedload(Survey.questions)).filter(Survey.type == SurveyType.hostel).all()

    ratings: list[HostelRatingOut] = []
    for survey in surveys:
        responses = db.query(SurveyResponse).filter(SurveyResponse.survey_id == survey.id).all()
        if not responses:
            ratings.append(
                HostelRatingOut(
                    hostel=survey.target_hostel or "Unknown",
                    response_count=0,
                    average_percent=0.0,
                    star_rating=0.0,
                )
            )
            continue

        question_max = {q.id: q.max_score for q in survey.questions}
        max_total = sum(question_max.values())
        if max_total <= 0:
            ratings.append(
                HostelRatingOut(
                    hostel=survey.target_hostel or "Unknown",
                    response_count=len(responses),
                    average_percent=0.0,
                    star_rating=0.0,
                )
            )
            continue

        percent_scores: list[float] = []
        for response in responses:
            total = 0
            for item in response.answers:
                qid = item.get("question_id")
                score = item.get("score", 0)
                if qid in question_max:
                    total += min(score, question_max[qid])
            percent_scores.append((total / max_total) * 100)

        average_percent = round(sum(percent_scores) / len(percent_scores), 2)
        star_rating = round((average_percent / 100) * 5, 1)
        ratings.append(
            HostelRatingOut(
                hostel=survey.target_hostel or "Unknown",
                response_count=len(responses),
                average_percent=average_percent,
                star_rating=star_rating,
            )
        )

    return sorted(ratings, key=lambda item: item.star_rating, reverse=True)
