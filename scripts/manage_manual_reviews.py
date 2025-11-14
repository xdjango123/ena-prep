#!/usr/bin/env python3
"""Utility helpers to inspect and resolve manual review candidates."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Dict, List

PROJECT_ROOT = Path(__file__).resolve().parents[1]
MANUAL_DIR = PROJECT_ROOT / "diagnostics_output" / "duplicates"
MANUAL_DIR.mkdir(parents=True, exist_ok=True)
CANDIDATES_PATH = MANUAL_DIR / "manual_review_candidates.json"
RESOLVED_PATH = MANUAL_DIR / "manual_review_resolved.csv"


def load_candidates() -> List[Dict[str, str]]:
    if not CANDIDATES_PATH.exists():
        return []
    with CANDIDATES_PATH.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    return data if isinstance(data, list) else []


def load_resolved() -> Dict[str, Dict[str, str]]:
    if not RESOLVED_PATH.exists():
        return {}
    resolved: Dict[str, Dict[str, str]] = {}
    with RESOLVED_PATH.open("r", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            key = row.get("review_key")
            if key:
                resolved[key] = row
    return resolved


def save_resolved(resolved: Dict[str, Dict[str, str]]) -> None:
    RESOLVED_PATH.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ["review_key", "status", "note"]
    with RESOLVED_PATH.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for key, row in sorted(resolved.items()):
            writer.writerow(
                {
                    "review_key": key,
                    "status": row.get("status", ""),
                    "note": row.get("note", ""),
                }
            )


def list_candidates(include_resolved: bool) -> None:
    candidates = load_candidates()
    resolved = load_resolved()
    if not candidates:
        print("No manual review candidates found.")
        return
    for item in candidates:
        key = item.get("review_key") or "unknown"
        status = resolved.get(key, {}).get("status", "pending")
        if not include_resolved and status != "pending":
            continue
        issue_type = item.get("issue_type", "unspecified")
        similarity = item.get("similarity")
        print(f"- {key} [{issue_type}] status={status}")
        if similarity is not None:
            print(f"    similarity: {similarity}")
        gen = item.get("generated_question") or {}
        existing = item.get("existing_question") or {}
        if gen:
            print(f"    generated: {gen.get('question_id')} | {gen.get('question_text')}")
        if existing:
            print(f"    existing : {existing.get('question_id')} | {existing.get('question_text')}")
        note = resolved.get(key, {}).get("note")
        if note:
            print(f"    note     : {note}")


def update_status(review_key: str, status: str, note: str) -> None:
    resolved = load_resolved()
    resolved[review_key] = {"status": status, "note": note}
    save_resolved(resolved)
    print(f"Marked {review_key} as {status}.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    list_parser = subparsers.add_parser("list", help="List pending manual review items.")
    list_parser.add_argument(
        "--all",
        action="store_true",
        help="Include already resolved entries in the listing.",
    )

    resolve_parser = subparsers.add_parser("resolve", help="Mark a review key as resolved.")
    resolve_parser.add_argument("review_key", help="Review key to resolve (e.g., generated|existing).")
    resolve_parser.add_argument("--note", help="Optional note explaining the decision.", default="")

    ignore_parser = subparsers.add_parser("ignore", help="Ignore a review key (won't be shown again).")
    ignore_parser.add_argument("review_key", help="Review key to ignore.")
    ignore_parser.add_argument("--note", help="Optional note explaining why it was ignored.", default="")

    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.command == "list":
        list_candidates(include_resolved=args.all)
    elif args.command == "resolve":
        update_status(args.review_key, "resolved", args.note)
    elif args.command == "ignore":
        update_status(args.review_key, "ignored", args.note)
    else:  # pragma: no cover
        raise SystemExit(f"Unknown command: {args.command}")


if __name__ == "__main__":
    main()
