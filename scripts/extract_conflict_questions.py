#!/usr/bin/env python3
"""Build an insert-ready payload from conflict diagnostics.

Useful when we want to override validation decisions (e.g., keep near-duplicates).
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Dict, List, Optional

ANSWER_MAP = {
    "answer1": "A",
    "answer2": "B",
    "answer3": "C",
    "answer4": "D",
}


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def normalize_correct(raw_value: Optional[str]) -> Optional[str]:
    if not raw_value:
        return None
    value = raw_value.strip()
    if len(value) == 1 and value.upper() in {"A", "B", "C", "D"}:
        return value.upper()
    lower = value.lower()
    return ANSWER_MAP.get(lower)


def to_question_payload(raw: Dict) -> Optional[Dict]:
    data = raw.get("question_data") or raw
    correct = normalize_correct(data.get("correct_letter") or data.get("correct"))
    if not correct:
        return None
    payload = {
        "question_text": (data.get("question_text") or "").strip(),
        "answer1": (data.get("answer1") or "").strip(),
        "answer2": (data.get("answer2") or "").strip(),
        "answer3": (data.get("answer3") or "").strip(),
        "answer4": (data.get("answer4") or None),
        "correct": correct,
        "explanation": (data.get("explanation") or "").strip(),
        "category": data.get("category"),
        "difficulty": (data.get("difficulty") or "HARD").upper(),
        "exam_type": data.get("exam_type"),
        "test_type": data.get("test_type"),
        "sub_category": data.get("sub_category"),
        "question_id": data.get("id") or data.get("question_id"),
    }
    return payload


SIMILARITY_PATTERN = re.compile(r"Similarity ([0-9.]+)")


def should_skip(reason: str) -> bool:
    if reason == "Exact duplicate signature":
        return True
    match = SIMILARITY_PATTERN.search(reason)
    if match:
        try:
            score = float(match.group(1))
        except ValueError:
            return False
        return score >= 0.999
    return False


def resolve_question(conflict: Dict, index: Dict[str, Dict]) -> Optional[Dict]:
    if "generated" in conflict:
        raw = conflict["generated"]
        return to_question_payload(raw)

    generated = conflict.get("generated_question") or {}
    question_id = generated.get("question_id")
    if not question_id:
        return None
    raw = index.get(question_id)
    if not raw:
        return None
    return to_question_payload(raw)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--conflicts",
        default="diagnostics_output/generated_conflicts.json",
        help="Path to diagnostics_output generated_conflicts.json",
    )
    parser.add_argument(
        "--source",
        default="new_questions/combined_targets.json",
        help="JSON containing the original question batches (combined).",
    )
    parser.add_argument(
        "--output",
        default="ai_validated_questions/conflicts_ready.json",
        help="Destination file for the insert-ready payload.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    conflicts = load_json(Path(args.conflicts))
    source_data = load_json(Path(args.source))

    index: Dict[str, Dict] = {}
    for entry in source_data:
        raw = entry.get("question_data") or entry
        question_id = raw.get("id") or raw.get("question_id")
        if question_id:
            index[str(question_id)] = entry

    selected: List[Dict] = []
    skipped = 0
    unresolved = 0
    for conflict in conflicts:
        reason = conflict.get("reason") or ""
        if should_skip(reason):
            skipped += 1
            continue
        payload = resolve_question(conflict, index)
        if not payload:
            unresolved += 1
            continue
        selected.append(payload)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(selected, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    print(
        f"Wrote {len(selected)} conflict overrides to {output_path} "
        f"(skipped {skipped} duplicates, unresolved {unresolved})."
    )


if __name__ == "__main__":
    main()
