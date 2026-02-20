DEPARTMENTS = [
    "Data Science",
    "Computer Science",
    "Software Engineering",
    "Mechatronics Engineering",
    "Mechanical Engineering",
    "Electrical Engineering",
    "Finance",
    "Business Administration",
    "Economics",
    "Accounting",
    "Mass Communication",
    "ISMS (Information and Media Studies)",
    "Film and Multimedia Studies",
    "Strategic Communication",
]

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


def is_valid_department(value: str | None) -> bool:
    if value is None:
        return False
    return value in DEPARTMENTS


def is_valid_hostel(value: str | None) -> bool:
    if value is None:
        return False
    return value in ALL_HOSTELS
