#!/usr/bin/env python3
"""
Assign correct answers and explanations to question batches using OpenAI models.

Workflow:
1. Read the extracted/normalized questions (JSON list).
2. For each entry, call the primary model to return a JSON payload with
   the correct letter and a French explanation.
3. Optionally confirm with a secondary validator model.
4. Write the enriched data set ready for downstream validation.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

try:
    from openai import OpenAI
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "Missing openai package. Install it with `pip install openai`."
    ) from exc


CHOICE_LETTERS = ("A", "B", "C", "D")


@dataclass
class AnswerResult:
    letter: str
    explanation: str
    raw_response: str


class AnswerGenerator:
    def __init__(
        self,
        model: str,
        validator_model: str,
        temperature: float,
        validator_temperature: float,
        max_retries: int,
        retry_sleep: float,
    ):
        self.model_name = model
        self.validator_model = validator_model
        self.temperature = temperature
        self.validator_temperature = validator_temperature
        self.max_retries = max_retries
        self.retry_sleep = retry_sleep

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise SystemExit("OPENAI_API_KEY is not set.")
        self.client = OpenAI(api_key=api_key)

    def _render_question(self, record: Dict[str, object]) -> Tuple[str, Dict[str, str]]:
        options: Dict[str, str] = {}
        for idx, letter in enumerate(CHOICE_LETTERS, start=1):
            value = record.get(f"answer{idx}")
            if value:
                options[letter] = str(value).strip()
        parts = [f"Question: {record['question_text']}"]
        parts.append("Options:")
        for letter, text in options.items():
            parts.append(f"{letter}. {text}")
        payload = "\n".join(parts)
        return payload, options

    def _primary_messages(self, record: Dict[str, object]) -> List[Dict[str, str]]:
        rendered, _ = self._render_question(record)
        instructions = (
            "Tu es un concepteur d'examens pour l'ENA. "
            "Analyse la question, choisis la bonne réponse (lettre A/B/C/D) "
            "et explique brièvement en français la logique du choix. "
            "Réponds en JSON avec exactement les clés `correct_letter` et `explanation`."
        )
        return [
            {"role": "system", "content": instructions},
            {"role": "user", "content": rendered},
        ]

    def _validator_messages(self, record: Dict[str, object], letter: str) -> List[Dict[str, str]]:
        rendered, options = self._render_question(record)
        answer_text = options.get(letter, "")
        prompt = (
            f"{rendered}\n\n"
            f"Réponse proposée: {letter}. {answer_text}\n"
            "Réponds uniquement par OK si la réponse est correcte, sinon KO et explique brièvement."
        )
        return [
            {
                "role": "system",
                "content": "Tu vérifies des QCM. Réponds strictement 'OK' si la réponse est valide, sinon 'KO: <raison>'.",
            },
            {"role": "user", "content": prompt},
        ]

    def _call_chat(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
        response_format: Optional[Dict[str, str]] = None,
    ) -> str:
        completion = self.client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            response_format=response_format,
        )
        return completion.choices[0].message.content or ""

    def _parse_primary_response(self, content: str) -> Optional[AnswerResult]:
        if not content:
            return None
        cleaned = content.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`")
            if cleaned.lower().startswith("json"):
                cleaned = cleaned[4:].strip()
        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError:
            return None
        letter = str(data.get("correct_letter") or data.get("letter") or "").strip().upper()
        explanation = str(data.get("explanation") or data.get("reason") or "").strip()
        if not letter or not explanation:
            return None
        return AnswerResult(letter=letter, explanation=explanation, raw_response=cleaned)

    def _letter_valid_for_record(self, record: Dict[str, object], letter: str) -> bool:
        if letter not in CHOICE_LETTERS:
            return False
        answer_index = CHOICE_LETTERS.index(letter) + 1
        return bool(record.get(f"answer{answer_index}"))

    def _validator_accepts(self, record: Dict[str, object], letter: str) -> bool:
        if not self.validator_model:
            return True
        content = self._call_chat(
            self._validator_messages(record, letter),
            model=self.validator_model,
            temperature=self.validator_temperature,
        ).strip()
        if not content:
            return False
        return content.upper().startswith("OK")

    def enrich_question(self, record: Dict[str, object]) -> Optional[AnswerResult]:
        for attempt in range(1, self.max_retries + 1):
            try:
                response_content = self._call_chat(
                    self._primary_messages(record),
                    model=self.model_name,
                    temperature=self.temperature,
                    response_format={"type": "json_object"},
                )
            except Exception as exc:
                print(f"⚠️  OpenAI error (attempt {attempt}): {exc}")
                time.sleep(self.retry_sleep)
                continue

            parsed = self._parse_primary_response(response_content)
            if not parsed:
                print(f"⚠️  Unable to parse response (attempt {attempt}).")
                time.sleep(self.retry_sleep)
                continue

            letter = parsed.letter
            if not self._letter_valid_for_record(record, letter):
                print(f"⚠️  Invalid letter '{letter}' for question {record.get('id')}.")
                time.sleep(self.retry_sleep)
                continue

            if self._validator_accepts(record, letter):
                return parsed

            print(f"⚠️  Validator rejected answer {letter} (attempt {attempt}).")
            time.sleep(self.retry_sleep)

        return None


def load_questions(path: Path) -> List[Dict[str, object]]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise SystemExit("Input JSON must be a list of question records.")
    return data


def normalize_explanation(text: str) -> str:
    cleaned = " ".join(text.split())
    if cleaned and cleaned[-1] not in ".!?":
        cleaned += "."
    return cleaned


def enrich_dataset(
    questions: List[Dict[str, object]],
    generator: AnswerGenerator,
    start_index: int,
    limit: Optional[int],
) -> Tuple[List[Dict[str, object]], List[Dict[str, object]]]:
    enriched: List[Dict[str, object]] = []
    failures: List[Dict[str, object]] = []

    end_index = len(questions) if limit is None else min(len(questions), start_index + limit)
    for idx in range(start_index, end_index):
        record = questions[idx]
        question_id = record.get("id") or f"question_{idx}"
        print(f"[{idx + 1}/{end_index}] Generating answer for {question_id}...")

        result = generator.enrich_question(record)
        if not result:
            print(f"❌ Failed to enrich question {question_id}")
            failures.append(record)
            continue

        letter = result.letter.upper()
        record["correct"] = letter
        record["correct_letter"] = letter
        record["explanation"] = normalize_explanation(result.explanation)
        record["ai_generated_answer"] = result.raw_response
        enriched.append(record)

    return enriched, failures


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        required=True,
        help="Path to the extracted/cleaned questions JSON.",
    )
    parser.add_argument(
        "--output",
        required=True,
        help="Destination path for the enriched JSON.",
    )
    parser.add_argument(
        "--failures-output",
        default="diagnostics_output/question_enrichment_failures.json",
        help="Where to store questions that could not be enriched.",
    )
    parser.add_argument("--model", default="gpt-4o-mini", help="Primary OpenAI model.")
    parser.add_argument(
        "--validator-model",
        default="gpt-4o-mini",
        help="Validator model (empty string to disable).",
    )
    parser.add_argument("--temperature", type=float, default=0.1)
    parser.add_argument("--validator-temperature", type=float, default=0.0)
    parser.add_argument("--max-retries", type=int, default=3)
    parser.add_argument("--retry-sleep", type=float, default=1.0)
    parser.add_argument("--start-index", type=int, default=0, help="Resume offset.")
    parser.add_argument("--limit", type=int, help="Process at most this many questions.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    questions = load_questions(Path(args.input))

    generator = AnswerGenerator(
        model=args.model,
        validator_model=args.validator_model,
        temperature=args.temperature,
        validator_temperature=args.validator_temperature,
        max_retries=args.max_retries,
        retry_sleep=args.retry_sleep,
    )

    enriched, failures = enrich_dataset(questions, generator, args.start_index, args.limit)

    write_json(Path(args.output), enriched)
    if failures:
        write_json(Path(args.failures_output), failures)
        print(f"⚠️  {len(failures)} questions failed enrichment (see {args.failures_output}).")
    else:
        print("✅ All questions enriched successfully.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nInterrupted by user.")
        sys.exit(1)
