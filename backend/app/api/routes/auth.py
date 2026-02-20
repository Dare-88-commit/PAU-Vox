from datetime import datetime, timedelta, timezone
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.catalog import is_valid_department, normalize_department
from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.account_deletion_request import AccountDeletionRequest
from app.models.email_verification_code import EmailVerificationCode
from app.models.enums import AccountDeletionStatus, NotificationType, UserRole
from app.models.feedback import Feedback
from app.models.notification import Notification
from app.models.survey import SurveyResponse
from app.models.user import User
from app.schemas.account_deletion import AccountDeletionRequestCreate, AccountDeletionRequestOut
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    ResendCodeRequest,
    SignupRequest,
    StaffDirectoryUser,
    TokenResponse,
    UserAchievement,
    UserProfile,
    UserProfileStats,
    UserPublic,
    VerifyEmailRequest,
)
from app.schemas.common import MessageResponse
from app.services.email import EmailDeliveryError, generate_verification_code, send_verification_email

router = APIRouter()
logger = logging.getLogger(__name__)


def _enforce_pau_domain(email: str) -> None:
    if not email.lower().endswith("@pau.edu.ng"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only @pau.edu.ng emails are allowed")


def _queue_verification_code(db: Session, user: User) -> str:
    code = generate_verification_code()
    expiry = datetime.now(timezone.utc) + timedelta(minutes=settings.email_verification_code_ttl_minutes)
    db.add(EmailVerificationCode(user_id=user.id, code=code, expires_at=expiry))
    return code


@router.post("/signup", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)) -> MessageResponse:
    _enforce_pau_domain(payload.email)
    email = payload.email.lower()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")

    department = normalize_department(payload.department)
    if department and not is_valid_department(department):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid department")

    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        role=UserRole.student,
        department=department,
        hashed_password=hash_password(payload.password),
        is_verified=False,
        is_active=True,
        is_major_admin=False,
        role_assignment_locked=False,
    )

    db.add(user)
    db.flush()
    code = _queue_verification_code(db, user)

    try:
        send_verification_email(user.email, code)
        db.commit()
        return MessageResponse(message="Signup successful. Check your email for the verification code.")
    except EmailDeliveryError:
        if settings.email_delivery_required:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Unable to send verification email")

        db.commit()
        logger.warning("SMTP unavailable in non-production mode. Verification code for %s: %s", user.email, code)
        return MessageResponse(message="Signup successful. Email delivery unavailable in this environment; verification code is logged on the backend.")


@router.post("/verify-email", response_model=MessageResponse)
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)) -> MessageResponse:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    code = (
        db.query(EmailVerificationCode)
        .filter(
            EmailVerificationCode.user_id == user.id,
            EmailVerificationCode.code == payload.code,
            EmailVerificationCode.used_at.is_(None),
        )
        .order_by(EmailVerificationCode.created_at.desc())
        .first()
    )
    if not code or code.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification code")

    code.used_at = datetime.now(timezone.utc)
    user.is_verified = True
    db.commit()
    return MessageResponse(message="Email verified successfully.")


@router.post("/resend-code", response_model=MessageResponse)
def resend_code(payload: ResendCodeRequest, db: Session = Depends(get_db)) -> MessageResponse:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.is_verified:
        return MessageResponse(message="Email is already verified.")

    code = _queue_verification_code(db, user)
    try:
        send_verification_email(user.email, code)
        db.commit()
        return MessageResponse(message="Verification code resent.")
    except EmailDeliveryError:
        if settings.email_delivery_required:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Unable to send verification email")

        db.commit()
        logger.warning("SMTP unavailable in non-production mode. Resent verification code for %s: %s", user.email, code)
        return MessageResponse(message="Verification code regenerated. Email delivery unavailable in this environment; code is logged on the backend.")


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email not verified")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")
    if user.is_deleted:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deleted")

    token = create_access_token(subject=user.id, role=user.role.value)
    return TokenResponse(access_token=token, user=UserPublic.model_validate(user))


@router.get("/me", response_model=UserPublic)
def me(current_user: User = Depends(get_current_user)) -> UserPublic:
    return UserPublic.model_validate(current_user)


@router.get("/profile", response_model=UserProfile)
def my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserProfile:
    feedbacks = (
        db.query(Feedback)
        .filter(Feedback.student_id == current_user.id)
        .order_by(Feedback.created_at.asc())
        .all()
    )
    resolved_feedbacks = [item for item in feedbacks if item.status.value == "resolved"]
    pending_feedbacks = [item for item in feedbacks if item.status.value == "pending"]

    total_feedback = len(feedbacks)
    resolved_feedback = len(resolved_feedbacks)
    pending_feedback = len(pending_feedbacks)
    resolution_rate = int(round((resolved_feedback / total_feedback) * 100)) if total_feedback > 0 else 0

    first_feedback_date = feedbacks[0].created_at.isoformat() if total_feedback >= 1 else None
    fifth_resolved_date = (
        sorted([item.updated_at for item in resolved_feedbacks])[4].isoformat()
        if resolved_feedback >= 5
        else None
    )
    tenth_feedback_date = feedbacks[9].created_at.isoformat() if total_feedback >= 10 else None
    third_resolved_date = (
        sorted([item.updated_at for item in resolved_feedbacks])[2].isoformat()
        if resolved_feedback >= 3
        else None
    )
    fifth_feedback_date = feedbacks[4].created_at.isoformat() if total_feedback >= 5 else None
    pau_champion_date = max(filter(None, [fifth_feedback_date, third_resolved_date])) if fifth_feedback_date and third_resolved_date else None

    achievements = [
        UserAchievement(
            key="first_feedback",
            title="First Feedback",
            description="Submitted your first feedback",
            earned=total_feedback >= 1,
            earned_at=first_feedback_date,
        ),
        UserAchievement(
            key="problem_solver",
            title="Problem Solver",
            description="5 feedback items resolved",
            earned=resolved_feedback >= 5,
            earned_at=fifth_resolved_date,
        ),
        UserAchievement(
            key="active_contributor",
            title="Active Contributor",
            description="Submitted 10 feedback items",
            earned=total_feedback >= 10,
            earned_at=tenth_feedback_date,
        ),
        UserAchievement(
            key="pau_champion",
            title="PAU Champion",
            description="Submitted 5 feedback and resolved at least 3",
            earned=total_feedback >= 5 and resolved_feedback >= 3,
            earned_at=pau_champion_date,
        ),
    ]

    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        department=current_user.department,
        is_verified=current_user.is_verified,
        is_active=current_user.is_active,
        created_at=current_user.created_at.isoformat(),
        stats=UserProfileStats(
            total_feedback=total_feedback,
            resolved_feedback=resolved_feedback,
            pending_feedback=pending_feedback,
            resolution_rate=resolution_rate,
        ),
        achievements=achievements,
    )


@router.get("/export-data")
def export_my_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    feedbacks = (
        db.query(Feedback)
        .filter(Feedback.student_id == current_user.id)
        .order_by(Feedback.created_at.desc())
        .all()
    )
    responses = (
        db.query(SurveyResponse)
        .filter(SurveyResponse.student_id == current_user.id)
        .order_by(SurveyResponse.submitted_at.desc())
        .all()
    )
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )

    payload = {
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "role": current_user.role.value,
            "department": current_user.department,
            "is_verified": current_user.is_verified,
            "is_active": current_user.is_active,
        },
        "feedback": [
            {
                "id": item.id,
                "type": item.type.value,
                "category": item.category,
                "subject": item.subject,
                "description": item.description,
                "status": item.status.value,
                "priority": item.priority.value,
                "created_at": item.created_at.isoformat(),
                "updated_at": item.updated_at.isoformat(),
            }
            for item in feedbacks
        ],
        "survey_responses": [
            {
                "id": row.id,
                "survey_id": row.survey_id,
                "is_anonymous": row.is_anonymous,
                "answers": row.answers,
                "submitted_at": row.submitted_at.isoformat(),
            }
            for row in responses
        ],
        "notifications": [
            {
                "id": row.id,
                "feedback_id": row.feedback_id,
                "title": row.title,
                "message": row.message,
                "type": row.type.value,
                "read": row.read,
                "created_at": row.created_at.isoformat(),
            }
            for row in notifications
        ],
        "exported_at": datetime.now(timezone.utc).isoformat(),
    }
    content = json.dumps(payload, indent=2)
    filename = f"pau-vox-data-{current_user.id[:8]}-{int(datetime.now(timezone.utc).timestamp())}.json"
    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/request-account-deletion", response_model=MessageResponse)
def request_account_deletion(
    payload: AccountDeletionRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    existing = (
        db.query(AccountDeletionRequest)
        .filter(
            AccountDeletionRequest.requester_id == current_user.id,
            AccountDeletionRequest.status == AccountDeletionStatus.pending,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You already have a pending deletion request")

    request_row = AccountDeletionRequest(
        requester_id=current_user.id,
        requester_email=current_user.email,
        requester_name=current_user.full_name,
        reason=(payload.reason or "").strip() or None,
    )
    db.add(request_row)
    db.flush()

    ict_admins = (
        db.query(User)
        .filter(User.role == UserRole.ict_admin, User.is_active.is_(True), User.is_deleted.is_(False))
        .all()
    )
    for admin in ict_admins:
        db.add(
            Notification(
                user_id=admin.id,
                title="Account deletion request",
                message=f"{current_user.full_name} ({current_user.email}) requested account deletion approval.",
                type=NotificationType.warning,
            )
        )

    db.commit()
    return MessageResponse(message="Deletion request submitted for ICT Admin approval")


@router.get("/account-deletion-request", response_model=AccountDeletionRequestOut | None)
def my_account_deletion_request(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = (
        db.query(AccountDeletionRequest)
        .filter(AccountDeletionRequest.requester_id == current_user.id)
        .order_by(AccountDeletionRequest.created_at.desc())
        .first()
    )
    if not row:
        return None
    return AccountDeletionRequestOut.model_validate(row)


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be different")

    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return MessageResponse(message="Password updated successfully")


@router.get("/staff-directory", response_model=list[StaffDirectoryUser])
def staff_directory(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[StaffDirectoryUser]:
    if current_user.role not in {
        UserRole.student_affairs,
        UserRole.head_student_affairs,
        UserRole.facilities_management,
        UserRole.department_head,
        UserRole.course_coordinator,
        UserRole.dean,
    }:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    query = db.query(User).filter(User.is_active.is_(True))
    if current_user.role == UserRole.head_student_affairs:
        query = query.filter(User.role == UserRole.student_affairs)
    elif current_user.role == UserRole.student_affairs:
        query = query.filter(User.role == UserRole.facilities_management)
    elif current_user.role == UserRole.facilities_management:
        query = query.filter(User.role == UserRole.facilities_account)
    elif current_user.role == UserRole.dean:
        query = query.filter(User.role == UserRole.department_head, User.department == current_user.department)
    else:
        query = query.filter(User.role.in_([UserRole.academic_staff, UserRole.course_coordinator]), User.department == current_user.department)
    users = query.order_by(User.full_name.asc()).all()
    return [StaffDirectoryUser.model_validate(user) for user in users]
