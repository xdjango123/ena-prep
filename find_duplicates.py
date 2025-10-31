#!/usr/bin/env python3
"""Detect duplicate question texts within each exam_type."""

from __future__ import annotations

import argparse
import collections
import os
from pathlib import Path
from typing import Dict, List, Tuple

from question_audit.db import dump_json, fetch_questions, get_supabase_client
from question_audit.logging_utils import info
from question_audit.text_utils import preview, token_signature


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output-dir",
        default="diagnostics_output",
        help="Directory for JSON reports (default: diagnostics_output)",
    )
    return parser.parse_args()


def pick_keep_candidate(records: List[Dict[str, str]]) -> Tuple[str, str]:
    """Return keep_id and reasoning based on heuristics."""
    def score(record: Dict[str, str]) -> Tuple[int, int]:
        explanation = record.get("explanation") or ""
        length_score = len(explanation)
        has_answer4 = 1 if record.get("answer4") else 0
        return (length_score, has_answer4)

    sorted_records = sorted(
        records,
        key=lambda r: (score(r), r.get("created_at") or "", r["id"]),
        reverse=True,
    )
    keep = sorted_records[0]
    keep_id = keep["id"]
    reason = "Longest explanation/most complete answers"
    return keep_id, reason


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    info("Connecting to Supabase...")
    client = get_supabase_client()

    info("Fetching questions for duplicate analysis")
    rows = fetch_questions(
        client,
        columns=[
            "id",
            "question_text",
            "explanation",
            "exam_type",
            "category",
            "test_type",
            "difficulty",
            "answer1",
            "answer2",
            "answer3",
            "answer4",
            "created_at",
        ],
    )

    grouped: Dict[Tuple[str, str], List[Dict[str, str]]] = collections.defaultdict(list)

    for row in rows:
        exam_type = row.get("exam_type") or "UNKNOWN"
        signature = token_signature(row.get("question_text", ""))
        key = (exam_type, signature)
        grouped[key].append(row)

    duplicates_report: List[Dict[str, object]] = []
    summary_counts = collections.Counter()

    for (exam_type, signature), records in grouped.items():
        if len(records) <= 1:
            continue

        keep_id, reason = pick_keep_candidate(records)
        delete_ids = [record["id"] for record in records if record["id"] != keep_id]

        duplicates_report.append(
            {
                "exam_type": exam_type,
                "signature": signature,
                "question_text_preview": preview(records[0].get("question_text", "")),
                "keep_id": keep_id,
                "delete_ids": delete_ids,
                "candidates": [
                    {
                        "id": record["id"],
                        "category": record.get("category"),
                        "test_type": record.get("test_type"),
                        "difficulty": record.get("difficulty"),
                        "explanation_length": len(record.get("explanation") or ""),
                        "created_at": record.get("created_at"),
                    }
                    for record in records
                ],
                "reason": reason,
            }
        )
        summary_counts[exam_type] += len(delete_ids)

    dump_json(os.fspath(output_dir / "duplicate_questions.json"), duplicates_report)
    summary = {
        "total_duplicates": sum(summary_counts.values()),
        "by_exam_type": dict(summary_counts),
    }
    dump_json(os.fspath(output_dir / "duplicate_questions_summary.json"), summary)
    info("Duplicate analysis finished.")


if __name__ == "__main__":
    main()
