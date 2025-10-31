"""Shared Supabase connector helpers for question diagnostics scripts."""

from __future__ import annotations

import json
import os
import functools
import inspect
from typing import Any, Dict, Iterable, List, Optional

from supabase import Client, create_client

DEFAULT_SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
DEFAULT_SUPABASE_SERVICE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhu"
    "YndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMD"
    "Y3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"
)


class SupabaseConfigError(RuntimeError):
    """Raised when required Supabase credentials are missing."""


def get_supabase_client() -> Client:
    """Create and return a Supabase client using environment variables.
    Falls back to the default project credentials when env vars are not set.

    Raises:
        SupabaseConfigError: If credentials are not available.
    """
    url = os.getenv("SUPABASE_URL") or DEFAULT_SUPABASE_URL
    key = os.getenv("SUPABASE_SERVICE_KEY") or DEFAULT_SUPABASE_SERVICE_KEY

    if not url or not key:
        raise SupabaseConfigError(
            "Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables "
            "before running the diagnostics scripts."
        )

    return create_client(url, key)


def fetch_questions(
    client: Client,
    columns: Optional[Iterable[str]] = None,
    filters: Optional[Dict[str, Any]] = None,
    chunk_size: int = 1000,
) -> List[Dict[str, Any]]:
    """Fetch question rows with optional column selection and filters.

    Args:
        client: Supabase client.
        columns: Optional iterable of column names to select.
        filters: Mapping of column -> value or callable applying to the query.
        chunk_size: Batch size for pagination.

    Returns:
        List of questions as dictionaries.
    """
    results: List[Dict[str, Any]] = []
    offset = 0
    total_count: Optional[int] = None
    select_clause = ", ".join(columns) if columns else "*"

    while True:
        query = client.table("questions").select(select_clause, count="exact")
        if filters:
            for column, value in filters.items():
                if inspect.isfunction(value) or inspect.ismethod(value) or isinstance(value, functools.partial):
                    query = value(query)
                else:
                    query = query.eq(column, value)

        page = query.range(offset, offset + chunk_size - 1).execute()
        data = page.data or []
        if total_count is None:
            total_count = getattr(page, "count", None)
        results.extend(data)

        fetched = len(data)
        if fetched == 0:
            break

        offset += fetched
        if total_count is not None and offset >= total_count:
            break

        if fetched < chunk_size and total_count is None:
            break

    return results


def dump_json(path: str, payload: Any) -> None:
    """Write payload to disk with UTF-8 encoding and readable formatting."""
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
