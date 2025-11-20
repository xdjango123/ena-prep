#!/usr/bin/env python3
"""
Fill missing `test_number` slots for examen blanc/practice tests directly in Supabase.

Usage example:
    python scripts/prepare_examen_blanc.py --exam-type CM --test-type examen_blanc --max-test-number 20
"""

from __future__ import annotations

import argparse
from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Tuple

from question_audit.db import (
    SupabaseConfigError,
    fetch_questions,
    get_supabase_client,
)

CATEGORIES: Tuple[str, str, str] = ("ANG", "CG", "LOG")
DEFAULT_TARGET_PER_SUBJECT = 20


@dataclass
class QuestionRecord:
    id: str
    category: str
    test_number: Optional[int]
    created_at: str

    @classmethod
    def from_row(cls, row: Dict[str, object]) -> "QuestionRecord":
        return cls(
            id=str(row["id"]),
            category=str(row.get("category") or ""),
            test_number=row.get("test_number"),
            created_at=str(row.get("created_at") or ""),
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--exam-type",
        choices=["CM", "CMS", "CS"],
        required=True,
        help="Exam type to target.",
    )
    parser.add_argument(
        "--test-type",
        default="examen_blanc",
        choices=["examen_blanc", "practice_test"],
        help="Test type to fill (default: examen_blanc).",
    )
    parser.add_argument(
        "--max-test-number",
        type=int,
        default=None,
        help="Highest test_number to fill (default: 20 for examen_blanc, 10 for practice_test).",
    )
    parser.add_argument(
        "--per-subject",
        type=int,
        default=None,
        help="Number of questions required per subject within each exam (default: 20 for examen_blanc, 15 for practice_test).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Compute assignments but do not update Supabase.",
    )
    args = parser.parse_args()
    if args.max_test_number is None:
        args.max_test_number = 10 if args.test_type == "practice_test" else 20
    if args.per_subject is None:
        args.per_subject = 15 if args.test_type == "practice_test" else DEFAULT_TARGET_PER_SUBJECT
    return args


def load_relevant_questions(
    client,
    exam_type: str,
    test_type: str,
) -> List[QuestionRecord]:
    columns = (
        "id, category, test_number, created_at, exam_type, test_type"
    )
    rows = fetch_questions(
        client,
        columns=[col.strip() for col in columns.split(",")],
        filters={"exam_type": exam_type, "test_type": test_type},
    )
    questions = [QuestionRecord.from_row(row) for row in rows if row.get("category") in CATEGORIES]
    if not questions:
        raise SystemExit(
            f"No questions found for exam_type={exam_type} and test_type={test_type}."
        )
    return questions


def build_initial_state(
    questions: Iterable[QuestionRecord],
) -> Tuple[
    Dict[int, Dict[str, List[QuestionRecord]]],
    Dict[str, List[QuestionRecord]],
]:
    per_exam: Dict[int, Dict[str, List[QuestionRecord]]] = defaultdict(
        lambda: defaultdict(list)
    )
    unassigned: Dict[str, List[QuestionRecord]] = defaultdict(list)

    for record in questions:
        bucket = record.category
        if record.test_number:
            per_exam[record.test_number][bucket].append(record)
        else:
            unassigned[bucket].append(record)

    # Sort by creation timestamp to keep ordering deterministic when we pop from pools.
    for exam_number in per_exam:
        for category in CATEGORIES:
            per_exam[exam_number][category].sort(
                key=lambda r: (r.created_at, r.id)
            )
    for category in CATEGORIES:
        unassigned[category].sort(key=lambda r: (r.created_at, r.id))

    return per_exam, unassigned


def ensure_capacity(
    max_test_number: int,
    per_subject: int,
    per_exam: Dict[int, Dict[str, List[QuestionRecord]]],
    unassigned: Dict[str, List[QuestionRecord]],
) -> List[Tuple[str, int]]:
    updates: List[Tuple[str, int]] = []

    for exam_number in range(1, max_test_number + 1):
        for category in CATEGORIES:
            assigned = per_exam[exam_number][category]
            if len(assigned) > per_subject:
                print(
                    f"⚠️  Exam {exam_number} ({category}) already has {len(assigned)} questions; "
                    f"only {per_subject} will be used. Extra questions remain untouched."
                )
                continue

            missing = per_subject - len(assigned)
            if missing == 0:
                continue

            pool = unassigned.get(category, [])
            if len(pool) < missing:
                available = len(pool)
                raise SystemExit(
                    f"❌ Not enough {category} questions to fill exam {exam_number}. "
                    f"Needed {missing}, found {available}. Please create more questions."
                )

            for _ in range(missing):
                record = pool.pop(0)
                record.test_number = exam_number
                per_exam[exam_number][category].append(record)
                updates.append((record.id, exam_number))

    return updates


def apply_updates(client, updates: List[Tuple[str, int]], dry_run: bool) -> None:
    if not updates:
        print("✅ No new assignments needed.")
        return

    if dry_run:
        print(f"ℹ️  Dry-run mode: would update {len(updates)} rows.")
        return

    for question_id, test_number in updates:
        client.table("questions").update({"test_number": test_number}).eq("id", question_id).execute()
    print(f"✅ Updated {len(updates)} questions with new test_number assignments.")


def summarize(
    max_test_number: int,
    per_exam: Dict[int, Dict[str, List[QuestionRecord]]],
    per_subject: int,
) -> None:
    print("\n=== Assignment Summary ===")
    for exam_number in range(1, max_test_number + 1):
        buckets = per_exam.get(exam_number, {})
        counts = {category: len(buckets.get(category, [])) for category in CATEGORIES}
        status = "✅" if all(count == per_subject for count in counts.values()) else "⚠️"
        print(
            f"{status} Exam {exam_number:02d}: "
            + ", ".join(f"{cat}={counts[cat]:02d}" for cat in CATEGORIES)
        )
    print()


def main() -> None:
    args = parse_args()
    try:
        client = get_supabase_client()
    except SupabaseConfigError as exc:
        raise SystemExit(str(exc)) from exc

    questions = load_relevant_questions(client, args.exam_type, args.test_type)
    per_exam, unassigned = build_initial_state(questions)
    updates = ensure_capacity(args.max_test_number, args.per_subject, per_exam, unassigned)
    summarize(args.max_test_number, per_exam, args.per_subject)
    apply_updates(client, updates, args.dry_run)


if __name__ == "__main__":
    main()
