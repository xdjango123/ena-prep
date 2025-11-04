#!/usr/bin/env python3
"""Replace EASY questions with newly generated HARD ones."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import random
import difflib
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Set, Tuple

import google.generativeai as genai
import openai

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if os.fspath(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, os.fspath(PROJECT_ROOT))

from question_audit.db import SupabaseConfigError, dump_json, fetch_questions, get_supabase_client  # type: ignore
from question_audit.language import detect_language_scores  # type: ignore
from question_audit.logging_utils import info, warn  # type: ignore

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
        "--source-difficulty",
        help="Optional difficulty filter to restrict input selection (e.g. EASY)",
    )
    parser.add_argument(
        "--target-difficulty",
        default="HARD",
        help="Difficulty assigned to generated questions (default: HARD)",
    )
    parser.add_argument(
        "--model-name",
        default="gpt-4o-mini",
        help="OpenAI model for question generation (default: gpt-4o-mini)",
    )
    parser.add_argument(
        "--gemini-model",
        default="gemini-2.0-flash",
        help="Gemini model for final validation (default: gemini-2.0-flash)",
    )
    parser.add_argument(
        "--categories",
        nargs="+",
        help="Optional category filter (e.g. ANG CG)",
    )
    parser.add_argument(
        "--exam-types",
        nargs="+",
        help="Optional exam_type filter (e.g. CM CMS CS)",
    )
    parser.add_argument(
        "--sub-categories",
        nargs="+",
        help="Optional sub_category filter",
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Process at most this many questions",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Persist changes (default: dry-run)",
    )
    parser.add_argument(
        "--retry-count",
        type=int,
        default=2,
        help="Maximum GPT retries per question (default: 2)",
    )
    parser.add_argument(
        "--similarity-threshold",
        type=float,
        default=0.9,
        help="Reject generated questions whose text similarity to an existing question is above this ratio (default: 0.9)",
    )
    parser.add_argument(
        "--english-threshold",
        type=float,
        default=0.6,
        help="Minimum English probability for ANG content (default: 0.6)",
    )
    parser.add_argument(
        "--french-threshold",
        type=float,
        default=0.7,
        help="Minimum French probability for CG/LOG content (default: 0.7)",
    )
    parser.add_argument(
        "--difficulty-threshold",
        type=float,
        default=0.1,
        help="Flag questions whose LLM difficulty score (0-1) is at or below this value (default: 0.10)",
    )
    parser.add_argument(
        "--log-dir",
        default="diagnostics_output",
        help="Directory to store logs (default: diagnostics_output)",
    )
    parser.add_argument(
        "--backup-dir",
        default="backups",
        help="Directory to store exported EASY questions (default: backups)",
    )
    parser.add_argument(
        "--skip-file",
        action="append",
        help="Path to newline-delimited question IDs to skip",
    )
    return parser.parse_args()


def load_skip_ids(paths: Iterable[str] | None) -> set[str]:
    ids: set[str] = set()
    if not paths:
        return ids
    for path in paths:
        if not os.path.exists(path):
            warn(f"Skip file not found: {path}")
            continue
        with open(path, "r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if line:
                    ids.add(line)
    return ids


def load_existing_hashes(client, chunk_size: int = 2000) -> Set[str]:
    """Fetch all existing question unique_hash values to prevent duplicates."""
    hashes: Set[str] = set()
    offset = 0
    while True:
        response = (
            client.table("questions")
            .select("unique_hash")
            .range(offset, offset + chunk_size - 1)
            .execute()
        )
        data = response.data or []
        if not data:
            break
        for row in data:
            value = row.get("unique_hash")
            if isinstance(value, str) and value:
                hashes.add(value)
        if len(data) < chunk_size:
            break
        offset += len(data)
    return hashes


def normalize_question_text(text: Optional[str]) -> str:
    if not text:
        return ""
    lowered = text.lower()
    collapsed = re.sub(r"\s+", " ", lowered)
    stripped = re.sub(r"[^\w\s]", "", collapsed)
    return stripped.strip()


def load_existing_question_map(
    client,
    chunk_size: int = 2000,
) -> Dict[Tuple[Optional[str], Optional[str]], List[str]]:
    mapping: Dict[Tuple[Optional[str], Optional[str]], List[str]] = {}
    offset = 0
    while True:
        response = (
            client.table("questions")
            .select("question_text, exam_type, category")
            .range(offset, offset + chunk_size - 1)
            .execute()
        )
        data = response.data or []
        if not data:
            break
        for row in data:
            norm = normalize_question_text(row.get("question_text"))
            if not norm:
                continue
            key = (row.get("exam_type"), row.get("category"))
            mapping.setdefault(key, []).append(norm)
        if len(data) < chunk_size:
            break
        offset += len(data)
    return mapping


def is_too_similar(
    candidate_norm: str,
    existing_norms: List[str],
    threshold: float,
) -> bool:
    for existing in existing_norms:
        ratio = difflib.SequenceMatcher(None, candidate_norm, existing).ratio()
        if ratio >= threshold:
            return True
    return False


def language_scores(text: str) -> Dict[str, float]:
    scores: Dict[str, float] = {}
    for lang in detect_language_scores(text):
        scores[lang.lang] = max(scores.get(lang.lang, 0.0), lang.prob)
    return scores


def meets_language_requirements(
    candidate: Dict[str, str],
    category: str,
    english_threshold: float,
    french_threshold: float,
) -> Tuple[bool, Dict[str, float]]:
    answers = candidate["answers"]
    parts = [
        candidate.get("question_text", ""),
        answers.get("A"),
        answers.get("B"),
        answers.get("C"),
        answers.get("D"),
        candidate.get("explanation", ""),
    ]
    joined = " ".join(str(part) for part in parts if part)
    scores = language_scores(joined)
    english_prob = scores.get("en", 0.0)
    french_prob = scores.get("fr", 0.0)
    if category == "ANG":
        return english_prob >= english_threshold, scores
    return french_prob >= french_threshold, scores


def format_existing_question(row: Dict[str, object]) -> str:
    options = [
        ("A", row.get("answer1")),
        ("B", row.get("answer2")),
        ("C", row.get("answer3")),
        ("D", row.get("answer4")),
    ]
    options_text = "\n".join(
        f"{label}) {value}" for label, value in options if value and str(value).strip()
    )
    return (
        f"Énoncé : {row.get('question_text')}\n"
        f"Options :\n{options_text if options_text else 'N/A'}\n"
        f"Bonne réponse : {row.get('correct')}\n"
        f"Explication : {row.get('explanation')}"
    )


def gemini_score_question(
    model: genai.GenerativeModel,
    row: Dict[str, object],
) -> Tuple[Optional[Dict[str, object]], Optional[str]]:
    prompt = f"""
Tu es un examinateur expert des concours d'entrée de l'ENA (Côte d'Ivoire).
Analyse la question suivante et évalue sa difficulté réelle pour des candidats de haut niveau.

{format_existing_question(row)}

Produit uniquement un objet JSON strict avec les clés :
{{
  "difficulty_score": nombre entre 0.0 et 1.0 (0 = très facile, 1 = très difficile),
  "rating": "très facile" | "facile" | "moyenne" | "difficile" | "très difficile",
  "too_easy": booléen indiquant si la question est trop facile pour un test sélectif,
  "confidence": nombre entre 0.0 et 1.0,
  "reason": "justification concise en français expliquant l'évaluation"
}}
"""
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        payload = extract_json_object(text)
        sleep_with_jitter()
        return payload, None
    except Exception as exc:
        warn(f"Gemini difficulty scoring failed: {exc}")
        return None, str(exc)


def gpt_generate_question(
    client: openai.OpenAI,
    model: str,
    row: Dict[str, object],
    target_difficulty: str,
    attempt: int,
) -> Tuple[Optional[Dict[str, object]], Optional[str]]:
    category = row.get("category")
    exam_type = row.get("exam_type")
    test_type = row.get("test_type")
    sub_category = row.get("sub_category") or "N/A"
    options = [
        row.get("answer1"),
        row.get("answer2"),
        row.get("answer3"),
        row.get("answer4"),
    ]
    option_count = sum(1 for opt in options if opt)
    option_count = max(option_count, 3)
    desired_language = "anglais" if category == "ANG" else "français"

    system_prompt = (
        "Tu es un concepteur de questions pour les épreuves de l'École Nationale "
        "d'Administration (Côte d'Ivoire). Tu crées des QCM difficiles et rigoureux."
    )
    user_prompt = f"""
Crée une nouvelle question de difficulté {target_difficulty} pour remplacer une question existante.
Contraintes :
- Catégorie : {category}
- Langue attendue : {desired_language}
- Type d'examen : {exam_type}
- Type de test : {test_type}
- Sous-catégorie : {sub_category}
- Nombre d'options : {option_count} (labelisées A, B, C et D si nécessaire)
- Fournis exactement une bonne réponse
- Ajoute une explication claire et précise
- La question doit être entièrement originale (ne réutilise pas l'énoncé existant)

Réponds uniquement en JSON strict :
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
  "difficulty": "{target_difficulty}"
}}
"""

    try:
        response = client.responses.create(
            model="gpt-5",
            input=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        content = response.output_text.strip()
        payload = extract_json_object(content)
        payload["attempt"] = attempt
        sleep_with_jitter()
        return payload, None
    except Exception as exc:
        warn(f"GPT generation failed (attempt {attempt}): {exc}")
        backoff = min(2 ** (attempt - 1), 8)
        sleep_with_jitter(base=backoff, jitter=0.3)
        return None, str(exc)


def validate_candidate_structure(candidate: Dict[str, object]) -> bool:
    required = {"question_text", "answers", "correct_letter", "explanation", "difficulty"}
    if not required.issubset(candidate.keys()):
        return False
    answers = candidate["answers"]
    if not isinstance(answers, dict):
        return False
    letters = {"A", "B", "C", "D"}
    if candidate["correct_letter"] not in letters:
        return False
    present_answers = [answers.get(letter) for letter in letters]
    if sum(1 for ans in present_answers if ans and str(ans).strip()) < 3:
        return False
    return True


def gemini_validate_candidate(
    model: genai.GenerativeModel,
    row: Dict[str, object],
    candidate: Dict[str, object],
) -> Tuple[bool, str]:
    prompt = f"""
Tu valides une nouvelle question proposée pour le remplacement d'une question obsolète.
Vérifie les points suivants :
1. Le contenu est adapté à la catégorie {row.get('category')} et au type {row.get('exam_type')}.
2. La difficulté correspond à {candidate.get('difficulty')} et est nettement plus élevée qu'une question facile.
3. L'explication justifie clairement la bonne réponse.
4. La langue utilisée est correcte (anglais pour ANG, français pour CG/LOG).
5. Les options sont cohérentes et une seule est correcte.

Question proposée :
Énoncé : {candidate.get('question_text')}
Options :
A) {candidate['answers'].get('A') or ''}
B) {candidate['answers'].get('B') or ''}
C) {candidate['answers'].get('C') or ''}
D) {candidate['answers'].get('D') or ''}
Bonne réponse : {candidate.get('correct_letter')}
Explication : {candidate.get('explanation')}

Réponds uniquement en JSON structuré :
{{
  "approved": true/false,
  "reason": "commentaire bref",
  "language_ok": true/false,
  "difficulty_ok": true/false,
  "explanation_ok": true/false,
  "correctness_ok": true/false
}}
"""
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        payload = extract_json_object(text)
        checks = [
            payload.get("approved"),
            payload.get("language_ok"),
            payload.get("difficulty_ok"),
            payload.get("explanation_ok"),
            payload.get("correctness_ok"),
        ]
        sleep_with_jitter()
        return all(bool(check) for check in checks), payload.get("reason", "")
    except Exception as exc:
        warn(f"Gemini validation failed: {exc}")
        return False, f"validation_error: {exc}"


def sha_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def candidate_to_insert_payload(
    row: Dict[str, object],
    candidate: Dict[str, object],
    target_difficulty: str,
) -> Dict[str, object]:
    answers = candidate["answers"]
    question_text = candidate["question_text"].strip()
    unique_hash = sha_hash(question_text)
    now = datetime.now(timezone.utc).isoformat()

    def normalise(value: object) -> Optional[str]:
        if value is None:
            return None
        if isinstance(value, str):
            stripped = value.strip()
            return stripped if stripped else None
        return str(value)

    return {
        "question_text": question_text,
        "answer1": normalise(answers.get("A")),
        "answer2": normalise(answers.get("B")),
        "answer3": normalise(answers.get("C")),
        "answer4": normalise(answers.get("D")),
        "correct": candidate["correct_letter"],
        "explanation": candidate["explanation"].strip(),
        "category": row.get("category"),
        "difficulty": target_difficulty,
        "exam_type": row.get("exam_type"),
        "test_type": row.get("test_type"),
        "sub_category": row.get("sub_category"),
        "unique_hash": unique_hash,
        "ai_generated": True,
        "question_pool": f"{row.get('exam_type')}_{row.get('category')}_{row.get('test_type')}",
        "usage_count": 0,
        "created_at": now,
        "updated_at": now,
    }


def insert_new_question(
    client,
    payload: Dict[str, object],
) -> Tuple[bool, Optional[str], Optional[str]]:
    try:
        exists = (
            client.table("questions")
            .select("id")
            .eq("unique_hash", payload["unique_hash"])
            .limit(1)
            .execute()
        )
        if exists.data:
            return False, None, "duplicate_hash"
        response = client.table("questions").insert(payload).execute()
        if response.data:
            new_id = response.data[0].get("id")
            return True, new_id, None
        return False, None, "insert_failed"
    except Exception as exc:
        return False, None, str(exc)


def delete_question(client, question_id: str) -> Tuple[bool, Optional[str]]:
    try:
        client.table("questions").delete().eq("id", question_id).execute()
        return True, None
    except Exception as exc:
        return False, str(exc)


def backup_questions(rows: List[Dict[str, object]], directory: str, difficulty: str) -> Path:
    Path(directory).mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    path = Path(directory) / f"{difficulty.lower()}_questions_backup_{timestamp}.json"
    dump_json(os.fspath(path), rows)
    return path


def main() -> None:
    args = parse_args()

    try:
        ensure_probability("--english-threshold", args.english_threshold)
        ensure_probability("--french-threshold", args.french_threshold)
        ensure_probability("--similarity-threshold", args.similarity_threshold)
        ensure_probability("--difficulty-threshold", args.difficulty_threshold)
    except ValueError as exc:
        warn(str(exc))
        return

    try:
        supabase = get_supabase_client()
    except SupabaseConfigError as exc:
        warn(str(exc))
        return

    filters: Dict[str, object] = {}
    if args.source_difficulty:
        filters["difficulty"] = args.source_difficulty
    rows = fetch_questions(
        supabase,
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
            "sub_category",
            "unique_hash",
        ],
        filters=filters,
    )

    if args.categories:
        wanted = {cat.upper() for cat in args.categories}
        rows = [row for row in rows if str(row.get("category")).upper() in wanted]
    if args.exam_types:
        wanted = {et.upper() for et in args.exam_types}
        rows = [row for row in rows if str(row.get("exam_type")).upper() in wanted]
    if args.sub_categories:
        wanted = {sc for sc in args.sub_categories}
        rows = [row for row in rows if (row.get("sub_category") or "") in wanted]
    skip_ids = load_skip_ids(args.skip_file)
    if skip_ids:
        info(f"Skipping {len(skip_ids)} question IDs provided in skip files")
        rows = [row for row in rows if str(row.get("id")) not in skip_ids]

    if args.limit is not None:
        rows = rows[: args.limit]

    if not rows:
        info("No questions matched the selection criteria.")
        return

    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        warn("GEMINI_API_KEY not set; aborting.")
        return
    genai.configure(api_key=gemini_api_key)

    scoring_model = genai.GenerativeModel(
        args.gemini_model,
        generation_config={
            "response_mime_type": "application/json",
            "temperature": 0.0,
        },
    )

    difficulty_assessments: List[Dict[str, object]] = []
    flagged_rows: List[Dict[str, object]] = []

    info("Scoring questions to identify those that are too easy...")

    for row in rows:
        qid = str(row.get("id"))
        assessment, error = gemini_score_question(scoring_model, row)
        if not assessment:
            difficulty_assessments.append(
                {
                    "question_id": qid,
                    "error": error or "unknown_error",
                }
            )
            continue

        raw_score = assessment.get("difficulty_score")
        try:
            score_value = float(raw_score)
        except (TypeError, ValueError):
            score_value = None
        rating = assessment.get("rating")
        too_easy_flag = bool(assessment.get("too_easy"))

        difficulty_assessments.append(
            {
                "question_id": qid,
                "difficulty_score": score_value,
                "rating": rating,
                "too_easy_flag": too_easy_flag,
                "confidence": assessment.get("confidence"),
                "reason": assessment.get("reason"),
                "raw": assessment,
            }
        )

        if score_value is not None:
            info(
                f"Difficulty score for {qid}: {score_value:.2f}"
                + (f" ({rating})" if rating else "")
            )
        else:
            info(f"Recorded difficulty assessment for {qid}, but score is missing.")

        flagged = False
        if score_value is not None and score_value <= args.difficulty_threshold:
            flagged = True
        elif score_value is None and too_easy_flag:
            flagged = True
        elif not flagged and too_easy_flag and score_value is not None:
            flagged = True

        if flagged:
            row["difficulty_assessment"] = assessment
            flagged_rows.append(row)

    log_dir = Path(args.log_dir)
    log_dir.mkdir(parents=True, exist_ok=True)
    run_timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    if difficulty_assessments:
        scores_path = log_dir / f"refresh_easy_scores_{run_timestamp}.json"
        dump_json(os.fspath(scores_path), difficulty_assessments)
        info(f"Wrote difficulty assessments to {scores_path}")

    if not flagged_rows:
        info(
            f"No questions were flagged as too easy (threshold={args.difficulty_threshold:.2f})."
        )
        return

    info(
        f"Flagged {len(flagged_rows)} question(s) as too easy (threshold={args.difficulty_threshold:.2f})."
    )

    rows = flagged_rows

    backup_path = backup_questions(rows, args.backup_dir, "too_easy")
    info(f"Backed up {len(rows)} flagged questions to {backup_path}")

    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        warn("OPENAI_API_KEY not set; aborting before generation.")
        return

    gpt_client = openai.OpenAI(api_key=openai_api_key)
    openai_model = os.getenv("OPENAI_MODEL", "gpt-5")
    gemini_model = genai.GenerativeModel(args.gemini_model)

    existing_hashes = load_existing_hashes(supabase)
    seen_hashes = set(existing_hashes)
    existing_text_map = load_existing_question_map(supabase)

    applied: List[Dict[str, object]] = []
    failed: List[Dict[str, object]] = []

    for idx, row in enumerate(rows, start=1):
        qid = str(row.get("id"))
        category = row.get("category")
        info(f"[{idx}/{len(rows)}] Processing question {qid} ({category})")

        candidate: Optional[Dict[str, object]] = None
        attempt_errors: List[str] = []
        pool_key = (row.get("exam_type"), row.get("category"))
        pool_texts = existing_text_map.setdefault(pool_key, [])

        for attempt in range(args.retry_count + 1):
            attempt_label = attempt + 1
            draft, gpt_error = gpt_generate_question(
                gpt_client, openai_model, row, args.target_difficulty, attempt_label
            )
            if not draft:
                if gpt_error:
                    attempt_errors.append(f"gpt_fail_attempt_{attempt_label}:{gpt_error}")
                continue
            if not validate_candidate_structure(draft):
                message = f"Invalid candidate structure for question {qid} (attempt {attempt_label})"
                attempt_errors.append(f"structure_attempt_{attempt_label}")
                warn(message)
                continue

            draft_text = (draft.get("question_text") or "").strip()
            if not draft_text:
                attempt_errors.append(f"empty_question_attempt_{attempt_label}")
                warn(f"Empty question text for {qid} (attempt {attempt_label})")
                continue

            draft_hash = sha_hash(draft_text)
            if draft_hash in seen_hashes:
                attempt_errors.append(f"duplicate_hash_attempt_{attempt_label}")
                warn(
                    f"Duplicate candidate detected for {qid} (attempt {attempt_label}); requesting a new question."
                )
                continue

            candidate_norm = normalize_question_text(draft_text)
            if candidate_norm and is_too_similar(
                candidate_norm,
                pool_texts,
                args.similarity_threshold,
            ):
                attempt_errors.append(f"similar_text_attempt_{attempt_label}")
                warn(
                    f"Candidate for {qid} is too similar to an existing question (attempt {attempt_label}); trying again."
                )
                continue

            meets_language, lang_scores = meets_language_requirements(
                draft,
                category=str(category),
                english_threshold=args.english_threshold,
                french_threshold=args.french_threshold,
            )
            if not meets_language:
                en_score = lang_scores.get("en", 0.0)
                fr_score = lang_scores.get("fr", 0.0)
                warn(
                    f"Language check failed for question {qid} (attempt {attempt_label}) "
                    f"(en={en_score:.2f}, fr={fr_score:.2f})"
                )
                attempt_errors.append(
                    f"language_attempt_{attempt_label}:en={en_score:.2f};fr={fr_score:.2f}"
                )
                continue
            approved, reason = gemini_validate_candidate(gemini_model, row, draft)
            if approved:
                candidate = draft
                candidate["gemini_reason"] = reason
                candidate["unique_hash"] = draft_hash
                candidate["normalized_text"] = candidate_norm
                break
            warn(f"Gemini rejected candidate for {qid}: {reason}")
            attempt_errors.append(f"gemini_attempt_{attempt_label}:{reason}")

        if not candidate:
            failed.append(
                {
                    "question_id": qid,
                    "reason": "generation_failed",
                    "details": attempt_errors,
                }
            )
            continue

        insert_payload = candidate_to_insert_payload(row, candidate, args.target_difficulty)
        candidate_hash = insert_payload["unique_hash"]
        if candidate_hash in seen_hashes:
            attempt_errors.append("duplicate_hash_after_validation")
            warn(f"Candidate hash already seen for {qid}; skipping.")
            failed.append(
                {
                    "question_id": qid,
                    "reason": "duplicate_hash_after_validation",
                    "candidate": candidate,
                    "attempt_errors": attempt_errors,
                }
            )
            continue
        if args.apply:
            inserted, new_id, insert_error = insert_new_question(supabase, insert_payload)
            if not inserted:
                warn(f"Insertion failed for {qid}: {insert_error}")
                failed.append(
                    {
                        "question_id": qid,
                        "reason": f"insertion_failed:{insert_error}",
                        "candidate": candidate,
                        "attempt_errors": attempt_errors,
                    }
                )
                continue

            success, delete_reason = delete_question(supabase, qid)
            if not success:
                warn(f"Deletion failed for {qid}: {delete_reason}")
                rollback_error: Optional[str] = None
                if new_id:
                    rollback_ok, rollback_error = delete_question(supabase, str(new_id))
                    if rollback_ok:
                        warn(f"Rollback succeeded: removed inserted replacement for {qid}.")
                    else:
                        warn(
                            f"Rollback failed for inserted replacement of {qid}: {rollback_error}"
                        )
                else:
                    rollback_error = "missing_insert_id"
                failed.append(
                    {
                        "question_id": qid,
                        "reason": f"deletion_failed:{delete_reason}",
                        "candidate": candidate,
                        "attempt_errors": attempt_errors,
                        "rollback_error": rollback_error,
                    }
                )
                continue

            applied.append(
                {
                    "question_id": qid,
                    "new_question_hash": insert_payload["unique_hash"],
                    "new_question_id": str(new_id) if new_id else None,
                    "candidate": candidate,
                }
            )
            seen_hashes.add(candidate_hash)
            info(f"Replaced question {qid} with a HARD alternative.")
        else:
            applied.append(
                {
                    "question_id": qid,
                    "candidate": candidate,
                    "attempt_errors": attempt_errors,
                    "note": "dry_run",
                }
            )
            info(f"DRY-RUN: would replace question {qid} with generated HARD version.")
            seen_hashes.add(candidate_hash)
        normalized = candidate.get("normalized_text", "")
        if normalized:
            pool_texts.append(normalized)

    suffix = "applied" if args.apply else "dry_run"

    if applied:
        path = log_dir / f"refresh_easy_{suffix}_{run_timestamp}.json"
        dump_json(os.fspath(path), applied)
        info(f"Wrote replacement log to {path}")
    if failed:
        path = log_dir / f"refresh_easy_failed_{run_timestamp}.json"
        dump_json(os.fspath(path), failed)
        info(f"Wrote failure log to {path}")

    info(
        f"Refresh complete. Successful candidates: {len(applied)}, failures: {len(failed)}. "
        f"Backup stored at {backup_path}."
    )


if __name__ == "__main__":
    main()
