import enum


class UserRole(str, enum.Enum):
    student = "student"
    academic_staff = "academic_staff"
    course_coordinator = "course_coordinator"
    dean = "dean"
    student_affairs = "student_affairs"
    head_student_affairs = "head_student_affairs"
    head_security = "head_security"
    security_supervisor = "security_supervisor"
    security_staff = "security_staff"
    head_maintenance = "head_maintenance"
    maintenance_staff = "maintenance_staff"
    head_facilities = "head_facilities"
    facilities_staff = "facilities_staff"
    head_cafeteria = "head_cafeteria"
    cafeteria_staff = "cafeteria_staff"
    facilities_management = "facilities_management"
    facilities_account = "facilities_account"
    department_head = "department_head"
    university_management = "university_management"
    ict_admin = "ict_admin"


class FeedbackType(str, enum.Enum):
    academic = "academic"
    non_academic = "non_academic"


class FeedbackStatus(str, enum.Enum):
    pending = "pending"
    in_review = "in_review"
    assigned = "assigned"
    working = "working"
    resolved = "resolved"
    rejected = "rejected"


class FeedbackPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
<<<<<<< HEAD
    
=======
    urgent = "urgent"
>>>>>>> 729e00501dbbf5426a5acc6f287fc9fd111f666a


class NotificationType(str, enum.Enum):
    info = "info"
    success = "success"
    warning = "warning"
    error = "error"


class SurveyType(str, enum.Enum):
    general = "general"
    hostel = "hostel"


class AccountDeletionStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
