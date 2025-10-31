"""Shared text helpers for diagnostics scripts."""

from __future__ import annotations

import re
import unicodedata
from typing import Iterable

WHITESPACE_RE = re.compile(r"\s+")


def normalize_text(value: str, keep_case: bool = False) -> str:
    """Normalize text for comparison."""
    if value is None:
        return ""

    text = unicodedata.normalize("NFKD", value)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.strip()
    text = WHITESPACE_RE.sub(" ", text)

    return text if keep_case else text.lower()


def token_signature(value: str) -> str:
    """Return signature string for duplicate detection."""
    sanitized = normalize_text(value)
    sanitized = re.sub(r"[^a-z0-9]+", " ", sanitized)
    tokens = sanitized.split()
    return " ".join(tokens)


def preview(value: str, length: int = 120) -> str:
    """Return a truncated preview string."""
    if not value:
        return ""

    snippet = value.strip().replace("\n", " ")
    if len(snippet) <= length:
        return snippet

    return snippet[: length - 1] + "…"


def flatten_options(options: Iterable[str]) -> str:
    """Flatten multiple answer strings."""
    return " ".join(opt or "" for opt in options)
