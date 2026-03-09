from app.core.catalog import department_school, non_academic_units_for_category, parse_departments_scope, parse_schools_scope, role_unit
from app.models.enums import FeedbackType, UserRole
from app.models.feedback import Feedback
from app.models.user import User


ACADEMIC_DEPARTMENT_ROLES = {UserRole.academic_staff, UserRole.department_head, UserRole.course_coordinator}
NON_ACADEMIC_SPECIAL_ROLES = {UserRole.student_affairs, UserRole.head_student_affairs}


def _academic_scope_match(user: User, feedback: Feedback) -> bool:
    if feedback.type != FeedbackType.academic or not feedback.department:
        return False
    if user.role == UserRole.dean:
        dean_schools = set(parse_schools_scope(user.department))
        return department_school(feedback.department) in dean_schools
    if user.role in ACADEMIC_DEPARTMENT_ROLES:
        return feedback.department in set(parse_departments_scope(user.department))
    return False


def _non_academic_scope_match(user: User, feedback: Feedback) -> bool:
    if feedback.type != FeedbackType.non_academic:
        return False
    if user.role in NON_ACADEMIC_SPECIAL_ROLES:
        return True
    unit = role_unit(user.role.value)
    if not unit:
        return False
    return unit in non_academic_units_for_category(feedback.category)


def can_view_feedback(user: User, feedback: Feedback) -> bool:
    if user.role == UserRole.student:
        return feedback.student_id == user.id
    if user.role in ACADEMIC_DEPARTMENT_ROLES or user.role == UserRole.dean:
        return _academic_scope_match(user, feedback)
    if user.role in NON_ACADEMIC_SPECIAL_ROLES:
        return _non_academic_scope_match(user, feedback)
    if user.role in {
        UserRole.head_security,
        UserRole.security_supervisor,
        UserRole.security_staff,
        UserRole.head_maintenance,
        UserRole.maintenance_staff,
        UserRole.head_facilities,
        UserRole.facilities_staff,
        UserRole.head_cafeteria,
        UserRole.cafeteria_staff,
        UserRole.facilities_management,
        UserRole.facilities_account,
    }:
        return _non_academic_scope_match(user, feedback)
    if user.role in {UserRole.university_management, UserRole.ict_admin}:
        return False
    return False


def can_add_internal_note(user: User, feedback: Feedback) -> bool:
    if user.role in {UserRole.student, UserRole.university_management, UserRole.ict_admin}:
        return False
    return can_view_feedback(user, feedback)
