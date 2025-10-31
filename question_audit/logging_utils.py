"""Lightweight logging helpers for scripts."""

from __future__ import annotations

import datetime as _dt
from typing import Any


def ts() -> str:
    """Return current timestamp string."""
    return _dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def info(message: str) -> None:
    print(f"[{ts()}] INFO  {message}")


def warn(message: str) -> None:
    print(f"[{ts()}] WARN  {message}")


def error(message: str) -> None:
    print(f"[{ts()}] ERROR {message}")


def debug(message: str, enabled: bool) -> None:
    if enabled:
        print(f"[{ts()}] DEBUG {message}")
