from collections import Counter
from hashlib import sha1
import re

from sqlalchemy.orm import Session

from app.models.feedback import Feedback
from app.models.enums import FeedbackType

TOKEN_RE = re.compile(r"[a-zA-Z0-9]{3,}")


def _tokens(value: str) -> set[str]:
    return set(TOKEN_RE.findall(value.lower()))


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def detect_similarity_group(
    db: Session,
    feedback_type: FeedbackType,
    category: str,
    subject: str,
    description: str,
) -> str | None:
    incoming_tokens = _tokens(f"{subject} {description}")
    candidates = (
        db.query(Feedback)
        .filter(Feedback.type == feedback_type, Feedback.category == category)
        .order_by(Feedback.created_at.desc())
        .limit(100)
        .all()
    )

    best_match: Feedback | None = None
    best_score = 0.0
    for candidate in candidates:
        score = _jaccard(incoming_tokens, _tokens(f"{candidate.subject} {candidate.description}"))
        if score > best_score:
            best_score = score
            best_match = candidate

    if best_match and best_score >= 0.35:
        return best_match.similarity_group or f"grp_{best_match.id}"

    normalized = " ".join(sorted(Counter(incoming_tokens).keys()))
    if not normalized:
        return None
    return f"grp_{sha1(normalized.encode('utf-8')).hexdigest()[:16]}"
