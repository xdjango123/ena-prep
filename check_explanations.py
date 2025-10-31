#!/usr/bin/env python3
"""Flag explanations that need manual review."""

from __future__ import annotations

import argparse
import collections
import json
import os
from pathlib import Path
from typing import Dict, List, Optional

import openai
import google.generativeai as genai

from question_audit.db import dump_json, fetch_questions, get_supabase_client
from question_audit.logging_utils import info, warn
from question_audit.text_utils import preview

LETTER_TO_KEY = {"A": "answer1", "B": "answer2", "C": "answer3", "D": "answer4"}

RULE_TO_REASON = {
    "is_french": ("not_french", False),
    "is_generic": ("generic_explanation", True),
}

GENERIC_PATTERNS = (
    "la réponse correcte est",
    "la reponse correcte est",
    "il s'agit d'un fait de culture générale",
    "il s'agit d'un fait de culture generale",
    "la règle d'anglais appliquée",
    "la regle d'anglais appliquee",
    "la règle d'anglais appliquée au cas présent",
    "la regle d'anglais appliquee au cas present",
)

GPT_PROMPT = (
    "Tu es responsable qualité des explications d'examen. Analyse la question, les réponses"
    " et l'explication fournie. Nous voulons seulement vérifier deux points :\n"
    "1. is_french — L'explication est intégralement rédigée en français naturel.\n"
    "2. is_generic — L'explication se contente d'une formule générique du type "
    "\"La réponse correcte est ...\" ou \"Il s'agit d'un fait de culture générale\" "
    "sans justification concrète.\n\n"
    "Retourne un JSON strictement valide du format :\n"
    "{\n"
    '  "is_french": true/false,\n'
    '  "is_generic": true/false,\n'
    '  "confidence": 0.0-1.0,\n'
    '  "summary": "commentaire bref"\n'
    "}\n"
    "Assume false dès qu'un point n'est pas clairement respecté et explique brièvement la raison."
)

GEMINI_PROMPT_TEMPLATE = (
    "Tu valides les explications d'examen. Voici la question et l'explication."
    " Un premier examinateur (GPT) a rendu son évaluation: {gpt_eval}."
    " Confirme ou corrige en retournant le même format JSON avec les clés"
    " is_french, is_generic, confidence (0-1) et summary. "
    "Signale is_generic=true si l'explication est une formule toute faite du type "
    "\"La réponse correcte est ...\" ou \"Il s'agit d'un fait de culture générale...\" "
    "sans justification concrète."
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, help="Limit number of questions scanned")
    parser.add_argument(
        "--output-dir",
        default="diagnostics_output",
        help="Directory for JSON reports (default: diagnostics_output)",
    )
    parser.add_argument(
        "--skip-file",
        action="append",
        help="Path to JSON file containing question IDs to skip (can be passed multiple times)",
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=1500,
        help="Number of rows to request per Supabase page (default: 1500)",
    )
    parser.add_argument(
        "--test-types",
        nargs="+",
        default=["examen_blanc", "practice_test", "quiz_series"],
        help="Order of test_type values to scan (default: examen_blanc practice_test quiz_series)",
    )
    parser.add_argument(
        "--categories",
        nargs="+",
        default=["ANG", "CG", "LOG"],
        help="Question categories to include (default: ANG CG LOG)",
    )
    parser.add_argument(
        "--model-name",
        default="gpt-4o-mini",
        help="OpenAI model name for validation (default: gpt-4o-mini)",
    )
    parser.add_argument(
        "--model-cache",
        default="diagnostics_output/model_validation_cache.json",
        help="Path to cache file for model evaluations",
    )
    parser.add_argument(
        "--gemini-model",
        default="gemini-1.5-pro-latest",
        help="Gemini model name for cross-validation (default: gemini-1.5-pro-latest)",
    )
    parser.add_argument(
        "--no-model",
        action="store_true",
        help="Disable model validation stage",
    )
    parser.add_argument(
        "--log-interval",
        type=int,
        default=250,
        help="Print progress after this many processed questions (default: 250)",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume from existing flagged_explanations.json instead of starting fresh",
    )
    return parser.parse_args()


def build_question_record(row: Dict[str, str]) -> Dict[str, object]:
    answers = {
        "A": row.get("answer1"),
        "B": row.get("answer2"),
        "C": row.get("answer3"),
        "D": row.get("answer4"),
    }
    correct_letter = (row.get("correct") or "").upper()
    correct_answer_text = answers.get(correct_letter)

    return {
        "question_id": row["id"],
        "exam_type": row.get("exam_type"),
        "category": row.get("category"),
        "difficulty": row.get("difficulty"),
        "test_type": row.get("test_type"),
        "question_text": row.get("question_text"),
        "answers": answers,
        "correct_letter": correct_letter,
        "correct_answer_text": correct_answer_text,
        "explanation": row.get("explanation"),
        "question_preview": preview(row.get("question_text", "")),
        "explanation_preview": preview(row.get("explanation", "")),
    }


def load_skip_ids(paths: List[str] | None) -> set[str]:
    if not paths:
        return set()

    skipped = set()
    for path in paths:
        file_path = Path(path)
        if not file_path.exists():
            warn(f"Skip file not found: {file_path}")
            continue

        try:
            with file_path.open("r", encoding="utf-8") as handle:
                data = json.load(handle)
        except json.JSONDecodeError as exc:
            warn(f"Could not parse skip file {file_path}: {exc}")
            continue

        if isinstance(data, list):
            for item in data:
                if isinstance(item, dict) and "question_id" in item:
                    skipped.add(item["question_id"])
                elif isinstance(item, str):
                    skipped.add(item)
        elif isinstance(data, dict):
            # Support mapping like {"question_ids": [...]}
            if "question_ids" in data and isinstance(data["question_ids"], list):
                for item in data["question_ids"]:
                    if isinstance(item, str):
                        skipped.add(item)
        else:
            warn(f"Unsupported structure in skip file {file_path}, ignored.")

    if skipped:
        info(f"Loaded {len(skipped)} question IDs to skip")
    return skipped


def load_model_cache(path: Path) -> Dict[str, Dict[str, object]]:
    if not path.exists():
        return {}
    try:
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    except json.JSONDecodeError as exc:
        warn(f"Could not read model cache {path}: {exc}")
        return {}

    if not isinstance(data, dict):
        warn(f"Model cache {path} has unexpected format; ignoring.")
        return {}

    cache: Dict[str, Dict[str, object]] = {}
    for key, value in data.items():
        if isinstance(value, dict):
            cache[str(key)] = value
    return cache


def save_model_cache(path: Path, cache: Dict[str, Dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(cache, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def parse_model_output(raw_text: Optional[str], source: str) -> Dict[str, object]:
    result = {
        "is_french": None,
        "is_generic": None,
        "confidence": None,
        "summary": "",
        "raw": raw_text,
        "error": None,
    }

    if raw_text is None:
        result["error"] = f"{source}: empty response"
        return result

    raw_text = raw_text.strip()
    if not raw_text:
        result["error"] = f"{source}: empty response"
        return result

    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        json_start = raw_text.find("{")
        json_end = raw_text.rfind("}")
        if json_start != -1 and json_end != -1 and json_end > json_start:
            try:
                parsed = json.loads(raw_text[json_start : json_end + 1])
            except json.JSONDecodeError:
                result["error"] = f"{source}: invalid JSON"
                return result
        else:
            result["error"] = f"{source}: invalid JSON"
            return result

    def coerce_bool(value: object) -> Optional[bool]:
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            lowered = value.strip().lower()
            if lowered in {"true", "vrai", "oui", "yes"}:
                return True
            if lowered in {"false", "faux", "non", "no"}:
                return False
        return None

    for key in ("is_french", "is_generic"):
        result[key] = coerce_bool(parsed.get(key))

    confidence = parsed.get("confidence")
    try:
        confidence_val = float(confidence)
        confidence_val = max(0.0, min(1.0, confidence_val))
    except (TypeError, ValueError):
        confidence_val = None
    result["confidence"] = confidence_val

    summary = parsed.get("summary")
    if isinstance(summary, str):
        result["summary"] = summary.strip()
    else:
        result["summary"] = raw_text

    return result


def apply_heuristics(record: Dict[str, object]) -> set[str]:
    reasons: set[str] = set()
    explanation = (record.get("explanation") or "").strip()
    if not explanation:
        return reasons

    normalized = explanation.lower()
    if any(pattern in normalized for pattern in GENERIC_PATTERNS):
        reasons.add("generic_explanation")

    return reasons


def evaluate_with_gpt(
    client: openai.OpenAI,
    model_name: str,
    record: Dict[str, object],
    cache: Dict[str, Dict[str, object]],
) -> Dict[str, object]:
    question_id = str(record["question_id"])
    cache_entry = cache.setdefault(question_id, {})
    if "gpt" in cache_entry:
        return cache_entry["gpt"]

    answers_text = "\n".join(
        f"{key}) {value if value else '[vide]'}" for key, value in record["answers"].items()
    )
    correct_line = f"{record['correct_letter']} -> {record.get('correct_answer_text') or '[inconnu]'}"
    prompt = (
        f"{GPT_PROMPT}\n\n"
        f"Question:\n{record['question_text']}\n\n"
        f"Réponses:\n{answers_text}\n\n"
        f"Bonne réponse: {correct_line}\n\n"
        f"Explication:\n{record['explanation']}"
    )

    try:
        response = client.chat.completions.create(
            model=model_name,
            temperature=0,
            messages=[
                {
                    "role": "system",
                    "content": "Tu es un évaluateur pédagogique expert en préparation de concours.",
                },
                {"role": "user", "content": prompt},
            ],
        )
        raw = (response.choices[0].message.content or "").strip()
    except Exception as exc:
        result = {
            "is_french": None,
            "is_generic": None,
            "confidence": None,
            "summary": str(exc),
            "raw": None,
            "error": f"openai_error: {exc}",
        }
        cache_entry["gpt"] = result
        cache[question_id] = cache_entry
        return result

    result = parse_model_output(raw, "gpt")
    cache_entry["gpt"] = result
    cache[question_id] = cache_entry
    return result


def evaluate_with_gemini(
    model: genai.GenerativeModel,
    record: Dict[str, object],
    cache: Dict[str, Dict[str, object]],
    gpt_result: Dict[str, object],
) -> Dict[str, object]:
    question_id = str(record["question_id"])
    cache_entry = cache.setdefault(question_id, {})
    if "gemini" in cache_entry:
        return cache_entry["gemini"]

    gpt_eval = {
        key: gpt_result.get(key)
        for key in ("is_french", "is_generic", "summary", "confidence", "error")
        if key in gpt_result
    }
    answers_text = "\n".join(
        f"{key}) {value if value else '[vide]'}" for key, value in record["answers"].items()
    )
    correct_line = f"{record['correct_letter']} -> {record.get('correct_answer_text') or '[inconnu]'}"
    prompt = (
        GEMINI_PROMPT_TEMPLATE.format(gpt_eval=json.dumps(gpt_eval, ensure_ascii=False))
        + "\n\nQuestion:\n"
        + (record["question_text"] or "")
        + "\n\nRéponses:\n"
        + answers_text
        + "\n\nBonne réponse: "
        + correct_line
        + "\n\nExplication:\n"
        + (record["explanation"] or "")
    )

    try:
        response = model.generate_content(prompt)
        raw = getattr(response, "text", None)
        if not raw:
            raw_parts: List[str] = []
            for candidate in getattr(response, "candidates", []) or []:
                content = getattr(candidate, "content", None)
                if not content:
                    continue
                for part in getattr(content, "parts", []) or []:
                    text_part = getattr(part, "text", None)
                    if text_part:
                        raw_parts.append(text_part)
            raw = "".join(raw_parts)
    except Exception as exc:
        result = {
            "is_french": None,
            "is_generic": None,
            "confidence": None,
            "summary": str(exc),
            "raw": None,
            "error": f"gemini_error: {exc}",
        }
        cache_entry["gemini"] = result
        cache[question_id] = cache_entry
        return result

    result = parse_model_output(raw, "gemini")
    cache_entry["gemini"] = result
    cache[question_id] = cache_entry
    return result


def collect_final_flags(
    gpt_result: Optional[Dict[str, object]],
    gemini_result: Optional[Dict[str, object]],
) -> tuple[set[str], Dict[str, bool]]:
    reasons: set[str] = set()
    gpt_fail = False
    gemini_fail = False

    for rule, (reason, flag_when) in RULE_TO_REASON.items():
        gpt_value = gpt_result.get(rule) if gpt_result else None
        gemini_value = gemini_result.get(rule) if gemini_result else None
        if isinstance(gpt_value, bool) and gpt_value is flag_when:
            reasons.add(reason)
            gpt_fail = True
        if isinstance(gemini_value, bool) and gemini_value is flag_when:
            reasons.add(reason)
            gemini_fail = True

    if gpt_result and gpt_result.get("error"):
        reasons.add("gpt_error")
        gpt_fail = True
    if gemini_result and gemini_result.get("error"):
        reasons.add("gemini_error")
        gemini_fail = True

    return reasons, {"gpt_fail": gpt_fail, "gemini_fail": gemini_fail}


def load_existing_results(path: Path):
    if not path.exists():
        return [], set(), collections.Counter(), {
            "gpt_flags": 0,
            "gemini_flags": 0,
            "both_flags": 0,
            "gpt_only": 0,
            "gemini_only": 0,
        }

    try:
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    except json.JSONDecodeError as exc:
        warn(f"Existing flagged file {path} could not be parsed: {exc}")
        return [], set(), collections.Counter(), {
            "gpt_flags": 0,
            "gemini_flags": 0,
            "both_flags": 0,
            "gpt_only": 0,
            "gemini_only": 0,
        }

    if not isinstance(data, list):
        warn(f"Existing flagged file {path} is not a list; ignoring for resume.")
        return [], set(), collections.Counter(), {
            "gpt_flags": 0,
            "gemini_flags": 0,
            "both_flags": 0,
            "gpt_only": 0,
            "gemini_only": 0,
        }

    stats = collections.Counter()
    ids = set()
    model_counts = {
        "gpt_flags": 0,
        "gemini_flags": 0,
        "both_flags": 0,
        "gpt_only": 0,
        "gemini_only": 0,
    }

    for entry in data:
        if not isinstance(entry, dict):
            continue
        qid = str(entry.get("question_id"))
        if not qid:
            continue
        ids.add(qid)
        for flag in entry.get("reason_flags", []):
            stats[flag] += 1
        if entry.get("exam_type"):
            stats[f"exam_type:{entry['exam_type']}"] += 1
        if entry.get("category"):
            stats[f"category:{entry['category']}"] += 1
        if entry.get("test_type"):
            stats[f"test_type:{entry['test_type']}"] += 1

        gpt_result = entry.get("gpt_result") or {}
        gemini_result = entry.get("gemini_result") or {}
        reasons, flags = collect_final_flags(gpt_result, gemini_result)
        if flags["gpt_fail"]:
            model_counts["gpt_flags"] += 1
        if flags["gemini_fail"]:
            model_counts["gemini_flags"] += 1
        if flags["gpt_fail"] and flags["gemini_fail"]:
            model_counts["both_flags"] += 1
        elif flags["gpt_fail"]:
            model_counts["gpt_only"] += 1
        elif flags["gemini_fail"]:
            model_counts["gemini_only"] += 1

    return data, ids, stats, model_counts


def write_outputs(
    flagged: List[Dict[str, object]],
    stats: collections.Counter,
    rows_total: int,
    output_dir: Path,
    model_counts: Dict[str, int],
    cache_entries: int,
    model_enabled: bool,
) -> None:
    flagged_path = output_dir / "flagged_explanations.json"
    summary_path = output_dir / "flagged_explanations_summary.json"

    dump_json(os.fspath(flagged_path), flagged)

    summary = {
        "total_questions": rows_total,
        "flagged_count": len(flagged),
        "reasons": {k: v for k, v in stats.items() if not k.startswith(("exam_type:", "category:", "test_type:"))},
        "by_exam_type": {
            key.split(":", 1)[1]: count
            for key, count in stats.items()
            if key.startswith("exam_type:")
        },
        "by_category": {
            key.split(":", 1)[1]: count
            for key, count in stats.items()
            if key.startswith("category:")
        },
        "by_test_type": {
            key.split(":", 1)[1]: count
            for key, count in stats.items()
            if key.startswith("test_type:")
        },
        "model_review": {
            "enabled": model_enabled,
            "gpt_failures": model_counts["gpt_flags"],
            "gemini_failures": model_counts["gemini_flags"],
            "both_fail": model_counts["both_flags"],
            "gpt_only": model_counts["gpt_only"],
            "gemini_only": model_counts["gemini_only"],
            "cache_entries": cache_entries if model_enabled else 0,
        },
    }
    dump_json(os.fspath(summary_path), summary)


def main() -> None:
    args = parse_args()
    args.categories = [cat.upper() for cat in args.categories] if args.categories else []
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    flagged_path = output_dir / "flagged_explanations.json"
    resume_enabled = args.resume
    flagged: List[Dict[str, object]] = []
    stats = collections.Counter()
    model_counts = {
        "gpt_flags": 0,
        "gemini_flags": 0,
        "both_flags": 0,
        "gpt_only": 0,
        "gemini_only": 0,
    }
    existing_ids: set[str] = set()

    if resume_enabled:
        existing_entries, existing_ids, stats, model_counts = load_existing_results(flagged_path)
        if existing_entries:
            info(f"Resuming with {len(existing_entries)} previously flagged explanations")
            flagged.extend(existing_entries)

    info("Connecting to Supabase...")
    client = get_supabase_client()

    info("Fetching questions with explanations")
    rows: List[Dict[str, object]] = []
    for test_type in args.test_types:
        filters = {
            "test_type": (lambda query, tt=test_type: query.eq("test_type", tt)),
            "explanation": (lambda query: query.not_.is_("explanation", "null")),
        }
        if args.categories:
            filters["category"] = (
                lambda query, cats=tuple(args.categories): query.in_("category", list(cats))
            )

        subset = fetch_questions(
            client,
            columns=[
                "id",
                "question_text",
                "answer1",
                "answer2",
                "answer3",
                "answer4",
                "correct",
                "explanation",
                "exam_type",
                "category",
                "difficulty",
                "test_type",
            ],
            filters=filters,
            chunk_size=args.chunk_size,
        )
        info(f" - Retrieved {len(subset)} rows for test_type={test_type}")
        rows.extend(subset)

    info(f"Fetched {len(rows)} total questions (ordered by test_type)")
    if args.limit:
        rows = rows[: args.limit]
        warn(f"Processing limited dataset: {len(rows)} rows")
    else:
        info(f"Processing total rows: {len(rows)}")

    skip_ids = load_skip_ids(args.skip_file)
    if resume_enabled:
        skip_ids.update(existing_ids)
    if skip_ids:
        info(f"Skipping {len(skip_ids)} question IDs supplied via resume/skip files")

    model_enabled = not args.no_model
    model_cache_path = Path(args.model_cache)
    model_cache: Dict[str, Dict[str, object]] = load_model_cache(model_cache_path) if model_enabled else {}
    gpt_client: Optional[openai.OpenAI] = None
    gemini_model: Optional[genai.GenerativeModel] = None

    if model_enabled:
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            raise RuntimeError("Set OPENAI_API_KEY before running the script.")
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        if not gemini_api_key:
            raise RuntimeError("Set GEMINI_API_KEY before running the script.")

        gpt_client = openai.OpenAI(api_key=openai_api_key)
        genai.configure(api_key=gemini_api_key)
        gemini_model = genai.GenerativeModel(args.gemini_model)
        info(f"OpenAI cache entries loaded: {len(model_cache)}")
        info(f"Using GPT model {args.model_name} and Gemini model {args.gemini_model}")
    else:
        warn("--no-model specified; no validations will be performed.")

    processed = 0
    log_interval = max(args.log_interval, 1)
    save_interval = max(1, min(log_interval, 100))
    new_flagged_count = 0
    model_active = model_enabled and gpt_client is not None and gemini_model is not None

    for row in rows:
        question_id = str(row["id"])
        if question_id in skip_ids:
            continue

        processed += 1
        record = build_question_record(row)
        reasons = apply_heuristics(record)

        gpt_result: Optional[Dict[str, object]] = None
        gemini_result: Optional[Dict[str, object]] = None
        flags = {"gpt_fail": False, "gemini_fail": False}

        if model_active:
            gpt_result = evaluate_with_gpt(gpt_client, args.model_name, record, model_cache)
            gemini_result = evaluate_with_gemini(gemini_model, record, model_cache, gpt_result)

            model_reasons, flags = collect_final_flags(gpt_result, gemini_result)
            reasons.update(model_reasons)

            if flags["gpt_fail"]:
                model_counts["gpt_flags"] += 1
            if flags["gemini_fail"]:
                model_counts["gemini_flags"] += 1
            if flags["gpt_fail"] and flags["gemini_fail"]:
                model_counts["both_flags"] += 1
            elif flags["gpt_fail"]:
                model_counts["gpt_only"] += 1
            elif flags["gemini_fail"]:
                model_counts["gemini_only"] += 1

        if reasons:
            entry = dict(record)
            entry["reason_flags"] = sorted(reasons)
            entry["gpt_result"] = gpt_result
            entry["gemini_result"] = gemini_result
            entry["model_enabled"] = model_active
            flagged.append(entry)
            for flag in reasons:
                stats[flag] += 1
            stats[f"exam_type:{record.get('exam_type')}"] += 1
            stats[f"category:{record.get('category')}"] += 1
            stats[f"test_type:{record.get('test_type')}"] += 1
            new_flagged_count += 1
            if new_flagged_count % save_interval == 0:
                write_outputs(
                    flagged,
                    stats,
                    len(rows),
                    output_dir,
                    model_counts,
                    len(model_cache),
                    model_active,
                )

        if processed % log_interval == 0:
            info(
                f"Processed {processed} questions (flagged: {len(flagged)}, "
                f"gpt_failures={model_counts['gpt_flags']}, gemini_failures={model_counts['gemini_flags']})"
            )
            write_outputs(
                flagged,
                stats,
                len(rows),
                output_dir,
                model_counts,
                len(model_cache),
                model_active,
            )

    info(f"Flagged explanations: {len(flagged)}")
    write_outputs(
        flagged,
        stats,
        len(rows),
        output_dir,
        model_counts,
        len(model_cache),
        model_active,
    )

    if model_active:
        save_model_cache(model_cache_path, model_cache)
        info(f"Model cache saved to {model_cache_path}")

    info("Saved flagged explanations and summary reports.")


if __name__ == "__main__":
    main()
