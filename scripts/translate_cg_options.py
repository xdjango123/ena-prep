#!/usr/bin/env python3
"""Translate CG answer options detected as English and update Supabase."""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime
from pathlib import Path
import random
import re
import time
from typing import Dict, Iterable, List, Optional, Tuple

import google.generativeai as genai
import openai

from question_audit.db import SupabaseConfigError, dump_json, get_supabase_client
from question_audit.language import detect_language_scores
from question_audit.logging_utils import info, warn

JSON_DECODER = json.JSONDecoder()


def extract_json_object(text: str) -> Dict[str, object]:
    """Return the first JSON object embedded in text."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    match = re.search(r"\{", cleaned)
    if not match:
        raise ValueError("Aucun objet JSON détecté dans la réponse.")
    start = match.start()
    payload, _ = JSON_DECODER.raw_decode(cleaned[start:])
    return payload


def sleep_with_jitter(base: float = 0.6, jitter: float = 0.5) -> None:
    time.sleep(base + random.random() * jitter)


def ensure_probability(name: str, value: float) -> None:
    if not 0.0 <= value <= 1.0:
        raise ValueError(f"{name} doit être compris entre 0.0 et 1.0 (fourni: {value}).")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        default="diagnostics_output/cg_option_language.json",
        help="JSON produced by audit_cg_option_language.py",
    )
    parser.add_argument(
        "--model-name",
        default="gpt-5",
        help="OpenAI model used for translation (default: gpt-5)",
    )
    parser.add_argument(
        "--gemini-model",
        default="gemini-2.0-flash",
        help="Gemini model used for validation (default: gemini-2.0-flash)",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Persist approved translations to Supabase (default: dry-run)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional limit on number of options processed",
    )
    parser.add_argument(
        "--skip-file",
        action="append",
        help="Path to newline-delimited option IDs (question_id|option) to skip",
    )
    parser.add_argument(
        "--log-dir",
        default="diagnostics_output",
        help="Directory to write translation logs (default: diagnostics_output)",
    )
    parser.add_argument(
        "--retry-count",
        type=int,
        default=2,
        help="Maximum GPT retry attempts before giving up (default: 2)",
    )
    parser.add_argument(
        "--min-french-confidence",
        type=float,
        default=0.6,
        help="Minimum French probability required after translation (default: 0.6)",
    )
    return parser.parse_args()


def load_flags(path: str) -> List[Dict[str, object]]:
    if not os.path.exists(path):
        raise FileNotFoundError(f"Input file not found: {path}")
    with open(path, "r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise ValueError(f"Expected list in {path}, got {type(data)!r}")
    return data


def load_skip_ids(paths: Iterable[str] | None) -> set[str]:
    result: set[str] = set()
    if not paths:
        return result
    for path in paths:
        if not os.path.exists(path):
            warn(f"Skip file not found: {path}")
            continue
        with open(path, "r", encoding="utf-8") as handle:
            for line in handle:
                token = line.strip()
                if token:
                    result.add(token)
    return result


def translate_with_gpt(
    client: openai.OpenAI,
    model: str,
    option_text: str,
    question_preview: str,
    retries: int,
) -> Tuple[Optional[str], Optional[str]]:
    system_prompt = (
        "Tu es traducteur spécialisé pour les épreuves de culture générale de l'ENA "
        "de Côte d'Ivoire. Tu traduis les réponses en français formel ivoirien en "
        "préservant le sens, les chiffres et la casse."
    )
    user_prompt = (
        "Question (aperçu): {question}\n"
        "Réponse à traduire: {answer}\n\n"
        "Retourne uniquement un JSON valide du format {{\"translation\": \"...\"}}. "
        "La traduction doit être concise, naturelle, sans guillemets superflus."
    ).format(question=question_preview or "(aperçu indisponible)", answer=option_text)

    last_error: Optional[str] = None

    for attempt in range(1, retries + 2):
        try:
            response = client.responses.create(
                model=model,
                input=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
            content = response.output_text.strip()
            payload = extract_json_object(content)
            translation = payload.get("translation")
            if isinstance(translation, str) and translation.strip():
                sleep_with_jitter()
                return translation.strip(), None
            raise ValueError("Clé 'translation' manquante ou vide.")
        except Exception as exc:
            last_error = str(exc)
            warn(f"GPT translation failed (attempt {attempt}): {exc}")
            backoff = min(2 ** (attempt - 1), 8)
            sleep_with_jitter(base=backoff, jitter=0.3)

    return None, last_error


def validate_with_gemini(
    model: genai.GenerativeModel,
    original: str,
    translation: str,
) -> Tuple[bool, str]:
    prompt = (
        "Tu es réviseur linguistique. On te fournit une option de réponse d'examen "
        "originale en anglais et sa traduction proposée en français. "
        "Vérifie que la traduction est fidèle, naturelle et sans erreur. "
        "Réponds uniquement en JSON au format "
        "{"
        '"approved": true/false, '
        '"reason": "explication brève"'
        "}."
        "\n\nOriginal: {original}\nTraduction: {translation}"
    ).format(original=original, translation=translation)

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        payload = extract_json_object(text)
        approved = bool(payload.get("approved"))
        reason = str(payload.get("reason", "")).strip()
        sleep_with_jitter()
        return approved, reason
    except Exception as exc:
        warn(f"Gemini validation failed: {exc}")
        return False, f"validation_error: {exc}"


def detect_french_probability(text: str) -> float:
    for lang in detect_language_scores(text):
        if lang.lang == "fr":
            return lang.prob
    return 0.0


def main() -> None:
    args = parse_args()

    try:
        ensure_probability("--min-french-confidence", args.min_french_confidence)
    except ValueError as exc:
        warn(str(exc))
        return

    try:
        client = get_supabase_client()
    except SupabaseConfigError as exc:
        warn(str(exc))
        return

    flags = load_flags(args.input)
    if args.limit is not None:
        flags = flags[: args.limit]

    skip_tokens = load_skip_ids(args.skip_file)
    if skip_tokens:
        info(f"Skip list loaded with {len(skip_tokens)} entries")

    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        warn("OPENAI_API_KEY not set; aborting.")
        return
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        warn("GEMINI_API_KEY not set; aborting.")
        return

    gpt_client = openai.OpenAI(api_key=openai_api_key)
    openai_model = os.getenv("OPENAI_MODEL", args.model_name or "gpt-5")
    genai.configure(api_key=gemini_api_key)
    gemini_model = genai.GenerativeModel(args.gemini_model)

    applied: List[Dict[str, object]] = []
    rejected: List[Dict[str, object]] = []

    for entry in flags:
        qid = str(entry.get("question_id"))
        option = entry.get("option")
        option_key = entry.get("option_key")
        option_text = (entry.get("option_text") or "").strip()
        question_preview = entry.get("question_preview") or ""
        token = f"{qid}|{option}"

        if not qid or not option_key:
            continue
        if token in skip_tokens:
            info(f"Skipping {token} (skip list)")
            continue
        if not option_text:
            info(f"Skipping {token} (empty option text)")
            continue

        translation, gpt_error = translate_with_gpt(
            client=gpt_client,
            model=openai_model,
            option_text=option_text,
            question_preview=question_preview,
            retries=args.retry_count,
        )
        if translation is None:
            rejected.append(
                {
                    "question_id": qid,
                    "option": option,
                    "reason": "gpt_failed",
                    "original_text": option_text,
                    "details": gpt_error,
                }
            )
            continue

        approved, reason = validate_with_gemini(
            gemini_model,
            original=option_text,
            translation=translation,
        )
        french_prob = detect_french_probability(translation)
        meets_language = french_prob >= args.min_french_confidence
        accepted = approved and meets_language

        log_entry = {
            "question_id": qid,
            "option": option,
            "option_key": option_key,
            "original_text": option_text,
            "translated_text": translation,
            "gemini_reason": reason,
            "gemini_approved": approved,
            "french_confidence": round(french_prob, 4),
            "meets_language_threshold": meets_language,
        }

        if accepted:
            if args.apply:
                client.table("questions").update({option_key: translation}).eq("id", qid).execute()
                info(
                    f"Updated {qid} option {option}: '{option_text}' -> '{translation}' "
                    f"(fr={french_prob:.2f})"
                )
            else:
                info(
                    f"DRY-RUN {qid} option {option}: would translate to '{translation}' "
                    f"(fr={french_prob:.2f})"
                )
            applied.append(log_entry)
        else:
            log_entry["reason"] = "gemini_rejected" if not approved else "low_french_score"
            rejected.append(log_entry)
            info(
                f"Rejected {qid} option {option}: approved={approved}, "
                f"fr={french_prob:.2f}, reason={reason}"
            )

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    suffix = "applied" if args.apply else "dry_run"
    log_dir = Path(args.log_dir)
    log_dir.mkdir(parents=True, exist_ok=True)

    if applied:
        path = log_dir / f"cg_option_translations_{suffix}_{timestamp}.json"
        dump_json(os.fspath(path), applied)
        info(f"Wrote applied log to {path}")

    if rejected:
        path = log_dir / f"cg_option_translations_rejected_{timestamp}.json"
        dump_json(os.fspath(path), rejected)
        info(f"Wrote rejected log to {path}")

    info(
        f"Translation session complete. Approved: {len(applied)}, "
        f"Rejected: {len(rejected)}."
    )


if __name__ == "__main__":
    main()
