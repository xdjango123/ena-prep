#!/usr/bin/env python3
"""Detect CG answer options that look English."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Dict, List

from question_audit.db import dump_json, fetch_questions, get_supabase_client
from question_audit.language import detect_language_scores
from question_audit.logging_utils import info
from question_audit.text_utils import preview


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--category",
        default="CG",
        help="Category to inspect (default: CG)",
    )
    parser.add_argument(
        "--english-threshold",
        type=float,
        default=0.4,
        help="Minimum English probability for flagging (default: 0.4)",
    )
    parser.add_argument(
        "--output",
        default="diagnostics_output/cg_option_language.json",
        help="Path for JSON report (default: diagnostics_output/cg_option_language.json)",
    )
    return parser.parse_args()


def language_scores(text: str) -> Dict[str, float]:
    scores: Dict[str, float] = {}
    for lang in detect_language_scores(text):
        scores[lang.lang] = max(scores.get(lang.lang, 0.0), lang.prob)
    return scores


def main() -> None:
    args = parse_args()
    info("Connecting to Supabase...")
    client = get_supabase_client()

    info(f"Fetching questions in category {args.category}")
    rows = fetch_questions(
        client,
        columns=[
            "id",
            "question_text",
            "answer1",
            "answer2",
            "answer3",
            "answer4",
            "exam_type",
            "difficulty",
            "sub_category",
        ],
        filters={"category": args.category},
    )

    flagged: List[Dict[str, object]] = []
    options = ["answer1", "answer2", "answer3", "answer4"]

    for row in rows:
        for index, key in enumerate(options):
            text = (row.get(key) or "").strip()
            if not text:
                continue
            scores = language_scores(text)
            english_prob = scores.get("en", 0.0)
            french_prob = scores.get("fr", 0.0)
            if english_prob >= args.english_threshold:
                flagged.append(
                    {
                        "question_id": row["id"],
                        "option": chr(ord("A") + index),
                        "option_key": key,
                        "option_text": text,
                        "english_confidence": round(english_prob, 4),
                        "french_confidence": round(french_prob, 4),
                        "question_preview": preview(row.get("question_text", "")),
                        "exam_type": row.get("exam_type"),
                        "difficulty": row.get("difficulty"),
                        "sub_category": row.get("sub_category"),
                    }
                )

    report_path = Path(args.output)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    dump_json(os.fspath(report_path), flagged)
    info(
        f"Audit complete. {len(flagged)} options flagged as English. "
        f"Report saved to {report_path}."
    )


if __name__ == "__main__":
    main()

