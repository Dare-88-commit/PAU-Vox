from __future__ import annotations

from collections import OrderedDict

SCHOOL_TO_DEPARTMENTS: dict[str, list[str]] = {
    "School of Science and Technology": [
        "Computer Science",
        "Software Engineering",
        "Electrical/Electronics Engineering",
        "Mechanical Engineering",
        "Data Science",
        "Mechatronics Engineering",
    ],
    "School of Media and Communication": [
        "Information and Media Studies",
        "Strategic Communication",
        "Mass Communication",
        "Film and Multimedia Studies",
    ],
    "School of Management and Social Sciences": [
        "Accounting",
        "Business Administration",
        "Economics",
        "Finance",
    ],
}

DEPARTMENTS = [
    department
    for departments in SCHOOL_TO_DEPARTMENTS.values()
    for department in departments
]

SCHOOLS = list(SCHOOL_TO_DEPARTMENTS.keys())
SCHOOL_ALIASES = {
    "School of Social Sciences": "School of Management and Social Sciences",
}

DEPARTMENT_TO_SCHOOL = {
    department: school
    for school, departments in SCHOOL_TO_DEPARTMENTS.items()
    for department in departments
}

ACADEMIC_FEEDBACK_CATEGORIES = [
    "Course Understanding",
    "Lecturer Teaching Quality",
    "Learning Exposure and New Content",
    "Assessment and Examination",
    "Course Delivery and Pace",
    "Department Administration",
    "Academic Advising",
    "Other",
]

NON_ACADEMIC_CATEGORY_TO_UNITS: OrderedDict[str, list[str]] = OrderedDict(
    [
        ("Campus Security", ["security"]),
        ("Hostel/Accommodation", ["maintenance", "facilities"]),
        ("Air Conditioning", ["maintenance"]),
        ("Electricity/Power", ["maintenance", "facilities"]),
        ("Water Supply", ["maintenance"]),
        ("Sanitation/Cleanliness", ["facilities", "maintenance"]),
        ("Cafeteria/Dining", ["cafeteria"]),
        ("Internet/Wi-Fi", ["facilities"]),
        ("Sports Facilities", ["facilities"]),
        ("Library", ["facilities"]),
        ("Transport", ["facilities"]),
        ("Student Welfare", ["facilities"]),
        ("Other", ["facilities"]),
    ]
)

NON_ACADEMIC_UNITS = ["security", "maintenance", "facilities", "cafeteria"]

UNIT_TO_HEAD_ROLE = {
    "security": "head_security",
    "maintenance": "head_maintenance",
    "facilities": "head_facilities",
    "cafeteria": "head_cafeteria",
}

UNIT_TO_STAFF_ROLES = {
    "security": {"security_supervisor", "security_staff"},
    "maintenance": {"maintenance_staff"},
    "facilities": {"facilities_staff", "facilities_management", "facilities_account"},
    "cafeteria": {"cafeteria_staff"},
}

MALE_HOSTELS = [
    "Faith Hall",
    "Amethyst Hall",
    "Emerald Hall",
    "Cooperative Kings Hall",
    "The POD Living Hall",
    "The Enterprise Hostel (EDC)",
]

FEMALE_HOSTELS = [
    "Pearl Hall",
    "Trinity Hall",
    "Cooperative Queens Hall",
    "Cedar House",
    "Trezadel Hall",
    "Queen Mary",
    "Redwood House",
]

ALL_HOSTELS = MALE_HOSTELS + FEMALE_HOSTELS


def normalize_department(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    return cleaned


def normalize_school(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    return SCHOOL_ALIASES.get(cleaned, cleaned)


def _split_scope_values(value: str | None) -> list[str]:
    if not value:
        return []
    raw = value.replace(";", ",").replace("|", ",")
    seen: set[str] = set()
    out: list[str] = []
    for item in raw.split(","):
        cleaned = item.strip()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            out.append(cleaned)
    return out


def parse_departments_scope(value: str | None) -> list[str]:
    return [item for item in _split_scope_values(value) if is_valid_department(item)]


def parse_schools_scope(value: str | None) -> list[str]:
    normalized = [normalize_school(item) for item in _split_scope_values(value)]
    return [item for item in normalized if is_valid_school(item)]


def stringify_scope(values: list[str]) -> str | None:
    return " | ".join(values) if values else None


def is_valid_department(value: str | None) -> bool:
    if value is None:
        return False
    return value in DEPARTMENTS


def is_valid_school(value: str | None) -> bool:
    if value is None:
        return False
    return normalize_school(value) in SCHOOLS


def department_school(department: str | None) -> str | None:
    if not department:
        return None
    return DEPARTMENT_TO_SCHOOL.get(department)


def school_departments(school: str | None) -> list[str]:
    if not school:
        return []
    return SCHOOL_TO_DEPARTMENTS.get(school, [])


def is_valid_hostel(value: str | None) -> bool:
    if value is None:
        return False
    return value in ALL_HOSTELS


def non_academic_units_for_category(category: str | None) -> set[str]:
    if not category:
        return set()
    return set(NON_ACADEMIC_CATEGORY_TO_UNITS.get(category, NON_ACADEMIC_CATEGORY_TO_UNITS["Other"]))


def role_unit(role_value: str | None) -> str | None:
    if not role_value:
        return None
    if role_value in {"head_security", "security_supervisor", "security_staff"}:
        return "security"
    if role_value in {"head_maintenance", "maintenance_staff"}:
        return "maintenance"
    if role_value in {"head_facilities", "facilities_staff", "facilities_management", "facilities_account"}:
        return "facilities"
    if role_value in {"head_cafeteria", "cafeteria_staff"}:
        return "cafeteria"
    return None
