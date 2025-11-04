#!/usr/bin/env python3
"""Process flagged questions (incorrect answers, unclear text) and prepare fixes.

Reads diagnostics_output/flag_summary.json, fetches the corresponding questions
from Supabase, groups them by issue, and writes a single consolidated report
with summary counts plus full question payloads. When invoked with --apply the
script also backs up and deletes the flagged rows so they can be regenerated.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if os.fspath(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, os.fspath(PROJECT_ROOT))

from question_audit.db import SupabaseConfigError, fetch_questions, get_supabase_client  # type: ignore
from question_audit.logging_utils import info, warn  # type: ignore

DIAGNOSTICS_DIR = PROJECT_ROOT / "diagnostics_output"
DEFAULT_INPUT = DIAGNOSTICS_DIR / "flag_summary.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        default=os.fspath(DEFAULT_INPUT),
        help="Path to flag_summary.json (default: diagnostics_output/flag_summary.json)",
    )
    parser.add_argument(
        "--output",
        default=os.fspath(DIAGNOSTICS_DIR / "question_fix_summary.json"),
        help="Path for consolidated output JSON (default: diagnostics_output/question_fix_summary.json)",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Backup and delete the flagged questions from Supabase",
    )
    parser.add_argument(
        "--backup-dir",
        default=os.fspath(PROJECT_ROOT / "backups"),
        help="Directory for Supabase backup file when --apply is used",
    )
    return parser.parse_args()


def load_flag_summary(path: str) -> List[Dict[str, object]]:
    if not os.path.exists(path):
        raise FileNotFoundError(f"Flag summary file not found: {path}")
    with open(path, "r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise ValueError(f"Expected list in {path}, got {type(data)}")
    return data


def fetch_question_map(ids: List[str]) -> Dict[str, Dict[str, object]]:
    client = get_supabase_client()
    question_map: Dict[str, Dict[str, object]] = {}
    chunk = 200
    for idx in range(0, len(ids), chunk):
        batch = ids[idx : idx + chunk]
        response = (
            client.table("questions")
            .select(
                "id, question_text, answer1, answer2, answer3, answer4, correct, explanation, "
                "category, exam_type, difficulty, test_type, sub_category"
            )
            .in_("id", batch)
            .execute()
        )
        for row in response.data or []:
            question_map[row["id"]] = row
    return question_map


def write_report(
    issues: List[Dict[str, object]],
    question_map: Dict[str, Dict[str, object]],
    output_path: Path,
) -> Dict[str, object]:
    summary: Dict[str, int] = {}
    questions: List[Dict[str, object]] = []

    for entry in issues:
        question_id = entry.get("question_id")
        issue_type = entry.get("issue", "unknown")
        summary[issue_type] = summary.get(issue_type, 0) + 1

        question_payload = question_map.get(str(question_id))
        questions.append(
            {
                "question_id": question_id,
                "issue": issue_type,
                "details": entry.get("details"),
                "validation": entry.get("validation"),
                "question": question_payload,
            }
        )

    payload = {
        "generated_at": datetime.utcnow().isoformat(),
        "total_flagged": len(issues),
        "summary": summary,
        "questions": questions,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    return payload


def backup_questions(
    questions: List[Dict[str, object]],
    backup_dir: Path,
) -> Path:
    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    path = backup_dir / f"flagged_questions_backup_{timestamp}.json"
    with path.open("w", encoding="utf-8") as handle:
        json.dump(questions, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    return path


def apply_changes(
    client,
    questions: List[Dict[str, object]],
) -> None:
    for question in questions:
        question_id = question.get("id")
        if not question_id:
            continue
        client.table("questions").delete().eq("id", question_id).execute()
        info(f"Deleted question {question_id} (flagged for replacement)")


def main() -> None:
    args = parse_args()

    try:
        issues = load_flag_summary(args.input)
    except (FileNotFoundError, ValueError) as exc:
        warn(str(exc))
        return

    if not issues:
        info("No issues found in flag_summary.json")
        return

    try:
        client = get_supabase_client()
    except SupabaseConfigError as exc:
        warn(str(exc))
        return

    question_ids = [str(item["question_id"]) for item in issues if item.get("question_id")]
    question_map = fetch_question_map(question_ids)

    report = write_report(issues, question_map, Path(args.output))
    info(
        f"Report written to {args.output} "
        f"(flagged: {report['total_flagged']}, summary: {report['summary']})"
    )

    if not args.apply:
        info("Dry-run mode: no changes applied.")
        return

    missing = [qid for qid in question_ids if qid not in question_map]
    if missing:
        warn(f"{len(missing)} question IDs not found in Supabase; skipping deletion.")

    questions_to_remove = [question_map[qid] for qid in question_ids if qid in question_map]
    backup_path = backup_questions(questions_to_remove, Path(args.backup_dir))
    info(f"Backup saved to {backup_path}")

    apply_changes(client, questions_to_remove)
    info("Flagged questions deleted from Supabase.")


if __name__ == "__main__":
    main()
