from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.core.policies import can_add_internal_note, can_view_feedback
from app.db.session import get_db
from app.models.enums import FeedbackStatus, FeedbackType, NotificationType, UserRole
from app.models.feedback import Feedback
from app.models.internal_note import InternalNote
from app.models.notification import Notification
from app.models.status_history import StatusHistory
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.feedback import (
    FeedbackAssignRequest,
    FeedbackCreate,
    FeedbackListResponse,
    FeedbackOut,
    FeedbackStatusUpdate,
    FeedbackUpdateByStudent,
    InternalNoteCreate,
)
from app.services.priority import detect_priority
from app.services.profanity import contains_profanity
from app.services.similarity import detect_similarity_group

router = APIRouter()


def _serialize_feedback(feedback: Feedback, viewer_role: UserRole) -> FeedbackOut:
    student_name = None if (feedback.is_anonymous and viewer_role != UserRole.student) else feedback.student.full_name
    description = feedback.description
    if viewer_role == UserRole.university_management:
        description = "[REDACTED]"

    return FeedbackOut(
        id=feedback.id,
        type=feedback.type,
        category=feedback.category,
        subject=feedback.subject,
        description=description,
        status=feedback.status,
        priority=feedback.priority,
        is_anonymous=feedback.is_anonymous,
        student_id=feedback.student_id,
        student_name=student_name,
        assigned_to_id=feedback.assigned_to_id,
        department=feedback.department,
        resolution_summary=feedback.resolution_summary,
        similarity_group=feedback.similarity_group,
        created_at=feedback.created_at,
        updated_at=feedback.updated_at,
        notes=feedback.notes,
        status_history=feedback.status_history,
    )


def _record_status_change(db: Session, feedback: Feedback, status_value: FeedbackStatus, by_user_id: str, note: str | None):
    feedback.status = status_value
    feedback.updated_at = datetime.now(timezone.utc)
    db.add(StatusHistory(feedback_id=feedback.id, status=status_value, updated_by_id=by_user_id, note=note))


def _notify(db: Session, user_id: str, title: str, message: str, feedback_id: str | None = None, level=NotificationType.info):
    db.add(
        Notification(
            user_id=user_id,
            feedback_id=feedback_id,
            title=title,
            message=message,
            type=level,
        )
    )


@router.post("/", response_model=FeedbackOut, status_code=status.HTTP_201_CREATED)
def create_feedback(
    payload: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FeedbackOut:
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can submit feedback")
    if payload.type == FeedbackType.academic and not payload.department:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Department is required for academic feedback")
    if contains_profanity(payload.subject) or contains_profanity(payload.description):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Feedback contains blocked language. Please rewrite before submitting.",
        )

    priority = detect_priority(payload.description)
    similarity_group = detect_similarity_group(
        db=db,
        feedback_type=payload.type,
        category=payload.category,
        subject=payload.subject,
        description=payload.description,
    )

    feedback = Feedback(
        type=payload.type,
        category=payload.category,
        subject=payload.subject,
        description=payload.description,
        is_anonymous=payload.is_anonymous,
        department=payload.department,
        student_id=current_user.id,
        priority=priority,
        similarity_group=similarity_group,
    )
    db.add(feedback)
    db.flush()
    db.add(
        StatusHistory(
            feedback_id=feedback.id,
            status=FeedbackStatus.pending,
            updated_by_id=current_user.id,
            note="Initial submission",
        )
    )

    # High-priority alerts go directly to relevant staff.
    if priority in {"high", "urgent"}:
        target_role = UserRole.student_affairs if payload.type == FeedbackType.non_academic else UserRole.department_head
        staff_targets = db.query(User).filter(User.role == target_role).all()
        for staff in staff_targets:
            if payload.type == FeedbackType.academic and staff.department != payload.department:
                continue
            _notify(
                db,
                staff.id,
                "High-priority feedback",
                f"{payload.category}: {payload.subject}",
                feedback.id,
                NotificationType.warning,
            )

    db.commit()
    db.refresh(feedback)
    feedback = (
        db.query(Feedback)
        .options(joinedload(Feedback.student), joinedload(Feedback.notes), joinedload(Feedback.status_history))
        .filter(Feedback.id == feedback.id)
        .first()
    )
    return _serialize_feedback(feedback, current_user.role)


@router.get("/", response_model=FeedbackListResponse)
def list_feedback(
    feedback_type: FeedbackType | None = Query(default=None),
    status_filter: FeedbackStatus | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FeedbackListResponse:
    if current_user.role in {UserRole.university_management, UserRole.ict_admin}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Use analytics endpoints for this role")

    query = db.query(Feedback).options(joinedload(Feedback.student), joinedload(Feedback.notes), joinedload(Feedback.status_history))
    if feedback_type:
        query = query.filter(Feedback.type == feedback_type)
    if status_filter:
        query = query.filter(Feedback.status == status_filter)

    if current_user.role == UserRole.student:
        query = query.filter(Feedback.student_id == current_user.id)
    elif current_user.role == UserRole.academic_staff:
        query = query.filter(Feedback.type == FeedbackType.academic, Feedback.department == current_user.department)
    elif current_user.role == UserRole.department_head:
        query = query.filter(Feedback.type == FeedbackType.academic, Feedback.department == current_user.department)
    elif current_user.role == UserRole.student_affairs:
        query = query.filter(Feedback.type == FeedbackType.non_academic)
    elif current_user.role == UserRole.facilities_management:
        query = query.filter(Feedback.type == FeedbackType.non_academic, Feedback.assigned_to_id == current_user.id)

    items = query.order_by(Feedback.created_at.desc()).all()
    return FeedbackListResponse(items=[_serialize_feedback(row, current_user.role) for row in items], total=len(items))


@router.get("/{feedback_id}", response_model=FeedbackOut)
def get_feedback(
    feedback_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FeedbackOut:
    feedback = (
        db.query(Feedback)
        .options(joinedload(Feedback.student), joinedload(Feedback.notes), joinedload(Feedback.status_history))
        .filter(Feedback.id == feedback_id)
        .first()
    )
    if not feedback:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")
    if not can_view_feedback(current_user, feedback):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return _serialize_feedback(feedback, current_user.role)


@router.patch("/{feedback_id}", response_model=FeedbackOut)
def update_feedback_by_student(
    feedback_id: str,
    payload: FeedbackUpdateByStudent,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FeedbackOut:
    feedback = db.query(Feedback).options(joinedload(Feedback.student)).filter(Feedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")
    if current_user.role != UserRole.student or feedback.student_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the submitting student can edit this feedback")
    if feedback.status != FeedbackStatus.pending:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Feedback cannot be edited after review begins")

    for field in ("category", "subject", "description", "is_anonymous", "department"):
        value = getattr(payload, field)
        if value is not None:
            setattr(feedback, field, value)

    if contains_profanity(feedback.subject) or contains_profanity(feedback.description):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Updated text contains blocked language")
    feedback.priority = detect_priority(feedback.description)
    feedback.similarity_group = detect_similarity_group(
        db,
        feedback.type,
        feedback.category,
        feedback.subject,
        feedback.description,
    )
    feedback.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(feedback)
    return _serialize_feedback(feedback, current_user.role)


@router.patch("/{feedback_id}/status", response_model=FeedbackOut)
def update_feedback_status(
    feedback_id: str,
    payload: FeedbackStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FeedbackOut:
    feedback = (
        db.query(Feedback)
        .options(joinedload(Feedback.student), joinedload(Feedback.notes), joinedload(Feedback.status_history))
        .filter(Feedback.id == feedback_id)
        .first()
    )
    if not feedback:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")

    role = current_user.role
    if role == UserRole.academic_staff:
        allowed = feedback.type == FeedbackType.academic and feedback.department == current_user.department
    elif role == UserRole.department_head:
        allowed = feedback.type == FeedbackType.academic and feedback.department == current_user.department
    elif role == UserRole.student_affairs:
        allowed = feedback.type == FeedbackType.non_academic
    elif role == UserRole.facilities_management:
        allowed = feedback.type == FeedbackType.non_academic and feedback.assigned_to_id == current_user.id
    else:
        allowed = False
    if not allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    if role == UserRole.facilities_management and payload.status not in {
        FeedbackStatus.working,
        FeedbackStatus.resolved,
    }:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Facilities can only set working or resolved status")

    _record_status_change(db, feedback, payload.status, current_user.id, payload.note)
    if payload.resolution_summary:
        feedback.resolution_summary = payload.resolution_summary

    _notify(
        db,
        feedback.student_id,
        "Feedback status updated",
        f"Your feedback '{feedback.subject}' moved to {payload.status.value}.",
        feedback.id,
        NotificationType.info,
    )
    db.commit()
    db.refresh(feedback)
    return _serialize_feedback(feedback, role)


@router.post("/{feedback_id}/assign", response_model=FeedbackOut)
def assign_feedback(
    feedback_id: str,
    payload: FeedbackAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FeedbackOut:
    feedback = (
        db.query(Feedback)
        .options(joinedload(Feedback.student), joinedload(Feedback.notes), joinedload(Feedback.status_history))
        .filter(Feedback.id == feedback_id)
        .first()
    )
    assignee = db.query(User).filter(User.id == payload.assignee_id, User.is_active.is_(True)).first()
    if not feedback or not assignee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback or assignee not found")

    if current_user.role == UserRole.student_affairs:
        if feedback.type != FeedbackType.non_academic or assignee.role != UserRole.facilities_management:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid assignment target")
    elif current_user.role == UserRole.department_head:
        if (
            feedback.type != FeedbackType.academic
            or feedback.department != current_user.department
            or assignee.role != UserRole.academic_staff
            or assignee.department != current_user.department
        ):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid assignment target")
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Student Affairs or Department Heads can assign")

    feedback.assigned_to_id = assignee.id
    _record_status_change(db, feedback, FeedbackStatus.assigned, current_user.id, payload.note or "Assigned")
    _notify(
        db,
        assignee.id,
        "New assignment",
        f"You have been assigned feedback '{feedback.subject}'.",
        feedback.id,
        NotificationType.warning,
    )
    db.commit()
    db.refresh(feedback)
    return _serialize_feedback(feedback, current_user.role)


@router.post("/{feedback_id}/notes", response_model=FeedbackOut)
def add_internal_note(
    feedback_id: str,
    payload: InternalNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FeedbackOut:
    feedback = (
        db.query(Feedback)
        .options(joinedload(Feedback.student), joinedload(Feedback.notes), joinedload(Feedback.status_history))
        .filter(Feedback.id == feedback_id)
        .first()
    )
    if not feedback:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")
    if not can_add_internal_note(current_user, feedback):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    db.add(InternalNote(feedback_id=feedback_id, author_id=current_user.id, text=payload.text))
    feedback.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(feedback)
    return _serialize_feedback(feedback, current_user.role)


@router.post("/{feedback_id}/escalate", response_model=MessageResponse)
def escalate_feedback(
    feedback_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    feedback = db.query(Feedback).options(joinedload(Feedback.student)).filter(Feedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")
    if current_user.role not in {UserRole.academic_staff, UserRole.student_affairs}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only operational staff can escalate")

    if feedback.type == FeedbackType.academic:
        heads = db.query(User).filter(User.role == UserRole.department_head, User.department == feedback.department).all()
        recipients = heads
    else:
        recipients = db.query(User).filter(User.role == UserRole.student_affairs).all()
    for user in recipients:
        _notify(
            db,
            user.id,
            "Escalated feedback",
            f"Feedback '{feedback.subject}' has been escalated for urgent review.",
            feedback.id,
            NotificationType.warning,
        )
    db.commit()
    return MessageResponse(message="Feedback escalated successfully.")
