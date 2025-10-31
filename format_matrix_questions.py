#!/usr/bin/env python3
"""Detect LOG matrix-style questions and propose HTML formatting."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Dict, List, Optional

from question_audit.db import dump_json, fetch_questions, get_supabase_client
from question_audit.logging_utils import info
from question_audit.matrix_parser import parse_matrix_text, render_html_table
from question_audit.text_utils import preview


KEYWORDS = ("matrice", "ligne", "[", "|", "⇒", "->", "→")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output-dir",
        default="diagnostics_output",
        help="Directory for JSON reports (default: diagnostics_output)",
    )
    parser.add_argument(
        "--keywords",
        nargs="*",
        default=KEYWORDS,
        help="Override keywords used to detect matrix questions",
    )
    return parser.parse_args()


def looks_like_matrix(text: str, keywords: List[str]) -> bool:
    lowered = (text or "").lower()
    return any(keyword in lowered for keyword in keywords)


def build_entry(row: Dict[str, str], rows: List[List[str]]) -> Dict[str, str]:
    html_table = render_html_table(rows)
    return {
        "question_id": row["id"],
        "exam_type": row.get("exam_type"),
        "question_preview": preview(row.get("question_text", "")),
        "structured_matrix": rows,
        "formatted_html": html_table,
        "display_suggestion": "Use MatrixDisplay component",
    }


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    info("Connecting to Supabase...")
    client = get_supabase_client()

    info("Fetching LOG questions for matrix analysis")
    rows = fetch_questions(
        client,
        columns=[
            "id",
            "question_text",
            "exam_type",
            "category",
            "sub_category",
        ],
        filters={"category": "LOG"},
    )

    flagged: List[Dict[str, object]] = []
    unmatched: List[Dict[str, str]] = []

    for row in rows:
        question_text = row.get("question_text") or ""
        if not looks_like_matrix(question_text, list(args.keywords)):
            continue

        parsed = parse_matrix_text(question_text)
        if parsed:
            flagged.append(build_entry(row, parsed))
        else:
            unmatched.append(
                {
                    "question_id": row["id"],
                    "question_preview": preview(question_text),
                }
            )

    dump_json(os.fspath(output_dir / "matrix_questions.json"), flagged)
    dump_json(os.fspath(output_dir / "matrix_questions_unmatched.json"), unmatched)
    info(f"Matrix questions parsed: {len(flagged)} | Unmatched patterns: {len(unmatched)}")


if __name__ == "__main__":
    main()
