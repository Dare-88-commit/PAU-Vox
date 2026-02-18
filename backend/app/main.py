from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from sqlalchemy import text

from app.api.router import api_router
from app.core.config import settings
from app.core.security import hash_password
from app.db.session import engine
from app.models import Base
from app.models.enums import UserRole

app = FastAPI(title=settings.app_name)

allowed_origins = settings.frontend_origins or []
if settings.frontend_origin and settings.frontend_origin not in allowed_origins:
    allowed_origins.append(settings.frontend_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
if settings.enforce_https:
    app.add_middleware(HTTPSRedirectMiddleware)


def _apply_runtime_patches() -> None:
    # Lightweight compatibility patch for existing PostgreSQL deployments.
    if not str(engine.url).startswith("postgresql"):
        return

    statements = [
        "ALTER TABLE feedback ADD COLUMN IF NOT EXISTS assigned_by_id VARCHAR(36)",
        "ALTER TABLE feedback ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ",
        "ALTER TABLE feedback ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ",
        "ALTER TABLE feedback ADD COLUMN IF NOT EXISTS overdue_alert_sent BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE surveys ADD COLUMN IF NOT EXISTS allow_anonymous_responses BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_major_admin BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS role_assignment_locked BOOLEAN NOT NULL DEFAULT FALSE",
    ]

    with engine.begin() as conn:
        for statement in statements:
            conn.execute(text(statement))


def _ensure_major_admin() -> None:
    with engine.begin() as conn:
        existing = conn.execute(
            text("SELECT id FROM users WHERE is_major_admin = TRUE LIMIT 1")
        ).fetchone()
        if existing:
            return

        email = settings.major_admin_email.lower().strip()
        name = settings.major_admin_name.strip()
        password_hash = hash_password(settings.major_admin_password)

        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, full_name, role, department, hashed_password,
                    is_verified, is_active, is_major_admin, role_assignment_locked, created_at
                ) VALUES (
                    :id, :email, :full_name, :role, NULL, :hashed_password,
                    TRUE, TRUE, TRUE, FALSE, NOW()
                )
                ON CONFLICT (email) DO UPDATE SET
                    is_major_admin = TRUE,
                    role = :role,
                    is_active = TRUE,
                    is_verified = TRUE
                """
            ),
            {
                "id": str(uuid4()),
                "email": email,
                "full_name": name,
                "role": UserRole.ict_admin.value,
                "hashed_password": password_hash,
            },
        )


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    _apply_runtime_patches()
    _ensure_major_admin()
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(api_router, prefix=settings.api_v1_prefix)
