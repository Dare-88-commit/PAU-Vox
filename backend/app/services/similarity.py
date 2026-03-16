from collections import Counter
from hashlib import sha1
import re

from sqlalchemy.orm import Session
<<<<<<< HEAD
=======

>>>>>>> 729e00501dbbf5426a5acc6f287fc9fd111f666a
from app.models.feedback import Feedback
from app.models.enums import FeedbackType

TOKEN_RE = re.compile(r"[a-zA-Z0-9]{3,}")
<<<<<<< HEAD
STOPWORDS = {"the", "and", "for", "with", "this", "that", "from"}

def _tokens(value: str) -> set[str]:
    return {t for t in TOKEN_RE.findall(value.lower()) if t not in STOPWORDS}
=======


def _tokens(value: str) -> set[str]:
    return set(TOKEN_RE.findall(value.lower()))

>>>>>>> 729e00501dbbf5426a5acc6f287fc9fd111f666a

def _jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)

<<<<<<< HEAD
=======

>>>>>>> 729e00501dbbf5426a5acc6f287fc9fd111f666a
def detect_similarity_group(
    db: Session,
    feedback_type: FeedbackType,
    category: str,
    subject: str,
    description: str,
) -> str | None:
    incoming_tokens = _tokens(f"{subject} {description}")
<<<<<<< HEAD
    if not incoming_tokens:
        return None

=======
>>>>>>> 729e00501dbbf5426a5acc6f287fc9fd111f666a
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
<<<<<<< HEAD
        if not best_match.similarity_group:
            best_match.similarity_group = f"grp_{best_match.id}"
            db.commit()
        return best_match.similarity_group

    normalized = " ".join(sorted(incoming_tokens))
    return f"grp_{sha1(normalized.encode('utf-8')).hexdigest()[:16]}"
=======
        return best_match.similarity_group or f"grp_{best_match.id}"

    normalized = " ".join(sorted(Counter(incoming_tokens).keys()))
    if not normalized:
        return None
    return f"grp_{sha1(normalized.encode('utf-8')).hexdigest()[:16]}"
>>>>>>> 729e00501dbbf5426a5acc6f287fc9fd111f666a
