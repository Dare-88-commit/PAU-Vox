from pydantic import BaseModel, EmailStr, Field

from app.models.enums import UserRole


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=120)
    department: str | None = Field(default=None, max_length=120)


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)


class ResendCodeRequest(BaseModel):
    email: EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserPublic"


class UserPublic(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: UserRole
    department: str | None = None
    is_verified: bool
    is_active: bool
    is_major_admin: bool = False

    model_config = {"from_attributes": True}


class StaffDirectoryUser(BaseModel):
    id: str
    full_name: str
    role: UserRole
    department: str | None = None

    model_config = {"from_attributes": True}


TokenResponse.model_rebuild()
