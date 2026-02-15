from typing import Iterable

BLOCKED_WORDS = {
    "damn",
    "hell",
    "stupid",
    "idiot",
    "fool",
    "crap",
    "suck",
}


def contains_profanity(text: str, blocked_words: Iterable[str] = BLOCKED_WORDS) -> bool:
    lower = text.lower()
    return any(word in lower for word in blocked_words)
