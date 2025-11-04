#!/usr/bin/env python3
"""Apply verified ANG↔CG recategorizations in Supabase.

This script consumes the JSON output produced by ``validate_categories.py`` and
applies category updates once the language detection scores are re-confirmed at
stricter thresholds.

Usage example:
    python scripts/recategorize_ang_cg.py \
        --input diagnostics_output/miscategorized_cg_to_ang.json \
        --apply
"""

from __future__ import annotations

import argparse
import collections
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

from question_audit.db import SupabaseConfigError, dump_json, get_supabase_client
from question_audit.language import detect_language_scores
from question_audit.logging_utils import info, warn
from question_audit.text_utils import flatten_options, preview


DEFAULT_COLUMNS = [
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
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        default="diagnostics_output/miscategorized_questions.json",
        help="JSON file produced by validate_categories.py",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Persist approved changes to Supabase (default: dry-run)",
    )
    parser.add_argument(
        "--english-threshold",
        type=float,
        default=0.85,
        help="Minimum English probability required for ANG reassignment (default: 0.85)",
    )
    parser.add_argument(
        "--french-threshold",
        type=float,
        default=0.8,
        help="Minimum French probability required for CG reassignment (default: 0.8)",
    )
    parser.add_argument(
        "--min-gap",
        type=float,
        default=0.15,
        help="Minimum difference between target and alternate language scores (default: 0.15)",
    )
    parser.add_argument(
        "--skip-file",
        action="append",
        help="Path to newline-delimited question IDs to ignore (can be passed multiple times)",
    )
    parser.add_argument(
        "--force-file",
        action="append",
        help="Path to newline-delimited question IDs to force update regardless of thresholds",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Number of questions to process per Supabase request (default: 100)",
    )
    parser.add_argument(
        "--log-dir",
        default="diagnostics_output",
        help="Directory where the change log will be written (default: diagnostics_output)",
    )
    parser.add_argument(
        "--columns",
        nargs="+",
        default=DEFAULT_COLUMNS,
        help="Question columns to pull from Supabase for verification",
    )
    parser.add_argument(
        "--dry-run-limit",
        type=int,
        default=None,
        help="Stop after this many proposed updates when running in dry-run mode",
    )
    return parser.parse_args()


def load_json_file(path: str) -> List[Dict[str, object]]:
    if not os.path.exists(path):
        raise FileNotFoundError(f"Input file not found: {path}")
    with open(path, "r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise ValueError(f"Expected list in {path}, got {type(data)!r}")
    return data


def load_id_list(paths: Iterable[str] | None) -> set[str]:
    ids: set[str] = set()
    if not paths:
        return ids
    for path in paths:
        if not os.path.exists(path):
            warn(f"Skip file not found: {path}")
            continue
        with open(path, "r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if line:
                    ids.add(line)
    return ids


def chunked(iterable: List[str], size: int) -> Iterable[List[str]]:
    for i in range(0, len(iterable), size):
        yield iterable[i : i + size]


def language_scores(text: str) -> Dict[str, float]:
    scores: Dict[str, float] = collections.defaultdict(float)
    for lang in detect_language_scores(text):
        scores[lang.lang] = max(scores[lang.lang], lang.prob)
    return scores


def combined_text(row: Dict[str, object]) -> str:
    answers = [
        row.get("answer1") or "",
        row.get("answer2") or "",
        row.get("answer3") or "",
        row.get("answer4") or "",
    ]
    return " ".join([row.get("question_text") or "", flatten_options(answers)])


def should_update(
    row: Dict[str, object],
    target_category: str,
    thresholds: Dict[str, float],
    min_gap: float,
    forced: bool,
) -> Tuple[bool, Dict[str, float]]:
    text = combined_text(row)
    scores = language_scores(text)
    english_score = scores.get("en", 0.0)
    french_score = scores.get("fr", 0.0)

    if forced:
        return True, {"english": english_score, "french": french_score}

    if target_category == "ANG":
        if english_score < thresholds["en"]:
            return False, {"english": english_score, "french": french_score}
        if english_score - french_score < min_gap:
            return False, {"english": english_score, "french": french_score}
        return True, {"english": english_score, "french": french_score}

    if target_category == "CG":
        if french_score < thresholds["fr"]:
            return False, {"english": english_score, "french": french_score}
        if french_score - english_score < min_gap:
            return False, {"english": english_score, "french": french_score}
        return True, {"english": english_score, "french": french_score}

    return False, {"english": english_score, "french": french_score}


def main() -> None:
    args = parse_args()
    try:
        client = get_supabase_client()
    except SupabaseConfigError as exc:
        warn(str(exc))
        return

    for name, value in (
        ("--english-threshold", args.english_threshold),
        ("--french-threshold", args.french_threshold),
    ):
        if not 0.0 <= value <= 1.0:
            warn(f"{name} doit être compris entre 0.0 et 1.0 (fourni: {value}).")
            return
    if args.min_gap < 0:
        warn("--min-gap doit être positif.")
        return

    flagged = load_json_file(args.input)
    skip_ids = load_id_list(args.skip_file)
    force_ids = load_id_list(args.force_file)

    info(f"Loaded {len(flagged)} flagged questions from {args.input}")
    if skip_ids:
        info(f"Skip list contains {len(skip_ids)} IDs")
    if force_ids:
        info(f"Force list contains {len(force_ids)} IDs")

    targets: Dict[str, str] = {}
    for entry in flagged:
        qid = entry.get("question_id")
        suggested = entry.get("suggested_category")
        if not qid or not suggested:
            continue
        targets[str(qid)] = str(suggested)

    if not targets:
        info("No valid targets found – exiting.")
        return

    columns = args.columns
    pending_ids = list(targets.keys())
    processed_updates: List[Dict[str, object]] = []
    declined: List[Dict[str, object]] = []

    thresholds = {"en": args.english_threshold, "fr": args.french_threshold}

    for batch in chunked(pending_ids, args.batch_size):
        query = client.table("questions").select(", ".join(columns)).in_("id", batch)
        response = query.execute()
        rows = response.data or []

        for row in rows:
            qid = row.get("id")
            if not qid:
                continue
            if qid in skip_ids:
                info(f"Skipping {qid} (skip list)")
                continue

            current_category = row.get("category")
            target_category = targets.get(qid)
            if not target_category:
                continue
            if current_category == target_category:
                info(f"{qid} already categorized as {target_category}")
                continue

            forced = qid in force_ids
            should_apply, scores = should_update(
                row,
                target_category=target_category,
                thresholds=thresholds,
                min_gap=args.min_gap,
                forced=forced,
            )

            entry_summary = {
                "question_id": qid,
                "current_category": current_category,
                "target_category": target_category,
                "english_confidence": round(scores["english"], 4),
                "french_confidence": round(scores["french"], 4),
                "forced": forced,
                "question_preview": preview(row.get("question_text", "")),
                "exam_type": row.get("exam_type"),
                "difficulty": row.get("difficulty"),
                "sub_category": row.get("sub_category"),
            }

            if should_apply:
                processed_updates.append(entry_summary)
                if args.apply:
                    client.table("questions").update({"category": target_category}).eq("id", qid).execute()
                    info(
                        f"Updated {qid}: {current_category} -> {target_category} "
                        f"(en={scores['english']:.2f}, fr={scores['french']:.2f})"
                    )
                else:
                    info(
                        f"DRY-RUN {qid}: would update {current_category} -> {target_category} "
                        f"(en={scores['english']:.2f}, fr={scores['french']:.2f})"
                    )
                    if args.dry_run_limit and len(processed_updates) >= args.dry_run_limit:
                        warn("Dry-run limit reached; stopping early.")
                        break
            else:
                declined.append(entry_summary)
                info(
                    f"Rejected {qid}: en={scores['english']:.2f}, fr={scores['french']:.2f}, "
                    f"target={target_category}, forced={forced}"
                )
        
        # Check if we should stop after processing this batch
        if args.dry_run_limit and len(processed_updates) >= args.dry_run_limit:
            break  # Exit outer loop when dry-run limit reached

    info(f"Proposed updates: {len(processed_updates)}; rejected: {len(declined)}")

    log_dir = Path(args.log_dir)
    log_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    suffix = "applied" if args.apply else "dry_run"

    if processed_updates:
        applied_path = log_dir / f"recategorize_{suffix}_{timestamp}.json"
        dump_json(os.fspath(applied_path), processed_updates)
        info(f"Wrote applied log to {applied_path}")

    if declined:
        declined_path = log_dir / f"recategorize_rejected_{timestamp}.json"
        dump_json(os.fspath(declined_path), declined)
        info(f"Wrote rejected log to {declined_path}")


if __name__ == "__main__":
    main()
