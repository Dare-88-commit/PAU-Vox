from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.core.catalog import is_valid_department, is_valid_hostel, parse_departments_scope
from app.db.session import get_db
from app.models.enums import NotificationType, SurveyType, UserRole
from app.models.notification import Notification
from app.models.survey import Survey, SurveyAudience, SurveyQuestion, SurveyResponse, SurveyViewerAccess
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.survey import (
    HostelRatingOut,
    SurveyAggregate,
    SurveyCreate,
    SurveyReminderRequest,
    SurveyResponseAnswerOut,
    SurveyResponseDetailOut,
    SurveyMyResponseOut,
    SurveyOut,
    SurveySubmitRequest,
)
from app.services.web_push import send_web_push_to_user

router = APIRouter()
EDIT_WINDOW_MINUTES = 60


def _can_view_survey_results(user: User, survey: Survey) -> bool:
    if survey.created_by_id == user.id:
        return True
    for grant in survey.viewer_access:
        if grant.user_id and grant.user_id == user.id:
            return True
        if grant.role and grant.role == user.role:
            return True
    return False


def _can_student_participate(student: User, survey: Survey) -> bool:
    if student.role != UserRole.student:
        return False
    if not survey.audiences:
        return True
    student_departments = set(parse_departments_scope(student.department))
    for audience in survey.audiences:
        if audience.user_id and audience.user_id == student.id:
            return True
        if audience.department and audience.department in student_departments:
            return True
    return False


def _serialize_survey(survey: Survey, current_user: User, db: Session) -> SurveyOut:
    out = SurveyOut.model_validate(survey)
    out.is_creator = survey.created_by_id == current_user.id
    out.response_viewer_roles = [item.role for item in survey.viewer_access if item.role]
    out.response_viewer_emails = []
    out.target_departments = [item.department for item in survey.audiences if item.department]
    out.target_user_emails = []
    if out.is_creator:
        viewer_ids = [item.user_id for item in survey.viewer_access if item.user_id]
        audience_ids = [item.user_id for item in survey.audiences if item.user_id]
        user_ids = list({*viewer_ids, *audience_ids})
        if user_ids:
            # Creator can see exactly who was targeted/shared.
            users = db.query(User).filter(User.id.in_(user_ids)).all()
            user_email_map = {item.id: item.email for item in users}
            out.response_viewer_emails = [user_email_map[item_id] for item_id in viewer_ids if item_id in user_email_map]
            out.target_user_emails = [user_email_map[item_id] for item_id in audience_ids if item_id in user_email_map]
    return out


def _resolve_users_by_emails(db: Session, emails: list[str]) -> list[User]:
    cleaned = list({email.strip().lower() for email in emails if email.strip()})
    if not cleaned:
        return []
    users = db.query(User).filter(User.email.in_(cleaned), User.is_active.is_(True), User.is_deleted.is_(False)).all()
    found = {user.email for user in users}
    missing = [email for email in cleaned if email not in found]
    if missing:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Unknown user email(s): {', '.join(missing)}")
    return users


def _validated_answers(payload: SurveySubmitRequest, survey: Survey) -> list[dict]:
    question_map = {q.id: q for q in survey.questions}
    answers_out: list[dict] = []
    for answer in payload.answers:
        question = question_map.get(answer.question_id)
        if not question:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid question id")
        if answer.score > question.max_score:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Score exceeds question maximum")

        detail = (answer.detail or "").strip() or None
        if question.requires_detail and not detail:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Detail is required for: {question.prompt}")

        answers_out.append({"question_id": answer.question_id, "score": answer.score, "detail": detail})
    return answers_out


@router.post("/", response_model=SurveyOut, status_code=status.HTTP_201_CREATED)
def create_survey(
    payload: SurveyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SurveyOut:
    if payload.type == SurveyType.hostel and not payload.target_hostel:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="target_hostel is required for hostel survey")
    if payload.type == SurveyType.hostel and not is_valid_hostel(payload.target_hostel):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid hostel")

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
                requires_detail=question.requires_detail,
                detail_label=question.detail_label,
                position=question.position,
            )
        )

    for role in set(payload.response_viewer_roles):
        if role == UserRole.student:
            continue
        db.add(SurveyViewerAccess(survey_id=survey.id, role=role))

    for user in _resolve_users_by_emails(db, payload.response_viewer_emails):
        db.add(SurveyViewerAccess(survey_id=survey.id, user_id=user.id))

    for user in _resolve_users_by_emails(db, payload.target_user_emails):
        if user.role != UserRole.student:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Target audience user must be a student: {user.email}",
            )
        db.add(SurveyAudience(survey_id=survey.id, user_id=user.id))

    for department in sorted({department.strip() for department in payload.target_departments if department.strip()}):
        if not is_valid_department(department):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid department in audience: {department}")
        db.add(SurveyAudience(survey_id=survey.id, department=department))

    db.commit()
    created = (
        db.query(Survey)
        .options(joinedload(Survey.questions), joinedload(Survey.viewer_access), joinedload(Survey.audiences))
        .filter(Survey.id == survey.id)
        .first()
    )
    return _serialize_survey(created, current_user, db)


@router.get("/", response_model=list[SurveyOut])
def list_surveys(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SurveyOut]:
    now = datetime.now(timezone.utc)
    query = db.query(Survey).options(
        joinedload(Survey.questions),
        joinedload(Survey.viewer_access),
        joinedload(Survey.audiences),
    )

    if current_user.role == UserRole.student:
        query = query.filter(
            Survey.is_active.is_(True),
            (Survey.opens_at.is_(None) | (Survey.opens_at <= now)),
            (Survey.closes_at.is_(None) | (Survey.closes_at >= now)),
        )

    surveys = query.order_by(Survey.created_at.desc()).all()
    if current_user.role == UserRole.student:
        surveys = [survey for survey in surveys if _can_student_participate(current_user, survey)]
    return [_serialize_survey(item, current_user, db) for item in surveys]


@router.get("/{survey_id}/my-response", response_model=SurveyMyResponseOut | None)
def my_response(
    survey_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can view this")

    response = db.query(SurveyResponse).filter(SurveyResponse.survey_id == survey_id, SurveyResponse.student_id == current_user.id).first()
    if not response:
        return None

    can_edit_until = response.submitted_at + timedelta(minutes=EDIT_WINDOW_MINUTES)
    return SurveyMyResponseOut(
        survey_id=survey_id,
        submitted_at=response.submitted_at,
        can_edit=datetime.now(timezone.utc) <= can_edit_until,
        can_edit_until=can_edit_until,
        answers=response.answers,
        anonymous=response.is_anonymous,
    )


@router.post("/{survey_id}/submit", response_model=MessageResponse)
def submit_survey(
    survey_id: str,
    payload: SurveySubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can submit survey responses")

    survey = (
        db.query(Survey)
        .options(joinedload(Survey.questions), joinedload(Survey.audiences))
        .filter(Survey.id == survey_id, Survey.is_active.is_(True))
        .first()
    )
    if not survey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Survey not found")

    now = datetime.now(timezone.utc)
    if survey.opens_at and survey.opens_at > now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Survey is not open yet")
    if survey.closes_at and survey.closes_at < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Survey is closed")

    if payload.anonymous and not survey.allow_anonymous_responses:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This survey does not allow anonymous responses")
    if not _can_student_participate(current_user, survey):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not in the survey audience")

    answers_out = _validated_answers(payload, survey)
    existing = db.query(SurveyResponse).filter(SurveyResponse.survey_id == survey_id, SurveyResponse.student_id == current_user.id).first()

    if existing:
        can_edit_until = existing.submitted_at + timedelta(minutes=EDIT_WINDOW_MINUTES)
        if now > can_edit_until:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Edit window elapsed. You can only edit within 1 hour.")
        existing.answers = answers_out
        existing.is_anonymous = payload.anonymous
        existing.submitted_at = now
        db.commit()
        return MessageResponse(message="Survey response updated")

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


@router.post("/{survey_id}/remind", response_model=MessageResponse)
def send_survey_reminder(
    survey_id: str,
    payload: SurveyReminderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    survey = (
        db.query(Survey)
        .options(joinedload(Survey.audiences))
        .filter(Survey.id == survey_id, Survey.is_active.is_(True))
        .first()
    )
    if not survey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Survey not found")
    if survey.created_by_id != current_user.id and current_user.role != UserRole.ict_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the survey creator can send reminders")

    recipients_query = (
        db.query(User)
        .filter(
            User.role == UserRole.student,
            User.is_active.is_(True),
            User.is_deleted.is_(False),
            User.push_notifications_enabled.is_(True),
        )
    )
    recipients = recipients_query.all()
    recipients = [row for row in recipients if _can_student_participate(row, survey)]

    cleaned_target_email_count = len({email.strip().lower() for email in payload.target_user_emails if email.strip()})
    target_users = _resolve_users_by_emails(db, payload.target_user_emails)
    target_user_ids = {user.id for user in target_users if user.role == UserRole.student}
    if cleaned_target_email_count and len(target_user_ids) != cleaned_target_email_count:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Only student emails can be targeted for reminders")
    target_departments = {department.strip() for department in payload.target_departments if department.strip()}
    for department in target_departments:
        if not is_valid_department(department):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid department filter: {department}")

    if target_user_ids:
        recipients = [user for user in recipients if user.id in target_user_ids]
    if target_departments:
        recipients = [user for user in recipients if target_departments.intersection(set(parse_departments_scope(user.department)))]

    for student in recipients:
        db.add(
            Notification(
                user_id=student.id,
                title="Survey reminder",
                message=f"Please complete the survey: {survey.title}",
                type=NotificationType.info,
            )
        )
        send_web_push_to_user(
            db=db,
            user_id=student.id,
            title="Survey reminder",
            message=f"Please complete the survey: {survey.title}",
            url="/surveys",
        )
    db.commit()
    return MessageResponse(message=f"Reminder sent to {len(recipients)} student account(s)")


@router.get("/{survey_id}/results", response_model=SurveyAggregate)
def survey_results(
    survey_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SurveyAggregate:
    survey = (
        db.query(Survey)
        .options(joinedload(Survey.questions), joinedload(Survey.viewer_access))
        .filter(Survey.id == survey_id)
        .first()
    )
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


@router.get("/{survey_id}/responses", response_model=list[SurveyResponseDetailOut])
def survey_responses(
    survey_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SurveyResponseDetailOut]:
    survey = (
        db.query(Survey)
        .options(joinedload(Survey.questions), joinedload(Survey.viewer_access))
        .filter(Survey.id == survey_id)
        .first()
    )
    if not survey:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Survey not found")
    if not _can_view_survey_results(current_user, survey):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    question_map = {q.id: q.prompt for q in survey.questions}
    responses = (
        db.query(SurveyResponse, User.full_name)
        .join(User, User.id == SurveyResponse.student_id)
        .filter(SurveyResponse.survey_id == survey_id)
        .order_by(SurveyResponse.submitted_at.desc())
        .all()
    )

    out: list[SurveyResponseDetailOut] = []
    for response, full_name in responses:
        answer_rows = [
            SurveyResponseAnswerOut(
                question_id=item.get("question_id"),
                question_prompt=question_map.get(item.get("question_id"), "Question"),
                score=item.get("score", 0),
                detail=item.get("detail"),
            )
            for item in response.answers
        ]
        out.append(
            SurveyResponseDetailOut(
                response_id=response.id,
                submitted_at=response.submitted_at,
                anonymous=response.is_anonymous,
                respondent_name=None if response.is_anonymous else full_name,
                answers=answer_rows,
            )
        )
    return out


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
