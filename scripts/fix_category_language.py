#!/usr/bin/env python3
"""Unified fixer for ANG/CG language/category mismatches."""

from __future__ import annotations

import argparse
import json
import os
import random
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

import google.generativeai as genai
import openai

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if os.fspath(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, os.fspath(PROJECT_ROOT))

from question_audit.db import SupabaseConfigError, dump_json, fetch_questions, get_supabase_client  # type: ignore
from question_audit.language import detect_language_scores  # type: ignore
from question_audit.logging_utils import info, warn  # type: ignore
from question_audit.text_utils import preview  # type: ignore

JSON_DECODER = json.JSONDecoder()
OPTION_KEYS = ["answer1", "answer2", "answer3", "answer4"]
LETTER_BY_INDEX = {0: "A", 1: "B", 2: "C", 3: "D"}


def question_snapshot(row: Dict[str, object]) -> Dict[str, object]:
    return {
        "question_text": row.get("question_text"),
        "answer1": row.get("answer1"),
        "answer2": row.get("answer2"),
        "answer3": row.get("answer3"),
        "answer4": row.get("answer4"),
        "category": row.get("category"),
        "exam_type": row.get("exam_type"),
        "difficulty": row.get("difficulty"),
        "sub_category": row.get("sub_category"),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--categories",
        nargs="+",
        default=["CG", "ANG"],
        help="Categories to inspect in order (default: CG ANG)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Process at most this many questions across all categories",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Persist changes to Supabase; default is dry-run",
    )
    parser.add_argument(
        "--question-english-threshold",
        type=float,
        default=0.82,
        help="Minimum English probability for question_text to be treated as English (default: 0.82)",
    )
    parser.add_argument(
        "--question-french-threshold",
        type=float,
        default=0.75,
        help="Minimum French probability for question_text to be treated as French (default: 0.75)",
    )
    parser.add_argument(
        "--option-english-threshold",
        type=float,
        default=0.65,
        help="Minimum English probability for answer option to be considered English (default: 0.65)",
    )
    parser.add_argument(
        "--option-french-threshold",
        type=float,
        default=0.55,
        help="Minimum French probability required on translated options (default: 0.55)",
    )
    parser.add_argument(
        "--model-name",
        default="gpt-5",
        help="OpenAI model used for translation and decision checks (default: gpt-5)",
    )
    parser.add_argument(
        "--decision-model",
        default=None,
        help="Optional secondary OpenAI model for action confirmation (defaults to --model-name)",
    )
    parser.add_argument(
        "--gemini-model",
        default="gemini-2.0-flash",
        help="Gemini model used for translation QA (default: gemini-2.0-flash)",
    )
    parser.add_argument(
        "--output-dir",
        default="diagnostics_output",
        help="Directory for resulting JSON logs (default: diagnostics_output)",
    )
    parser.add_argument(
        "--skip-file",
        action="append",
        help="Path to newline-delimited question IDs to ignore",
    )
    parser.add_argument(
        "--manual-limit",
        type=int,
        default=None,
        help="Stop once this many manual review items are collected (default: unlimited)",
    )
    parser.add_argument(
        "--no-model",
        action="store_true",
        help="Disable the OpenAI confirmation step (heuristics only)",
    )
    return parser.parse_args()


def sleep_with_jitter(base: float = 0.6, jitter: float = 0.4) -> None:
    time.sleep(base + random.random() * jitter)


def ensure_probability(name: str, value: float) -> None:
    if not 0.0 <= value <= 1.0:
        raise ValueError(f"{name} must be between 0.0 and 1.0 (received {value}).")


def load_skip_ids(paths: Iterable[str] | None) -> set[str]:
    if not paths:
        return set()
    skip: set[str] = set()
    for path in paths:
        if not os.path.exists(path):
            warn(f"Skip file not found: {path}")
            continue
        with open(path, "r", encoding="utf-8") as handle:
            for line in handle:
                token = line.strip()
                if token:
                    skip.add(token)
    return skip


def language_scores(text: str) -> Dict[str, float]:
    scores: Dict[str, float] = {}
    for lang in detect_language_scores(text or ""):
        scores[lang.lang] = max(scores.get(lang.lang, 0.0), lang.prob)
    return scores


def english_prompt_indicator(text: str) -> bool:
    if not text:
        return False
    lower = text.lower()
    if any(
        phrase in lower
        for phrase in (
            "que signifie",
            "que veut dire",
            "traduction en anglais",
            "mot anglais",
            "traduire en anglais",
            "signifie en anglais",
            "traduisez en anglais",
        )
    ):
        return True
    quoted = re.findall(r"['\"]([A-Za-z ]+)['\"]", text)
    return any(word and word.strip().isascii() for word in quoted)


def french_prompt_indicator(text: str) -> bool:
    if not text:
        return False
    lower = text.lower()
    return any(
        phrase in lower
        for phrase in (
            "que signifie en français",
            "traduire en français",
            "mot français",
            "signifie en français",
        )
    )


def analyse_question(
    row: Dict[str, object],
    category: str,
    english_question_threshold: float,
    french_question_threshold: float,
    english_option_threshold: float,
) -> Dict[str, object]:
    question_text = row.get("question_text") or ""
    question_scores = language_scores(question_text)
    english_question = question_scores.get("en", 0.0) >= english_question_threshold
    french_question = question_scores.get("fr", 0.0) >= french_question_threshold
    english_hint = english_prompt_indicator(question_text)
    french_hint = french_prompt_indicator(question_text)

    options_info: List[Dict[str, object]] = []
    english_option_count = 0
    french_option_count = 0

    for idx, key in enumerate(OPTION_KEYS):
        option_text = (row.get(key) or "").strip()
        if not option_text:
            continue
        scores = language_scores(option_text)
        english_prob = scores.get("en", 0.0)
        french_prob = scores.get("fr", 0.0)
        letter = LETTER_BY_INDEX[idx]
        is_english = english_prob >= english_option_threshold
        if is_english:
            english_option_count += 1
        if french_prob >= french_question_threshold:
            french_option_count += 1
        options_info.append(
            {
                "option_key": key,
                "option_letter": letter,
                "option_text": option_text,
                "english_prob": round(english_prob, 4),
                "french_prob": round(french_prob, 4),
                "is_english": is_english,
            }
        )

    heuristics_action = None
    heuristic_reason = ""
    if category == "CG":
        if english_question or english_hint:
            heuristics_action = "recategorize_ang"
            heuristic_reason = "question_text_english" if english_question else "question_prompt_hint"
        elif english_option_count > 0:
            heuristics_action = "translate_to_french"
            heuristic_reason = "english_answer_options"
    elif category == "ANG":
        if french_question or french_hint:
            heuristics_action = "recategorize_cg"
            heuristic_reason = "question_text_french" if french_question else "question_prompt_hint"
        elif french_option_count > 0:
            heuristics_action = "manual_review"
            heuristic_reason = "french_answer_options"

    return {
        "question_language_en": round(question_scores.get("en", 0.0), 4),
        "question_language_fr": round(question_scores.get("fr", 0.0), 4),
        "english_question": english_question,
        "french_question": french_question,
        "english_prompt_hint": english_hint,
        "french_prompt_hint": french_hint,
        "options": options_info,
        "english_option_count": english_option_count,
        "heuristics_action": heuristics_action,
        "heuristic_reason": heuristic_reason,
    }


def extract_json_object(text: str) -> Dict[str, object]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    match = re.search(r"\{", cleaned)
    if not match:
        raise ValueError("No JSON object found in response.")
    start = match.start()
    payload, _ = JSON_DECODER.raw_decode(cleaned[start:])
    return payload


def model_decision(
    client: openai.OpenAI,
    model: str,
    category: str,
    row: Dict[str, object],
    analysis: Dict[str, object],
) -> Optional[Dict[str, object]]:
    question_text = row.get("question_text") or ""
    options_block = "\n".join(
        f"{item['option_letter']}) {item['option_text']}" for item in analysis["options"]
    )
    heuristic_summary = {
        "heuristics_action": analysis["heuristics_action"],
        "heuristic_reason": analysis["heuristic_reason"],
        "english_question": analysis["english_question"],
        "french_question": analysis["french_question"],
        "english_prompt_hint": analysis["english_prompt_hint"],
        "french_prompt_hint": analysis["french_prompt_hint"],
        "english_option_count": analysis["english_option_count"],
    }
    allowed_actions = ["manual_review"]
    if category == "CG":
        allowed_actions.extend(["recategorize_ang", "translate_to_french"])
    elif category == "ANG":
        allowed_actions.append("recategorize_cg")

    prompt = (
        "Tu analyses une question de QCM de l'ENA. "
        "Règles :\n"
        "- Si l'énoncé appartient clairement à l'anglais (ou teste un mot anglais), la question doit être en catégorie ANG.\n"
        "- Si l'énoncé est en français mais certaines options sont en anglais, il faut traduire ces options en français.\n"
        "- Si l'énoncé est en français et la question est en catégorie ANG, recatégorise vers CG.\n"
        "- Sinon, signale une revue manuelle.\n"
        f"Actions autorisées : {allowed_actions}.\n"
        "Réponds en JSON du format {\"action\": \"...\", \"reason\": \"...\"}.\n\n"
        f"Catégorie actuelle: {category}\n"
        f"Énoncé: {question_text}\n"
        f"Options:\n{options_block}\n\n"
        f"Analyse heuristique: {json.dumps(heuristic_summary, ensure_ascii=False)}"
    )

    try:
        response = client.responses.create(
            model=model,
            input=[
                {"role": "system", "content": "Tu es un correcteur de questions d'examen."},
                {"role": "user", "content": prompt},
            ],
        )
        content = response.output_text.strip()
        payload = extract_json_object(content)
        action = payload.get("action")
        reason = payload.get("reason", "")
        if action not in allowed_actions:
            raise ValueError(f"Unexpected action: {action}")
        sleep_with_jitter()
        return {"action": action, "reason": reason}
    except Exception as exc:
        warn(f"Decision model failed: {exc}")
        return None


def update_category(
    client,
    row: Dict[str, object],
    target_category: str,
    english_threshold: float,
    french_threshold: float,
    apply: bool,
) -> Tuple[bool, str]:
    question_text = row.get("question_text") or ""
    scores = language_scores(question_text)
    english_prob = scores.get("en", 0.0)
    french_prob = scores.get("fr", 0.0)

    if target_category == "ANG":
        if english_prob < english_threshold or english_prob <= french_prob:
            return False, f"insufficient_english en={english_prob:.2f} fr={french_prob:.2f}"
    elif target_category == "CG":
        if french_prob < french_threshold or french_prob <= english_prob:
            return False, f"insufficient_french en={english_prob:.2f} fr={french_prob:.2f}"
    else:
        return False, f"unsupported_target {target_category}"

    if apply:
        client.table("questions").update({"category": target_category}).eq("id", row["id"]).execute()
        info(
            f"Updated question {row['id']} category -> {target_category} "
            f"(en={english_prob:.2f}, fr={french_prob:.2f})"
        )
    else:
        info(
            f"DRY-RUN recategorize {row['id']} -> {target_category} "
            f"(en={english_prob:.2f}, fr={french_prob:.2f})"
        )
    return True, ""


def translate_option_to_french(
    gpt_client: openai.OpenAI,
    gpt_model: str,
    gemini_model: genai.GenerativeModel,
    question_preview: str,
    option_letter: str,
    option_key: str,
    option_text: str,
    min_french: float,
) -> Tuple[Optional[Dict[str, object]], Optional[Dict[str, object]]]:
    system_prompt = (
        "Tu es traducteur spécialisé pour les épreuves de culture générale de l'ENA "
        "de Côte d'Ivoire. Tu traduis les réponses en français formel ivoirien tout en "
        "préservant le sens, les chiffres et la casse."
    )
    user_prompt = (
        "Question (aperçu): {question}\n"
        "Réponse à traduire: {answer}\n\n"
        "Retourne uniquement un JSON valide du format {{\"translation\": \"...\"}}. "
        "La traduction doit être concise, naturelle, sans guillemets superflus."
    ).format(question=question_preview or "(aperçu indisponible)", answer=option_text)

    translation = None
    error_detail = None
    for attempt in range(1, 4):
        try:
            response = gpt_client.responses.create(
                model=gpt_model,
                input=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
            content = response.output_text.strip()
            payload = extract_json_object(content)
            candidate = payload.get("translation")
            if isinstance(candidate, str) and candidate.strip():
                translation = candidate.strip()
                break
            raise ValueError("Translation missing or empty.")
        except Exception as exc:
            error_detail = str(exc)
            warn(f"GPT translation failed for option {option_letter} (attempt {attempt}): {exc}")
            backoff = min(2 ** (attempt - 1), 8)
            sleep_with_jitter(base=backoff, jitter=0.3)

    if translation is None:
        return None, {
            "option_letter": option_letter,
            "option_key": option_key,
            "reason": "gpt_failed",
            "details": error_detail,
            "original_text": option_text,
        }

    try:
        response = gemini_model.generate_content(
            (
                "Tu es réviseur linguistique. Vérifie que la traduction proposée est fidèle, naturelle "
                "et sans erreur. Réponds uniquement en JSON du format {\"approved\": true/false, "
                "\"reason\": \"...\"}.\n\n"
                f"Original: {option_text}\n"
                f"Traduction: {translation}"
            )
        )
        payload = extract_json_object(response.text.strip())
        approved = bool(payload.get("approved"))
        reason = str(payload.get("reason", "")).strip()
        sleep_with_jitter()
    except Exception as exc:
        warn(f"Gemini validation failed for option {option_letter}: {exc}")
        return None, {
            "option_letter": option_letter,
            "option_key": option_key,
            "reason": "validation_error",
            "details": str(exc),
            "original_text": option_text,
            "translation": translation,
        }

    french_prob = detect_french_probability(translation)
    if not approved or french_prob < min_french:
        return None, {
            "option_letter": option_letter,
            "option_key": option_key,
            "reason": "validation_rejected" if not approved else "low_french_probability",
            "details": reason,
            "original_text": option_text,
            "translation": translation,
            "french_prob": round(french_prob, 4),
        }

    return (
        {
            "option_letter": option_letter,
            "option_key": option_key,
            "original_text": option_text,
            "translated_text": translation,
            "french_prob": round(french_prob, 4),
            "gemini_reason": reason,
        },
        None,
    )


def detect_french_probability(text: str) -> float:
    for lang in detect_language_scores(text):
        if lang.lang == "fr":
            return lang.prob
    return 0.0


def process_question(
    category: str,
    row: Dict[str, object],
    analysis: Dict[str, object],
    args: argparse.Namespace,
    supabase_client,
    gpt_client: openai.OpenAI,
    gemini_model: genai.GenerativeModel,
    model_result: Optional[Dict[str, object]],
    recat_log: List[Dict[str, object]],
    translation_log: List[Dict[str, object]],
    manual_log: List[Dict[str, object]],
) -> None:
    heuristics_action = analysis["heuristics_action"]
    if not heuristics_action:
        return

    final_action = heuristics_action
    model_reason = None
    if model_result:
        model_action = model_result.get("action")
        model_reason = model_result.get("reason", "")
        if model_action != heuristics_action:
            manual_log.append(
                {
                    "question_id": row["id"],
                    "category": category,
                    "heuristics_action": heuristics_action,
                    "model_action": model_action,
                    "model_reason": model_reason,
                    "analysis": analysis,
                    "question_preview": preview(row.get("question_text", "")),
                    "question": question_snapshot(row),
                }
            )
            info(
                f"Manual review: heuristics={heuristics_action} vs model={model_action} "
                f"for question {row['id']}"
            )
            return
        final_action = model_action

    if final_action == "recategorize_ang":
        success, reason = update_category(
            supabase_client,
            row,
            target_category="ANG",
            english_threshold=args.question_english_threshold,
            french_threshold=args.question_french_threshold,
            apply=args.apply,
        )
        if success:
            recat_log.append(
                {
                    "question_id": row["id"],
                    "from_category": category,
                    "to_category": "ANG",
                    "question_language_en": analysis["question_language_en"],
                    "question_language_fr": analysis["question_language_fr"],
                    "reason": analysis["heuristic_reason"],
                    "model_reason": model_reason,
                    "question": question_snapshot(row),
                }
            )
        else:
            manual_log.append(
                {
                    "question_id": row["id"],
                    "category": category,
                    "heuristics_action": final_action,
                    "failure_reason": reason,
                    "analysis": analysis,
                    "question": question_snapshot(row),
                }
            )

    elif final_action == "recategorize_cg":
        success, reason = update_category(
            supabase_client,
            row,
            target_category="CG",
            english_threshold=args.question_english_threshold,
            french_threshold=args.question_french_threshold,
            apply=args.apply,
        )
        if success:
            recat_log.append(
                {
                    "question_id": row["id"],
                    "from_category": category,
                    "to_category": "CG",
                    "question_language_en": analysis["question_language_en"],
                    "question_language_fr": analysis["question_language_fr"],
                    "reason": analysis["heuristic_reason"],
                    "model_reason": model_reason,
                    "question": question_snapshot(row),
                }
            )
        else:
            manual_log.append(
                {
                    "question_id": row["id"],
                    "category": category,
                    "heuristics_action": final_action,
                    "failure_reason": reason,
                    "analysis": analysis,
                    "question": question_snapshot(row),
                }
            )

    elif final_action == "translate_to_french":
        question_preview = preview(row.get("question_text", ""))
        translated: List[Dict[str, object]] = []
        rejected: List[Dict[str, object]] = []

        for option in analysis["options"]:
            if not option["is_english"]:
                continue
            success_entry, reject_entry = translate_option_to_french(
                gpt_client,
                openai_model,
                gemini_model,
                question_preview=question_preview,
                option_letter=option["option_letter"],
                option_key=option["option_key"],
                option_text=option["option_text"],
                min_french=args.option_french_threshold,
            )
            if success_entry:
                translated.append(success_entry)
            elif reject_entry:
                rejected.append(reject_entry)

        if translated and args.apply:
            updates = {entry["option_key"]: entry["translated_text"] for entry in translated}
            supabase_client.table("questions").update(updates).eq("id", row["id"]).execute()
            info(
                f"Updated options for question {row['id']}: "
                f"{[entry['option_letter'] for entry in translated]}"
            )
        elif translated:
            info(
                f"DRY-RUN translate options for {row['id']}: "
                f"{[entry['option_letter'] for entry in translated]}"
            )

        translation_log.append(
            {
                "question_id": row["id"],
                "category": category,
                "translated": translated,
                "rejected": rejected,
                "question_preview": question_preview,
                "question": question_snapshot(row),
            }
        )

        if rejected:
            manual_log.append(
                {
                    "question_id": row["id"],
                    "category": category,
                    "heuristics_action": final_action,
                    "rejected_translations": rejected,
                    "analysis": analysis,
                    "question": question_snapshot(row),
                }
            )

    else:
        manual_log.append(
            {
                "question_id": row["id"],
                "category": category,
                "heuristics_action": heuristics_action,
                "analysis": analysis,
                "question": question_snapshot(row),
            }
        )


def main() -> None:
    args = parse_args()

    try:
        ensure_probability("--question-english-threshold", args.question_english_threshold)
        ensure_probability("--question-french-threshold", args.question_french_threshold)
        ensure_probability("--option-english-threshold", args.option_english_threshold)
        ensure_probability("--option-french-threshold", args.option_french_threshold)
    except ValueError as exc:
        warn(str(exc))
        return

    categories: Sequence[str] = [cat.upper() for cat in args.categories]
    skip_ids = load_skip_ids(args.skip_file)
    if skip_ids:
        info(f"Loaded {len(skip_ids)} IDs from skip file(s)")

    try:
        supabase_client = get_supabase_client()
    except SupabaseConfigError as exc:
        warn(str(exc))
        return

    openai_api_key = os.getenv("OPENAI_API_KEY")
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not openai_api_key:
        warn("OPENAI_API_KEY not set; aborting.")
        return
    if not gemini_api_key:
        warn("GEMINI_API_KEY not set; aborting.")
        return

    gpt_client = openai.OpenAI(api_key=openai_api_key)
    openai_model = os.getenv("OPENAI_MODEL", args.model_name or "gpt-5")
    decision_model_name = os.getenv(
        "OPENAI_DECISION_MODEL",
        args.decision_model or openai_model,
    )
    genai.configure(api_key=gemini_api_key)
    gemini_model = genai.GenerativeModel(args.gemini_model)

    recategorized: List[Dict[str, object]] = []
    translations: List[Dict[str, object]] = []
    manual_review: List[Dict[str, object]] = []

    processed_total = 0

    for category in categories:
        info(f"Processing category {category}")
        rows = fetch_questions(
            supabase_client,
            columns=[
                "id",
                "question_text",
                "answer1",
                "answer2",
                "answer3",
                "answer4",
                "category",
                "exam_type",
                "difficulty",
                "sub_category",
            ],
            filters={"category": category},
        )

        for row in rows:
            if args.limit and processed_total >= args.limit:
                break
            question_id = row["id"]
            if question_id in skip_ids:
                continue

            processed_total += 1
            analysis = analyse_question(
                row,
                category=category,
                english_question_threshold=args.question_english_threshold,
                french_question_threshold=args.question_french_threshold,
                english_option_threshold=args.option_english_threshold,
            )

            heuristics_action = analysis["heuristics_action"]
            if not heuristics_action:
                continue

            model_result = None
            if not args.no_model:
                model_result = model_decision(
                    gpt_client,
                    decision_model_name,
                    category,
                    row,
                    analysis,
                )
                if model_result is None:
                    manual_review.append(
                        {
                            "question_id": question_id,
                            "category": category,
                            "heuristics_action": heuristics_action,
                            "analysis": analysis,
                            "reason": "decision_model_failed",
                            "question": question_snapshot(row),
                        }
                    )
                    continue

            process_question(
                category,
                row,
                analysis,
                args,
                supabase_client,
                gpt_client,
                gemini_model,
                model_result,
                recategorized,
                translations,
                manual_review,
            )

            if args.manual_limit and len(manual_review) >= args.manual_limit:
                warn("Manual review limit reached; stopping early.")
                break

        if args.limit and processed_total >= args.limit:
            break

    output_dir = Path(args.output_dir)
    if not output_dir.is_absolute():
        output_dir = PROJECT_ROOT / output_dir
    output_dir = output_dir / "category_language"
    output_dir.mkdir(parents=True, exist_ok=True)
    run_tag = "applied" if args.apply else "dry_run"
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

    recat_path = output_dir / f"category_language_recategorized_{run_tag}_{timestamp}.json"
    trans_path = output_dir / f"category_language_translations_{run_tag}_{timestamp}.json"
    manual_path = output_dir / f"category_language_manual_{run_tag}_{timestamp}.json"

    dump_json(os.fspath(recat_path), recategorized)
    dump_json(os.fspath(trans_path), translations)
    dump_json(os.fspath(manual_path), manual_review)

    info(
        "Session complete. "
        f"Recategorized: {len(recategorized)}, "
        f"Translations attempted: {len([t for t in translations if t['translated']])}, "
        f"Manual review: {len(manual_review)}"
    )
    info(f"Logs saved to {recat_path}, {trans_path}, {manual_path}")


if __name__ == "__main__":
    main()
