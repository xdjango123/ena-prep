#!/usr/bin/env python3
"""Generate HARD replacement questions for flagged items."""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

try:
    from openai import OpenAI
except Exception:  # pragma: no cover
    OpenAI = None  # type: ignore

import google.generativeai as genai

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from question_audit.logging_utils import info, warn
from question_audit.text_utils import token_signature
from question_audit.language import detect_language_scores

MANIFEST_PATH = "diagnostics_output/replacements_manifest.json"
OUTPUT_PATH = "ai_validated_questions/replacements_raw.json"
PROMPT_LOG_PATH = Path("diagnostics_output/regeneration_prompts_log.jsonl")

SYSTEM_PROMPT = (
    "Tu es un concepteur d'examens pour l'École Nationale d'Administration (Côte d'Ivoire). "
    "Tu produis des questions QCM difficiles, précises et originales, adaptées au contexte ivoirien."
)


@dataclass
class ReplacementTarget:
    question_id: str
    exam_type: str
    category: str  # category to generate for (original category)
    original_category: str
    test_type: str
    sub_category: Optional[str]
    reasons: List[str]
    recommended_category: Optional[str]
    notes: List[Dict[str, object]]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--manifest",
        default=MANIFEST_PATH,
        help=f"Path to manifest JSON (default: {MANIFEST_PATH})",
    )
    parser.add_argument(
        "--output",
        default=OUTPUT_PATH,
        help=f"Where to store generated questions (default: {OUTPUT_PATH})",
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Generate at most this many replacements",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing output instead of appending",
    )
    parser.add_argument(
        "--sleep",
        type=float,
        default=1.0,
        help="Seconds to sleep between API calls (default: 1.0)",
    )
    parser.add_argument(
        "--max-retries",
        type=int,
        default=2,
        help="Maximum retries per question when generation or validation fails (default: 2)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Prepare prompts and validation without calling OpenAI",
    )
    parser.add_argument(
        "--gemini-model",
        default="gemini-2.0-flash",
        help="Gemini model for validation (default: gemini-2.0-flash)",
    )
    parser.add_argument(
        "--french-threshold",
        type=float,
        default=0.6,
        help="Minimum French probability for CG questions (default: 0.60)",
    )
    parser.add_argument(
        "--english-threshold",
        type=float,
        default=0.6,
        help="Minimum English probability for ANG questions (default: 0.60)",
    )
    return parser.parse_args()


def load_manifest(path: Path, limit: Optional[int]) -> List[ReplacementTarget]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    questions = payload.get("questions", [])
    targets: List[ReplacementTarget] = []
    for item in questions[: limit or None]:
        recommended = item.get("recommended_category")
        original_category = item.get("original_category") or item.get("category")
        target_category = original_category
        target = ReplacementTarget(
            question_id=item["question_id"],
            exam_type=item.get("exam_type"),
            category=target_category,
            original_category=original_category,
            test_type=item.get("test_type"),
            sub_category=item.get("sub_category"),
            reasons=item.get("reasons", []),
            recommended_category=recommended,
            notes=item.get("notes", []),
        )
        targets.append(target)
    return targets


def append_prompt_log(question_id: str, prompt: str) -> None:
    PROMPT_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    entry = {
        "question_id": question_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "system_prompt": SYSTEM_PROMPT,
        "user_prompt": prompt,
    }
    with PROMPT_LOG_PATH.open("a", encoding="utf-8") as handle:
        json.dump(entry, handle, ensure_ascii=False)
        handle.write("\n")


def build_prompt(target: ReplacementTarget) -> str:
    sub_category = target.sub_category or "N/A"
    reasons = ", ".join(target.reasons) if target.reasons else "renouvellement"
    language_hint = "anglais" if target.category == "ANG" else "français"
    notes_text = "\n".join(
        f"- {note.get('reason')}: {note.get('details')}" for note in target.notes if note
    )
    notes_block = f"\nNotes supplémentaires :\n{notes_text}" if notes_text else ""
    category_note = (
        f"Catégorie actuelle : {target.original_category} -> Catégorie visée : {target.category}"
        if target.original_category and target.original_category != target.category
        else f"Catégorie : {target.category}"
    )
    return f"""
Génère une question à choix multiples entièrement nouvelle et de difficulté HARD.

Contexte :
- {category_note}
- Langue à utiliser : {language_hint}
- Type d'examen : {target.exam_type}
- Type de test : {target.test_type}
- Sous-catégorie : {sub_category}
- Raisons du remplacement : {reasons}
{notes_block}

Contraintes :
1. Question originale, sans reprise de formulations existantes.
2. Options numérotées A, B, C et D (D peut être null si seulement 3 options pertinentes).
3. Une seule bonne réponse, indiquée par la lettre correspondante.
4. Explication claire, en français, justifiant la bonne réponse et montrant la difficulté.
5. Ajuste le contenu au contexte ivoirien lorsqu'il est pertinent (surtout pour CG).

Réponds UNIQUEMENT avec un JSON du format :
{{
  "question_text": "...",
  "answers": {{
    "A": "...",
    "B": "...",
    "C": "...",
    "D": "..." ou null
  }},
  "correct_letter": "A" | "B" | "C" | "D",
  "explanation": "...",
  "difficulty": "HARD"
}}
"""


def call_openai(prompt: str) -> Dict[str, object]:
    if OpenAI is None:
        raise RuntimeError("openai package not available. Install `openai`>=1.0.0.")
    client = OpenAI()
    response = client.responses.create(
        model=os.getenv("OPENAI_MODEL", "gpt-5"),
        max_output_tokens=900,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
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
    if not message:
        raise RuntimeError("OpenAI response did not contain textual content.")
    return json.loads(message)


def language_ok(payload: Dict[str, object], category: str, english_threshold: float, french_threshold: float) -> bool:
    text_parts = [
        payload.get("question_text") or "",
        payload.get("explanation") or "",
    ]
    answers = payload.get("answers") or {}
    if isinstance(answers, dict):
        text_parts.extend(answers.get(letter) or "" for letter in ["A", "B", "C", "D"])
    combined = " ".join(str(part) for part in text_parts if part)
    scores = {lang.lang: lang.prob for lang in detect_language_scores(combined)}
    if category == "ANG":
        return scores.get("en", 0.0) >= english_threshold
    return scores.get("fr", 0.0) >= french_threshold


def validate_with_gemini(
    model: genai.GenerativeModel,
    target: ReplacementTarget,
    payload: Dict[str, object],
) -> Tuple[bool, str]:
    answers = payload.get("answers") or {}
    prompt = f"""
Tu valides une nouvelle question de difficulté HARD pour l'ENA Côte d'Ivoire.

Catégorie: {target.category}
Type d'examen: {target.exam_type}
Type de test: {target.test_type}
Sous-catégorie: {target.sub_category or 'N/A'}

Question proposée:
Énoncé: {payload.get('question_text')}
Options:
A) {answers.get('A')}
B) {answers.get('B')}
C) {answers.get('C')}
D) {answers.get('D')}
Bonne réponse: {payload.get('correct_letter')}
Explication: {payload.get('explanation')}

Réponds UNIQUEMENT avec du JSON:
{{
  "approved": true/false,
  "difficulty_ok": true/false,
  "correctness_ok": true/false,
  "explanation_ok": true/false,
  "language_ok": true/false,
  "reason": "justification concise en français"
}}
"""
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        result = json.loads(text)
        checks = [
            result.get("approved"),
            result.get("difficulty_ok"),
            result.get("correctness_ok"),
            result.get("explanation_ok"),
            result.get("language_ok"),
        ]
        return all(bool(check) for check in checks), result.get("reason", "")
    except Exception as exc:
        warn(f"Gemini validation failed: {exc}")
        return False, str(exc)


def sleeping(seconds: float) -> None:
    if seconds > 0:
        time.sleep(seconds)


def append_output(path: Path, items: List[Dict[str, object]], overwrite: bool) -> None:
    if overwrite or not path.exists():
        data: List[Dict[str, object]] = []
    else:
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    data.extend(items)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def main() -> None:
    args = parse_args()

    manifest_path = Path(args.manifest)
    if not manifest_path.exists():
        warn(f"Manifest not found: {manifest_path}")
        return

    try:
        targets = load_manifest(manifest_path, args.limit)
    except Exception as exc:
        warn(f"Could not load manifest: {exc}")
        return

    if not targets:
        info("Manifest is empty. Nothing to generate.")
        return

    genai_api_key = os.getenv("GEMINI_API_KEY")
    if not genai_api_key:
        warn("GEMINI_API_KEY not set; aborting.")
        return
    genai.configure(api_key=genai_api_key)
    gemini_model = genai.GenerativeModel(args.gemini_model)

    openai_model = os.getenv("OPENAI_MODEL", "gpt-5")

    outputs: List[Dict[str, object]] = []
    client = None
    if not args.dry_run:
        if OpenAI is None:
            warn("openai package not available; aborting generation.")
            return
        client = OpenAI()

    for idx, target in enumerate(targets, start=1):
        info(f"[{idx}/{len(targets)}] Generating replacement for {target.question_id}")
        prompt = build_prompt(target)
        append_prompt_log(target.question_id, prompt)

        if args.dry_run:
            continue

        generated_payload: Optional[Dict[str, object]] = None
        reason: str = ""

        for attempt in range(args.max_retries + 1):
            try:
                response = client.responses.create(
                    model=openai_model,
                    max_output_tokens=900,
                    input=[
                        {"role": "system", "content": SYSTEM_PROMPT},
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
                if not message:
                    raise RuntimeError("Empty response from OpenAI.")
                candidate = json.loads(message)
            except Exception as exc:
                reason = f"openai_error_attempt_{attempt+1}:{exc}"
                warn(reason)
                sleeping(args.sleep)
                continue

            answers = candidate.get("answers") or {}
            correct_letter = candidate.get("correct_letter")
            question_text = candidate.get("question_text")
            explanation = candidate.get("explanation")

            if not isinstance(answers, dict) or correct_letter not in {"A", "B", "C", "D"}:
                reason = f"invalid_structure_attempt_{attempt+1}"
                warn(reason)
                sleeping(args.sleep)
                continue

            if not question_text or not explanation:
                reason = f"missing_fields_attempt_{attempt+1}"
                warn(reason)
                sleeping(args.sleep)
                continue

            if not language_ok(candidate, target.category, args.english_threshold, args.french_threshold):
                reason = f"language_check_failed_attempt_{attempt+1}"
                warn(reason)
                sleeping(args.sleep)
                continue

            approved, validation_reason = validate_with_gemini(gemini_model, target, candidate)
            if not approved:
                reason = f"gemini_reject_attempt_{attempt+1}:{validation_reason}"
                warn(reason)
                sleeping(args.sleep)
                continue

            candidate["validation_reason"] = validation_reason
            generated_payload = candidate
            break

        if not generated_payload:
            warn(f"Failed to generate question for {target.question_id}: {reason}")
            continue

        signature = token_signature(generated_payload.get("question_text", ""))
        outputs.append(
            {
                "question_id": target.question_id,
                "exam_type": target.exam_type,
                "category": target.category,
                "original_category": target.original_category,
                "test_type": target.test_type,
                "sub_category": target.sub_category,
                "reasons": target.reasons,
                "recommended_category": target.recommended_category,
                "notes": target.notes,
                "generated": generated_payload,
                "token_signature": signature,
            }
        )
        sleeping(args.sleep)

    if args.dry_run:
        info(f"Dry-run completed. Prompts recorded for {len(targets)} question(s).")
        return

    if not outputs:
        warn("No successful generations. Output file not written.")
        return

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    append_output(output_path, outputs, args.overwrite)
    info(f"Wrote {len(outputs)} generated questions to {output_path}.")


if __name__ == "__main__":
    main()
