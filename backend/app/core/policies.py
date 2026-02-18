from app.models.enums import FeedbackType, UserRole
from app.models.feedback import Feedback
from app.models.user import User


def can_view_feedback(user: User, feedback: Feedback) -> bool:
    if user.role == UserRole.student:
        return feedback.student_id == user.id
    if user.role == UserRole.academic_staff:
        return feedback.type == FeedbackType.academic and feedback.department == user.department
    if user.role == UserRole.department_head:
        return feedback.type == FeedbackType.academic and feedback.department == user.department
    if user.role == UserRole.student_affairs:
        return feedback.type == FeedbackType.non_academic
    if user.role == UserRole.facilities_management:
        return feedback.type == FeedbackType.non_academic
    if user.role in {UserRole.university_management, UserRole.ict_admin}:
        return False
    return False


def can_add_internal_note(user: User, feedback: Feedback) -> bool:
    if user.role in {UserRole.student, UserRole.university_management, UserRole.ict_admin}:
        return False
    return can_view_feedback(user, feedback) or (
        user.role == UserRole.student_affairs and feedback.type == FeedbackType.non_academic
    )
