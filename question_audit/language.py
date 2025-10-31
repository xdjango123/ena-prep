"""Language detection helpers."""

from __future__ import annotations

from langdetect import DetectorFactory, LangDetectException, detect_langs

DetectorFactory.seed = 42


def detect_language_scores(text: str):
    """Return language probability results for text."""
    if not text or not text.strip():
        return []

    try:
        return detect_langs(text)
    except LangDetectException:
        return []


def is_probably_english(text: str, threshold: float = 0.7) -> bool:
    """Return True when text is likely English."""
    for lang in detect_language_scores(text):
        if lang.lang == "en" and lang.prob >= threshold:
            return True
    return False


def is_probably_french(text: str, threshold: float = 0.6) -> bool:
    """Return True when text is likely French."""
    for lang in detect_language_scores(text):
        if lang.lang == "fr" and lang.prob >= threshold:
            return True
    return False
