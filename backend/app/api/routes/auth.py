from datetime import datetime, timedelta, timezone
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.email_verification_code import EmailVerificationCode
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    ResendCodeRequest,
    SignupRequest,
    StaffDirectoryUser,
    TokenResponse,
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

    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        role=UserRole.student,
        department=payload.department.strip() if payload.department else None,
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

    token = create_access_token(subject=user.id, role=user.role.value)
    return TokenResponse(access_token=token, user=UserPublic.model_validate(user))


@router.get("/me", response_model=UserPublic)
def me(current_user: User = Depends(get_current_user)) -> UserPublic:
    return UserPublic.model_validate(current_user)


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
    if current_user.role not in {UserRole.student_affairs, UserRole.department_head}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    query = db.query(User).filter(User.is_active.is_(True))
    if current_user.role == UserRole.student_affairs:
        query = query.filter(User.role == UserRole.facilities_management)
    else:
        query = query.filter(User.role == UserRole.academic_staff, User.department == current_user.department)
    users = query.order_by(User.full_name.asc()).all()
    return [StaffDirectoryUser.model_validate(user) for user in users]
