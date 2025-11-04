#!/usr/bin/env python3
"""Build a manifest of questions that need replacement.

Sources combined:
1. Duplicate detection report (similarity >= threshold)
2. Category mismatch heuristic (language profile or classifier disagrees with assigned category)
3. Flag summary issues (incorrect answers, explanation problems, etc.)
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import subprocess
from collections import defaultdict
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Set, Tuple
import re

try:
    from openai import OpenAI
except Exception:  # pragma: no cover
    OpenAI = None  # type: ignore

try:
    import google.generativeai as genai  # type: ignore
except Exception:
    genai = None  # type: ignore

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
from question_audit.text_utils import normalize_text, preview  # type: ignore

DEFAULT_DUPLICATE_REPORT = "diagnostics_output/cross_exam_duplicates.json"
DEFAULT_MANIFEST = "diagnostics_output/replacements_manifest.json"
DIAGNOSTICS_DIR = Path("diagnostics_output")
FALLBACK_FLAG_SUMMARY = Path("cleaned_questions_vm_backup/flag_summary.json")
DEBUG_CLASSIFIER_LOG = DIAGNOSTICS_DIR / "debug_classifier_responses.log"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--duplicate-report",
        default=DEFAULT_DUPLICATE_REPORT,
        help=f"Path to duplicate report JSON (default: {DEFAULT_DUPLICATE_REPORT})",
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
        "--flag-summary",
        default=os.fspath(DIAGNOSTICS_DIR / "flag_summary.json"),
        help="Path to flag_summary.json produced by diagnostics (default: diagnostics_output/flag_summary.json)",
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
        "--progress-interval",
        type=int,
        default=250,
        help="How frequently to log progress counters while scanning (default: 250)",
    )
    parser.add_argument(
        "--quality-check-limit",
        type=int,
        help="Maximum number of questions to evaluate for answer/explanation quality (default: all)",
    )
    parser.add_argument(
        "--quality-model",
        default="gemini-2.0-flash",
        help="Gemini model to evaluate correctness/explanations (default: gemini-2.0-flash)",
    )
    parser.add_argument(
        "--quality-sleep",
        type=float,
        default=0.6,
        help="Seconds to pause between quality evaluations (default: 0.6)",
    )
    return parser.parse_args()


def ensure_probability(name: str, value: float) -> None:
    if not 0.0 <= value <= 1.0:
        raise ValueError(f"{name} must be between 0.0 and 1.0 (received {value}).")


def load_json(path: Path) -> object:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_flag_summary(path: Path) -> List[Dict[str, object]]:
    if not path.exists():
        warn(f"Flag summary not found: {path}")
        return []
    try:
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
        if isinstance(data, list):
            return data
        warn(f"Unexpected payload in {path}; expected list.")
        return []
    except json.JSONDecodeError as exc:
        warn(f"Could not parse {path}: {exc}")
        return []


def extract_json_object(text: str) -> Optional[Dict[str, object]]:
    if not text:
        return None
    cleaned = text.strip()
    if cleaned.startswith("```") and cleaned.endswith("```"):
        cleaned = cleaned.strip("`")
        cleaned = re.sub(r"^json\s*", "", cleaned, flags=re.IGNORECASE).strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    snippet = cleaned[start : end + 1]
    try:
        return json.loads(snippet)
    except json.JSONDecodeError:
        return None


def fallback_category_payload(text: str) -> Optional[Dict[str, object]]:
    if not text:
        return None
    match = re.search(r'"?category"?\s*:\s*"(ANG|CG|LOG)"', text)
    if not match:
        return None
    category = match.group(1)
    confidence_match = re.search(r'"?confidence"?\s*:\s*([0-9.]+)', text)
    confidence = float(confidence_match.group(1)) if confidence_match else 0.5
    reason_match = re.search(r'"?reason"?\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"', text)
    if reason_match:
        reason = reason_match.group(1).replace('\\"', '"')
    else:
        reason = "classified via fallback"
    return {
        "category": category,
        "confidence": confidence,
        "reason": reason,
    }


def log_classifier_debug(row: Dict[str, object], question_id: str, status: str, message: str) -> None:
    try:
        DEBUG_CLASSIFIER_LOG.parent.mkdir(parents=True, exist_ok=True)
        question_preview = preview(row.get("question_text", ""), length=160)
        answers = [
            row.get("answer1") or "",
            row.get("answer2") or "",
            row.get("answer3") or "",
            row.get("answer4") or "",
        ]
        options_preview = " | ".join(
            f"{chr(65 + idx)}: {preview(ans, length=80)}" if ans.strip() else ""
            for idx, ans in enumerate(answers)
        )
        entry = (
            f"== {question_id} | status={status} | current={row.get('category')} | "
            f"exam={row.get('exam_type')} | test={row.get('test_type')}\n"
            f"Question: {question_preview}\n"
            f"Options: {options_preview}\n"
            f"Model output:\n{message}\n\n"
        )
        with DEBUG_CLASSIFIER_LOG.open("a", encoding="utf-8") as handle:
            handle.write(entry)
    except Exception:
        pass


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
    progress_interval: int = 250,
) -> Tuple[Dict[str, Dict[str, object]], Dict[str, str], Dict[str, int]]:
    if OpenAI is None:
        warn("openai package not available; skipping category classification.")
        return {}, {}, {"total": 0, "success": 0, "retries": 0}

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        warn("OPENAI_API_KEY not set; skipping category classification.")
        return {}, {}, {"total": 0, "success": 0, "retries": 0}

    client = OpenAI()
    model_name = os.getenv("OPENAI_MODEL", "gpt-5")

    process_rows = rows if limit is None else rows[:limit]

    results: Dict[str, Dict[str, object]] = {}
    failures: Dict[str, str] = {}
    stats = {"total": len(process_rows), "success": 0, "retries": 0}
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
- CG (culture générale, connaissances sur la Côte d'Ivoire et le monde)
- LOG (raisonnement logique, calculs, puzzles, suites, matrices)

Question : {question_text}
Options :
{options_block}

Réponds uniquement avec du JSON :
{{
  "category": "ANG" | "CG" | "LOG",
  "confidence": nombre entre 0.0 et 1.0,
  "reason": "explication brève en français"
}}
"""
        success = False
        last_error: Optional[Exception] = None
        for attempt in range(2):
            try:
                response = client.responses.create(
                    model=model_name,
                    max_output_tokens=400,
                    input=[
                        {"role": "system", "content": "Tu es un classificateur de questions d'examen."},
                        {"role": "user", "content": prompt},
                    ],
                )
                message = (getattr(response, "output_text", "") or "").strip()
                if not message:
                    parts: List[str] = []
                    for item in getattr(response, "output", []) or []:
                        if getattr(item, "role", "") != "assistant":
                            continue
                        for content in getattr(item, "content", []) or []:
                            text = getattr(content, "text", None)
                            if text:
                                parts.append(text)
                    message = "".join(parts).strip()
                payload = extract_json_object(message)
                used_fallback = False
                if not payload:
                    payload = fallback_category_payload(message)
                    used_fallback = payload is not None
                if not payload:
                    raise ValueError("Could not parse classifier response as JSON")
                category = payload.get("category")
                confidence = float(payload.get("confidence", 0.0))
                if category in {"ANG", "CG", "LOG"} and confidence >= confidence_threshold:
                    results[question_id] = {
                        "recommended_category": category,
                        "confidence": confidence,
                        "reason": payload.get("reason"),
                    }
                log_classifier_debug(
                    row,
                    question_id,
                    "fallback" if used_fallback else "parsed",
                    message,
                )
                stats["success"] += 1
                if attempt > 0:
                    stats["retries"] += 1
                success = True
                break
                
            except Exception as exc:
                last_error = exc
                time.sleep(max(sleep_seconds, 0.0))
        if not success and last_error is not None:
            log_classifier_debug(row, question_id, "error", str(last_error))
            failures[question_id] = str(last_error)

        if progress_interval and idx % progress_interval == 0:
            info(
                f"[classification] processed {idx}/{stats['total']} (accepted {stats['success']}, retries {stats['retries']})"
            )

    return results, failures, stats


def evaluate_question_quality(
    rows: List[Dict[str, object]],
    limit: Optional[int],
    sleep_seconds: float,
    model_name: str,
    progress_interval: int = 250,
) -> Tuple[Dict[str, Dict[str, object]], Dict[str, str], Dict[str, int]]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        warn("GEMINI_API_KEY not set; skipping quality evaluation.")
        return {}, {}, {"total": 0, "success": 0, "retries": 0}

    try:
        if genai is None:
            raise RuntimeError("google-generativeai package not available")
        if genai is None:
            raise RuntimeError("google-generativeai package not available")
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(model_name)
    except Exception as exc:  # pragma: no cover
        warn(f"Failed to initialise Gemini client: {exc}")
        return {}, {}, {"total": 0, "success": 0, "retries": 0}

    process_rows = rows if limit is None else rows[:limit]
    results: Dict[str, Dict[str, object]] = {}
    failures: Dict[str, str] = {}
    stats = {"total": len(process_rows), "success": 0, "retries": 0}

    for idx, row in enumerate(process_rows, start=1):
        question_id = str(row.get("id"))
        question_text = row.get("question_text") or ""
        answers = {
            "A": row.get("answer1") or "",
            "B": row.get("answer2") or "",
            "C": row.get("answer3") or "",
            "D": row.get("answer4") or "",
        }
        correct_letter = (row.get("correct") or "").upper()
        explanation = row.get("explanation") or ""
        options_block = "\n".join(f"{letter}) {text}" for letter, text in answers.items() if text.strip())

        prompt = f"""
Tu es vérificateur qualité pour l'ENA Côte d'Ivoire.
Analyse la question suivante, sa réponse correcte supposée et son explication.

Question : {question_text}
Options :
{options_block}
Réponse correcte enregistrée : {correct_letter or "(non renseignée)"}
Explication : {explanation}

Réponds uniquement avec un JSON :
{{
  "correct_answer_ok": true/false,
  "explanation_ok": true/false,
  "correct_option": "A" | "B" | "C" | "D" | null,
  "confidence": nombre entre 0.0 et 1.0,
  "reason": "justification concise en français"
}}
"""

        success = False
        last_error: Optional[Exception] = None
        for attempt in range(2):
            try:
                response = model.generate_content(prompt)
                text = response.text.strip()
                payload = extract_json_object(text)
                if not payload:
                    raise ValueError("Could not parse Gemini response as JSON")
                results[question_id] = payload
                stats["success"] += 1
                if attempt > 0:
                    stats["retries"] += 1
                success = True
                break
            except Exception as exc:  # pragma: no cover
                last_error = exc
                time.sleep(max(sleep_seconds, 0.0))
        if not success and last_error is not None:
            failures[question_id] = str(last_error)

        if progress_interval and idx % progress_interval == 0:
            info(
                f"[quality] processed {idx}/{stats['total']} (accepted {stats['success']}, retries {stats['retries']})"
            )

    return results, failures, stats


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
    notes_map: Dict[str, List[Dict[str, object]]],
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
        answers = {
            "A": row.get("answer1"),
            "B": row.get("answer2"),
            "C": row.get("answer3"),
            "D": row.get("answer4"),
        }
        entry = {
            "question_id": qid,
            "exam_type": exam_type,
            "category": category,
            "original_category": category,
            "test_type": test_type,
            "difficulty": row.get("difficulty"),
            "question_text": row.get("question_text"),
            "answers": answers,
            "explanation": row.get("explanation"),
            "reasons": sorted(reasons),
            "notes": notes_map.get(qid, []),
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
        ensure_probability("--english-threshold", args.english_threshold)
        ensure_probability("--french-threshold", args.french_threshold)
    except ValueError as exc:
        warn(str(exc))
        return

    duplicate_path = Path(args.duplicate_report)
    info("Running duplicate analysis: python scripts/find_duplicates.py --include-intra-exam")
    cmd = [sys.executable, "scripts/find_duplicates.py", "--include-intra-exam"]
    result = subprocess.run(cmd, cwd=os.fspath(PROJECT_ROOT), capture_output=True, text=True)
    if result.returncode != 0:
        warn(
            "find_duplicates.py failed (exit %s): %s"
            % (result.returncode, result.stderr.strip())
        )
        if not duplicate_path.exists():
            warn("Duplicate report missing and regeneration failed; aborting.")
            return
    duplicate_path = Path(args.duplicate_report)
    if not duplicate_path.exists():
        warn(
            f"Duplicate report not found even after running find_duplicates.py: {duplicate_path}"
        )
        return
    duplicate_report = load_json(duplicate_path)
    duplicate_ids = collect_duplicate_ids(duplicate_report, args.duplicate_threshold)
    info(f"Duplicates flagged (similarity >= {args.duplicate_threshold:.2f}): {len(duplicate_ids)}")

    flag_summary_path = Path(args.flag_summary)
    flag_summary_entries = load_flag_summary(flag_summary_path)
    if not flag_summary_entries and FALLBACK_FLAG_SUMMARY.exists() and FALLBACK_FLAG_SUMMARY != flag_summary_path:
        info(f"No entries found at {flag_summary_path}. Falling back to {FALLBACK_FLAG_SUMMARY}.")
        flag_summary_entries = load_flag_summary(FALLBACK_FLAG_SUMMARY)

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
    info(f"Fetched {len(rows)} questions from Supabase for analysis.")

    wrong_category_ids = detect_wrong_category(
        rows,
        english_threshold=args.english_threshold,
        french_threshold=args.french_threshold,
        delta_threshold=args.delta_threshold,
        categories=args.categories,
    )
    info(f"Wrong-category questions flagged: {len(wrong_category_ids)}")

    reasons_map: Dict[str, Set[str]] = defaultdict(set)
    notes_map: Dict[str, List[Dict[str, object]]] = defaultdict(list)

    for qid in duplicate_ids:
        reasons_map[qid].add("duplicate")
        notes_map[qid].append({"reason": "duplicate", "details": "Similarity above threshold"})

    for qid in wrong_category_ids:
        reasons_map[qid].add("wrong_category")
        notes_map[qid].append({"reason": "wrong_category", "details": "Language heuristic mismatch"})

    classification_results, classification_failures, classification_stats = classify_question_categories(
        rows,
        limit=args.classification_limit,
        sleep_seconds=args.sleep,
        progress_interval=args.progress_interval,
    )
    info(
        "Classification summary: processed %(total)d, parsed %(success)d, retries %(retries)d, failures %(failures)d"
        % {
            "total": classification_stats["total"],
            "success": classification_stats["success"],
            "retries": classification_stats["retries"],
            "failures": len(classification_failures),
        }
    )
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
            notes_map[qid].append(
                {
                    "reason": "wrong_category",
                    "details": result.get("reason"),
                    "confidence": result.get("confidence"),
                    "recommended_category": recommended,
                }
            )

    if classification_failures:
        warn(
            "Classifier could not parse %d question(s); see debug log for raw responses."
            % len(classification_failures)
        )
        for qid, error in classification_failures.items():
            notes_map[qid].append(
                {
                    "reason": "classification_error",
                    "details": error,
                }
            )

    for entry in flag_summary_entries:
        qid = str(entry.get("question_id") or "")
        if not qid:
            continue
        issue = entry.get("issue")
        details = entry.get("details") or entry.get("validation")
        if issue == "incorrect_answer":
            reasons_map[qid].add("incorrect_answer")
            notes_map[qid].append({"reason": "incorrect_answer", "details": details})
        elif issue in {"explanation_not_validated", "gatekeeper_failed", "validation_error", "unrelated_explanation"}:
            reasons_map[qid].add("unrelated_explanation")
            notes_map[qid].append({"reason": "unrelated_explanation", "details": details})

    quality_results, quality_failures, quality_stats = evaluate_question_quality(
        rows,
        limit=args.quality_check_limit,
        sleep_seconds=args.quality_sleep,
        model_name=args.quality_model,
        progress_interval=args.progress_interval,
    )
    info(
        "Quality summary: processed %(total)d, parsed %(success)d, retries %(retries)d, failures %(failures)d"
        % {
            "total": quality_stats["total"],
            "success": quality_stats["success"],
            "retries": quality_stats["retries"],
            "failures": len(quality_failures),
        }
    )
    quality_incorrect = 0
    quality_unrelated = 0

    for row in rows:
        qid = str(row.get("id"))
        result = quality_results.get(qid)
        if not result:
            continue
        reason_text = result.get("reason")
        confidence = result.get("confidence")
        if not result.get("correct_answer_ok", True):
            reasons_map[qid].add("incorrect_answer")
            quality_incorrect += 1
            notes_map[qid].append(
                {
                    "reason": "incorrect_answer",
                    "details": reason_text,
                    "confidence": confidence,
                    "model_correct_option": result.get("correct_option"),
                }
            )
        if not result.get("explanation_ok", True):
            reasons_map[qid].add("unrelated_explanation")
            quality_unrelated += 1
            notes_map[qid].append(
                {
                    "reason": "unrelated_explanation",
                    "details": reason_text,
                    "confidence": confidence,
                }
            )

    info(
        "Quality flags raised: incorrect_answer=%d, unrelated_explanation=%d"
        % (quality_incorrect, quality_unrelated)
    )

    if quality_failures:
        warn(
            "Quality evaluator failed on %d question(s); they were marked with quality_error."
            % len(quality_failures)
        )
        for qid, error in quality_failures.items():
            notes_map[qid].append(
                {
                    "reason": "quality_error",
                    "details": error,
                }
            )

    all_ids = set(reasons_map.keys())
    info(f"Total distinct questions flagged: {len(all_ids)}")
    if not all_ids:
        warn("No questions matched the selected criteria. Manifest not created.")
        return

    question_map = fetch_question_details(all_ids)
    entries, summary = build_manifest_entries(
        question_map,
        reasons_map,
        notes_map,
        recommendations=recommended_map,
    )

    manifest = {
        "total_questions": len(entries),
        "summary_by_pool": summary,
        "questions": entries,
        "classification_stats": classification_stats,
        "classification_failures": classification_failures,
        "quality_stats": quality_stats,
        "quality_failures": quality_failures,
        "quality_counts": {
            "incorrect_answer": quality_incorrect,
            "unrelated_explanation": quality_unrelated,
        },
    }

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    dump_json(os.fspath(output_path), manifest)
    info(f"Replacement manifest written to {output_path} ({len(entries)} questions).")

    summary_snapshot = manifest.copy()
    summary_snapshot.pop("questions", None)
    summary_output_path = output_path.with_name("replacement_summary.json")
    dump_json(os.fspath(summary_output_path), summary_snapshot)
    info(f"Summary written to {summary_output_path}.")


if __name__ == "__main__":
    main()
