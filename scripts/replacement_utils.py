#!/usr/bin/env python3
"""Shared helpers for generating replacement questions."""

from __future__ import annotations

import json
import os
import sys
import time
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

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

from question_audit.language import detect_language_scores  # type: ignore
from question_audit.logging_utils import info, warn  # type: ignore
from question_audit.text_utils import token_signature, preview  # type: ignore

GENERATION_FAILURE_LOG_PATH = Path("diagnostics_output/openai_generation_failures.log")

SYSTEM_PROMPT = (
    "Tu es un concepteur d'examens pour l'École Nationale d'Administration (Côte d'Ivoire). "
    "Tu produis des questions QCM difficiles, précises et originales, adaptées au contexte ivoirien."
)

_OPENAI_CLIENT: Optional[OpenAI] = None
_GENAI_MODEL: Optional[object] = None
_GENAI_MODEL_NAME: Optional[str] = None


@dataclass
class ReplacementTarget:
    question_id: str
    exam_type: str
    category: str
    original_category: str
    test_type: str
    sub_category: Optional[str]
    reasons: List[str]
    recommended_category: Optional[str]
    notes: List[Dict[str, object]]


@dataclass
class GenerationConfig:
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o")
    gemini_model: str = "gemini-2.0-flash"
    english_threshold: float = 0.6
    french_threshold: float = 0.6
    max_retries: int = 2
    sleep_seconds: float = 1.0
    dry_run: bool = False
    temperature: float = 1.0
    max_output_tokens: int = 16000


def _get_openai_client() -> OpenAI:
    global _OPENAI_CLIENT
    if OpenAI is None:
        raise RuntimeError("openai package not available. Install `openai>=1.0.0`.")
    if _OPENAI_CLIENT is None:
        _OPENAI_CLIENT = OpenAI()
    return _OPENAI_CLIENT


def _get_gemini_model(model_name: str):
    global _GENAI_MODEL, _GENAI_MODEL_NAME
    if genai is None:
        raise RuntimeError("google-generativeai package not available.")
    if _GENAI_MODEL is None or _GENAI_MODEL_NAME != model_name:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("Missing GEMINI_API_KEY environment variable.")
        genai.configure(api_key=api_key)
        _GENAI_MODEL = genai.GenerativeModel(model_name)
        _GENAI_MODEL_NAME = model_name
    return _GENAI_MODEL


def get_openai_client() -> OpenAI:
    """Public helper to reuse the shared OpenAI client."""
    return _get_openai_client()


def get_gemini_model(model_name: str):
    """Public helper to reuse the shared Gemini model."""
    return _get_gemini_model(model_name)


def extract_json_object(text: str) -> Optional[Dict[str, object]]:
    """Attempt to parse the first JSON object contained in text."""
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


def _coerce_to_dict(value: object) -> Dict[str, object]:
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    for attr in ("model_dump", "to_dict"):
        method = getattr(value, attr, None)
        if callable(method):
            try:
                data = method()
                if isinstance(data, dict):
                    return data
            except Exception:
                continue
    if hasattr(value, "__dict__"):
        try:
            return dict(vars(value))
        except Exception:
            pass
    return {}


def _extract_response_text(response: object) -> str:
    if response is None:
        return ""
    for attr in ("output_text", "text", "content"):
        value = getattr(response, attr, None)
        if isinstance(value, str) and value.strip():
            return value.strip()

    data = _coerce_to_dict(response)
    texts: List[str] = []

    def _collect(obj: object) -> None:
        if obj is None:
            return
        if isinstance(obj, str):
            if obj.strip():
                texts.append(obj)
            return
        if isinstance(obj, dict):
            if isinstance(obj.get("text"), str):
                if obj["text"].strip():
                    texts.append(obj["text"])
            for key in ("output", "content", "parts", "messages", "choices", "data"):
                if key in obj:
                    _collect(obj[key])
            return
        if isinstance(obj, list):
            for item in obj:
                _collect(item)
            return
        if hasattr(obj, "__dict__"):
            try:
                _collect(vars(obj))
            except Exception:
                return

    for key in ("output", "content", "choices", "messages"):
        if key in data:
            _collect(data[key])
    if not texts:
        _collect(data)
    combined = "".join(texts).strip()
    return combined


def _log_generation_failure(
    question_id: str,
    attempt: int,
    error: str,
    prompt: str,
    response: object,
) -> None:
    try:
        GENERATION_FAILURE_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        payload: Dict[str, object] = {
            "question_id": question_id,
            "attempt": attempt,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": error,
            "prompt_preview": preview(prompt, length=400),
        }
        data = _coerce_to_dict(response)
        if data:
            payload["response"] = data
        with GENERATION_FAILURE_LOG_PATH.open("a", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False)
            handle.write("\n")
    except Exception:
        pass


def log_classifier_debug(row: Dict[str, object], question_id: str, status: str, message: str) -> None:
    """Append classifier output to debug log for later inspection."""
    try:
        log_path = Path("diagnostics_output/debug_classifier_responses.log")
        log_path.parent.mkdir(parents=True, exist_ok=True)
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
        with log_path.open("a", encoding="utf-8") as handle:
            handle.write(entry)
    except Exception:
        pass


def build_prompt(target: ReplacementTarget) -> str:
    sub_category = target.sub_category or "N/A"
    reasons = ", ".join(target.reasons) if target.reasons else "renouvellement"
    language_hint = "anglais" if target.category == "ANG" else "français"
    notes_text = "\n".join(
        f"- {note.get('reason')}: {note.get('details')}"
        for note in target.notes
        if note
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


def generate_replacement_for_target(
    target: ReplacementTarget,
    config: GenerationConfig,
) -> Dict[str, object]:
    attempts: List[Dict[str, object]] = []

    if config.dry_run:
        prompt = build_prompt(target)
        return {
            "status": "dry_run",
            "generated_entry": None,
            "attempts": attempts,
            "prompt": prompt,
        }

    openai_client = _get_openai_client()
    gemini_model = _get_gemini_model(config.gemini_model)

    for attempt in range(config.max_retries + 1):
        prompt = build_prompt(target)

        response: Optional[object] = None
        try:
            response = openai_client.chat.completions.create(
                model=config.openai_model,
                max_completion_tokens=config.max_output_tokens,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
            )
            message = (response.choices[0].message.content or "").strip()
            if not message:
                raise ValueError("Empty response from OpenAI.")
            candidate_payload = extract_json_object(message)
            candidate = candidate_payload if candidate_payload is not None else json.loads(message)
        except (json.JSONDecodeError, ValueError) as exc:
            error_msg = str(exc)
            _log_generation_failure(target.question_id, attempt + 1, error_msg, prompt, response)
            attempts.append(
                {
                    "attempt": attempt + 1,
                    "phase": "openai",
                    "error": error_msg,
                }
            )
            time.sleep(max(config.sleep_seconds, 0.0))
            continue
        except Exception as exc:
            error_msg = str(exc)
            _log_generation_failure(target.question_id, attempt + 1, error_msg, prompt, response)
            attempts.append(
                {
                    "attempt": attempt + 1,
                    "phase": "openai",
                    "error": error_msg,
                }
            )
            time.sleep(max(config.sleep_seconds, 0.0))
            continue

        answers = candidate.get("answers") or {}
        correct_letter = candidate.get("correct_letter")
        question_text = candidate.get("question_text")
        explanation = candidate.get("explanation")
        if not isinstance(answers, dict) or correct_letter not in {"A", "B", "C", "D"}:
            attempts.append(
                {
                    "attempt": attempt + 1,
                    "phase": "structure",
                    "error": "Invalid structure or missing correct letter",
                }
            )
            time.sleep(max(config.sleep_seconds, 0.0))
            continue
        if not question_text or not explanation:
            attempts.append(
                {
                    "attempt": attempt + 1,
                    "phase": "structure",
                    "error": "Missing question text or explanation",
                }
            )
            time.sleep(max(config.sleep_seconds, 0.0))
            continue

        text_parts = [
            question_text,
            explanation,
            answers.get("A") or "",
            answers.get("B") or "",
            answers.get("C") or "",
            answers.get("D") or "",
        ]
        joined = " ".join(part for part in text_parts if part)
        scores = {lang.lang: lang.prob for lang in detect_language_scores(joined)}

        if target.category == "ANG":
            if scores.get("en", 0.0) < config.english_threshold:
                attempts.append(
                    {
                        "attempt": attempt + 1,
                        "phase": "language",
                        "error": f"English probability too low (en={scores.get('en', 0.0):.2f})",
                    }
                )
                time.sleep(max(config.sleep_seconds, 0.0))
                continue
        else:
            if scores.get("fr", 0.0) < config.french_threshold:
                attempts.append(
                    {
                        "attempt": attempt + 1,
                        "phase": "language",
                        "error": f"French probability too low (fr={scores.get('fr', 0.0):.2f})",
                    }
                )
                time.sleep(max(config.sleep_seconds, 0.0))
                continue

        try:
            validation_prompt = f"""
Tu valides une nouvelle question de difficulté HARD pour l'ENA Côte d'Ivoire.

Catégorie: {target.category}
Type d'examen: {target.exam_type}
Type de test: {target.test_type}
Sous-catégorie: {target.sub_category or 'N/A'}

Question proposée:
Énoncé: {question_text}
Options:
A) {answers.get('A')}
B) {answers.get('B')}
C) {answers.get('C')}
D) {answers.get('D')}
Bonne réponse: {correct_letter}
Explication: {explanation}

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
            validation = gemini_model.generate_content(validation_prompt)
            validation_text = validation.text.strip()
            validation_payload = extract_json_object(validation_text)
            if validation_payload is None:
                 validation_payload = json.loads(validation_text)

            checks = [
                validation_payload.get("approved"),
                validation_payload.get("difficulty_ok"),
                validation_payload.get("correctness_ok"),
                validation_payload.get("explanation_ok"),
                validation_payload.get("language_ok"),
            ]
            approved = all(bool(check) for check in checks)
            validation_reason = validation_payload.get("reason", "")
        except Exception as exc:
            attempts.append(
                {
                    "attempt": attempt + 1,
                    "phase": "validation",
                    "error": str(exc),
                }
            )
            time.sleep(max(config.sleep_seconds, 0.0))
            continue

        if not approved:
            attempts.append(
                {
                    "attempt": attempt + 1,
                    "phase": "validation",
                    "error": f"Validation rejected: {validation_reason}",
                }
            )
            time.sleep(max(config.sleep_seconds, 0.0))
            continue

        signature = token_signature(question_text)
        generated_entry = {
            "question_id": target.question_id,
            "exam_type": target.exam_type,
            "category": target.category,
            "original_category": target.original_category,
            "test_type": target.test_type,
            "sub_category": target.sub_category,
            "reasons": target.reasons,
            "recommended_category": target.recommended_category,
            "notes": target.notes,
            "generated": {
                "question_text": question_text.strip(),
                "answers": {
                    "A": (answers.get("A") or "").strip(),
                    "B": (answers.get("B") or "").strip(),
                    "C": (answers.get("C") or "").strip(),
                    "D": (answers.get("D") or None) and (answers.get("D") or None).strip() or None,
                },
                "correct_letter": correct_letter,
                "explanation": explanation.strip(),
                "difficulty": "HARD",
            },
            "token_signature": signature,
        }

        return {
            "status": "success",
            "generated_entry": generated_entry,
            "attempts": attempts,
        }

    return {
        "status": "failed",
        "generated_entry": None,
        "attempts": attempts,
    }
