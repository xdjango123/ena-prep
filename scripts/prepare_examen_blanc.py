#!/usr/bin/env python3
"""
Assign sequential `test_number`s to examen blanc questions and print coverage stats.

Usage (defaults to CM examen data):
    python scripts/prepare_examen_blanc.py
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict, OrderedDict
from pathlib import Path
from typing import Dict, List


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        default="ai_validated_questions/cm_examen_ready.json",
        help="Validated questions JSON (list of dicts).",
    )
    parser.add_argument(
        "--output",
        default="ai_validated_questions/cm_examen_ready_testnumber.json",
        help="Destination file with test_number stamped.",
    )
    parser.add_argument(
        "--start-test-number",
        type=int,
        default=1,
        help="Test number to start assigning from (default: 1).",
    )
    parser.add_argument(
        "--goal-exams",
        type=int,
        default=20,
        help="Target number of examen blancs for summary (default: 20).",
    )
    return parser.parse_args()


def load_questions(path: Path) -> List[Dict[str, object]]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise SystemExit(f"{path} must contain a list of question objects.")
    return data


def derive_exam_id(question: Dict[str, object]) -> str:
    identifier = question.get("question_id") or question.get("id") or ""
    parts = str(identifier).split("_")
    if len(parts) >= 3:
        return "_".join(parts[:3])
    return str(identifier)


def assign_test_numbers(
    questions: List[Dict[str, object]],
    start_number: int,
) -> Dict[str, int]:
    grouped: "OrderedDict[str, List[Dict[str, object]]]" = OrderedDict()
    for q in questions:
        exam_id = derive_exam_id(q)
        if exam_id not in grouped:
            grouped[exam_id] = []
        grouped[exam_id].append(q)

    mapping: Dict[str, int] = {}
    current = start_number
    for exam_id in grouped:
        mapping[exam_id] = current
        current += 1
    return mapping


def print_summary(questions: List[Dict[str, object]], goal_exams: int) -> None:
    per_category = defaultdict(int)
    for q in questions:
        category = q.get("category") or "UNKNOWN"
        per_category[str(category)] += 1

    print("\n=== Examen Blanc Coverage ===")
    total_exams_possible = []
    for category in sorted(per_category):
        total = per_category[category]
        exams_possible = total // 20
        total_exams_possible.append(exams_possible)
        print(
            f"{category}: {total} questions -> {exams_possible}/{goal_exams} exams"
        )
    if total_exams_possible:
        print(
            f"Overall exams limited by min category: {min(total_exams_possible)}/{goal_exams}"
        )
    print()


def main() -> None:
    args = parse_args()
    questions = load_questions(Path(args.input))
    mapping = assign_test_numbers(questions, args.start_test_number)

    enriched: List[Dict[str, object]] = []
    for q in questions:
        exam_id = derive_exam_id(q)
        test_number = mapping.get(exam_id)
        q_with_number = dict(q)
        q_with_number["test_number"] = test_number
        enriched.append(q_with_number)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(enriched, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    print(f"Assigned test_number starting at {args.start_test_number}.")
    print(f"Wrote {len(enriched)} records to {output_path}")
    print_summary(enriched, args.goal_exams)


if __name__ == "__main__":
    main()
