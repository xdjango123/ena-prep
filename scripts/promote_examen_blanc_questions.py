#!/usr/bin/env python3
"""Promote quiz_series/practice_test questions into examen_blanc to fill deficits.

Usage:
    PYTHONPATH=. python scripts/promote_examen_blanc_questions.py --exam-type CMS --exam-type CS
"""

from __future__ import annotations

import argparse
from collections import defaultdict
import sys
from difflib import SequenceMatcher
from typing import Dict, List, Tuple

from question_audit.db import get_supabase_client, SupabaseConfigError

TARGET_PER_SUBJECT = 400
MIN_QUIZ_SERIES_RESERVE = 120
SIMILARITY_THRESHOLD = 0.95
CATEGORIES = ("ANG", "CG", "LOG")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--exam-type",
        dest="exam_types",
        action="append",
        required=True,
        choices=["CM", "CMS", "CS"],
        help="Exam type(s) to fill",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only report actions without updating Supabase.",
    )
    return parser.parse_args()


def fetch_questions(client, exam_type: str, test_type: str) -> List[Dict[str, object]]:
    response = client.table("questions").select(
        "id, question_text, exam_type, test_type, category, created_at"
    ).eq("exam_type", exam_type).eq("test_type", test_type).execute()
    return response.data or []


def normalize_text(text: str) -> str:
    return " ".join(text.split()).lower()


def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b).ratio()


def compute_existing_texts(rows: List[Dict[str, object]]) -> Dict[str, List[str]]:
    buckets: Dict[str, List[str]] = {cat: [] for cat in CATEGORIES}
    for row in rows:
        cat = str(row.get("category"))
        text = row.get("question_text")
        if cat in buckets and isinstance(text, str):
            buckets[cat].append(normalize_text(text))
    return buckets


def select_candidates(
    existing_texts: List[str],
    candidates: List[Dict[str, object]],
    needed: int,
) -> Tuple[List[str], List[str]]:
    picked_ids: List[str] = []
    added_texts: List[str] = []
    for row in candidates:
        if len(picked_ids) >= needed:
            break
        qid = str(row["id"])
        qtext = normalize_text(str(row.get("question_text") or ""))
        if not qtext:
            continue
        sims = [similarity(qtext, base) for base in existing_texts + added_texts]
        if sims and max(sims) >= SIMILARITY_THRESHOLD:
            continue
        picked_ids.append(qid)
        added_texts.append(qtext)
    return picked_ids, added_texts


def promote_questions(client, exam_type: str, dry_run: bool) -> None:
    print(f"\n=== Exam type {exam_type} ===")
    exam_rows = fetch_questions(client, exam_type, "examen_blanc")
    per_category_counts = defaultdict(int)
    for row in exam_rows:
        per_category_counts[str(row.get("category"))] += 1

    deficits = {
        cat: max(0, TARGET_PER_SUBJECT - per_category_counts.get(cat, 0))
        for cat in CATEGORIES
    }

    if all(val == 0 for val in deficits.values()):
        print("✅ No deficit; nothing to do.")
        return

    print("Current counts:")
    for cat in CATEGORIES:
        print(f"  {cat}: {per_category_counts.get(cat, 0)} (need {deficits[cat]})")

    existing_texts = compute_existing_texts(exam_rows)
    total_updates = []

    quiz_rows = fetch_questions(client, exam_type, "quiz_series")
    practice_rows = fetch_questions(client, exam_type, "practice_test")

    quiz_by_cat: Dict[str, List[Dict[str, object]]] = {cat: [] for cat in CATEGORIES}
    practice_by_cat: Dict[str, List[Dict[str, object]]] = {cat: [] for cat in CATEGORIES}
    for row in quiz_rows:
        cat = str(row.get("category"))
        if cat in quiz_by_cat:
            quiz_by_cat[cat].append(row)
    for row in practice_rows:
        cat = str(row.get("category"))
        if cat in practice_by_cat:
            practice_by_cat[cat].append(row)

    for cat in CATEGORIES:
        need = deficits[cat]
        if need <= 0:
            continue

        print(f"\n➡️  Filling {cat}: need {need}")
        # Quiz series first, respecting reserve
        quiz_pool = quiz_by_cat[cat]
        quiz_pool.sort(key=lambda r: r.get("created_at") or "")
        allowed_from_quiz = max(0, len(quiz_pool) - MIN_QUIZ_SERIES_RESERVE)
        quiz_take = min(need, allowed_from_quiz)

        selected_ids: List[str] = []
        new_texts: List[str] = []
        if quiz_take > 0:
            quiz_ids, quiz_texts = select_candidates(existing_texts[cat], quiz_pool, quiz_take)
            selected_ids.extend(quiz_ids)
            new_texts.extend(quiz_texts)
            need -= len(quiz_ids)
            print(f"  • Took {len(quiz_ids)} from quiz_series (reserve kept at {MIN_QUIZ_SERIES_RESERVE}).")
        else:
            print(f"  • Quiz series reserve prevents taking any (available {len(quiz_pool)}).")

        if need > 0:
            practice_pool = practice_by_cat[cat]
            practice_pool.sort(key=lambda r: r.get("created_at") or "")
            practice_ids, practice_texts = select_candidates(existing_texts[cat] + new_texts, practice_pool, need)
            selected_ids.extend(practice_ids)
            new_texts.extend(practice_texts)
            need -= len(practice_ids)
            print(f"  • Took {len(practice_ids)} from practice_test.")

        if need > 0:
            print(f"  ⚠️ Still missing {need} questions for {cat}; create more content.")

        if selected_ids:
            existing_texts[cat].extend(new_texts)
            total_updates.extend(selected_ids)
            print(f"  → Selected {len(selected_ids)} total for {cat}.")

        deficits[cat] = max(0, deficits[cat] - len(selected_ids))

    if not total_updates:
        print("No questions selected; exiting.")
        return

    if dry_run:
        print(f"Dry run: would update {len(total_updates)} questions.")
        return

    chunk = 100
    for i in range(0, len(total_updates), chunk):
        batch = total_updates[i : i + chunk]
        client.table("questions").update({"test_type": "examen_blanc", "test_number": None}).in_("id", batch).execute()

    print(f"✅ Promoted {len(total_updates)} questions to examen_blanc for {exam_type}.")
    print("Re-run prepare_examen_blanc.py for this exam type to assign test numbers.")


def main() -> None:
    args = parse_args()
    try:
        client = get_supabase_client()
    except SupabaseConfigError as exc:
        print(exc)
        sys.exit(1)

    for exam_type in args.exam_types:
        promote_questions(client, exam_type, args.dry_run)


if __name__ == "__main__":
    main()
