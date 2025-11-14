#!/usr/bin/env python3
"""
Update Supabase question fields (e.g., test_type, test_number) based on a local JSON file.

Usage:
    python scripts/update_question_fields.py \
        --input ai_validated_questions/cm_examen_ready_testnumber.json \
        --set-test-type examen_blanc \
        --set-test-number 10

Fields are matched via the SHA-256 hash of `question_text`, so the JSON must contain
the exact text that was inserted previously.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Dict, List, Optional

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from question_audit.db import get_supabase_client, SupabaseConfigError  # type: ignore


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def load_questions(path: Path) -> List[Dict[str, object]]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise SystemExit(f"{path} must contain a list of question objects.")
    return data


def extract_payload(entry: Dict[str, object]) -> Dict[str, object]:
    if "question_data" in entry and isinstance(entry["question_data"], dict):
        return entry["question_data"]
    return entry


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        required=True,
        help="JSON file containing the questions that should be updated.",
    )
    parser.add_argument(
        "--set-test-type",
        help="Update the `test_type` field to this value. If omitted, the payload value is ignored.",
    )
    parser.add_argument(
        "--set-test-number",
        type=int,
        help="Force the `test_number` to this integer for all entries.",
    )
    parser.add_argument(
        "--use-payload-test-number",
        action="store_true",
        help="Use the `test_number` present in each question payload when updating Supabase.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview the updates without touching Supabase.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.set_test_type and args.set_test_number is None and not args.use_payload_test_number:
        raise SystemExit(
            "Specify --set-test-type, --set-test-number, or --use-payload-test-number."
        )

    entries = load_questions(Path(args.input))

    try:
        client = get_supabase_client()
    except SupabaseConfigError as exc:
        raise SystemExit(f"Supabase credentials missing: {exc}") from exc

    total = 0
    for entry in entries:
        payload = extract_payload(entry)
        question_text = payload.get("question_text")
        if not question_text:
            continue
        update_fields: Dict[str, object] = {}
        if args.set_test_type:
            update_fields["test_type"] = args.set_test_type
        if args.set_test_number is not None:
            update_fields["test_number"] = args.set_test_number
        elif args.use_payload_test_number and payload.get("test_number") is not None:
            update_fields["test_number"] = payload["test_number"]
        if not update_fields:
            continue

        unique_hash = sha256(question_text)
        total += 1
        if args.dry_run:
            print(f"[dry-run] Would update hash {unique_hash} -> {update_fields}")
            continue
        resp = (
            client.table("questions")
            .update(update_fields)
               .eq("unique_hash", unique_hash)
               .execute()
        )
        updated = len(resp.data or [])
        print(f"[{total}] Updated hash {unique_hash}: {updated} row(s)")

    print(f"\nProcessed {total} question(s).")


if __name__ == "__main__":
    main()
