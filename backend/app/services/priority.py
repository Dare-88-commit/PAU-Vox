from app.models.enums import FeedbackPriority
from app.ai.urgency import UrgencyModel

_MODEL: UrgencyModel | None = None
_MODEL_ERROR: Exception | None = None
EMERGENCY_KEYWORDS = {
    "fire",
    "smoke",
    "explosion",
    "gas leak",
    "dying",
    "unconscious",
    "fainted",
    "collapsed",
    "assault",
    "attack",
    "threat",
    "emergency",
    "bleeding",
    "injury",
    "accident",
    "stroke",
    "seizure",
    "knife",
    "gun",
    "help me",
}

LABEL_MAP = {
    "High": FeedbackPriority.high,
    "Medium": FeedbackPriority.medium,
    "Low": FeedbackPriority.low,
}


def _load_model() -> UrgencyModel | None:
    global _MODEL, _MODEL_ERROR
    if _MODEL:
        return _MODEL
    if _MODEL_ERROR is not None:
        return None
    try:
        _MODEL = UrgencyModel()
        return _MODEL
    except Exception as exc:
        _MODEL_ERROR = exc
        return None


def detect_priority(text: str) -> FeedbackPriority:
    lower = text.lower()
    if any(keyword in lower for keyword in EMERGENCY_KEYWORDS):
        return FeedbackPriority.high
    model = _load_model()
    if model is None:
        # Fallback: if model can't load, return medium to avoid hard failure.
        return FeedbackPriority.medium
    prediction = model.predict(text)
    return LABEL_MAP.get(prediction, FeedbackPriority.medium)
