from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import UserRole


class AdminUserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole
    department: str | None
    is_verified: bool
    is_active: bool
    is_major_admin: bool
    role_assignment_locked: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)


class AssignRoleRequest(BaseModel):
    role: UserRole
    department: str | None = Field(default=None, max_length=120)
