from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from io import BytesIO, StringIO
import csv

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response, StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.enums import FeedbackStatus, FeedbackType, UserRole
from app.models.feedback import Feedback
from app.models.user import User
from app.schemas.analytics import AnalyticsResponse, ResolutionMetric

router = APIRouter()


def _guard_analytics_access(current_user: User, department: str | None):
    if current_user.role == UserRole.university_management:
        return
    if current_user.role in {UserRole.department_head, UserRole.course_coordinator, UserRole.dean}:
        if department and department != current_user.department:
            raise HTTPException(status_code=403, detail="Department scope violation")
        return
    raise HTTPException(status_code=403, detail="Analytics access is restricted")


def _filtered_feedback(db: Session, current_user: User, department: str | None):
    query = db.query(Feedback)
    if current_user.role in {UserRole.department_head, UserRole.course_coordinator, UserRole.dean}:
        query = query.filter(Feedback.type == FeedbackType.academic, Feedback.department == current_user.department)
    elif department:
        query = query.filter(Feedback.department == department)
    return query.all()


def _resolution_hours(feedbacks: list[Feedback]) -> ResolutionMetric:
    deltas: list[float] = []
    for item in feedbacks:
        if item.status != FeedbackStatus.resolved:
            continue
        delta = item.updated_at - item.created_at
        deltas.append(delta.total_seconds() / 3600)
    if not deltas:
        return ResolutionMetric(average_resolution_hours=0.0, resolved_count=0)
    return ResolutionMetric(
        average_resolution_hours=round(sum(deltas) / len(deltas), 2),
        resolved_count=len(deltas),
    )


def _build_analytics(feedbacks: list[Feedback]) -> AnalyticsResponse:
    by_type = Counter([item.type.value for item in feedbacks])
    by_status = Counter([item.status.value for item in feedbacks])
    by_priority = Counter([item.priority.value for item in feedbacks])
    top_categories = Counter([item.category for item in feedbacks]).most_common(10)
    return AnalyticsResponse(
        total_feedback=len(feedbacks),
        by_type=dict(by_type),
        by_status=dict(by_status),
        by_priority=dict(by_priority),
        top_categories=dict(top_categories),
        resolution=_resolution_hours(feedbacks),
    )


@router.get("/", response_model=AnalyticsResponse)
def get_analytics(
    department: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AnalyticsResponse:
    _guard_analytics_access(current_user, department)
    feedbacks = _filtered_feedback(db, current_user, department)
    return _build_analytics(feedbacks)


@router.get("/trends")
def get_trends(
    days: int = Query(default=30, ge=7, le=365),
    department: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _guard_analytics_access(current_user, department)
    feedbacks = _filtered_feedback(db, current_user, department)

    end_date = datetime.now(timezone.utc).date()
    start_date = end_date - timedelta(days=days - 1)

    buckets = defaultdict(lambda: {"date": "", "submitted": 0, "resolved": 0, "avg_resolution_hours": 0.0, "resolution_samples": 0})
    for idx in range(days):
        day = start_date + timedelta(days=idx)
        key = day.isoformat()
        buckets[key]["date"] = key

    for item in feedbacks:
        created_day = item.created_at.date().isoformat()
        if created_day in buckets:
            buckets[created_day]["submitted"] += 1

        if item.status == FeedbackStatus.resolved:
            resolved_day = item.updated_at.date().isoformat()
            if resolved_day in buckets:
                buckets[resolved_day]["resolved"] += 1
                delta_hours = (item.updated_at - item.created_at).total_seconds() / 3600
                buckets[resolved_day]["avg_resolution_hours"] += delta_hours
                buckets[resolved_day]["resolution_samples"] += 1

    result = []
    for key in sorted(buckets.keys()):
        row = buckets[key]
        if row["resolution_samples"]:
            row["avg_resolution_hours"] = round(row["avg_resolution_hours"] / row["resolution_samples"], 2)
        else:
            row["avg_resolution_hours"] = 0.0
        row.pop("resolution_samples", None)
        result.append(row)

    return {"items": result, "days": days}


@router.get("/export")
def export_analytics(
    format: str = Query(default="csv", pattern="^(csv|pdf)$"),
    department: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _guard_analytics_access(current_user, department)
    feedbacks = _filtered_feedback(db, current_user, department)
    analytics = _build_analytics(feedbacks)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

    if format == "csv":
        buffer = StringIO()
        writer = csv.writer(buffer)
        writer.writerow(["metric", "key", "value"])
        writer.writerow(["total_feedback", "", analytics.total_feedback])
        for key, value in analytics.by_type.items():
            writer.writerow(["by_type", key, value])
        for key, value in analytics.by_status.items():
            writer.writerow(["by_status", key, value])
        for key, value in analytics.by_priority.items():
            writer.writerow(["by_priority", key, value])
        for key, value in analytics.top_categories.items():
            writer.writerow(["top_category", key, value])
        writer.writerow(["resolution", "average_resolution_hours", analytics.resolution.average_resolution_hours])
        writer.writerow(["resolution", "resolved_count", analytics.resolution.resolved_count])
        return Response(
            content=buffer.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="analytics_{timestamp}.csv"'},
        )

    pdf_buffer = BytesIO()
    pdf = canvas.Canvas(pdf_buffer, pagesize=A4)
    y = 800
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(40, y, "PAU Vox Analytics Report")
    y -= 30
    pdf.setFont("Helvetica", 11)
    pdf.drawString(40, y, f"Generated: {datetime.utcnow().isoformat()} UTC")
    y -= 30
    pdf.drawString(40, y, f"Total feedback: {analytics.total_feedback}")
    y -= 20
    for label, section in (
        ("By Type", analytics.by_type),
        ("By Status", analytics.by_status),
        ("By Priority", analytics.by_priority),
        ("Top Categories", analytics.top_categories),
    ):
        pdf.setFont("Helvetica-Bold", 11)
        pdf.drawString(40, y, label)
        y -= 18
        pdf.setFont("Helvetica", 10)
        for key, value in section.items():
            pdf.drawString(60, y, f"{key}: {value}")
            y -= 14
            if y < 80:
                pdf.showPage()
                y = 800
    pdf.drawString(40, y, f"Avg resolution (hours): {analytics.resolution.average_resolution_hours}")
    y -= 14
    pdf.drawString(40, y, f"Resolved count: {analytics.resolution.resolved_count}")
    pdf.save()
    pdf_buffer.seek(0)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="analytics_{timestamp}.pdf"'},
    )
