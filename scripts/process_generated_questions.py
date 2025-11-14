#!/usr/bin/env python3
"""Validate freshly generated questions and optionally insert them.

Steps performed:
1. Load generated questions from the provided JSON file.
2. Fetch existing questions from Supabase to guard against duplicates.
3. Run a battery of checks (duplicate detection, answer mapping, French explanation).
4. Emit diagnostics for conflicts and near-duplicates awaiting manual review.
5. Optionally insert the validated questions via the existing QuestionInserter helper.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

# Ensure project root is importable when the script is executed via a relative path.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from langdetect import DetectorFactory, LangDetectException, detect  # type: ignore

from question_audit.db import (
    SupabaseConfigError,
    fetch_questions,
    get_supabase_client,
)
from question_audit.text_utils import normalize_text, token_signature
from question_audit.model_checks import ModelValidators, run_llm_checks

DetectorFactory.seed = 42  # make language detection deterministic

# Lazy import to avoid pulling heavy dependencies when running in dry mode
try:  # pragma: no cover - avoid import cost unless needed
    from insert_questions_to_db import QuestionInserter
except Exception:  # pragma: no cover - optional
    QuestionInserter = None  # type: ignore


SIMILARITY_DUPLICATE_THRESHOLD = 0.999
SIMILARITY_MANUAL_REVIEW_LOW = 0.95
SIMILARITY_MANUAL_REVIEW_HIGH = SIMILARITY_DUPLICATE_THRESHOLD
DEFAULT_INPUT = "ai_validated_questions/successful_questions_ready.json"
DEFAULT_READY_OUTPUT = "ai_validated_questions/ready_for_insert.json"
READY_SOURCE_IDS = "ai_validated_questions/ready_for_insert_source_ids.json"
INGESTED_IDS_PATH = "ai_validated_questions/ingested_source_ids.json"
CONFLICTS_PATH = "diagnostics_output/generated_conflicts.json"
MANUAL_REVIEW_DIR = Path("diagnostics_output/duplicates")
MANUAL_REVIEW_CANDIDATES = MANUAL_REVIEW_DIR / "manual_review_candidates.json"
MANUAL_REVIEW_RESOLVED = MANUAL_REVIEW_DIR / "manual_review_resolved.csv"
REGEN_PROMPT_DIR = Path("diagnostics_output/regeneration_prompts")
POTENTIAL_ERRORS_PATH = "diagnostics_output/potential_errors.json"


@dataclass
class ExistingQuestion:
    id: str
    text: str
    normalized: str
    signature: str


@dataclass
class GeneratedQuestion:
    raw: Dict[str, Any]
    normalized_text: str
    signature: str
    question_id: str


class GeneratedQuestionProcessor:
    def __init__(self, args: argparse.Namespace):
        self.args = args
        self.cwd = Path(args.cwd).resolve()
        self.input_path = self.cwd / args.input
        self.ready_output_path = self.cwd / args.output
        self.ready_source_ids_path = self.cwd / READY_SOURCE_IDS
        self.ingested_ids_path = self.cwd / INGESTED_IDS_PATH
        self.conflicts_path = self.cwd / CONFLICTS_PATH
        self.manual_review_candidates_path = self.cwd / MANUAL_REVIEW_CANDIDATES
        self.manual_review_resolved_path = self.cwd / MANUAL_REVIEW_RESOLVED
        self.regen_prompt_dir = self.cwd / REGEN_PROMPT_DIR

        self.conflicts: List[Dict[str, Any]] = []
        self.manual_review_entries: List[Dict[str, Any]] = []
        self.accepted_questions: List[Dict[str, Any]] = []
        self.potential_errors: List[Dict[str, Any]] = []
        self.accepted_source_ids: List[str] = []
        self.replaced_source_ids: List[str] = []
        self.stats = {
            "loaded": 0,
            "accepted": 0,
            "conflicts": 0,
            "manual_review": 0,
            "skipped_language": 0,
            "skipped_answer": 0,
            "skipped_duplicate_choice": 0,
            "inserted": 0,
        }

        self.manual_review_resolved = self._load_manual_review_resolved()
        self.supabase_client = self._init_supabase_client()
        self.existing_questions = self._load_existing_questions()
        self.ingested_ids = self._load_ingested_ids()
        self.validators = ModelValidators(
            gemini_model=args.gemini_model,
            gpt_model=args.gpt_model,
            cache_path=(self.cwd / args.model_cache).resolve(),
        )

    def _load_manual_review_resolved(self) -> Dict[str, Dict[str, str]]:
        if not self.manual_review_resolved_path.exists():
            return {}

        resolved: Dict[str, Dict[str, str]] = {}
        with self.manual_review_resolved_path.open("r", encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                key = row.get("review_key")
                if key:
                    resolved[key] = row
        return resolved

    def _init_supabase_client(self):
        try:
            return get_supabase_client()
        except SupabaseConfigError as exc:
            raise SystemExit(f"Supabase configuration error: {exc}") from exc

    def _load_existing_questions(self) -> List[ExistingQuestion]:
        rows = fetch_questions(
            self.supabase_client,
            columns=[
                "id",
                "question_text",
                "category",
                "exam_type",
                "test_type",
                "difficulty",
            ],
        )

        existing: List[ExistingQuestion] = []
        for row in rows:
            text = row.get("question_text") or ""
            normalized = normalize_text(text)
            existing.append(
                ExistingQuestion(
                    id=str(row.get("id")),
                    text=text,
                    normalized=normalized,
                    signature=token_signature(text),
                )
            )
        return existing

    def run(self) -> None:
        if self.args.use_ready_cache:
            self._load_ready_cache()
        else:
            print("Loading generated questions…")
            generated = self._load_generated_questions()
            print(f"Loaded {len(generated)} generated entries.")
            for idx, entry in enumerate(generated, start=1):
                print(f"[{idx}/{len(generated)}] Validating {entry.question_id}…")
                self._process_generated(entry)

        if self.manual_review_entries:
            MANUAL_REVIEW_DIR.mkdir(parents=True, exist_ok=True)
            self._write_json(self.manual_review_candidates_path, self.manual_review_entries)

        if self.conflicts:
            self.conflicts_path.parent.mkdir(parents=True, exist_ok=True)
            self._write_json(self.conflicts_path, self.conflicts)

        if self.accepted_questions and not self.args.use_ready_cache:
            self.ready_output_path.parent.mkdir(parents=True, exist_ok=True)
            self._write_json(self.ready_output_path, self.accepted_questions)
            self._write_json(self.ready_source_ids_path, self.accepted_source_ids)

        if self.args.insert and self.accepted_questions:
            self._insert_questions()

        if self.potential_errors:
            errors_path = self.cwd / POTENTIAL_ERRORS_PATH
            errors_path.parent.mkdir(parents=True, exist_ok=True)
            self._write_json(errors_path, self.potential_errors)

        self.validators.flush_cache()
        self._print_summary()

    def _insert_questions(self) -> None:
        if QuestionInserter is None:
            raise SystemExit("QuestionInserter unavailable – ensure insert_questions_to_db.py is importable.")
        inserter = QuestionInserter()
        limit = self.args.limit or len(self.accepted_questions)
        paired = list(zip(self.accepted_questions[:limit], self.accepted_source_ids[:limit]))
        for idx, (payload, source_id) in enumerate(paired, start=1):
            if self.args.dry_run:
                print(f"[dry-run] Would insert question {idx}/{limit}: {payload['question_text'][:60]}...")
                continue
            success = inserter.insert_question(payload)
            if success:
                self.stats["inserted"] += 1
                if source_id and self._looks_like_uuid(source_id):
                    self.replaced_source_ids.append(source_id)
        inserter.verify_insertion()
        if self.args.delete_originals:
            target_ids = (
                [sid for _, sid in paired]
                if self.args.dry_run
                else self.replaced_source_ids
            )
            self._delete_original_questions(target_ids, dry_run=self.args.dry_run)
        if not self.args.dry_run and self.replaced_source_ids:
            self._record_ingested_ids(self.replaced_source_ids)

    def _write_json(self, path: Path, payload: Any) -> None:
        with path.open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)
            handle.write("\n")

    def _load_ready_cache(self) -> None:
        if not self.ready_output_path.exists():
            raise SystemExit(f"Ready-for-insert payload not found: {self.ready_output_path}")
        if not self.ready_source_ids_path.exists():
            self._rebuild_ready_source_ids()

        with self.ready_output_path.open("r", encoding="utf-8") as handle:
            cached_questions = json.load(handle)
        with self.ready_source_ids_path.open("r", encoding="utf-8") as handle:
            cached_source_ids = json.load(handle)

        if not isinstance(cached_questions, list) or not isinstance(cached_source_ids, list):
            raise SystemExit("Ready cache malformed: expected lists for questions and source IDs.")
        if len(cached_questions) != len(cached_source_ids):
            raise SystemExit(
                f"Ready cache mismatch: {len(cached_questions)} questions vs {len(cached_source_ids)} source IDs."
            )

        filtered_questions: List[Dict[str, Any]] = []
        filtered_source_ids: List[str] = []
        for question, source_id in zip(cached_questions, cached_source_ids):
            source_id_str = str(source_id)
            if source_id_str in self.ingested_ids:
                continue
            filtered_questions.append(question)
            filtered_source_ids.append(source_id_str)

        self.accepted_questions = filtered_questions
        self.accepted_source_ids = filtered_source_ids
        self.stats["loaded"] = len(self.accepted_questions)
        self.stats["accepted"] = len(self.accepted_questions)
        print(f"Loaded {len(self.accepted_questions)} cached ready-to-insert questions.")

    def _rebuild_ready_source_ids(self) -> None:
        """Recreate ready_for_insert_source_ids.json by aligning ready payloads to replacements_raw."""
        if not self.input_path.exists():
            raise SystemExit(
                f"Cannot rebuild source IDs: input file not found at {self.input_path}"
            )
        ready_payload = json.loads(self.ready_output_path.read_text(encoding="utf-8"))
        raw_payload = json.loads(self.input_path.read_text(encoding="utf-8"))
        if not isinstance(ready_payload, list):
            raise SystemExit("Ready payload malformed; expected a list.")
        mapping: List[str] = []
        ready_idx = 0

        for item in raw_payload:
            if ready_idx >= len(ready_payload):
                break
            question_id = str(item.get("question_id") or item.get("id") or "")
            generated_block = (
                item.get("generated")
                or (item.get("generated_entry") or {}).get("generated")
                or {}
            )
            ready_block = ready_payload[ready_idx]
            if self._same_question(ready_block, generated_block):
                mapping.append(question_id)
                ready_idx += 1

        if ready_idx != len(ready_payload):
            raise SystemExit(
                "Unable to rebuild ready_for_insert_source_ids.json "
                f"(matched {ready_idx}/{len(ready_payload)} entries)."
            )

        self._write_json(self.ready_source_ids_path, mapping)
        print(
            f"Rebuilt {len(mapping)} ready-for-insert source IDs at {self.ready_source_ids_path}"
        )

    @staticmethod
    def _same_question(ready_block: Dict[str, Any], generated_block: Dict[str, Any]) -> bool:
        """Return True when the ready and generated question payloads describe the same question."""
        if not ready_block or not generated_block:
            return False
        if ready_block.get("question_text") != generated_block.get("question_text"):
            return False
        ready_answers = [
            ready_block.get("answer1"),
            ready_block.get("answer2"),
            ready_block.get("answer3"),
            ready_block.get("answer4"),
        ]
        gen_answers = [
            generated_block.get("answers", {}).get("A")
            if isinstance(generated_block.get("answers"), dict)
            else generated_block.get("answer1"),
            generated_block.get("answers", {}).get("B")
            if isinstance(generated_block.get("answers"), dict)
            else generated_block.get("answer2"),
            generated_block.get("answers", {}).get("C")
            if isinstance(generated_block.get("answers"), dict)
            else generated_block.get("answer3"),
            generated_block.get("answers", {}).get("D")
            if isinstance(generated_block.get("answers"), dict)
            else generated_block.get("answer4"),
        ]
        return all(
            (ready_answers[idx] or "").strip() == (gen_answers[idx] or "").strip()
            for idx in range(4)
        )

    def _load_ingested_ids(self) -> set[str]:
        if not self.ingested_ids_path.exists():
            return set()
        try:
            with self.ingested_ids_path.open("r", encoding="utf-8") as handle:
                data = json.load(handle)
            if isinstance(data, list):
                return {str(item) for item in data if item}
        except json.JSONDecodeError:
            pass
        return set()

    def _record_ingested_ids(self, new_ids: List[str]) -> None:
        if not new_ids:
            return
        updated = set(self.ingested_ids)
        updated.update(str(item) for item in new_ids if item)
        self.ingested_ids = updated
        self.ingested_ids_path.parent.mkdir(parents=True, exist_ok=True)
        with self.ingested_ids_path.open("w", encoding="utf-8") as handle:
            json.dump(sorted(updated), handle, ensure_ascii=False, indent=2)

    def _load_generated_questions(self) -> List[GeneratedQuestion]:
        if not self.input_path.exists():
            raise SystemExit(f"Input file not found: {self.input_path}")

        with self.input_path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)

        generated: List[GeneratedQuestion] = []
        for item in data:
            question_id = item.get("question_id") or item.get("id") or "generated"
            if question_id in self.ingested_ids:
                continue
            question_data = (
                item.get("question_data")
                or item.get("generated")
                or (item.get("generated_entry") or {}).get("generated")
                or {}
            )
            question_text = question_data.get("question_text") or item.get("question_text")
            if not question_text:
                continue
            normalized = normalize_text(question_text)
            generated.append(
                GeneratedQuestion(
                    raw=item,
                    normalized_text=normalized,
                    signature=token_signature(question_text),
                    question_id=str(question_id),
                )
            )
        self.stats["loaded"] = len(generated)
        return generated

    def _llm_validate_question(self, payload: Dict[str, Any], generated: GeneratedQuestion) -> bool:
        issues, details = run_llm_checks(payload, self.validators)
        if not issues:
            return True
        for issue in issues:
            reason = f"llm_{issue['task']}_{issue['status']}"
            self._add_potential_error(
                reason,
                {
                    "question_id": generated.question_id,
                    "question_text": payload.get("question_text"),
                    "exam_type": payload.get("exam_type"),
                    "category": payload.get("category"),
                },
                extras={
                    "llm_issue": issue,
                    "llm_results": details,
                },
            )
        return False

    def _add_potential_error(
        self,
        reason: str,
        generated_payload: Dict[str, Any],
        extras: Optional[Dict[str, Any]] = None,
    ) -> None:
        entry: Dict[str, Any] = {
            "reason": reason,
            "question_id": generated_payload.get("question_id"),
            "payload": generated_payload,
        }
        if extras:
            entry.update(extras)
        self.potential_errors.append(entry)

    def _process_generated(self, generated: GeneratedQuestion) -> None:
        limit = self.args.limit
        if limit and len(self.accepted_questions) >= limit:
            return

        question_payload = self._prepare_question_payload(generated.raw)
        if not question_payload:
            return
        question_payload.setdefault("question_id", generated.question_id)

        duplicate_status = self._check_duplicates(generated, question_payload)
        if duplicate_status == "conflict":
            return
        if duplicate_status == "manual_review":
            return

        if not self._validate_language(question_payload):
            self.stats["skipped_language"] += 1
            return

        if not self._validate_answers(question_payload):
            return

        if not self._llm_validate_question(question_payload, generated):
            return

        self.accepted_questions.append(question_payload)
        self.accepted_source_ids.append(generated.question_id)
        self.stats["accepted"] += 1

    def _prepare_question_payload(self, raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        question_data = (
            raw.get("question_data")
            or raw.get("generated")
            or (raw.get("generated_entry") or {}).get("generated")
            or {}
        )
        question_text = question_data.get("question_text") or raw.get("question_text")
        if not question_text:
            return None

        answers_dict = question_data.get("answers") if isinstance(question_data.get("answers"), dict) else None
        if answers_dict:
            answer1 = answers_dict.get("A")
            answer2 = answers_dict.get("B")
            answer3 = answers_dict.get("C")
            answer4 = answers_dict.get("D")
        else:
            answer1 = question_data.get("answer1") or raw.get("answer1")
            answer2 = question_data.get("answer2") or raw.get("answer2")
            answer3 = question_data.get("answer3") or raw.get("answer3")
            answer4 = question_data.get("answer4") or raw.get("answer4")

        final_answer = (
            question_data.get("correct_letter")
            or question_data.get("correct")
            or raw.get("final_answer")
        )
        final_explanation = question_data.get("explanation") or raw.get("final_explanation")

        payload = {
            "question_text": question_text.strip(),
            "answer1": (answer1 or "").strip(),
            "answer2": (answer2 or "").strip(),
            "answer3": (answer3 or "").strip(),
            "answer4": (answer4 or None) and (answer4 or None).strip() or None,
            "correct": (final_answer or "").strip().upper(),
            "explanation": (final_explanation or "").strip(),
            "category": question_data.get("category") or raw.get("category"),
            "difficulty": "HARD",  # enforce HARD difficulty
            "exam_type": question_data.get("exam_type") or raw.get("exam_type"),
            "test_type": question_data.get("test_type") or raw.get("test_type"),
            "sub_category": question_data.get("sub_category") or raw.get("sub_category"),
        }

        # Skip if any core fields missing
        required = [
            "question_text",
            "answer1",
            "answer2",
            "answer3",
            "correct",
            "explanation",
            "category",
            "exam_type",
            "test_type",
        ]
        for field in required:
            if not payload.get(field):
                self.conflicts.append(
                    {
                        "reason": f"Missing required field {field}",
                        "generated": raw,
                    }
                )
                self.stats["conflicts"] += 1
                self._add_potential_error(
                    f"missing_field_{field}",
                    {
                        "question_id": raw.get("question_id") or raw.get("id"),
                        "raw": raw,
                    },
                )
                return None

        # Ensure explanation sentences are well formatted
        payload["explanation"] = self._normalize_explanation(payload["explanation"])

        return payload

    def _normalize_explanation(self, explanation: str) -> str:
        cleaned = " ".join(part.strip() for part in explanation.split())
        if cleaned and cleaned[-1] not in ".!?":
            cleaned += "."
        return cleaned

    def _check_duplicates(
        self,
        generated: GeneratedQuestion,
        payload: Dict[str, Any],
    ) -> str:
        # Exact token signature match with existing question – conflict
        for existing in self.existing_questions:
            if generated.signature == existing.signature:
                self._record_conflict("Exact duplicate signature", payload, existing, generated)
                return "conflict"

        # Evaluate similarity against existing questions
        best_existing = self._best_match(generated.normalized_text, self.existing_questions)
        if best_existing and best_existing[0] >= SIMILARITY_DUPLICATE_THRESHOLD:
            self._record_conflict(
                f"Similarity {best_existing[0]:.3f} with existing question",
                payload,
                best_existing[1],
                generated,
            )
            return "conflict"

        if best_existing and SIMILARITY_MANUAL_REVIEW_LOW <= best_existing[0] < SIMILARITY_MANUAL_REVIEW_HIGH:
            review_key = f"{generated.question_id}|{best_existing[1].id}"
            if review_key not in self.manual_review_resolved:
                self.manual_review_entries.append(
                    {
                        "review_key": review_key,
                        "issue_type": "near_duplicate",
                        "similarity": round(best_existing[0], 3),
                        "generated_question": {
                            "question_id": generated.question_id,
                            "question_text": payload["question_text"],
                            "exam_type": payload["exam_type"],
                            "category": payload["category"],
                            "test_type": payload["test_type"],
                        },
                        "existing_question": {
                            "question_id": best_existing[1].id,
                            "question_text": best_existing[1].text,
                        },
                    }
                )
                self.stats["manual_review"] += 1
                self._add_potential_error(
                    "manual_review_duplicate",
                    {
                        "question_id": generated.question_id,
                        "question_text": payload.get("question_text"),
                        "exam_type": payload.get("exam_type"),
                        "category": payload.get("category"),
                    },
                    extras={
                        "existing_question": {
                            "question_id": best_existing[1].id,
                            "question_text": best_existing[1].text,
                        },
                        "similarity": best_existing[0],
                    },
                )
                return "manual_review"

        return "ok"

    def _best_match(self, normalized_text: str, candidates: Iterable[ExistingQuestion]) -> Optional[Tuple[float, ExistingQuestion]]:
        best_ratio = 0.0
        best_candidate: Optional[ExistingQuestion] = None
        for candidate in candidates:
            ratio = SequenceMatcher(None, normalized_text, candidate.normalized).ratio()
            if ratio > best_ratio:
                best_ratio = ratio
                best_candidate = candidate
        if not best_candidate:
            return None
        return best_ratio, best_candidate

    def _record_conflict(
        self,
        reason: str,
        payload: Dict[str, Any],
        existing: ExistingQuestion,
        generated: GeneratedQuestion,
    ) -> None:
        self.conflicts.append(
            {
                "reason": reason,
                "generated_question": {
                    "question_id": generated.question_id,
                    "question_text": payload["question_text"],
                    "exam_type": payload["exam_type"],
                    "category": payload["category"],
                    "test_type": payload["test_type"],
                },
                "existing_question": {
                    "question_id": existing.id,
                    "question_text": existing.text,
                },
            }
        )
        self.stats["conflicts"] += 1
        self._add_potential_error(
            reason,
            {
                "question_id": generated.question_id,
                "question_text": payload.get("question_text"),
                "exam_type": payload.get("exam_type"),
                "category": payload.get("category"),
                "test_type": payload.get("test_type"),
            },
            extras={
                "existing_question": {
                    "question_id": existing.id,
                    "question_text": existing.text,
                }
            },
        )

    def _validate_language(self, payload: Dict[str, Any]) -> bool:
        explanation = payload.get("explanation") or ""
        try:
            language = detect(explanation)
        except LangDetectException:
            language = ""
        if language != "fr":
            self.conflicts.append(
                {
                    "reason": "Explanation not detected as French",
                    "generated_question": payload,
                }
            )
            self._add_potential_error(
                "explanation_not_french",
                {
                    "question_id": payload.get("question_id"),
                    "question_text": payload.get("question_text"),
                    "exam_type": payload.get("exam_type"),
                    "category": payload.get("category"),
                },
            )
            return False
        if explanation.count(".") + explanation.count("!") + explanation.count("?") < 1:
            self.conflicts.append(
                {
                    "reason": "Explanation missing sentence termination",
                    "generated_question": payload,
                }
            )
            self._add_potential_error(
                "explanation_format",
                {
                    "question_id": payload.get("question_id"),
                    "question_text": payload.get("question_text"),
                    "exam_type": payload.get("exam_type"),
                    "category": payload.get("category"),
                },
            )
            return False
        return True

    def _delete_original_questions(self, source_ids: List[str], dry_run: bool = False) -> None:
        valid_ids = [sid for sid in source_ids if self._looks_like_uuid(sid)]
        if not valid_ids:
            return
        prefix = "[dry-run] " if dry_run else ""
        print(f"{prefix}Deleting {len(valid_ids)} original question(s) to prevent duplicates.")
        for chunk_start in range(0, len(valid_ids), 50):
            chunk = valid_ids[chunk_start : chunk_start + 50]
            if dry_run:
                print(f"[dry-run] Would delete IDs: {', '.join(chunk)}")
                continue
            try:
                self.supabase_client.table("questions").delete().in_("id", chunk).execute()
            except Exception as exc:
                print(f"⚠️  Failed to delete originals {chunk}: {exc}")

    @staticmethod
    def _looks_like_uuid(value: str) -> bool:
        return bool(re.fullmatch(r"[0-9a-fA-F-]{32,}", value or ""))

    def _validate_answers(self, payload: Dict[str, Any]) -> bool:
        answers = [payload.get("answer1"), payload.get("answer2"), payload.get("answer3"), payload.get("answer4")]
        # Ensure distinct non-empty distractors
        trimmed = [ans.strip() for ans in answers if ans]
        if len(set(trimmed)) != len(trimmed):
            self.conflicts.append(
                {
                    "reason": "Duplicate answer options detected",
                    "generated_question": payload,
                }
            )
            self.stats["skipped_duplicate_choice"] += 1
            self._add_potential_error(
                "duplicate_options",
                {
                    "question_id": payload.get("question_id"),
                    "question_text": payload.get("question_text"),
                    "exam_type": payload.get("exam_type"),
                    "category": payload.get("category"),
                },
            )
            return False

        correct = payload.get("correct")
        if correct not in {"A", "B", "C", "D"}:
            self.conflicts.append(
                {
                    "reason": "Correct answer letter invalid",
                    "generated_question": payload,
                }
            )
            self.stats["skipped_answer"] += 1
            self._add_potential_error(
                "invalid_correct_letter",
                {
                    "question_id": payload.get("question_id"),
                    "question_text": payload.get("question_text"),
                    "exam_type": payload.get("exam_type"),
                    "category": payload.get("category"),
                },
            )
            return False

        idx = ord(correct) - ord("A")
        if idx >= len(answers) or not answers[idx]:
            self.conflicts.append(
                {
                    "reason": "Correct answer letter missing corresponding option",
                    "generated_question": payload,
                }
            )
            self.stats["skipped_answer"] += 1
            self._add_potential_error(
                "missing_correct_option",
                {
                    "question_id": payload.get("question_id"),
                    "question_text": payload.get("question_text"),
                    "exam_type": payload.get("exam_type"),
                    "category": payload.get("category"),
                },
            )
            return False

        return True

    def _print_summary(self) -> None:
        print("\n=== Generated Question Processing Summary ===")
        for key, value in self.stats.items():
            print(f"{key:>20}: {value}")
        if self.manual_review_entries:
            print(f"Manual review queue written to: {self.manual_review_candidates_path}")
        if self.conflicts:
            print(f"Conflicts written to: {self.conflicts_path}")
        if self.accepted_questions:
            print(f"Ready-for-insert payload written to: {self.ready_output_path}")
        if self.potential_errors:
            print(f"Potential issues noted: {len(self.potential_errors)} (see {POTENTIAL_ERRORS_PATH})")
        if self.args.delete_originals:
            count = len(self.replaced_source_ids) if not self.args.dry_run else len(self.accepted_source_ids)
            print(f"Original questions targeted for deletion: {count}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--cwd",
        default=os.getcwd(),
        help="Project root (default: current working directory)",
    )
    parser.add_argument(
        "--input",
        default=DEFAULT_INPUT,
        help=f"Generated questions JSON file (default: {DEFAULT_INPUT})",
    )
    parser.add_argument(
        "--output",
        default=DEFAULT_READY_OUTPUT,
        help=f"Destination for validated questions (default: {DEFAULT_READY_OUTPUT})",
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Process at most this many questions",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run validations without inserting into Supabase",
    )
    parser.add_argument(
        "--insert",
        action="store_true",
        help="Insert validated questions using QuestionInserter",
    )
    parser.add_argument(
        "--delete-originals",
        action="store_true",
        help="After successful insertion, delete source question IDs present in the input (requires Supabase credentials)",
    )
    parser.add_argument(
        "--use-ready-cache",
        action="store_true",
        help="Skip validation and reuse the existing ready_for_insert cache for insertion",
    )
    parser.add_argument(
        "--gemini-model",
        default="gemini-2.0-flash",
        help="Gemini model to use for automated validation (default: gemini-2.0-flash)",
    )
    parser.add_argument(
        "--gpt-model",
        default="gpt-4o-mini",
        help="GPT model to confirm Gemini flags (default: gpt-4o-mini)",
    )
    parser.add_argument(
        "--model-cache",
        default="diagnostics_output/model_validation_cache.json",
        help="Path to the shared model validation cache file",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    processor = GeneratedQuestionProcessor(args)
    processor.run()


if __name__ == "__main__":
    main()
