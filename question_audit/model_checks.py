"""Shared helpers for LLM-backed validation tasks."""

from __future__ import annotations

import hashlib
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import google.generativeai as genai
import openai

from question_audit.logging_utils import info, warn

DEFAULT_CACHE_PATH = Path("diagnostics_output/model_validation_cache.json")


def _hash_payload(task: str, payload: Dict[str, Any]) -> str:
    serialized = json.dumps({"task": task, "payload": payload}, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


class ValidationCache:
    """Simple JSON-backed cache to avoid repeated model calls."""

    def __init__(self, path: Path = DEFAULT_CACHE_PATH):
        self.path = path
        self.data: Dict[str, Any] = {}
        if path.exists():
            try:
                with path.open("r", encoding="utf-8") as handle:
                    loaded = json.load(handle)
                if isinstance(loaded, dict):
                    self.data = loaded
            except json.JSONDecodeError as exc:
                warn(f"Unable to parse validation cache {path}: {exc}")

    def get(self, key: str) -> Optional[Dict[str, Any]]:
        entry = self.data.get(key)
        return entry if isinstance(entry, dict) else None

    def set(self, key: str, value: Dict[str, Any]) -> None:
        self.data[key] = value

    def flush(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("w", encoding="utf-8") as handle:
            json.dump(self.data, handle, ensure_ascii=False, indent=2)
            handle.write("\n")


@dataclass
class ValidationResult:
    task: str
    status: str
    reason: str
    confidence: Optional[float] = None
    model: Optional[str] = None
    raw: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "task": self.task,
            "status": self.status,
            "reason": self.reason,
        }
        if self.confidence is not None:
            payload["confidence"] = self.confidence
        if self.model:
            payload["model"] = self.model
        if self.raw:
            payload["raw"] = self.raw
        if self.details:
            payload["details"] = self.details
        if self.error:
            payload["error"] = self.error
        return payload


class ModelValidators:
    """Centralized access to Gemini/GPT validators with caching."""

    def __init__(
        self,
        *,
        gemini_model: str = "gemini-2.0-flash",
        gpt_model: str = "gpt-4o-mini",
        cache_path: Path = DEFAULT_CACHE_PATH,
    ) -> None:
        self.cache = ValidationCache(cache_path)
        self.gemini_model_name = gemini_model
        self.gpt_model_name = gpt_model
        self._gemini = None
        self._gpt = None

    def _ensure_gemini(self):
        if self._gemini:
            return self._gemini
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("Missing GEMINI_API_KEY.")
        genai.configure(api_key=api_key)
        self._gemini = genai.GenerativeModel(self.gemini_model_name)
        return self._gemini

    def _ensure_gpt(self):
        if self._gpt:
            return self._gpt
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("Missing OPENAI_API_KEY.")
        self._gpt = openai.OpenAI(api_key=api_key)
        return self._gpt

    def _call_gemini(self, prompt: str, cache_key: str) -> ValidationResult:
        cached = self.cache.get(cache_key)
        if cached:
            return ValidationResult(**cached)
        try:
            model = self._ensure_gemini()
            response = model.generate_content(prompt)
            text = response.text or ""
            result = ValidationResult(
                task=cache_key,
                status="ok",
                reason="response",
                raw=text.strip(),
                model=self.gemini_model_name,
            )
        except Exception as exc:
            result = ValidationResult(
                task=cache_key,
                status="error",
                reason="gemini_error",
                error=str(exc),
                model=self.gemini_model_name,
            )
        self.cache.set(cache_key, result.to_dict())
        return result

    def _call_gpt(self, messages: List[Dict[str, str]], cache_key: str) -> ValidationResult:
        cached = self.cache.get(cache_key)
        if cached:
            return ValidationResult(**cached)
        try:
            client = self._ensure_gpt()
            response = client.chat.completions.create(
                model=self.gpt_model_name,
                temperature=0,
                messages=messages,
            )
            text = response.choices[0].message.content or ""
            result = ValidationResult(
                task=cache_key,
                status="ok",
                reason="response",
                raw=text.strip(),
                model=self.gpt_model_name,
            )
        except Exception as exc:
            result = ValidationResult(
                task=cache_key,
                status="error",
                reason="gpt_error",
                error=str(exc),
                model=self.gpt_model_name,
            )
        self.cache.set(cache_key, result.to_dict())
        return result

    def validate_with_gemini(self, task: str, prompt: str, payload: Dict[str, Any]) -> ValidationResult:
        cache_key = f"gemini::{task}::{_hash_payload(task, payload)}"
        return self._call_gemini(prompt, cache_key)

    def validate_with_gpt(self, task: str, messages: List[Dict[str, str]], payload: Dict[str, Any]) -> ValidationResult:
        cache_key = f"gpt::{task}::{_hash_payload(task, payload)}"
        return self._call_gpt(messages, cache_key)

    def flush_cache(self) -> None:
        info("Saving model validation cache.")
        self.cache.flush()


def _extract_json_object(raw: Optional[str]) -> Optional[Dict[str, Any]]:
    if not raw:
        return None
    text = raw.strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    snippet = text[start : end + 1]
    try:
        return json.loads(snippet)
    except json.JSONDecodeError:
        return None


def _format_answers(record: Dict[str, Any]) -> Dict[str, Optional[str]]:
    return {
        "A": record.get("answer1")
        or (record.get("answers") or {}).get("A")
        or (record.get("answer_options") or {}).get("A"),
        "B": record.get("answer2")
        or (record.get("answers") or {}).get("B")
        or (record.get("answer_options") or {}).get("B"),
        "C": record.get("answer3")
        or (record.get("answers") or {}).get("C")
        or (record.get("answer_options") or {}).get("C"),
        "D": record.get("answer4")
        or (record.get("answers") or {}).get("D")
        or (record.get("answer_options") or {}).get("D"),
    }


def _answers_text(record: Dict[str, Any]) -> str:
    answers = _format_answers(record)
    parts = []
    for letter in ("A", "B", "C", "D"):
        text = answers.get(letter)
        if text:
            parts.append(f"{letter}) {text}")
    return "\n".join(parts)


def _record_id(record: Dict[str, Any]) -> str:
    return str(
        record.get("question_id")
        or record.get("id")
        or record.get("source_id")
        or record.get("uuid")
        or "unknown"
    )


CATEGORY_PROMPT = """
Tu es un expert linguistique pour les QCM de l'ENA. Analyse le texte de la question et les options.
Détermine les langues dominantes utilisées et si cela correspond à la catégorie annoncée.
Catégorie attendue: {category}
Test type: {test_type}
Question:
{question_text}

Options:
{answers}

Retourne du JSON:
{{
  "detected_language": "fr" | "en" | "mixed" | "unknown",
  "language_score": 0-1,
  "should_flag": true/false,
  "reason": "explication brève",
  "notes": "commentaire optionnel"
}}
"""

EXPLANATION_PROMPT = """
Tu vérifies la qualité de l'explication d'un QCM de l'ENA. Vérifie qu'elle est pertinente,
qu'elle reste dans le contexte de la question et qu'elle est rédigée principalement en français naturel.

Question:
{question_text}

Options:
{answers}

Explication fournie:
{explanation}

Retourne un JSON:
{{
  "should_flag": true/false,
  "reason": "bref résumé",
  "confidence": 0-1,
  "language": "fr" | "en" | "mixed" | "unknown"
}}
"""

CORRECT_ANSWER_PROMPT = """
Tu es correcteur. Vérifie si la réponse officielle (lettre {correct_letter}) est correcte.
Explique brièvement ton raisonnement.

Question:
{question_text}

Options:
{answers}

Explication fournie:
{explanation}

Réponds avec JSON:
{{
  "official_letter": "{correct_letter}",
  "correct_letter": "A" | "B" | "C" | "D",
  "agrees_with_official": true/false,
  "confidence": 0-1,
  "reason": "justification concise"
}}
"""


def _interpret_flag_result(result: ValidationResult, parsed: Optional[Dict[str, Any]]) -> ValidationResult:
    if parsed is None:
        result.status = "error"
        result.reason = "invalid_json"
        result.details = None
        return result
    should_flag = bool(parsed.get("should_flag"))
    result.status = "flagged" if should_flag else "ok"
    result.reason = parsed.get("reason") or result.reason
    if "confidence" in parsed:
        try:
            result.confidence = float(parsed["confidence"])
        except (TypeError, ValueError):
            pass
    result.details = parsed
    return result


def _build_payload(record: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "question_id": _record_id(record),
        "question_text": record.get("question_text"),
        "exam_type": record.get("exam_type"),
        "test_type": record.get("test_type"),
        "category": record.get("category"),
    }


def evaluate_category_language(validators: ModelValidators, record: Dict[str, Any]) -> ValidationResult:
    prompt = CATEGORY_PROMPT.format(
        category=record.get("category"),
        test_type=record.get("test_type"),
        question_text=record.get("question_text") or "",
        answers=_answers_text(record),
    )
    payload = _build_payload(record)
    result = validators.validate_with_gemini("category_language", prompt, payload)
    parsed = _extract_json_object(result.raw)
    return _interpret_flag_result(result, parsed)


def evaluate_explanation(validators: ModelValidators, record: Dict[str, Any]) -> ValidationResult:
    prompt = EXPLANATION_PROMPT.format(
        question_text=record.get("question_text") or "",
        answers=_answers_text(record),
        explanation=record.get("explanation") or "",
    )
    payload = _build_payload(record)
    result = validators.validate_with_gemini("explanation_quality", prompt, payload)
    parsed = _extract_json_object(result.raw)
    return _interpret_flag_result(result, parsed)


def evaluate_correct_answer(validators: ModelValidators, record: Dict[str, Any]) -> ValidationResult:
    prompt = CORRECT_ANSWER_PROMPT.format(
        question_text=record.get("question_text") or "",
        answers=_answers_text(record),
        explanation=record.get("explanation") or "",
        correct_letter=(record.get("correct") or record.get("correct_letter") or "").upper(),
    )
    payload = _build_payload(record)
    result = validators.validate_with_gemini("correct_answer", prompt, payload)
    parsed = _extract_json_object(result.raw)
    if parsed:
        agrees = bool(parsed.get("agrees_with_official"))
        result.status = "ok" if agrees else "flagged"
        result.reason = parsed.get("reason") or result.reason
        if "confidence" in parsed:
            try:
                result.confidence = float(parsed["confidence"])
            except (TypeError, ValueError):
                pass
        result.details = parsed
    else:
        result.status = "error"
        result.reason = "invalid_json"
    return result


def confirm_with_gpt(validators: ModelValidators, task: str, record: Dict[str, Any], reason: str) -> ValidationResult:
    messages = [
        {
            "role": "system",
            "content": "Tu es examinateur senior pour les QCM de l'ENA. Vérifie objectivement la qualité des questions.",
        },
        {
            "role": "user",
            "content": (
                f"Tâche: {task}\n"
                f"Question: {record.get('question_text')}\n"
                f"Options:\n{_answers_text(record)}\n"
                f"Explication: {record.get('explanation')}\n"
                f"Raison initiale du signalement: {reason}\n"
                "Réponds en JSON {\"should_flag\": true/false, \"reason\": \"...\"}"
            ),
        },
    ]
    payload = _build_payload(record)
    result = validators.validate_with_gpt(task, messages, payload)
    parsed = _extract_json_object(result.raw)
    return _interpret_flag_result(result, parsed)


LLM_TASK_METADATA = {
    "category_language": {
        "label": "category_language_issue",
        "error_label": "category_language_llm_error",
        "message": "Langue incohérente avec la catégorie.",
    },
    "explanation_quality": {
        "label": "explanation_quality_issue",
        "error_label": "explanation_quality_llm_error",
        "message": "Explication hors contexte ou insuffisante.",
    },
    "correct_answer": {
        "label": "correct_answer_issue",
        "error_label": "correct_answer_llm_error",
        "message": "Réponse officielle suspecte.",
    },
}


def run_llm_checks(
    record: Dict[str, Any],
    validators: ModelValidators,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Return (issues, full_details) after Gemini+GPT validation."""
    issues: List[Dict[str, Any]] = []
    details: Dict[str, Any] = {}

    task_evaluators = [
        ("category_language", evaluate_category_language),
        ("explanation_quality", evaluate_explanation),
        ("correct_answer", evaluate_correct_answer),
    ]

    for task_name, evaluator in task_evaluators:
        gemini_result = evaluator(validators, record)
        result_dict = gemini_result.to_dict()
        details[task_name] = result_dict
        metadata = {"gemini": result_dict}

        if gemini_result.status == "flagged":
            confirm = confirm_with_gpt(
                validators,
                f"{task_name}_confirm",
                record,
                gemini_result.reason,
            )
            confirm_dict = confirm.to_dict()
            details[f"{task_name}_confirm"] = confirm_dict
            metadata["gpt"] = confirm_dict
            if confirm.status == "flagged":
                issues.append(
                    {
                        "task": task_name,
                        "status": "flagged",
                        "reason": confirm.reason or gemini_result.reason,
                        "metadata": metadata,
                    }
                )
            elif confirm.status == "error":
                issues.append(
                    {
                        "task": task_name,
                        "status": "error",
                        "reason": confirm.reason or "Erreur lors de la confirmation GPT.",
                        "metadata": metadata,
                    }
                )
        elif gemini_result.status == "error":
            issues.append(
                {
                    "task": task_name,
                    "status": "error",
                    "reason": gemini_result.reason or "Erreur lors de la validation Gemini.",
                    "metadata": metadata,
                }
            )

    return issues, details
