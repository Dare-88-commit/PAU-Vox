# PAU Vox Backend (FastAPI)

FastAPI backend implementing the SRS requirements for authentication, role-based feedback workflows, moderation, notifications, and analytics.

## Stack
- FastAPI
- SQLAlchemy
- PostgreSQL
- JWT auth (`python-jose`)
- Argon2 password hashing (`passlib[argon2]`)

## Quick Start
1. Create env file:
   - `cp .env.example .env` (or create manually on Windows)
2. Install deps:
   - `pip install -r requirements.txt`
3. Start PostgreSQL (either local or Docker).
4. Run API:
   - `uvicorn app.main:app --reload --port 8000`
5. Open docs:
   - `http://localhost:8000/docs`

## Docker
- `docker compose up`

This starts:
- API on `http://localhost:8000`
- PostgreSQL on `localhost:5432`

## Implemented SRS Coverage
- PAU email-only signup and 6-digit verification code
- JWT auth and role-based access control
- Academic and non-academic feedback sectors
- Profanity filtering (submission blocking)
- Similarity grouping and emergency priority detection
- Assignment + status workflows
- Internal notes (staff-only)
- Notifications for status/assignment/high-priority events
- Analytics + export (`CSV` and `PDF`)

## API Prefix
- `/api/v1`

## Core Endpoints
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/feedback`
- `GET /api/v1/feedback`
- `PATCH /api/v1/feedback/{feedback_id}`
- `PATCH /api/v1/feedback/{feedback_id}/status`
- `POST /api/v1/feedback/{feedback_id}/assign`
- `POST /api/v1/feedback/{feedback_id}/notes`
- `POST /api/v1/feedback/{feedback_id}/escalate`
- `GET /api/v1/notifications`
- `PATCH /api/v1/notifications/{notification_id}/read`
- `PATCH /api/v1/notifications/read-all`
- `GET /api/v1/analytics`
- `GET /api/v1/analytics/export?format=csv|pdf`
