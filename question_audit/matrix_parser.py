"""Helpers for parsing and rendering matrix-like question text."""

from __future__ import annotations

import html
import re
from typing import List, Optional


BRACKET_WRAP_RE = re.compile(r"^\[([\s\S]+)\]$")


def clean_row(text: str) -> str:
    text = text.strip()
    text = text.replace("⇒", "|").replace("=>", "|")
    text = text.replace(":", " ")
    return text.strip()


def remove_row_label(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^ligne\s*\d+\s*[:\-]?", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^row\s*\d+\s*[:\-]?", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^\d+\s*(?:\)|\.|\:)", "", text)
    text = re.sub(r"^\((.*)\)$", r"\1", text)
    return text.strip()


def parse_matrix_text(value: str) -> Optional[List[List[str]]]:
    """Attempt to parse matrix-like strings into rows/columns.

    Returns:
        List of rows with string cells or None when parsing fails.
    """
    if not value:
        return None

    text = value.strip()
    match = BRACKET_WRAP_RE.match(text)
    if match:
        text = match.group(1)

    text = text.replace("Ligne", "Ligne ").replace("ligne", "ligne ")
    raw_rows = [segment.strip() for segment in re.split(r";|\n", text) if segment.strip()]
    if not raw_rows:
        return None

    rows: List[List[str]] = []
    max_cols = 0

    for raw in raw_rows:
        cleaned = clean_row(raw)
        cleaned = remove_row_label(cleaned)
        cells = [cell for cell in re.split(r"\||,", cleaned) if cell.strip()]

        if len(cells) == 1:
            cells = cleaned.split()

        cells = [cell.strip() for cell in cells if cell.strip()]
        if not cells:
            continue

        max_cols = max(max_cols, len(cells))
        rows.append(cells)

    if len(rows) < 2:
        return None

    # Normalize row lengths
    for row in rows:
        if len(row) < max_cols:
            row.extend([""] * (max_cols - len(row)))

    return rows if rows else None


def render_html_table(rows: List[List[str]]) -> str:
    """Return HTML table markup for the rows."""
    html_rows = []
    for row in rows:
        cols = "".join(f"<td>{html.escape(cell)}</td>" for cell in row)
        html_rows.append(f"<tr>{cols}</tr>")
    return "<table class='matrix-table'>\n" + "\n".join(html_rows) + "\n</table>"
