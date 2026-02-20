from datetime import datetime, timezone
from pathlib import Path
import secrets

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.core.catalog import is_valid_department, normalize_department
from app.core.config import settings
from app.core.policies import can_add_internal_note, can_view_feedback
from app.db.session import get_db
from app.models.attachment import Attachment
from app.models.enums import FeedbackPriority, FeedbackStatus, FeedbackType, NotificationType, UserRole
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
from app.services.email import send_plain_email
from app.services.priority import detect_priority
from app.services.profanity import contains_profanity
from app.services.similarity import detect_similarity_group

router = APIRouter()

EDIT_WINDOW_SECONDS = 60 * 60


def _serialize_feedback(feedback: Feedback, viewer_role: UserRole) -> FeedbackOut:
    student_name = None if (feedback.is_anonymous and viewer_role != UserRole.student) else feedback.student.full_name
    description = feedback.description
    if viewer_role == UserRole.university_management:
        description = "[REDACTED]"

    include_internal = viewer_role in {
        UserRole.academic_staff,
        UserRole.course_coordinator,
        UserRole.dean,
        UserRole.department_head,
        UserRole.student_affairs,
        UserRole.head_student_affairs,
        UserRole.facilities_management,
        UserRole.facilities_account,
    }

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
        assigned_by_id=feedback.assigned_by_id,
        assigned_at=feedback.assigned_at,
        due_at=feedback.due_at,
        department=feedback.department,
        resolution_summary=feedback.resolution_summary,
        similarity_group=feedback.similarity_group,
        attachments=[f"/api/v1/feedback/{feedback.id}/attachments/{item.id}" for item in feedback.attachments],
        created_at=feedback.created_at,
        updated_at=feedback.updated_at,
        notes=feedback.notes if include_internal else [],
        status_history=feedback.status_history if include_internal else [],
    )


def _record_status_change(db: Session, feedback: Feedback, status_value: FeedbackStatus, by_user_id: str, note: str | None):
    feedback.status = status_value
    feedback.updated_at = datetime.now(timezone.utc)
    db.add(StatusHistory(feedback_id=feedback.id, status=status_value, updated_by_id=by_user_id, note=note))


def _notify(
    db: Session,
    user_id: str,
    title: str,
    message: str,
    feedback_id: str | None = None,
    level=NotificationType.info,
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user or not target_user.push_notifications_enabled:
        return
    if level in {NotificationType.warning, NotificationType.error} and not target_user.high_priority_alerts_enabled:
        return
    db.add(
        Notification(
            user_id=user_id,
            feedback_id=feedback_id,
            title=title,
            message=message,
            type=level,
        )
    )


def _can_modify_status(current_user: User, feedback: Feedback) -> bool:
    role = current_user.role
    if role in {UserRole.academic_staff, UserRole.department_head, UserRole.course_coordinator, UserRole.dean}:
        return feedback.type == FeedbackType.academic and feedback.department == current_user.department
    if role in {UserRole.student_affairs, UserRole.head_student_affairs}:
        return feedback.type == FeedbackType.non_academic
    if role in {UserRole.facilities_management, UserRole.facilities_account}:
        return feedback.type == FeedbackType.non_academic
    return False


@router.post("/", response_model=FeedbackOut, status_code=status.HTTP_201_CREATED)
def create_feedback(
    payload: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FeedbackOut:
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can submit feedback")
    department = normalize_department(payload.department)
    if payload.type == FeedbackType.academic and not department:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Department is required for academic feedback")
    if payload.type == FeedbackType.academic and not is_valid_department(department):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid department")
    if payload.type == FeedbackType.non_academic:
        department = None
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
    if similarity_group:
        recurring_count = (
            db.query(Feedback)
            .filter(Feedback.similarity_group == similarity_group, Feedback.type == payload.type)
            .count()
        )
        if recurring_count >= 5:
            priority = FeedbackPriority.urgent
        elif recurring_count >= 2 and priority in {FeedbackPriority.low, FeedbackPriority.medium}:
            priority = FeedbackPriority.high

    feedback = Feedback(
        type=payload.type,
        category=payload.category,
        subject=payload.subject,
        description=payload.description,
        is_anonymous=payload.is_anonymous,
        department=department,
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

    if priority in {FeedbackPriority.high, FeedbackPriority.urgent}:
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
    feedback = (
        db.query(Feedback)
        .options(joinedload(Feedback.student), joinedload(Feedback.notes), joinedload(Feedback.status_history), joinedload(Feedback.attachments))
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

    query = db.query(Feedback).options(
        joinedload(Feedback.student),
        joinedload(Feedback.notes),
        joinedload(Feedback.status_history),
        joinedload(Feedback.attachments),
    )
    if feedback_type:
        query = query.filter(Feedback.type == feedback_type)
    if status_filter:
        query = query.filter(Feedback.status == status_filter)

    if current_user.role == UserRole.student:
        query = query.filter(Feedback.student_id == current_user.id)
    elif current_user.role in {UserRole.academic_staff, UserRole.department_head, UserRole.course_coordinator, UserRole.dean}:
        query = query.filter(Feedback.type == FeedbackType.academic, Feedback.department == current_user.department)
    elif current_user.role in {UserRole.student_affairs, UserRole.head_student_affairs}:
        query = query.filter(Feedback.type == FeedbackType.non_academic)
    elif current_user.role in {UserRole.facilities_management, UserRole.facilities_account}:
        query = query.filter(Feedback.type == FeedbackType.non_academic)

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
        .options(joinedload(Feedback.student), joinedload(Feedback.notes), joinedload(Feedback.status_history), joinedload(Feedback.attachments))
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
    feedback = db.query(Feedback).options(joinedload(Feedback.student), joinedload(Feedback.attachments)).filter(Feedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")
    if current_user.role != UserRole.student or feedback.student_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the submitting student can edit this feedback")

    elapsed = datetime.now(timezone.utc) - feedback.created_at
    if elapsed.total_seconds() > EDIT_WINDOW_SECONDS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Feedback can only be edited within 1 hour of submission")

    for field in ("category", "subject", "description", "is_anonymous", "department"):
        value = getattr(payload, field)
        if value is not None:
            setattr(feedback, field, value)

    feedback.department = normalize_department(feedback.department)
    if feedback.type == FeedbackType.academic:
        if not feedback.department:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Department is required for academic feedback")
        if not is_valid_department(feedback.department):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid department")
    else:
        feedback.department = None

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
        .options(joinedload(Feedback.student), joinedload(Feedback.notes), joinedload(Feedback.status_history), joinedload(Feedback.attachments))
        .filter(Feedback.id == feedback_id)
        .first()
    )
    if not feedback:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")

    if not _can_modify_status(current_user, feedback):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    if payload.status != feedback.status:
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
    return _serialize_feedback(feedback, current_user.role)


@router.post("/{feedback_id}/assign", response_model=FeedbackOut)
def assign_feedback(
    feedback_id: str,
    payload: FeedbackAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FeedbackOut:
    feedback = (
        db.query(Feedback)
        .options(joinedload(Feedback.student), joinedload(Feedback.notes), joinedload(Feedback.status_history), joinedload(Feedback.attachments))
        .filter(Feedback.id == feedback_id)
        .first()
    )
    assignee = db.query(User).filter(User.id == payload.assignee_id, User.is_active.is_(True)).first()
    if not feedback or not assignee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback or assignee not found")
    if feedback.status in {FeedbackStatus.resolved, FeedbackStatus.rejected}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot assign a closed issue")

    if current_user.role == UserRole.head_student_affairs:
        if feedback.type != FeedbackType.non_academic or assignee.role != UserRole.student_affairs:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid assignment target")
    elif current_user.role == UserRole.student_affairs:
        if feedback.type != FeedbackType.non_academic or assignee.role != UserRole.facilities_management:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid assignment target")
    elif current_user.role == UserRole.facilities_management:
        if feedback.type != FeedbackType.non_academic or assignee.role != UserRole.facilities_account:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid assignment target")
    elif current_user.role == UserRole.dean:
        if (
            feedback.type != FeedbackType.academic
            or feedback.department != current_user.department
            or assignee.role != UserRole.department_head
            or assignee.department != current_user.department
        ):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid relegation target")
    elif current_user.role in {UserRole.department_head, UserRole.course_coordinator}:
        if (
            feedback.type != FeedbackType.academic
            or feedback.department != current_user.department
            or assignee.role not in {UserRole.academic_staff, UserRole.course_coordinator}
            or assignee.department != current_user.department
        ):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid assignment target")
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions for assignment")

    feedback.assigned_to_id = assignee.id
    feedback.assigned_by_id = current_user.id
    feedback.assigned_at = datetime.now(timezone.utc)
    feedback.due_at = payload.due_at
    feedback.overdue_alert_sent = False
    note_label = "Relegated" if current_user.role == UserRole.dean else "Assigned"
    _record_status_change(db, feedback, FeedbackStatus.assigned, current_user.id, payload.note or note_label)
    _notify(
        db,
        assignee.id,
        "New assignment" if current_user.role != UserRole.dean else "New relegated task",
        f"You have been {'relegated' if current_user.role == UserRole.dean else 'assigned'} feedback '{feedback.subject}'.",
        feedback.id,
        NotificationType.warning,
    )
    if current_user.id != assignee.id:
        _notify(
            db,
            current_user.id,
            "Assignment confirmed" if current_user.role != UserRole.dean else "Relegation confirmed",
            f"You {'relegated' if current_user.role == UserRole.dean else 'assigned'} '{feedback.subject}' with due date {payload.due_at.isoformat() if payload.due_at else 'none'}.",
            feedback.id,
            NotificationType.info,
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
        .options(joinedload(Feedback.student), joinedload(Feedback.notes), joinedload(Feedback.status_history), joinedload(Feedback.attachments))
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
    if current_user.role not in {UserRole.academic_staff, UserRole.student_affairs, UserRole.course_coordinator, UserRole.facilities_management, UserRole.facilities_account}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only operational staff can escalate")

    if feedback.type == FeedbackType.academic:
        recipients = db.query(User).filter(User.role == UserRole.department_head, User.department == feedback.department).all()
    else:
        recipients = db.query(User).filter(User.role == UserRole.student_affairs).all()
    for recipient in recipients:
        _notify(
            db,
            recipient.id,
            "Escalated feedback",
            f"Feedback '{feedback.subject}' has been escalated for urgent review.",
            feedback.id,
            NotificationType.warning,
        )
    db.commit()
    return MessageResponse(message="Feedback escalated successfully.")


@router.post("/overdue/check", response_model=MessageResponse)
def check_overdue_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    if current_user.role not in {UserRole.ict_admin, UserRole.department_head, UserRole.student_affairs, UserRole.course_coordinator, UserRole.head_student_affairs, UserRole.dean, UserRole.facilities_management}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    now = datetime.now(timezone.utc)
    overdue_items = (
        db.query(Feedback)
        .filter(
            Feedback.due_at.is_not(None),
            Feedback.due_at < now,
            Feedback.status.notin_([FeedbackStatus.resolved, FeedbackStatus.rejected]),
            Feedback.overdue_alert_sent.is_(False),
        )
        .all()
    )

    for item in overdue_items:
        if item.assigned_to_id:
            _notify(
                db,
                item.assigned_to_id,
                "Overdue assignment",
                f"Task '{item.subject}' is overdue. Please resolve immediately.",
                item.id,
                NotificationType.warning,
            )
            assignee = db.query(User).filter(User.id == item.assigned_to_id).first()
            if assignee and assignee.email_notifications_enabled:
                send_plain_email(assignee.email, "PAU Vox Overdue Task", f"Task '{item.subject}' is overdue.")

        if item.assigned_by_id:
            _notify(
                db,
                item.assigned_by_id,
                "Assigned task overdue",
                f"Task '{item.subject}' assigned by you is overdue.",
                item.id,
                NotificationType.warning,
            )

        item.overdue_alert_sent = True

    db.commit()
    return MessageResponse(message=f"Overdue check complete. {len(overdue_items)} task(s) flagged.")


@router.post("/{feedback_id}/attachments", response_model=FeedbackOut)
async def upload_attachment(
    feedback_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FeedbackOut:
    feedback = (
        db.query(Feedback)
        .options(joinedload(Feedback.student), joinedload(Feedback.notes), joinedload(Feedback.status_history), joinedload(Feedback.attachments))
        .filter(Feedback.id == feedback_id)
        .first()
    )
    if not feedback:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")

    can_upload = False
    if current_user.role == UserRole.student:
        can_upload = feedback.student_id == current_user.id and (datetime.now(timezone.utc) - feedback.created_at).total_seconds() <= EDIT_WINDOW_SECONDS
    elif current_user.role in {UserRole.facilities_management, UserRole.facilities_account, UserRole.student_affairs, UserRole.head_student_affairs, UserRole.department_head, UserRole.dean, UserRole.academic_staff, UserRole.course_coordinator}:
        can_upload = can_view_feedback(current_user, feedback)
    if not can_upload:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    content = await file.read()
    if len(content) > settings.max_upload_size_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Attachment exceeds size limit")

    safe_name = Path(file.filename or "upload.bin").name
    storage_name = f"{feedback_id}_{secrets.token_hex(8)}_{safe_name}"
    storage_path = Path(settings.upload_dir) / storage_name
    storage_path.write_bytes(content)

    attachment = Attachment(
        feedback_id=feedback_id,
        uploaded_by_id=current_user.id,
        file_name=safe_name,
        file_path=str(storage_path),
        content_type=file.content_type or "application/octet-stream",
    )
    db.add(attachment)
    db.commit()
    feedback = (
        db.query(Feedback)
        .options(joinedload(Feedback.student), joinedload(Feedback.notes), joinedload(Feedback.status_history), joinedload(Feedback.attachments))
        .filter(Feedback.id == feedback_id)
        .first()
    )
    return _serialize_feedback(feedback, current_user.role)


@router.get("/{feedback_id}/attachments/{attachment_id}")
def download_attachment(
    feedback_id: str,
    attachment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")
    if not can_view_feedback(current_user, feedback):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    attachment = (
        db.query(Attachment)
        .filter(Attachment.id == attachment_id, Attachment.feedback_id == feedback_id)
        .first()
    )
    if not attachment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")
    if not Path(attachment.file_path).exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment file missing")

    return FileResponse(path=attachment.file_path, filename=attachment.file_name, media_type=attachment.content_type)
