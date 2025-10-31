#!/usr/bin/env python3
"""Validate questions and regenerate French explanations across the question bank."""

from __future__ import annotations

import argparse
import collections
import json
import os
import time
from dataclasses import dataclass
from pathlib import Path
import re
from typing import Any, Dict, Iterable, List, Optional, Tuple

import openai
import google.generativeai as genai

from question_audit.db import dump_json, fetch_questions, get_supabase_client
from question_audit.logging_utils import info, warn
from question_audit.language import is_probably_english


DEFAULT_GENERATION_MODEL = "gpt-5"
DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"
DEFAULT_OUTPUT_DIR = "cleaned_questions"
DEFAULT_TEST_TYPE_PRIORITY = ("examen_blanc",)
DEFAULT_FAST_JUDGE_MODEL = "gemini-1.5-flash"
GENERIC_PHRASES = (
    "la réponse correcte est",
    "la reponse correcte est",
    "la réponse juste est",
    "la bonne réponse est",
    "il s'agit d'un fait de culture générale",
    "il s agit d un fait de culture generale",
    "c'est la bonne réponse",
    "c est la bonne reponse",
)
GENERATION_PROMPT = (
    "Tu es un professeur qui prépare des étudiants francophones aux concours.\n"
    "Rédige une explication en 2 à 3 phrases en français :\n"
    "- rappelle en quoi consiste la question,\n"
    "- démontre clairement pourquoi la bonne réponse est exacte,\n"
    "- mentionne brièvement ce qui rend les autres options incorrectes si utile.\n\n"
    "Question : {question}\n"
    "Option A : {answer_a}\n"
    "Option B : {answer_b}\n"
    "Option C : {answer_c}\n"
    "Option D : {answer_d}\n"
    "Bonne réponse : {correct_letter}"
)
FAST_JUDGE_PROMPT = (
    "Tu es un correcteur rapide. Analyse la question et l'explication fournie.\n"
    "Attribue un score de 1 à 5 reflétant la justesse de l'explication et sa clarté "
    "(5 = excellent, 1 = incorrect/incompréhensible).\n"
    "Réponds uniquement avec un JSON valide du format:\n"
    "{\n"
    '  "score": nombre,\n'
    '  "feedback": "commentaire bref"\n'
    "}"
)
VALIDATION_PROMPT = (
    "Tu es contrôleur qualité pour des questions d'examen. Analyse les informations ci-dessous "
    "et retourne strictement un JSON valide.\n\n"
    "QUESTION:\n{question}\n\n"
    "OPTIONS:\nA) {answer_a}\nB) {answer_b}\nC) {answer_c}\nD) {answer_d}\n\n"
    "Bonne réponse attendue: {correct_letter}\n"
    "Explication fournie: {explanation}\n\n"
    "Respecte les règles suivantes:\n"
    "1. Vérifie que la bonne réponse indiquée correspond vraiment à la meilleure option. "
    "Retourne true uniquement si tu es certain que le choix est correct.\n"
    "2. Évalue l'explication fournie (si elle existe) et confirme qu'elle:\n"
    "   - est entièrement en français naturel,\n"
    "   - contient 2 ou 3 phrases complètes,\n"
    "   - explique concrètement pourquoi la bonne réponse est correcte (ou pourquoi les autres sont fausses).\n"
    "3. Si l'explication est absente, en anglais, contient moins de 2 phrases ou plus de 3 phrases, "
    "ou manque de détails concrets, considère qu'une nouvelle explication est nécessaire.\n\n"
    "Retourne uniquement un JSON du format:\n"
    "{{\n"
    '  "correct_answer_is_valid": true/false,\n'
    '  "correct_answer_feedback": "phrase courte",\n'
    '  "explanation_language": "french" | "english" | "mixed" | "missing",\n'
    '  "explanation_sentence_count": entier,\n'
    '  "explanation_is_specific": true/false,\n'
    '  "explanation_feedback": "phrase courte",\n'
    '  "needs_new_explanation": true/false\n'
    "}}\n"
    "Utilise des booléens true/false (en minuscules) et pas d'autres clés."
)


@dataclass
class ValidationOutcome:
    ok: bool
    payload: Dict[str, Any]
    raw: str
    error_message: Optional[str] = None

    @property
    def correct_answer_is_valid(self) -> bool:
        value = self.payload.get("correct_answer_is_valid")
        return value is True

    @property
    def needs_new_explanation(self) -> bool:
        value = self.payload.get("needs_new_explanation")
        return True if not isinstance(value, bool) else value


@dataclass
class GatekeeperResult:
    passed: bool
    sentence_count: int
    keyword_overlap: int
    reasons: List[str]

    def to_payload(self) -> Dict[str, Any]:
        return {
            "passed": self.passed,
            "sentence_count": self.sentence_count,
            "keyword_overlap": self.keyword_overlap,
            "reasons": self.reasons,
        }


@dataclass
class FastJudgeResult:
    score: Optional[float]
    feedback: Optional[str]
    model: Optional[str]
    used: bool
    raw: Optional[str] = None

    def to_payload(self) -> Dict[str, Any]:
        return {
            "used": self.used,
            "model": self.model,
            "score": self.score,
            "feedback": self.feedback,
            "raw": self.raw,
        }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, help="Limiter le nombre de questions traitées.")
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=1000,
        help="Nombre de lignes récupérées par page Supabase (défaut: 1000).",
    )
    parser.add_argument(
        "--output-dir",
        default=DEFAULT_OUTPUT_DIR,
        help="Répertoire de sortie pour les JSON (défaut: cleaned_questions).",
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_GENERATION_MODEL,
        help="Modèle OpenAI utilisé pour la génération d'explications.",
    )
    parser.add_argument(
        "--gemini-model",
        default=DEFAULT_GEMINI_MODEL,
        help="Modèle Gemini utilisé pour la validation.",
    )
    parser.add_argument(
        "--fast-judge-model",
        default=DEFAULT_FAST_JUDGE_MODEL,
        help="Modèle léger utilisé pour un jugement rapide (défaut: gemini-1.5-flash). "
        "Utiliser 'none' pour désactiver.",
    )
    parser.add_argument("--api-key", help="Clé API OpenAI (défaut: OPENAI_API_KEY).")
    parser.add_argument("--gemini-api-key", help="Clé API Gemini (défaut: GEMINI_API_KEY).")
    parser.add_argument(
        "--temperature",
        type=float,
        default=1.0,
        help="Température du modèle OpenAI pour la génération (défaut: 1.0).",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.8,
        help="Pause en secondes entre les appels OpenAI (défaut: 0.8).",
    )
    parser.add_argument(
        "--max-attempts",
        type=int,
        default=3,
        help="Nombre maximum de tentatives pour produire une explication valide (défaut: 3).",
    )
    parser.add_argument(
        "--judge-threshold",
        type=float,
        default=4.0,
        help="Score minimum du fast judge pour accepter une explication sans validation coûteuse.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Ne pas appeler OpenAI, insérer un texte factice pour inspection.",
    )
    parser.add_argument(
        "--prioritize-test-types",
        nargs="+",
        default=list(DEFAULT_TEST_TYPE_PRIORITY),
        help="Liste des test_type à traiter en priorité (défaut: examen_blanc).",
    )
    parser.add_argument(
        "--filter-test-types",
        nargs="+",
        help="Limiter le traitement à certains test_type (par défaut: tous).",
    )
    parser.add_argument(
        "--filter-categories",
        nargs="+",
        help="Limiter le traitement à certaines catégories (par défaut: toutes).",
    )
    parser.add_argument(
        "--log-interval",
        type=int,
        default=100,
        help="Fréquence d'affichage de l'avancement (défaut: 100 questions).",
    )
    parser.add_argument(
        "--gate-min-sentences",
        type=int,
        default=2,
        help="Nombre minimal de phrases pour l'explication (défaut: 2).",
    )
    parser.add_argument(
        "--gate-max-sentences",
        type=int,
        default=3,
        help="Nombre maximal de phrases pour l'explication (défaut: 3).",
    )
    parser.add_argument(
        "--skip-expensive-validation",
        action="store_true",
        help="Ne pas déclencher la validation Gemini (stage B) quand le gatekeeper échoue.",
    )
    parser.add_argument(
        "--only-with-explanations",
        action="store_true",
        help="Limiter le traitement aux questions disposant déjà d'une explication non vide.",
    )
    return parser.parse_args()


def prepare_filters(args: argparse.Namespace) -> Dict[str, Any]:
    filters: Dict[str, Any] = {}
    if args.filter_categories:
        filters["category"] = lambda query, values=tuple(args.filter_categories): query.in_(
            "category", list(values)
        )
    if args.only_with_explanations:
        filters["explanation"] = lambda query: query.not_.is_("explanation", "null")
    return filters


def tokenize_words(text: str) -> set[str]:
    return {word.lower() for word in re.findall(r"[a-zA-ZÀ-ÿ']+", text or "") if len(word) > 2}


def run_gatekeeper(
    question: Dict[str, Any],
    explanation: str,
    min_sentences: int,
    max_sentences: int,
) -> GatekeeperResult:
    reasons: List[str] = []
    cleaned = explanation or ""
    sentences = [part.strip() for part in re.split(r"[.!?]+", cleaned) if part.strip()]
    sentence_count = len(sentences)
    if sentence_count < min_sentences or sentence_count > max_sentences:
        reasons.append(
            f"nb_sentences_{sentence_count}_outside_{min_sentences}_{max_sentences}"
        )

    words_explanation = tokenize_words(cleaned)
    words_question = tokenize_words(question.get("question_text", ""))
    correct_answer_text = question["answers"].get(question["correct_letter"]) or ""
    words_correct = tokenize_words(correct_answer_text)
    keyword_overlap = len(words_explanation.intersection(words_question.union(words_correct)))
    if keyword_overlap == 0:
        reasons.append("no_keyword_overlap")

    lower_expl = cleaned.lower()
    for pattern in GENERIC_PHRASES:
        if pattern in lower_expl:
            reasons.append("generic_phrase")
            break

    if is_probably_english(cleaned):
        reasons.append("english_detected")

    passed = not reasons
    return GatekeeperResult(passed=passed, sentence_count=sentence_count, keyword_overlap=keyword_overlap, reasons=reasons)


def build_question_record(row: Dict[str, Any]) -> Dict[str, Any]:
    answers = {
        "A": row.get("answer1"),
        "B": row.get("answer2"),
        "C": row.get("answer3"),
        "D": row.get("answer4"),
    }
    correct_letter = (row.get("correct") or "").strip().upper()
    return {
        "id": row["id"],
        "question_text": row.get("question_text") or "",
        "answers": answers,
        "correct_letter": correct_letter,
        "test_type": row.get("test_type"),
        "exam_type": row.get("exam_type"),
        "category": row.get("category"),
        "difficulty": row.get("difficulty"),
        "explanation": row.get("explanation") or "",
    }


def order_rows(rows: List[Dict[str, Any]], priority: Iterable[str]) -> List[Dict[str, Any]]:
    priority_list = list(priority)
    priority_map = {value: index for index, value in enumerate(priority_list)}
    others = sorted(
        {
            row.get("test_type")
            for row in rows
            if row.get("test_type") not in priority_map and row.get("test_type") is not None
        }
    )
    offset = len(priority_map)
    other_map = {value: offset + index for index, value in enumerate(others)}

    def sort_key(row: Dict[str, Any]) -> Tuple[int, Any]:
        test_type = row.get("test_type")
        group = priority_map.get(test_type, other_map.get(test_type, offset + len(other_map)))
        return group, row.get("id")

    return sorted(rows, key=sort_key)


def extract_gemini_text(response: Any) -> str:
    raw = getattr(response, "text", None)
    if raw:
        return raw.strip()
    parts: List[str] = []
    for candidate in getattr(response, "candidates", []) or []:
        content = getattr(candidate, "content", None)
        if not content:
            continue
        for part in getattr(content, "parts", []) or []:
            text = getattr(part, "text", None)
            if text:
                parts.append(text)
    return "".join(parts).strip()


def clean_json_block(raw: str) -> str:
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("```", 2)
        if len(text) >= 2:
            candidate = text[1]
            if candidate.lstrip().startswith("json"):
                return candidate.split("\n", 1)[1].strip()
            return candidate.strip()
    return text


def validate_with_gemini(
    model: genai.GenerativeModel,
    question: Dict[str, Any],
    explanation: str,
) -> ValidationOutcome:
    payload = dict(question)
    prompt = VALIDATION_PROMPT.format(
        question=payload["question_text"],
        answer_a=payload["answers"].get("A") or "[vide]",
        answer_b=payload["answers"].get("B") or "[vide]",
        answer_c=payload["answers"].get("C") or "[vide]",
        answer_d=payload["answers"].get("D") or "[vide]",
        correct_letter=payload["correct_letter"] or "[?]",
        explanation=explanation if explanation else "[aucune]",
    )

    try:
        response = model.generate_content(prompt)
    except Exception as exc:
        return ValidationOutcome(False, {}, "", f"Gemini API error: {exc}")

    raw = extract_gemini_text(response)
    if not raw:
        return ValidationOutcome(False, {}, "", "Gemini returned an empty response")

    cleaned = clean_json_block(raw)
    try:
        parsed = json.loads(cleaned)
        if not isinstance(parsed, dict):
            raise ValueError("Validation output is not an object")
        return ValidationOutcome(True, parsed, cleaned)
    except Exception as exc:  # noqa: BLE001
        return ValidationOutcome(False, {}, cleaned, f"Gemini JSON parse error: {exc}")


def evaluate_with_fast_judge(
    model: Optional[genai.GenerativeModel],
    model_name: Optional[str],
    question: Dict[str, Any],
    explanation: str,
) -> FastJudgeResult:
    if not model:
        return FastJudgeResult(score=None, feedback=None, model=None, used=False)

    prompt = (
        FAST_JUDGE_PROMPT
        + "\n\nQuestion:\n"
        + question["question_text"]
        + "\n\nRéponses:\n"
        + "\n".join(f"{key}) {value or '[vide]'}" for key, value in question["answers"].items())
        + "\n\nBonne réponse attendue: "
        + question["correct_letter"]
        + "\n\nExplication proposée:\n"
        + explanation
    )
    try:
        response = model.generate_content(prompt)
    except Exception as exc:  # noqa: BLE001
        warn(f"Fast judge error: {exc}")
        return FastJudgeResult(score=None, feedback=str(exc), model=model_name, used=True)

    raw = extract_gemini_text(response)
    payload = None
    if raw:
        cleaned = clean_json_block(raw)
        try:
            payload = json.loads(cleaned)
        except json.JSONDecodeError:
            payload = None
    score = None
    feedback = None
    if isinstance(payload, dict):
        value = payload.get("score")
        if isinstance(value, (int, float)):
            score = float(value)
        feedback = payload.get("feedback")
    return FastJudgeResult(
        score=score,
        feedback=feedback,
        model=model_name,
        used=True,
        raw=raw,
    )


def call_openai_explanation(
    client: openai.OpenAI,
    question: Dict[str, Any],
    model: str,
    temperature: float,
) -> str:
    prompt = GENERATION_PROMPT.format(
        question=question["question_text"],
        answer_a=question["answers"].get("A") or "[vide]",
        answer_b=question["answers"].get("B") or "[vide]",
        answer_c=question["answers"].get("C") or "[vide]",
        answer_d=question["answers"].get("D") or "[vide]",
        correct_letter=question["correct_letter"] or "[?]",
    )
    response = client.chat.completions.create(
        model=model,
        temperature=temperature,
        messages=[
            {
                "role": "system",
                "content": "Tu es un pédagogue qui produit des explications courtes et précises en français.",
            },
            {"role": "user", "content": prompt},
        ],
    )
    return (response.choices[0].message.content or "").strip()


def build_import_record(
    question: Dict[str, Any],
    explanation: str,
    validation_snapshot: Dict[str, Any],
    origin_explanation: str,
    updated_in_db: bool,
) -> Dict[str, Any]:
    return {
        "question_id": question["id"],
        "test_type": question.get("test_type"),
        "exam_type": question.get("exam_type"),
        "category": question.get("category"),
        "difficulty": question.get("difficulty"),
        "question_text": question["question_text"],
        "answers": question["answers"],
        "correct_letter": question["correct_letter"],
        "new_explanation": explanation,
        "previous_explanation": origin_explanation,
        "validation_snapshot": validation_snapshot,
        "updated_in_db": updated_in_db,
    }


def update_question_explanation(client: Any, question_id: str, explanation: str) -> bool:
    try:
        response = (
            client.table("questions")
            .update({"explanation": explanation})
            .eq("id", question_id)
            .execute()
        )
    except Exception as exc:  # noqa: BLE001
        warn(f"Échec de mise à jour Supabase pour {question_id}: {exc}")
        return False

    data = getattr(response, "data", None)
    if not data:
        warn(f"Supabase n'a retourné aucune donnée lors de la mise à jour de {question_id}.")
        return False
    return True


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    import_path = output_dir / "questions_for_import.json"
    flags_path = output_dir / "flag_summary.json"

    if args.model.lower().startswith("gpt-5") and args.temperature != 1.0:
        warn(
            "Le modèle gpt-5 ne supporte pas les températures personnalisées; "
            "température forcée à 1.0."
        )
        args.temperature = 1.0

    openai_api_key = args.api_key or os.getenv("OPENAI_API_KEY")
    gemini_api_key = args.gemini_api_key or os.getenv("GEMINI_API_KEY")

    if not gemini_api_key:
        raise RuntimeError("Set GEMINI_API_KEY or provide --gemini-api-key to validate questions.")
    if not args.dry_run and not openai_api_key:
        raise RuntimeError("Set OPENAI_API_KEY or provide --api-key for explanation generation.")

    genai.configure(api_key=gemini_api_key)
    gemini_model = genai.GenerativeModel(args.gemini_model)
    openai_client = openai.OpenAI(api_key=openai_api_key) if not args.dry_run else None
    fast_judge_model = None
    fast_judge_model_name = args.fast_judge_model.strip().lower() if args.fast_judge_model else "none"
    if fast_judge_model_name not in ("none", "false", "0", ""):
        try:
            fast_judge_model = genai.GenerativeModel(args.fast_judge_model)
        except Exception as exc:  # noqa: BLE001
            warn(f"Impossible d'initialiser le fast judge ({args.fast_judge_model}): {exc}")
            fast_judge_model = None

    skip_ids: set[str] = set()
    if import_path.exists():
        try:
            with import_path.open("r", encoding="utf-8") as handle:
                existing_payload = json.load(handle)
            if isinstance(existing_payload, list):
                for entry in existing_payload:
                    if not isinstance(entry, dict):
                        continue
                    if entry.get("updated_in_db") is True:
                        qid = entry.get("question_id")
                        if qid:
                            skip_ids.add(str(qid))
        except json.JSONDecodeError as exc:
            warn(f"Impossible de lire {import_path}: {exc}. Reprise ignorée.")

    client = get_supabase_client()
    filters = prepare_filters(args)
    fetch_filters = dict(filters)
    if args.filter_test_types:
        fetch_filters["test_type"] = lambda query, values=tuple(args.filter_test_types): query.in_(
            "test_type", list(values)
        )
    rows = fetch_questions(
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
        filters=fetch_filters,
        chunk_size=args.chunk_size,
    )

    if not rows:
        warn("Aucune question récupérée. Vérifiez les filtres ou la base.")
        dump_json(str(import_path), [])
        dump_json(str(flags_path), [])
        return

    rows = order_rows(rows, args.prioritize_test_types)
    if args.limit:
        rows = rows[: args.limit]
        warn(f"Limitation appliquée: {len(rows)} questions seront traitées.")

    info(f"{len(rows)} questions prêtes à être traitées.")
    distribution = collections.Counter(row.get("test_type") or "[aucun]" for row in rows)
    info(
        "Répartition test_type: "
        + ", ".join(f"{label}={count}" for label, count in sorted(distribution.items()))
    )

    row_ids = {str(row["id"]) for row in rows}
    matched_skip_ids = skip_ids.intersection(row_ids)
    if matched_skip_ids:
        info(
            f"Mode reprise: {len(matched_skip_ids)} questions déjà mises à jour seront ignorées; "
            f"{len(rows) - len(matched_skip_ids)} restantes à traiter."
        )
    else:
        matched_skip_ids = set()

    questions_for_import: List[Dict[str, Any]] = []
    flag_summary: List[Dict[str, Any]] = []

    total_seen = 0
    skipped_previously = 0
    successful_generations = 0
    fast_path_successes = 0
    gemini_validations = 0
    regeneration_attempts = 0
    flagged_count = 0
    db_updates = 0

    for row in rows:
        qid = str(row["id"])
        if qid in matched_skip_ids:
            skipped_previously += 1
            continue

        total_seen += 1
        question = build_question_record(row)

        origin_explanation = question["explanation"]
        final_payload: Dict[str, Any] = {}
        new_explanation = "[DRY RUN] Nouvelle explication à rédiger."

        if args.dry_run:
            final_payload = {
                "pipeline": "dry_run",
                "gatekeeper": None,
                "fast_judge": None,
                "gemini": None,
            }
            success = True
        else:
            success = False
            max_attempts = max(1, min(2, args.max_attempts))
            attempt = 0
            while attempt < max_attempts:
                attempt += 1
                try:
                    new_explanation = call_openai_explanation(
                        openai_client,
                        question,
                        args.model,
                        args.temperature,
                    )
                except Exception as exc:  # noqa: BLE001
                    warn(f"Erreur OpenAI pour question {question['id']} (tentative {attempt}): {exc}")
                    if attempt >= max_attempts:
                        flag_summary.append(
                            {
                                "question_id": question["id"],
                                "issue": "openai_error",
                                "details": str(exc),
                            }
                        )
                        flagged_count += 1
                    time.sleep(max(args.delay, 0.0))
                    continue

                time.sleep(max(args.delay, 0.0))

                gate_result = run_gatekeeper(
                    question,
                    new_explanation,
                    args.gate_min_sentences,
                    args.gate_max_sentences,
                )
                judge_result = evaluate_with_fast_judge(
                    fast_judge_model,
                    args.fast_judge_model if fast_judge_model else None,
                    question,
                    new_explanation,
                )
                fast_ok = gate_result.passed and (
                    not judge_result.used
                    or judge_result.score is None
                    or judge_result.score >= args.judge_threshold
                )

                if fast_ok:
                    final_payload = {
                        "pipeline": "fast_path",
                        "gatekeeper": gate_result.to_payload(),
                        "fast_judge": judge_result.to_payload(),
                        "gemini": None,
                    }
                    fast_path_successes += 1
                    success = True
                    break

                if args.skip_expensive_validation:
                    flag_summary.append(
                        {
                            "question_id": question["id"],
                            "issue": "gatekeeper_failed",
                            "details": gate_result.to_payload(),
                            "fast_judge": judge_result.to_payload(),
                        }
                    )
                    flagged_count += 1
                    break

                validation = validate_with_gemini(gemini_model, question, new_explanation)
                gemini_validations += 1
                if not validation.ok:
                    warn(
                        f"Échec de validation Gemini (tentative {attempt}) "
                        f"pour question {question['id']}: {validation.error_message}"
                    )
                    if attempt >= max_attempts:
                        flag_summary.append(
                            {
                                "question_id": question["id"],
                                "issue": "validation_error",
                                "details": validation.error_message,
                                "raw": validation.raw,
                                "gatekeeper": gate_result.to_payload(),
                                "fast_judge": judge_result.to_payload(),
                            }
                        )
                        flagged_count += 1
                    else:
                        regeneration_attempts += 1
                    continue

                if not validation.correct_answer_is_valid:
                    warn(
                        f"Réponse suspecte pour question {question['id']} d'après Gemini."
                    )
                    if attempt >= max_attempts:
                        flag_summary.append(
                            {
                                "question_id": question["id"],
                                "issue": "incorrect_answer",
                                "details": validation.payload.get("correct_answer_feedback"),
                                "validation": validation.payload,
                                "gatekeeper": gate_result.to_payload(),
                                "fast_judge": judge_result.to_payload(),
                            }
                        )
                        flagged_count += 1
                    else:
                        regeneration_attempts += 1
                    continue

                if validation.needs_new_explanation:
                    warn(
                        f"Explication insuffisante selon Gemini pour question {question['id']}."
                    )
                    if attempt >= max_attempts:
                        flag_summary.append(
                            {
                                "question_id": question["id"],
                                "issue": "explanation_not_validated",
                                "details": validation.payload.get("explanation_feedback"),
                                "validation": validation.payload,
                                "gatekeeper": gate_result.to_payload(),
                                "fast_judge": judge_result.to_payload(),
                            }
                        )
                        flagged_count += 1
                    else:
                        regeneration_attempts += 1
                    continue

                final_payload = {
                    "pipeline": "stage_b",
                    "gatekeeper": gate_result.to_payload(),
                    "fast_judge": judge_result.to_payload(),
                    "gemini": validation.payload,
                }
                success = True
                break

        if not success:
            continue

        updated_in_db = False
        if not args.dry_run:
            updated_in_db = update_question_explanation(
                client,
                question["id"],
                new_explanation,
            )
            if not updated_in_db:
                flag_summary.append(
                    {
                        "question_id": question["id"],
                        "issue": "update_failed",
                        "details": "Impossible de mettre à jour la base avec la nouvelle explication.",
                        "validation": final_payload,
                    }
                )
                flagged_count += 1
        questions_for_import.append(
            build_import_record(
                question,
                new_explanation,
                ValidationOutcome(True, final_payload, raw=json.dumps(final_payload)),
                origin_explanation,
                updated_in_db,
            )
        )
        successful_generations += 1
        if updated_in_db:
            db_updates += 1

        if total_seen % max(args.log_interval, 1) == 0:
            info(
                f"{total_seen} questions examinées | "
                f"{successful_generations} explications générées | "
                f"{fast_path_successes} via fast path | "
                f"{gemini_validations} validations Gemini | "
                f"{db_updates} mises à jour Supabase | "
                f"{flagged_count} éléments dans le flag summary."
            )

    dump_json(str(import_path), questions_for_import)
    dump_json(str(flags_path), flag_summary)

    info(
        "Traitement terminé: "
        f"{total_seen} questions examinées, "
        f"{successful_generations} explications générées, "
        f"{db_updates} mises à jour Supabase, "
        f"{len(flag_summary)} éléments dans le flag summary, "
        f"{skipped_previously} questions ignorées via reprise, "
        f"{fast_path_successes} via fast path, "
        f"{gemini_validations} validations Gemini, "
        f"{regeneration_attempts} régénérations déclenchées."
    )


if __name__ == "__main__":
    main()
