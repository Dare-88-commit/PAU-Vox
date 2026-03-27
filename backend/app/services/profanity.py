from __future__ import annotations

import os
from typing import Iterable

import joblib

BLOCKED_WORDS = {
    "damn",
    "hell",
    "stupid",
    "idiot",
    "fool",
    "crap",
    "suck",
}

_MODEL = None
_MODEL_ERROR: Exception | None = None
_PROFANITY_THRESHOLD = 0.70


def _load_model():
    global _MODEL, _MODEL_ERROR
    if _MODEL is not None:
        return _MODEL
    if _MODEL_ERROR is not None:
        return None
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(base_dir, "../ai/profanity_model.pkl")
        model_path = os.path.normpath(model_path)
        if not os.path.exists(model_path):
            raise FileNotFoundError(model_path)
        _MODEL = joblib.load(model_path)
        return _MODEL
    except Exception as exc:
        _MODEL_ERROR = exc
        return None


def _rule_based(text: str, blocked_words: Iterable[str] = BLOCKED_WORDS) -> bool:
    lower = text.lower()
    return any(word in lower for word in blocked_words)


def contains_profanity(text: str, blocked_words: Iterable[str] = BLOCKED_WORDS) -> bool:
    model = _load_model()
    if model is None:
        return _rule_based(text, blocked_words)
    try:
        if hasattr(model, "predict_proba"):
            prob = model.predict_proba([text])[0][1]
            return prob >= _PROFANITY_THRESHOLD
        pred = model.predict([text])
        return bool(pred[0])
    except Exception:
        return _rule_based(text, blocked_words)
