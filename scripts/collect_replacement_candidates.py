#!/usr/bin/env python3
"""Build a manifest of questions that need replacement.

Sources combined:
1. Duplicate detection report (similarity >= threshold)
2. Difficulty scoring report (Gemini, score <= threshold or flagged `too_easy`)
3. Category mismatch heuristic (language profile does not match assigned category)
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from collections import defaultdict
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Set, Tuple

try:
    from openai import OpenAI
except Exception:  # pragma: no cover
    OpenAI = None  # type: ignore

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from question_audit.db import (  # type: ignore
    SupabaseConfigError,
    dump_json,
    fetch_questions,
    get_supabase_client,
)
from question_audit.language import detect_language_scores  # type: ignore
from question_audit.logging_utils import info, warn  # type: ignore
from question_audit.text_utils import normalize_text  # type: ignore

DEFAULT_DUPLICATE_REPORT = "diagnostics_output/cross_exam_duplicates.json"
DEFAULT_SCORES_GLOB = "diagnostics_output/refresh_easy_scores_*.json"
DEFAULT_MANIFEST = "diagnostics_output/replacements_manifest.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--duplicate-report",
        default=DEFAULT_DUPLICATE_REPORT,
        help=f"Path to duplicate report JSON (default: {DEFAULT_DUPLICATE_REPORT})",
    )
    parser.add_argument(
        "--scores-file",
        help="Path to refresh_easy_scores JSON. If omitted, the newest matching file is used.",
    )
    parser.add_argument(
        "--output",
        default=DEFAULT_MANIFEST,
        help=f"Destination manifest JSON (default: {DEFAULT_MANIFEST})",
    )
    parser.add_argument(
        "--duplicate-threshold",
        type=float,
        default=0.9,
        help="Similarity threshold (0-1) to flag duplicates (default: 0.90)",
    )
    parser.add_argument(
        "--difficulty-threshold",
        type=float,
        default=0.1,
        help="Maximum difficulty score (0-1) to flag a question as too easy (default: 0.10)",
    )
    parser.add_argument(
        "--english-threshold",
        type=float,
        default=0.6,
        help="Minimum English probability required to consider text English (default: 0.60)",
    )
    parser.add_argument(
        "--french-threshold",
        type=float,
        default=0.6,
        help="Minimum French probability required to consider text French (default: 0.60)",
    )
    parser.add_argument(
        "--delta-threshold",
        type=float,
        default=0.1,
        help="Minimum difference between language probabilities to assert mismatch (default: 0.10)",
    )
    parser.add_argument(
        "--categories",
        nargs="+",
        default=None,
        help="Optional category filter when running language heuristics (e.g. ANG CG)",
    )
    parser.add_argument(
        "--classification-limit",
        type=int,
        help="Maximum number of questions to classify with the model (default: all)",
    )
    parser.add_argument(
        "--sleep",
        type=float,
        default=0.8,
        help="Seconds to pause between OpenAI classification calls (default: 0.8)",
    )
    parser.add_argument(
        "--categories",
        nargs="+",
        help="Filter audit by specific categories (e.g. ANG LOG CG).",
    )
    return parser.parse_args()


def ensure_probability(name: str, value: float) -> None:
    if not 0.0 <= value <= 1.0:
        raise ValueError(f"{name} must be between 0.0 and 1.0 (received {value}).")


def load_json(path: Path) -> object:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def find_latest_scores_file(pattern: str) -> Optional[Path]:
    matches = sorted(Path().glob(pattern))
    return matches[-1] if matches else None


def collect_duplicate_ids(report: Dict[str, object], threshold: float) -> Set[str]:
    ids: Set[str] = set()
    clusters = report.get("clusters", [])
    if not isinstance(clusters, list):
        return ids
    for cluster in clusters:
        max_similarity = cluster.get("max_similarity") or 0.0
        if max_similarity is None or float(max_similarity) < threshold:
            continue
        records = cluster.get("records", [])
        for record in records:
            qid = record.get("id")
            if isinstance(qid, str):
                ids.add(qid)
    return ids


def collect_easy_ids(scores: List[Dict[str, object]], threshold: float) -> Set[str]:
    ids: Set[str] = set()
    for entry in scores:
        qid = entry.get("question_id")
        if not isinstance(qid, str):
            continue
        score = entry.get("difficulty_score")
        too_easy_flag = bool(entry.get("too_easy_flag") or entry.get("too_easy"))
        try:
            score_value = float(score) if score is not None else None
        except (TypeError, ValueError):
            score_value = None
        if score_value is not None and score_value <= threshold:
            ids.add(qid)
        elif score_value is None and too_easy_flag:
            ids.add(qid)
        elif too_easy_flag and score_value is not None and score_value <= threshold + 0.05:
            ids.add(qid)
    return ids


def language_profile(text: str) -> Tuple[float, float]:
    scores = {lang.lang: lang.prob for lang in detect_language_scores(text or "")}
    return scores.get("en", 0.0), scores.get("fr", 0.0)


def detect_wrong_category(
    rows: Iterable[Dict[str, object]],
    english_threshold: float,
    french_threshold: float,
    delta_threshold: float,
    categories: Optional[Sequence[str]] = None,
) -> Set[str]:
    target_categories = {cat.upper() for cat in categories} if categories else None
    ids: Set[str] = set()
    for row in rows:
        category = (row.get("category") or "").upper()
        if target_categories and category not in target_categories:
            continue

        question_text = row.get("question_text") or ""
        options = [
            row.get("answer1") or "",
            row.get("answer2") or "",
            row.get("answer3") or "",
            row.get("answer4") or "",
        ]
        combined = normalize_text(" ".join([question_text] + options), keep_case=True)
        en_prob, fr_prob = language_profile(combined)

        if category == "ANG":
            if fr_prob >= english_threshold and (fr_prob - en_prob) >= delta_threshold:
                ids.add(str(row["id"]))
        elif category == "CG":
            if en_prob >= french_threshold and (en_prob - fr_prob) >= delta_threshold:
                ids.add(str(row["id"]))
    return ids


def classify_question_categories(
    rows: List[Dict[str, object]],
    limit: Optional[int],
    sleep_seconds: float,
    confidence_threshold: float = 0.55,
) -> Dict[str, Dict[str, object]]:
    if OpenAI is None:
        warn("openai package not available; skipping category classification.")
        return {}

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        warn("OPENAI_API_KEY not set; skipping category classification.")
        return {}

    client = OpenAI()
    model_name = os.getenv("OPENAI_MODEL", "gpt-5")

    process_rows = rows if limit is None else rows[:limit]

    results: Dict[str, Dict[str, object]] = {}
    for idx, row in enumerate(process_rows, start=1):
        question_id = str(row.get("id"))
        question_text = row.get("question_text") or ""
        options = [row.get("answer1") or "", row.get("answer2") or "", row.get("answer3") or "", row.get("answer4") or ""]
        options_block = "\n".join(
            f"{chr(65 + i)}) {opt}" for i, opt in enumerate(options) if opt.strip()
        )
        prompt = f"""
Tu es examinateur pour l'ENA Côte d'Ivoire. Détermine la catégorie la plus adaptée pour cette question :
- ANG (anglais, compréhension ou expression)
- CG (culture générale, connaissances sur la Côte d'Ivoire et le monde, ....)
- LOG (raisonnement logique, calculs, puzzles, suites, matrices...)

Question : {question_text}
Options :
{options_block}

Réponds uniquement avec du JSON :
{{
  "category": "ANG" | "CG" | "LOG",
  "confidence": nombre entre 0.0 et 1.0,
  "reason": "une explication brève en français"
}}
"""
        try:
            response = client.responses.create(
                model=model_name,
                max_output_tokens=400,
                input=[
                    {"role": "system", "content": "Tu es un classificateur de questions d'examen."},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
            )
            message = (getattr(response, "output_text", "") or "").strip()
            result = json.loads(message)
            category = result.get("category")
            confidence = float(result.get("confidence", 0.0))
            if category in {"ANG", "CG", "LOG"} and confidence >= confidence_threshold:
                results[question_id] = {
                    "recommended_category": category,
                    "confidence": confidence,
                    "reason": result.get("reason"),
                }
        except Exception as exc:
            warn(f"Category classification failed for {question_id}: {exc}")
        time.sleep(max(sleep_seconds, 0.0))

    return results


def fetch_question_details(question_ids: Iterable[str]) -> Dict[str, Dict[str, object]]:
    ids = list({qid for qid in question_ids if qid})
    if not ids:
        return {}
    client = get_supabase_client()
    details: Dict[str, Dict[str, object]] = {}
    chunk_size = 100
    for start in range(0, len(ids), chunk_size):
        chunk = ids[start : start + chunk_size]
        response = (
            client.table("questions")
            .select(
                "id, question_text, answer1, answer2, answer3, answer4, "
                "exam_type, category, difficulty, test_type, sub_category"
            )
            .in_("id", chunk)
            .execute()
        )
        for row in response.data or []:
            qid = str(row.get("id"))
            details[qid] = row
    return details


def build_manifest_entries(
    question_map: Dict[str, Dict[str, object]],
    reasons_map: Dict[str, Set[str]],
    recommendations: Optional[Dict[str, Dict[str, object]]] = None,
) -> Tuple[List[Dict[str, object]], Dict[Tuple[str, str, str], int]]:
    entries: List[Dict[str, object]] = []
    summary = defaultdict(int)
    for qid, reasons in reasons_map.items():
        row = question_map.get(qid)
        if not row:
            warn(f"Question {qid} not found in Supabase; skipping.")
            continue

        exam_type = row.get("exam_type")
        category = row.get("category")
        test_type = row.get("test_type")
        entry = {
            "question_id": qid,
            "exam_type": exam_type,
            "category": category,
            "test_type": test_type,
            "difficulty": row.get("difficulty"),
            "reasons": sorted(reasons),
        }
        if recommendations and qid in recommendations:
            entry["recommended_category"] = recommendations[qid].get("recommended_category")
            entry["classification_confidence"] = recommendations[qid].get("confidence")
            entry["classification_reason"] = recommendations[qid].get("reason")
        entries.append(entry)
        summary[(exam_type, category, test_type)] += 1
    entries.sort(key=lambda item: (item["exam_type"], item["category"], item["test_type"], item["question_id"]))
    summary_dict = {
        f"{key[0]}|{key[1]}|{key[2]}": count for key, count in summary.items()
    }
    return entries, summary_dict


def main() -> None:
    args = parse_args()

    try:
        ensure_probability("--duplicate-threshold", args.duplicate_threshold)
        ensure_probability("--difficulty-threshold", args.difficulty_threshold)
        ensure_probability("--english-threshold", args.english_threshold)
        ensure_probability("--french-threshold", args.french_threshold)
    except ValueError as exc:
        warn(str(exc))
        return

    duplicate_path = Path(args.duplicate_report)
    if not duplicate_path.exists():
        warn(f"Duplicate report not found: {duplicate_path}")
        return
    duplicate_report = load_json(duplicate_path)
    duplicate_ids = collect_duplicate_ids(duplicate_report, args.duplicate_threshold)
    info(f"Duplicates flagged (similarity >= {args.duplicate_threshold:.2f}): {len(duplicate_ids)}")

    scores_path: Optional[Path]
    if args.scores_file:
        scores_path = Path(args.scores_file)
    else:
        scores_path = find_latest_scores_file(DEFAULT_SCORES_GLOB)
    if scores_path and scores_path.exists():
        scores_payload = load_json(scores_path)
        if isinstance(scores_payload, list):
            easy_ids = collect_easy_ids(scores_payload, args.difficulty_threshold)
            info(f"'Too easy' questions flagged (score <= {args.difficulty_threshold:.2f}): {len(easy_ids)}")
        else:
            warn(f"Scores file {scores_path} did not contain a list; ignoring.")
            easy_ids = set()
    else:
        warn("No refresh_easy_scores file found; skipping ease check.")
        easy_ids = set()

    try:
        client = get_supabase_client()
    except SupabaseConfigError as exc:
        warn(str(exc))
        return

    wrong_category_ids = set()
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
            "category",
            "difficulty",
            "test_type",
            "sub_category",
        ],
    )
    # Filter by category if requested
    if args.categories:
        target_cats = {c.upper() for c in args.categories}
        rows = [r for r in rows if (r.get("category") or "").upper() in target_cats]
        info(f"Filtered to {len(rows)} questions in categories: {target_cats}")
    
    wrong_category_ids = detect_wrong_category(
        rows,
        english_threshold=args.english_threshold,
        french_threshold=args.french_threshold,
        delta_threshold=args.delta_threshold,
        categories=args.categories,
    )
    info(f"Wrong-category questions flagged: {len(wrong_category_ids)}")

    reasons_map: Dict[str, Set[str]] = defaultdict(set)
    for qid in duplicate_ids:
        reasons_map[qid].add("duplicate")
    for qid in easy_ids:
        reasons_map[qid].add("too_easy")
    for qid in wrong_category_ids:
        reasons_map[qid].add("wrong_category")
    classification_results = classify_question_categories(
        rows,
        limit=args.classification_limit,
        sleep_seconds=args.sleep,
    )
    info(f"Model classification completed for {len(classification_results)} question(s).")
    recommended_map: Dict[str, Dict[str, object]] = {}
    for row in rows:
        qid = str(row.get("id"))
        current_category = (row.get("category") or "").upper()
        result = classification_results.get(qid)
        if not result:
            continue
        recommended = (result.get("recommended_category") or "").upper()
        if recommended and recommended != current_category:
            reasons_map[qid].add("wrong_category")
            recommended_map[qid] = result

    all_ids = set(reasons_map.keys())
    if not all_ids:
        warn("No questions matched the selected criteria. Manifest not created.")
        return

    question_map = fetch_question_details(all_ids)
    entries, summary = build_manifest_entries(question_map, reasons_map, recommendations=recommended_map)

    manifest = {
        "total_questions": len(entries),
        "summary_by_pool": summary,
        "questions": entries,
    }

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    dump_json(os.fspath(output_path), manifest)
    info(f"Replacement manifest written to {output_path} ({len(entries)} questions).")


if __name__ == "__main__":
    main()
