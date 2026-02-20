from datetime import datetime, timezone
import secrets

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.catalog import is_valid_department, normalize_department
from app.core.security import hash_password
from app.db.session import get_db
from app.models.account_deletion_request import AccountDeletionRequest
from app.models.enums import AccountDeletionStatus, NotificationType, UserRole
from app.models.notification import Notification
from app.models.user import User
from app.schemas.account_deletion import AccountDeletionRequestOut, AccountDeletionReviewRequest
from app.schemas.admin import AdminUserOut, AssignRoleRequest, ResetPasswordRequest
from app.schemas.common import MessageResponse

router = APIRouter()
DEPARTMENT_ROLES = {UserRole.academic_staff, UserRole.course_coordinator, UserRole.department_head, UserRole.dean}


def _require_ict_or_major_admin(current_user: User) -> None:
    if current_user.role != UserRole.ict_admin and not current_user.is_major_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ICT Admin or major admin access required")


def _require_major_admin(current_user: User) -> None:
    if not current_user.is_major_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Major admin access required")


@router.get("/users", response_model=list[AdminUserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AdminUserOut]:
    _require_ict_or_major_admin(current_user)
    rows = db.query(User).filter(User.is_deleted.is_(False)).order_by(User.created_at.desc()).all()
    return [AdminUserOut.model_validate(row) for row in rows]


@router.patch("/users/{user_id}/assign-role", response_model=MessageResponse)
def assign_user_role(
    user_id: str,
    payload: AssignRoleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    _require_ict_or_major_admin(current_user)

    if payload.role == UserRole.ict_admin and not current_user.is_major_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only major admin can assign ICT Admin role")

    user = db.query(User).filter(User.id == user_id, User.is_deleted.is_(False)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.is_major_admin:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Major admin role cannot be changed")

    department = normalize_department(payload.department)
    if payload.role in DEPARTMENT_ROLES and not is_valid_department(department):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A valid department is required for this role")

    if payload.role == UserRole.student:
        user.role = UserRole.student
        user.department = None
    else:
        user.role = payload.role
        user.department = department if payload.role in DEPARTMENT_ROLES else None

    db.commit()
    return MessageResponse(message=f"Role updated: {payload.role.value}")


@router.patch("/users/{user_id}/deactivate", response_model=MessageResponse)
def deactivate_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    _require_ict_or_major_admin(current_user)
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot deactivate yourself")
    user = db.query(User).filter(User.id == user_id, User.is_deleted.is_(False)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.is_major_admin:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot deactivate major admin")
    user.is_active = False
    db.commit()
    return MessageResponse(message="User deactivated")


@router.patch("/users/{user_id}/activate", response_model=MessageResponse)
def activate_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    _require_ict_or_major_admin(current_user)
    user = db.query(User).filter(User.id == user_id, User.is_deleted.is_(False)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.is_active = True
    db.commit()
    return MessageResponse(message="User activated")


@router.delete("/users/{user_id}", response_model=MessageResponse)
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    _require_major_admin(current_user)
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Major admin cannot delete itself")

    user = db.query(User).filter(User.id == user_id, User.is_deleted.is_(False)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.is_major_admin:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete major admin")

    db.delete(user)
    db.commit()
    return MessageResponse(message="User deleted")


@router.post("/users/{user_id}/reset-password", response_model=MessageResponse)
def reset_user_password(
    user_id: str,
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    _require_ict_or_major_admin(current_user)
    user = db.query(User).filter(User.id == user_id, User.is_deleted.is_(False)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return MessageResponse(message="Password reset successfully")


@router.get("/account-deletion-requests", response_model=list[AccountDeletionRequestOut])
def list_account_deletion_requests(
    status_filter: AccountDeletionStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AccountDeletionRequestOut]:
    _require_ict_or_major_admin(current_user)
    query = db.query(AccountDeletionRequest)
    if status_filter:
        query = query.filter(AccountDeletionRequest.status == status_filter)
    rows = query.order_by(AccountDeletionRequest.created_at.desc()).all()
    return [AccountDeletionRequestOut.model_validate(row) for row in rows]


@router.patch("/account-deletion-requests/{request_id}", response_model=MessageResponse)
def review_account_deletion_request(
    request_id: str,
    payload: AccountDeletionReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    _require_ict_or_major_admin(current_user)
    row = db.query(AccountDeletionRequest).filter(AccountDeletionRequest.id == request_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deletion request not found")
    if row.status != AccountDeletionStatus.pending:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Deletion request already reviewed")

    row.reviewed_by_id = current_user.id
    row.reviewed_at = datetime.now(timezone.utc)
    row.review_note = (payload.review_note or "").strip() or None

    target_user = db.query(User).filter(User.id == row.requester_id).first()

    if payload.approve:
        row.status = AccountDeletionStatus.approved
        if target_user and target_user.is_major_admin:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Major admin account cannot be deleted")
        if target_user:
            target_user.is_active = False
            target_user.is_verified = False
            target_user.is_deleted = True
            target_user.full_name = "Deleted User"
            target_user.department = None
            target_user.email = f"deleted-{target_user.id[:8]}-{secrets.token_hex(3)}@pau.deleted"
            target_user.hashed_password = hash_password(f"deleted-{secrets.token_hex(16)}")
            target_user.email_notifications_enabled = False
            target_user.push_notifications_enabled = False
            target_user.high_priority_alerts_enabled = False
            target_user.weekly_digest_enabled = False
        db.commit()
        return MessageResponse(message="Deletion approved and account deleted")

    row.status = AccountDeletionStatus.rejected
    if target_user and target_user.is_active and not target_user.is_deleted and target_user.push_notifications_enabled:
        db.add(
            Notification(
                user_id=target_user.id,
                title="Account deletion request rejected",
                message="Your account deletion request was reviewed and rejected by ICT Admin.",
                type=NotificationType.info,
            )
        )
    db.commit()
    return MessageResponse(message="Deletion request rejected")
