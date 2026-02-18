from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "PAU Vox Backend"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 120
    database_url: str = "sqlite:///./pau_vox.db"

    # Accept comma-separated origins in env like: http://localhost:5173,http://localhost:3000
    frontend_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://localhost:3000"]
    )
    frontend_origin: str | None = None  # legacy single-origin fallback

    email_verification_code_ttl_minutes: int = 15
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None
    smtp_use_tls: bool = True
    # If unset, production requires delivery and non-production allows fallback.
    require_email_delivery: bool | None = None

    enforce_https: bool = False
    upload_dir: str = "uploads"
    max_upload_size_bytes: int = 10 * 1024 * 1024

    # Bootstrap major admin account.
    major_admin_email: str = "owner@pau.edu.ng"
    major_admin_password: str = "ChangeMeNow123!"
    major_admin_name: str = "PAU Vox Owner"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @field_validator("frontend_origins", mode="before")
    @classmethod
    def parse_frontend_origins(cls, value):
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @property
    def email_delivery_required(self) -> bool:
        if self.require_email_delivery is not None:
            return self.require_email_delivery
        return self.environment.lower() == "production"


settings = Settings()
