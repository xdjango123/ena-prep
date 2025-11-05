#!/usr/bin/env python3
"""Stream question audit findings and generate replacements inline.

The flow implements the desired refresh pipeline:
- Run modular duplicate/category/quality checks per question.
- Stream findings to diagnostics_output/flagged_questions_stream.jsonl while keeping a
  rolling summary checkpoint in diagnostics_output/realtime_summary.json.
- Trigger replacement generation immediately for flagged questions (up to max_retries + 1 attempts).
- Persist a consolidated replacements_manifest.json and append successful generations to
  ai_validated_questions/replacements_raw.json for downstream validation.
"""

from __future__ import annotations

import argparse
import json
import signal
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from question_audit.db import (
    SupabaseConfigError,
    fetch_questions,
    get_supabase_client,
)
from question_audit.language import detect_language_scores
from question_audit.logging_utils import info, warn
from question_audit.text_utils import flatten_options, normalize_text, preview, token_signature

from scripts.replacement_utils import (
    GenerationConfig,
    ReplacementTarget,
    extract_json_object,
    generate_replacement_for_target,
    get_gemini_model,
)

DIAGNOSTICS_DIR = PROJECT_ROOT / "diagnostics_output"
STREAM_PATH = DIAGNOSTICS_DIR / "flagged_questions_stream.jsonl"
SUMMARY_PATH = DIAGNOSTICS_DIR / "realtime_summary.json"
MANIFEST_PATH = DIAGNOSTICS_DIR / "replacements_manifest.json"
REPLACEMENTS_PATH = PROJECT_ROOT / "ai_validated_questions/replacements_raw.json"
ATTEMPTS_PATH = DIAGNOSTICS_DIR / "replacement_attempts.jsonl"
AI_REVIEW_LOG_PATH = DIAGNOSTICS_DIR / "gemini_review_failures.log"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class AuditFinding:
    finding_type: str
    message: str
    severity: str = "warning"
    metadata: Dict[str, Any] | None = None

    def to_dict(self) -> Dict[str, Any]:
        payload = {
            "type": self.finding_type,
            "message": self.message,
            "severity": self.severity,
        }
        if self.metadata:
            payload["metadata"] = self.metadata
        return payload


def append_jsonl(path: Path, payload: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False)
        handle.write("\n")


def load_flag_summary(path: Path, *, quiet_missing: bool = False) -> List[Dict[str, Any]]:
    if not path.exists():
        if not quiet_missing:
            warn(f"Flag summary not found: {path}")
        return []
    try:
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
        if isinstance(data, list):
            return data
        warn(f"Unexpected format in {path}; expected a list.")
    except json.JSONDecodeError as exc:
        warn(f"Unable to parse {path}: {exc}")
    return []


def build_duplicate_index(rows: Iterable[Dict[str, Any]], *, min_length: int = 24) -> Dict[str, List[Dict[str, Any]]]:
    index: Dict[str, List[Dict[str, Any]]] = {}
    for row in rows:
        text = row.get("question_text") or ""
        if len(normalize_text(text)) < min_length:
            continue
        signature = token_signature(text)
        if not signature:
            continue
        index.setdefault(signature, []).append(row)
    return index


def duplicate_check(question: Dict[str, Any], duplicate_index: Dict[str, List[Dict[str, Any]]]) -> Optional[AuditFinding]:
    signature = token_signature(question.get("question_text") or "")
    if not signature:
        return None
    matches = [
        row for row in duplicate_index.get(signature, []) if str(row.get("id")) != str(question.get("id"))
    ]
    if not matches:
        return None
    metadata = {
        "match_count": len(matches),
        "samples": [
            {
                "id": str(match.get("id")),
                "exam_type": match.get("exam_type"),
                "category": match.get("category"),
                "preview": preview(match.get("question_text", ""), length=80),
            }
            for match in matches[:5]
        ],
        "signature": signature[:80],
    }
    return AuditFinding(
        finding_type="duplicate_question",
        message="Question en doublon détectée dans le catalogue.",
        metadata=metadata,
    )


def category_check(
    question: Dict[str, Any],
    *,
    english_threshold: float,
    french_threshold: float,
) -> Optional[AuditFinding]:
    category = (question.get("category") or "UNKNOWN").upper()
    text_blob = " ".join(
        part
        for part in [
            question.get("question_text") or "",
            question.get("explanation") or "",
            flatten_options(
                [
                    question.get("answer1") or "",
                    question.get("answer2") or "",
                    question.get("answer3") or "",
                    question.get("answer4") or "",
                ]
            ),
        ]
        if part
    )
    scores = {result.lang: result.prob for result in detect_language_scores(text_blob)}
    if category == "ANG":
        en_prob = scores.get("en", 0.0)
        if en_prob < english_threshold:
            return AuditFinding(
                finding_type="category_mismatch",
                message="Catégorie ANG mais probabilité anglaise insuffisante.",
                metadata={"english_probability": round(en_prob, 3), "threshold": english_threshold},
            )
    else:
        fr_prob = scores.get("fr", 0.0)
        if fr_prob < french_threshold:
            return AuditFinding(
                finding_type="category_mismatch",
                message="Contenu non francophone détecté alors que la catégorie attend du français.",
                metadata={"french_probability": round(fr_prob, 3), "threshold": french_threshold},
            )
    return None


def _normalize_correct_letter(value: Any) -> Optional[str]:
    if value is None:
        return None
    raw = str(value).strip().upper()
    if raw in {"A", "B", "C", "D"}:
        return raw
    mapping = {"1": "A", "2": "B", "3": "C", "4": "D"}
    return mapping.get(raw)


def explanation_check(question: Dict[str, Any]) -> Optional[AuditFinding]:
    explanation = (question.get("explanation") or "").strip()
    if not explanation:
        return AuditFinding("missing_explanation", "Aucune explication fournie pour la réponse correcte.")
    if len(explanation.split()) < 12:
        return AuditFinding(
            "weak_explanation",
            "Explication très courte; vérifier la justification.",
            metadata={"word_count": len(explanation.split())},
        )
    if explanation.lower().startswith("la bonne réponse est"):
        return AuditFinding(
            "boilerplate_explanation",
            "L'explication commence par une formulation générique.",
        )
    return None


def answer_check(question: Dict[str, Any]) -> Optional[AuditFinding]:
    answers = {
        "A": (question.get("answer1") or "").strip(),
        "B": (question.get("answer2") or "").strip(),
        "C": (question.get("answer3") or "").strip(),
        "D": (question.get("answer4") or "").strip(),
    }
    correct_letter = _normalize_correct_letter(question.get("correct"))
    if not correct_letter:
        return AuditFinding("invalid_correct_answer", "La valeur 'correct' ne référence aucune option valide.")
    correct_text = answers.get(correct_letter, "")
    if not correct_text:
        return AuditFinding(
            "invalid_correct_answer",
            f"L'option {correct_letter} est vide ou absente.",
        )
    duplicates = [letter for letter, text in answers.items() if text and text == correct_text and letter != correct_letter]
    if duplicates:
        return AuditFinding(
            "ambiguous_answers",
            "Plusieurs options identiques créent une ambiguïté.",
            metadata={"duplicates": [correct_letter] + duplicates},
        )
    return None


def run_quality_checks(question: Dict[str, Any]) -> List[AuditFinding]:
    findings: List[AuditFinding] = []
    explanation = explanation_check(question)
    if explanation:
        findings.append(explanation)
    answer = answer_check(question)
    if answer:
        findings.append(answer)
    return findings


class SummaryTracker:
    def __init__(self, path: Path, resume: bool) -> None:
        self.path = path
        self.data: Dict[str, Any] = {
            "created_at": utc_now(),
            "updated_at": utc_now(),
            "processed": 0,
            "flagged": 0,
            "issue_counts": {},
            "generation": {"success": 0, "failed": 0, "skipped": 0},
            "total_attempts": 0,
            "total_retries": 0,
            "failures": [],
            "last_question_id": None,
            "ai_review": {
                "confirmed": 0,
                "cleared": 0,
                "skipped": 0,
                "error": 0,
            },
        }
        if resume and path.exists():
            try:
                with path.open("r", encoding="utf-8") as handle:
                    loaded = json.load(handle)
                if isinstance(loaded, dict):
                    self.data.update(loaded)
            except json.JSONDecodeError:
                warn("Unable to resume realtime_summary.json; starting fresh.")

    def update(
        self,
        *,
        question_id: str,
        findings: List[AuditFinding],
        generation_status: str,
        attempts: int,
        failure_reason: Optional[str],
        review_label: str,
    ) -> None:
        self.data["processed"] = int(self.data.get("processed", 0)) + 1
        if findings:
            self.data["flagged"] = int(self.data.get("flagged", 0)) + 1
            issue_counts: Dict[str, int] = dict(self.data.get("issue_counts", {}))
            for finding in findings:
                issue_counts[finding.finding_type] = issue_counts.get(finding.finding_type, 0) + 1
            self.data["issue_counts"] = issue_counts
        generation_counts = dict(self.data.get("generation", {}))
        generation_counts[generation_status] = generation_counts.get(generation_status, 0) + 1
        self.data["generation"] = generation_counts
        self.data["total_attempts"] = int(self.data.get("total_attempts", 0)) + attempts
        self.data["total_retries"] = int(self.data.get("total_retries", 0)) + max(attempts - 1, 0)
        if failure_reason:
            failures = list(self.data.get("failures", []))
            failures.append({"question_id": question_id, "reason": failure_reason, "timestamp": utc_now()})
            self.data["failures"] = failures[-25:]
        self.data["last_question_id"] = question_id
        review_counts: Dict[str, int] = dict(self.data.get("ai_review", {}))
        review_counts[review_label] = review_counts.get(review_label, 0) + 1
        self.data["ai_review"] = review_counts
        self.data["updated_at"] = utc_now()
        self.flush()

    def flush(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("w", encoding="utf-8") as handle:
            json.dump(self.data, handle, ensure_ascii=False, indent=2)
            handle.write("\n")


class ManifestWriter:
    def __init__(self, path: Path, resume: bool) -> None:
        self.path = path
        self.created_at = utc_now()
        self.entries: Dict[str, Dict[str, Any]] = {}
        self.order: List[str] = []
        if path.exists():
            try:
                with path.open("r", encoding="utf-8") as handle:
                    payload = json.load(handle)
                if isinstance(payload, dict):
                    self.created_at = payload.get("created_at", self.created_at)
                    for item in payload.get("questions", []) or []:
                        if isinstance(item, dict) and "question_id" in item:
                            qid = str(item["question_id"])
                            self.entries[qid] = item
                            self.order.append(qid)
            except json.JSONDecodeError:
                warn("Unable to resume replacements_manifest.json; starting fresh.")

    def has_success(self, question_id: str) -> bool:
        entry = self.entries.get(question_id)
        status = (entry or {}).get("generation", {}).get("status")
        return status == "success"

    def update(self, record: Dict[str, Any]) -> None:
        question_id = str(record["question_id"])
        if question_id not in self.entries:
            self.order.append(question_id)
        self.entries[question_id] = record
        self.flush()

    def flush(self) -> None:
        payload = {
            "created_at": self.created_at,
            "updated_at": utc_now(),
            "questions": [self.entries[qid] for qid in self.order],
        }
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)
            handle.write("\n")


class ReplacementStore:
    def __init__(self, path: Path, resume: bool) -> None:
        self.path = path
        self.entries: Dict[str, Dict[str, Any]] = {}
        if path.exists():
            try:
                with path.open("r", encoding="utf-8") as handle:
                    data = json.load(handle)
                if isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict) and "question_id" in item:
                            self.entries[str(item["question_id"])] = item
            except json.JSONDecodeError:
                warn("Unable to resume replacements_raw.json; starting fresh.")

    def add(self, question_id: str, payload: Dict[str, Any]) -> None:
        self.entries[question_id] = payload
        self.flush()

    def flush(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("w", encoding="utf-8") as handle:
            json.dump(list(self.entries.values()), handle, ensure_ascii=False, indent=2)
            handle.write("\n")


def truncate_outputs(resume: bool) -> None:
    if resume:
        return
    for path in [STREAM_PATH, ATTEMPTS_PATH]:
        if path.exists():
            path.unlink()


def prepare_target(question: Dict[str, Any], findings: List[AuditFinding]) -> ReplacementTarget:
    category = (question.get("category") or "UNKNOWN").upper()
    exam_type = question.get("exam_type") or "UNKNOWN"
    test_type = question.get("test_type") or "UNKNOWN"
    notes = [
        {
            "reason": finding.finding_type,
            "details": finding.message,
            "metadata": finding.metadata or {},
        }
        for finding in findings
    ]
    return ReplacementTarget(
        question_id=str(question.get("id")),
        exam_type=exam_type,
        category=category,
        original_category=category,
        test_type=test_type,
        sub_category=question.get("sub_category"),
        reasons=[finding.finding_type for finding in findings],
        recommended_category=category,
        notes=notes,
    )


def log_attempts(question_id: str, attempts: List[Dict[str, Any]]) -> None:
    if not attempts:
        return
    append_jsonl(
        ATTEMPTS_PATH,
        {"question_id": question_id, "timestamp": utc_now(), "attempts": attempts},
    )


def _safe_preview(text: Optional[str], length: int = 160) -> str:
    if not text:
        return ""
    return preview(text, length=length)


def log_ai_review_failure(
    question_id: str,
    review_payload: Dict[str, Any],
    prompt: str,
) -> None:
    try:
        AI_REVIEW_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with AI_REVIEW_LOG_PATH.open("a", encoding="utf-8") as handle:
            json.dump(
                {
                    "question_id": question_id,
                    "timestamp": utc_now(),
                    **review_payload,
                    "prompt_preview": _safe_preview(prompt, length=400),
                },
                handle,
                ensure_ascii=False,
            )
            handle.write("\n")
    except Exception:
        pass


def run_ai_review(
    question_id: str,
    question: Dict[str, Any],
    findings: List[AuditFinding],
    model_name: str,
) -> Dict[str, Any]:
    if not findings:
        return {
            "status": "skipped",
            "should_flag": False,
            "reason": "No heuristic findings to review.",
        }

    try:
        model = get_gemini_model(model_name)
    except Exception as exc:  # pragma: no cover - dependency/config errors
        return {
            "status": "error",
            "should_flag": True,
            "error": f"Gemini model unavailable: {exc}",
        }

    question_preview = preview(question.get("question_text", ""), length=280)
    answers = {
        "A": question.get("answer1") or "",
        "B": question.get("answer2") or "",
        "C": question.get("answer3") or "",
        "D": question.get("answer4") or "",
    }
    findings_text = "\n".join(
        f"- {item.finding_type}: {item.message}" for item in findings
    )

    prompt = f"""
Tu es un examinateur de qualité pour les QCM de l'ENA (Côte d'Ivoire).
Analyse la question suivante et confirme si elle doit être remplacée.

Question:
{question_preview}

Options:
A) {answers['A']}
B) {answers['B']}
C) {answers['C']}
D) {answers['D']}

Bonne réponse enregistrée: {question.get('correct')}
Explication actuelle: {question.get('explanation') or '---'}
Catégorie: {question.get('category')} | Type d'examen: {question.get('exam_type')} | Test: {question.get('test_type')}

Problèmes détectés par les heuristiques:
{findings_text}

Retourne UNIQUEMENT du JSON:
{{
  "should_flag": true/false,
  "reason": "bref résumé en français expliquant la décision"
}}
"""

    response = None
    try:
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.0,
                "top_p": 0.9,
                "max_output_tokens": 320,
            },
        )
        text = (getattr(response, "text", "") or "").strip()
        if not text:
            parts: List[str] = []
            for candidate in getattr(response, "candidates", []) or []:
                content = getattr(candidate, "content", None)
                if not content:
                    continue
                for part in getattr(content, "parts", []) or []:
                    value = getattr(part, "text", None)
                    if value:
                        parts.append(value)
            text = "".join(parts).strip()
        payload = extract_json_object(text)
        if payload is None:
            raise ValueError(f"Gemini review returned non-JSON content: {text[:160]}")
        should_flag = bool(payload.get("should_flag"))
        reason = payload.get("reason", "")
        return {
            "status": "ok",
            "should_flag": should_flag,
            "reason": reason,
            "raw": payload,
        }
    except Exception as exc:  # pragma: no cover - model/parse errors
        meta: Dict[str, Any] = {
            "status": "error",
            "should_flag": True,
            "error": f"Gemini review failed: {exc}",
        }
        if response is not None:
            meta["candidates"] = [
                {
                    "finish_reason": getattr(candidate, "finish_reason", None),
                    "safety_ratings": [
                        {
                            "category": getattr(rating, "category", None),
                            "prob": getattr(rating, "probability", None),
                        }
                        for rating in getattr(candidate, "safety_ratings", []) or []
                    ],
                    "text_snippet": _safe_preview(
                        "".join(
                            getattr(part, "text", "")
                            for part in (
                                getattr(getattr(candidate, "content", None), "parts", []) or []
                            )
                        ),
                        length=200,
                    ),
                }
                for candidate in getattr(response, "candidates", []) or []
            ]
            feedback = getattr(response, "prompt_feedback", None)  # type: ignore[attr-defined]
            if feedback is not None:
                meta["prompt_feedback"] = getattr(feedback, "block_reason", None) or str(feedback)
        log_ai_review_failure(question_id, meta, prompt)
        return meta


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        default="diagnostics_output/flag_summary.json",
        help="Path to flag_summary.json (default: diagnostics_output/flag_summary.json)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Process at most N questions from the flag summary.",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume from existing outputs instead of starting fresh.",
    )
    parser.add_argument(
        "--english-threshold",
        type=float,
        default=0.6,
        help="Minimum English probability for ANG content (default: 0.60).",
    )
    parser.add_argument(
        "--french-threshold",
        type=float,
        default=0.6,
        help="Minimum French probability for non-ANG content (default: 0.60).",
    )
    parser.add_argument(
        "--max-retries",
        type=int,
        default=2,
        help="Maximum retries per question when generation fails (default: 2 → 3 attempts).",
    )
    parser.add_argument(
        "--sleep",
        type=float,
        default=1.0,
        help="Seconds to sleep between generation attempts (default: 1.0).",
    )
    parser.add_argument(
        "--dry-run-generation",
        action="store_true",
        help="Prepare prompts without calling OpenAI (dry run).",
    )
    parser.add_argument(
        "--flagged-only",
        action="store_true",
        help="Restrict the audit to IDs from --input instead of scanning the full catalogue.",
    )
    parser.add_argument(
        "--audit-gemini-model",
        default="gemini-2.0-flash",
        help="Gemini model name used to confirm violations before regeneration.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    truncate_outputs(args.resume)

    flag_path = (PROJECT_ROOT / args.input).resolve()
    scan_all = not args.flagged_only

    flagged = load_flag_summary(flag_path, quiet_missing=scan_all)

    try:
        client = get_supabase_client()
    except SupabaseConfigError as exc:
        raise SystemExit(f"Supabase configuration error: {exc}") from exc

    info("Fetching questions from Supabase…")
    columns = [
        "id",
        "question_text",
        "answer1",
        "answer2",
        "answer3",
        "answer4",
        "correct",
        "explanation",
        "category",
        "exam_type",
        "test_type",
        "sub_category",
        "difficulty",
    ]
    all_rows = fetch_questions(client, columns=columns)
    question_map = {str(row.get("id")): row for row in all_rows if row.get("id")}
    duplicate_index = build_duplicate_index(all_rows)
    info(f"Loaded {len(question_map)} questions; starting audit loop.")

    if not flagged and scan_all:
        flagged = [
            {
                "question_id": qid,
                "issue": "full_scan",
                "details": "Full catalogue scan executed (flagged-only disabled).",
            }
            for qid in question_map.keys()
        ]
    if args.limit:
        flagged = flagged[: args.limit]
    if not flagged:
        warn("No flagged questions found; nothing to audit.")
        return
    if scan_all:
        info(f"Full catalogue scan enabled. Auditing {len(flagged)} question(s).")

    summary = SummaryTracker(SUMMARY_PATH, resume=args.resume)
    summary.flush()
    manifest = ManifestWriter(MANIFEST_PATH, resume=args.resume)
    replacements = ReplacementStore(REPLACEMENTS_PATH, resume=args.resume)

    stop_requested = False

    def handle_signal(signum, _frame) -> None:
        nonlocal stop_requested
        warn(f"Signal {signum} received; will stop after the current question.")
        stop_requested = True

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    processed = 0
    for entry in flagged:
        if stop_requested:
            break
        question_id = str(entry.get("question_id") or "").strip()
        if not question_id:
            continue
        question = question_map.get(question_id)
        if question is None:
            warn(f"Question {question_id} not found in Supabase; skipping.")
            continue

        if manifest.has_success(question_id):
            info(f"[skip] Question already has a successful replacement: {question_id}")
            summary.update(
                question_id=question_id,
                findings=[],
                generation_status="success",
                attempts=0,
                failure_reason=None,
            )
            continue

        findings: List[AuditFinding] = []
        issue_name = entry.get("issue")
        if issue_name:
            findings.append(
                AuditFinding(
                    finding_type=str(issue_name),
                    message=str(entry.get("details") or "Signalé pour remplacement."),
                    metadata={"source": "flag_summary"},
                )
            )

        duplicate = duplicate_check(question, duplicate_index)
        if duplicate:
            findings.append(duplicate)

        category = category_check(
            question,
            english_threshold=args.english_threshold,
            french_threshold=args.french_threshold,
        )
        if category:
            findings.append(category)

        findings.extend(run_quality_checks(question))

        heuristic_findings = list(findings)
        review_info = {
            "status": "skipped",
            "should_flag": bool(heuristic_findings),
            "reason": "Aucun problème détecté par les heuristiques." if not heuristic_findings else "",
        }
        review_label = "skipped"

        if heuristic_findings:
            review_info = run_ai_review(question_id, question, heuristic_findings, args.audit_gemini_model)
            status = review_info.get("status")
            if status == "ok":
                if review_info.get("should_flag", False):
                    review_label = "confirmed"
                else:
                    review_label = "cleared"
                    findings = []
            elif status == "error":
                review_label = "error"
            else:
                review_label = "skipped"

        generation_status = "skipped"
        attempts_count = 0
        failure_reason: Optional[str] = None
        generation_payload = {
            "status": "skipped",
            "attempts": [],
            "generated_entry": None,
        }

        if review_label == "cleared":
            append_jsonl(
                STREAM_PATH,
                {
                    "timestamp": utc_now(),
                    "question_id": question_id,
                    "heuristic_findings": [finding.to_dict() for finding in heuristic_findings],
                    "final_findings": [],
                    "review": {**review_info, "label": review_label},
                    "generation_status": "skipped",
                },
            )
            summary.update(
                question_id=question_id,
                findings=[],
                generation_status="skipped",
                attempts=0,
                failure_reason=None,
                review_label=review_label,
            )
            continue

        if findings:
            target = prepare_target(question, findings)
            config = GenerationConfig(
                max_retries=args.max_retries,
                sleep_seconds=args.sleep,
                dry_run=args.dry_run_generation,
            )
            info(f"Generating replacement for {question_id} ({target.category})…")
            start = time.time()
            try:
                result = generate_replacement_for_target(target, config)
            except Exception as exc:  # pragma: no cover - defensive catch for API stack
                duration = time.time() - start
                attempts = []
                failure_reason = str(exc)
                generation_status = "failed"
                attempts_count = 1
                generation_payload = {
                    "status": "failed",
                    "attempts": attempts,
                    "generated_entry": None,
                    "error": failure_reason,
                    "took_seconds": round(duration, 3),
                }
            else:
                duration = time.time() - start
                attempts = result.get("attempts", []) or []
                log_attempts(question_id, attempts)
                attempts_count = len(attempts)
                status_value = result.get("status")
                if status_value in {"success", "dry_run"}:
                    attempts_count += 1
                elif attempts_count == 0:
                    attempts_count = 1
                generation_status = result.get("status", "failed")
                if generation_status not in {"success", "dry_run"}:
                    generation_status = "failed"
                generation_payload = {
                    "status": result.get("status"),
                    "attempts": attempts,
                    "generated_entry": result.get("generated_entry"),
                    "took_seconds": round(duration, 3),
                }
                if generation_status == "success" and result.get("generated_entry"):
                    replacements.add(question_id, result["generated_entry"])  # type: ignore[index]
                elif generation_status == "failed":
                    failure_reason = "; ".join(
                        attempt.get("error", "") for attempt in attempts if attempt.get("error")
                    ) or "Generation failed without detailed error."
        else:
            info(f"No additional findings for {question_id}; skipping generation.")

        manifest.update(
            {
                "question_id": question_id,
                "exam_type": question.get("exam_type") or "UNKNOWN",
                "category": (question.get("category") or "UNKNOWN").upper(),
                "test_type": question.get("test_type") or "UNKNOWN",
                "sub_category": question.get("sub_category"),
                "difficulty": question.get("difficulty"),
                "heuristic_findings": [finding.to_dict() for finding in heuristic_findings],
                "findings": [finding.to_dict() for finding in findings],
                "ai_review": {**review_info, "label": review_label},
                "generation": generation_payload,
                "source": {
                    "flag_summary": entry,
                    "question_preview": preview(question.get("question_text", ""), length=140),
                },
                "processed_at": utc_now(),
            }
        )

        append_jsonl(
            STREAM_PATH,
            {
                "timestamp": utc_now(),
                "question_id": question_id,
                "heuristic_findings": [finding.to_dict() for finding in heuristic_findings],
                "final_findings": [finding.to_dict() for finding in findings],
                "review": {**review_info, "label": review_label},
                "generation_status": generation_status,
            },
        )

        summary_failure = failure_reason or (review_info.get("error") if review_label == "error" else None)
        summary.update(
            question_id=question_id,
            findings=findings,
            generation_status=generation_status if generation_status != "dry_run" else "skipped",
            attempts=attempts_count,
            failure_reason=summary_failure,
            review_label=review_label,
        )

        processed += 1

    info(f"Audit loop finished. Processed {processed} question(s).")
    
    # Generate final summary
    summary.flush()
    manifest.flush()
    replacements.flush()
    
    final_summary = summary.data
    info("\n" + "="*70)
    info("FINAL SUMMARY")
    info("="*70)
    info(f"Total processed: {final_summary.get('processed', 0)}")
    info(f"Total flagged: {final_summary.get('flagged', 0)}")
    info(f"Generation - Success: {final_summary.get('generation', {}).get('success', 0)}")
    info(f"Generation - Failed: {final_summary.get('generation', {}).get('failed', 0)}")
    info(f"Generation - Skipped: {final_summary.get('generation', {}).get('skipped', 0)}")
    info(f"Total attempts: {final_summary.get('total_attempts', 0)}")
    info(f"Total retries: {final_summary.get('total_retries', 0)}")
    info(f"AI Review - Confirmed: {final_summary.get('ai_review', {}).get('confirmed', 0)}")
    info(f"AI Review - Cleared: {final_summary.get('ai_review', {}).get('cleared', 0)}")
    info(f"AI Review - Errors: {final_summary.get('ai_review', {}).get('error', 0)}")
    if final_summary.get('issue_counts'):
        info(f"Issue counts: {final_summary.get('issue_counts')}")
    if final_summary.get('failures'):
        failure_count = len(final_summary.get('failures', []))
        info(f"Failures recorded: {failure_count}")
    info("="*70)
    info(f"Summary saved to: {SUMMARY_PATH}")
    info(f"Manifest saved to: {MANIFEST_PATH}")
    info(f"Replacements saved to: {REPLACEMENTS_PATH}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        warn("Interrupted by user; partial results have been saved.")
