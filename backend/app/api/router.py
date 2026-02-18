from fastapi import APIRouter

from app.api.routes import admin, analytics, auth, feedback, notifications, surveys

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(feedback.router, prefix="/feedback", tags=["feedback"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(surveys.router, prefix="/surveys", tags=["surveys"])
