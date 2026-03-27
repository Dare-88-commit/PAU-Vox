from hashlib import sha1

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.orm import Session

from app.models.feedback import Feedback
from app.models.enums import FeedbackType

SIMILARITY_THRESHOLD = 0.35


def _normalize_text(value: str) -> str:
    return " ".join(value.lower().split())


def _tfidf_similarity_scores(incoming: str, candidates: list[str]) -> list[float]:
    if not candidates:
        return []
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english")
    all_texts = [incoming] + candidates
    matrix = vectorizer.fit_transform(all_texts)
    sims = cosine_similarity(matrix[0:1], matrix[1:]).flatten()
    return sims.tolist()

def detect_similarity_group(
    db: Session,
    feedback_type: FeedbackType,
    category: str,
    subject: str,
    description: str,
) -> str | None:
    incoming_text = _normalize_text(f"{subject} {description}")
    if not incoming_text:
        return None
    candidates = (
        db.query(Feedback)
        .filter(Feedback.type == feedback_type, Feedback.category == category)
        .order_by(Feedback.created_at.desc())
        .limit(100)
        .all()
    )

    candidate_texts = [
        _normalize_text(f"{candidate.subject} {candidate.description}")
        for candidate in candidates
    ]

    scores = _tfidf_similarity_scores(incoming_text, candidate_texts)

    best_match: Feedback | None = None
    best_score = 0.0
    for candidate, score in zip(candidates, scores):
        if score > best_score:
            best_score = score
            best_match = candidate

    if best_match and best_score >= SIMILARITY_THRESHOLD:
        if not best_match.similarity_group:
            best_match.similarity_group = f"grp_{best_match.id}"
            db.commit()
        return best_match.similarity_group

    return f"grp_{sha1(incoming_text.encode('utf-8')).hexdigest()[:16]}"
