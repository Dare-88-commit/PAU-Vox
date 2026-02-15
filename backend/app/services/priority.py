from app.models.enums import FeedbackPriority

URGENT_KEYWORDS = {"urgent", "danger", "fire", "flood", "emergency", "threat", "assault", "injury"}
HIGH_KEYWORDS = {"broken", "not working", "critical", "severe", "serious"}


def detect_priority(text: str) -> FeedbackPriority:
    lower = text.lower()
    if any(keyword in lower for keyword in URGENT_KEYWORDS):
        return FeedbackPriority.urgent
    if any(keyword in lower for keyword in HIGH_KEYWORDS):
        return FeedbackPriority.high
    return FeedbackPriority.medium
