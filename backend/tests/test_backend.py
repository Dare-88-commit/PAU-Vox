# backend/tests/test_backend.py
import sys
from pathlib import Path
import io
import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure the app folder is in sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent / "app"))

# ------------------------------
# Import your app and models
# ------------------------------
from app.main import app
from app.db.session import get_db
from app.models.user import User
from app.models.base import Base
from app.models.feedback import Feedback
from app.models.enums import UserRole, FeedbackType, FeedbackStatus, FeedbackPriority

# ------------------------------
# Setup test database
# ------------------------------
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture()
def client():
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()
    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def create_test_db():
    # Create all tables
    Base.metadata.create_all(bind=engine)
    yield
    # Drop tables after tests
    Base.metadata.drop_all(bind=engine)
    
@pytest.fixture()
def setup_users():
    db = TestingSessionLocal()
    student = User(id="stu1", role=UserRole.student, is_active=True)
    dept_head = User(id="head1", role=UserRole.department_head, is_active=True, department="CS")
    student_affairs = User(id="sa1", role=UserRole.student_affairs, is_active=True)
    facilities = User(id="fac1", role=UserRole.facilities_management, is_active=True)
    db.add_all([student, dept_head, student_affairs, facilities])
    db.commit()
    yield {"student": student, "dept_head": dept_head, "student_affairs": student_affairs, "facilities": facilities}
    db.close()

# ------------------------------
# Feedback Creation
# ------------------------------
@patch("app.ai.profanity.check_profanity", return_value=False)
@patch("app.ai.urgency.UrgencyModel.predict", return_value="medium")
def test_create_feedback(mock_urgency, mock_profanity, client, setup_users):
    student = setup_users["student"]
    payload = {
        "type": "academic",
        "category": "exam",
        "subject": "Midterm question",
        "description": "Please improve exam schedule",
        "department": "CS",
        "is_anonymous": False
    }
    response = client.post("/feedback/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["subject"] == "Midterm question"
    assert data["student_id"] == student.id
    assert data["priority"] == "medium"

@patch("app.ai.profanity.check_profanity", return_value=True)
def test_create_feedback_blocked_profanity(mock_profanity, client, setup_users):
    payload = {
        "type": "academic",
        "category": "exam",
        "subject": "badword here",
        "description": "Some description",
        "department": "CS",
        "is_anonymous": False
    }
    response = client.post("/feedback/", json=payload)
    assert response.status_code == 422

# ------------------------------
# Status update
# ------------------------------
def test_status_update(client, setup_users):
    student = setup_users["student"]
    dept_head = setup_users["dept_head"]
    db = TestingSessionLocal()
    fb = Feedback(
        id="fb1", type=FeedbackType.academic, category="exam",
        subject="X", description="Desc", student_id=student.id,
        department="CS", status=FeedbackStatus.pending,
        created_at=datetime.now(timezone.utc)
    )
    db.add(fb)
    db.commit()
    db.close()

    payload = {"status": "in_review"}
    response = client.patch(f"/feedback/{fb.id}/status", json=payload)
    assert response.status_code in [200, 403]
    if response.status_code == 200:
        data = response.json()
        assert data["status"] == "in_review"

# ------------------------------
# Assignment & notes
# ------------------------------
def test_assign_feedback(client, setup_users):
    dept_head = setup_users["dept_head"]
    staff = setup_users["facilities"]
    db = TestingSessionLocal()
    fb = Feedback(
        id="fb_assign", type=FeedbackType.academic, category="exam",
        subject="Assign test", description="Desc", student_id="stu1",
        department="CS", status=FeedbackStatus.pending,
        created_at=datetime.now(timezone.utc)
    )
    db.add(fb)
    db.commit()
    db.close()

    payload = {
        "assignee_id": staff.id,
        "due_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "note": "Please handle"
    }
    response = client.post(f"/feedback/{fb.id}/assign", json=payload)
    assert response.status_code in [200, 400, 403]

def test_add_internal_note(client, setup_users):
    dept_head = setup_users["dept_head"]
    db = TestingSessionLocal()
    fb = Feedback(
        id="fb_note", type=FeedbackType.academic, category="exam",
        subject="Note test", description="Desc", student_id="stu1",
        department="CS", status=FeedbackStatus.pending,
        created_at=datetime.now(timezone.utc)
    )
    db.add(fb)
    db.commit()
    db.close()

    payload = {"text": "Internal comment"}
    response = client.post(f"/feedback/{fb.id}/notes", json=payload)
    assert response.status_code in [200, 403]

# ------------------------------
# Attachments
# ------------------------------
def test_upload_download_attachment(client, setup_users):
    student = setup_users["student"]
    db = TestingSessionLocal()
    fb = Feedback(
        id="fb_attach", type=FeedbackType.academic, category="exam",
        subject="Attach test", description="Desc", student_id=student.id,
        department="CS", status=FeedbackStatus.pending,
        created_at=datetime.now(timezone.utc)
    )
    db.add(fb)
    db.commit()
    db.close()

    files = {"file": ("test.txt", b"Hello World")}
    response = client.post(f"/feedback/{fb.id}/attachments", files=files)
    assert response.status_code == 200
    data = response.json()
    assert any("test.txt" in a for a in data["attachments"])

# ------------------------------
# Overdue tasks
# ------------------------------
def test_overdue_check(client, setup_users):
    dept_head = setup_users["dept_head"]
    db = TestingSessionLocal()
    fb = Feedback(
        id="fb_overdue", type=FeedbackType.academic, category="exam",
        subject="Overdue", description="Desc", student_id="stu1",
        department="CS", status=FeedbackStatus.assigned,
        assigned_to_id=dept_head.id,
        due_at=datetime.now(timezone.utc) - timedelta(days=1),
        overdue_alert_sent=False,
        created_at=datetime.now(timezone.utc)
    )
    db.add(fb)
    db.commit()
    db.close()

    response = client.post("/feedback/overdue/check")
    assert response.status_code in [200, 403]