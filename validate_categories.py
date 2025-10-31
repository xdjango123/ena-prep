#!/usr/bin/env python3
"""Identify questions categorized as CG that look like ANG."""

from __future__ import annotations

import argparse
from pathlib import Path
import os
from typing import Dict, List

from question_audit.db import dump_json, fetch_questions, get_supabase_client
from question_audit.language import detect_language_scores
from question_audit.logging_utils import info
from question_audit.text_utils import flatten_options, preview


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source-category",
        default="CG",
        help="Category to review (default: CG)",
    )
    parser.add_argument(
        "--suggested-category",
        default="ANG",
        help="Target category to suggest when English detected (default: ANG)",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.7,
        help="Minimum English probability for flagging (default: 0.7)",
    )
    parser.add_argument(
        "--output-dir",
        default="diagnostics_output",
        help="Directory for JSON reports (default: diagnostics_output)",
    )
    return parser.parse_args()


def english_confidence(text: str) -> float:
    for lang in detect_language_scores(text):
        if lang.lang == "en":
            return lang.prob
    return 0.0


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    info("Connecting to Supabase...")
    client = get_supabase_client()

    info(f"Fetching questions in category {args.source_category}")
    rows = fetch_questions(
        client,
        columns=[
            "id",
            "category",
            "question_text",
            "answer1",
            "answer2",
            "answer3",
            "answer4",
            "exam_type",
            "difficulty",
            "sub_category",
        ],
        filters={"category": args.source_category},
    )

    flagged: List[Dict[str, object]] = []
    for row in rows:
        combined_text = " ".join(
            [
                row.get("question_text") or "",
                flatten_options(
                    [
                        row.get("answer1"),
                        row.get("answer2"),
                        row.get("answer3"),
                        row.get("answer4"),
                    ]
                ),
            ]
        )
        confidence = english_confidence(combined_text)
        if confidence >= args.threshold:
            flagged.append(
                {
                    "question_id": row["id"],
                    "current_category": row.get("category"),
                    "suggested_category": args.suggested_category,
                    "confidence": round(confidence, 4),
                    "question_preview": preview(row.get("question_text", "")),
                    "exam_type": row.get("exam_type"),
                    "difficulty": row.get("difficulty"),
                    "sub_category": row.get("sub_category"),
                }
            )

    dump_json(os.fspath(output_dir / "miscategorized_questions.json"), flagged)
    summary = {
        "reviewed": len(rows),
        "flagged": len(flagged),
    }
    dump_json(os.fspath(output_dir / "miscategorized_questions_summary.json"), summary)
    info("Category validation complete.")


if __name__ == "__main__":
    main()
