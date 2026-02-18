from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import hash_password
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.admin import AdminUserOut, AssignRoleRequest, ResetPasswordRequest
from app.schemas.common import MessageResponse

router = APIRouter()


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
    rows = db.query(User).order_by(User.created_at.desc()).all()
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

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.is_major_admin:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Major admin role cannot be changed")

    if payload.role == UserRole.student:
        user.role = UserRole.student
        user.department = None
    else:
        user.role = payload.role
        user.department = payload.department.strip() if payload.department else None

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
    user = db.query(User).filter(User.id == user_id).first()
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
    user = db.query(User).filter(User.id == user_id).first()
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

    user = db.query(User).filter(User.id == user_id).first()
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
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return MessageResponse(message="Password reset successfully")
