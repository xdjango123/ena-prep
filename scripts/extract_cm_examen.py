#!/usr/bin/env python3
"""
Parse the CM examen DOCX files and emit a normalized JSON payload.

Each document contains three sections (CG, ANG, LOG) with 20 QCM each.
This script walks every .docx file inside new_questions/cm_examen,
extracts the question text plus answer choices, and writes a combined
JSON file that downstream scripts (answer assignment, validation, insert)
can consume.
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

from docx import Document  # type: ignore

SECTION_KEYWORDS = {
    "ANG": ("ANGLAIS", "ENGLISH"),
    "CG": ("CULTURE", "GÉNÉ", "GENERALE"),
    "LOG": ("LOGIQUE", "RAISONNEMENT"),
}

OPTION_PATTERN = re.compile(r"^([A-Da-d])[\.\)]\s*(.+)")
QUESTION_PATTERN = re.compile(r"^(\d+)[\.\-\):]?\s*(.+)")
INLINE_OPTION_MARKER = re.compile(r"([A-Da-d])[\.\)]\s+")
MAX_OPTIONS = 3


@dataclass
class PendingQuestion:
    section: str
    exam_index: int
    local_index: int
    source_file: str
    lines: List[str] = field(default_factory=list)
    options: List[Tuple[str, str]] = field(default_factory=list)

    def append_text(self, text: str) -> None:
        if text:
            self.lines.append(text.strip())

    def append_option(self, label: str, text: str) -> None:
        clean = text.strip()
        if clean:
            self.options.append((label.upper(), clean))

    def append_to_last_option(self, extra: str) -> None:
        if not self.options:
            self.append_text(extra)
            return
        label, text = self.options[-1]
        updated = f"{text} {extra.strip()}".strip()
        self.options[-1] = (label, updated)

    def to_record(self) -> Optional[Dict[str, object]]:
        if not self.lines or len(self.options) < 2:
            return None
        # Preserve option order by label (A-D)
        answers: Dict[str, Optional[str]] = {letter: None for letter in ("A", "B", "C", "D")}
        for idx, (label, text) in enumerate(self.options):
            if label in answers and answers[label] is None:
                answers[label] = text
            else:
                slot = ["A", "B", "C", "D"][idx] if idx < 4 else None
                if slot:
                    answers[slot] = text

        question_text = " ".join(self.lines).strip()
        if not question_text:
            return None

        question_id = f"cm_exam_{self.exam_index:02d}_{self.section}_{self.local_index:02d}"
        base = {
            "id": question_id,
            "question_text": question_text,
            "answer1": answers["A"],
            "answer2": answers["B"],
            "answer3": answers["C"],
            "answer4": answers["D"],
            "correct": None,
            "correct_letter": None,
            "explanation": "",
            "category": self.section,
            "difficulty": "HARD",
            "exam_type": "CM",
            "test_type": "examen_blanc",
            "sub_category": None,
            "ai_generated": True,
            "question_pool": f"CM_{self.section}_examen_blanc",
            "source_file": self.source_file,
            "question_number": self.local_index,
        }
        return base


def iter_lines(doc: Document) -> Iterable[Tuple[str, bool]]:
    for para in doc.paragraphs:
        raw = (para.text or "").replace("\u00a0", " ").strip()
        if not raw:
            continue
        clean = " ".join(raw.splitlines()).strip()
        if not clean:
            continue
        ppr = getattr(para._p, "pPr", None)  # type: ignore[attr-defined]
        num_pr = getattr(ppr, "numPr", None) if ppr is not None else None
        is_numbered = num_pr is not None
        yield clean, is_numbered


SECTION_ALIASES = {
    "CG": {"CULTURE GENERALE", "CULTURE GÉNÉRALE"},
    "ANG": {"ANGLAIS"},
    "LOG": {"LOGIQUE", "RAISONNEMENT"},
}


def detect_section(line: str, current: str) -> Optional[str]:
    stripped = line.strip()
    if not stripped:
        return None
    upper = stripped.upper()
    if upper.startswith("SECTION"):
        for section, tokens in SECTION_KEYWORDS.items():
            if any(token in upper for token in tokens):
                return section
        if "SECTION 1" in upper:
            return "CG"
        if "SECTION 2" in upper:
            return "ANG"
        if "SECTION 3" in upper:
            return "LOG"
        return current
    if stripped.startswith("🇬🇧"):
        return "ANG"
    if stripped.startswith("🧩") or stripped.startswith("🧮"):
        return "LOG"
    for section, aliases in SECTION_ALIASES.items():
        if upper in aliases:
            return section
    return None


def split_question_and_options(text: str) -> Tuple[str, List[Tuple[str, str]]]:
    matches = list(INLINE_OPTION_MARKER.finditer(text))
    if not matches:
        return text.strip(), []

    options: List[Tuple[str, str]] = []
    for idx, match in enumerate(matches):
        start = match.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        chunk = text[start:end].strip()
        if chunk:
            options.append((match.group(1).upper(), chunk.rstrip(" .;:")))

    question_part = text[: matches[0].start()].strip(" -:;")
    return question_part or text.strip(), options


def looks_like_question_intro(text: str) -> bool:
    stripped = text.strip()
    if not stripped:
        return False
    if stripped.upper().startswith("SECTION"):
        return False
    return stripped.endswith("?") or stripped.endswith(":")


def is_option_line(text: str) -> bool:
    return bool(OPTION_PATTERN.match(text.strip()))


def strip_number_prefix(text: str) -> str:
    match = QUESTION_PATTERN.match(text)
    if match:
        return match.group(2).strip()
    return text.strip()


def parse_docx(path: Path, exam_index: int) -> List[Dict[str, object]]:
    doc = Document(path)
    section = "CG"
    counters = {"CG": 0, "ANG": 0, "LOG": 0}
    questions: List[Dict[str, object]] = []
    pending: Optional[PendingQuestion] = None
    question_buffer: List[str] = []

    def finalize_current() -> None:
        nonlocal pending, question_buffer
        if pending:
            record = pending.to_record()
            if record:
                questions.append(record)
        pending = None
        question_buffer = []

    def ensure_pending() -> Optional[PendingQuestion]:
        nonlocal pending, question_buffer
        if pending is not None:
            return pending
        if not question_buffer:
            return None
        counters[section] += 1
        pending_local = PendingQuestion(
            section=section,
            exam_index=exam_index,
            local_index=counters[section],
            source_file=path.name,
        )
        pending = pending_local
        pending.append_text(" ".join(question_buffer).strip())
        question_buffer = []
        return pending

    for raw_line, is_numbered in iter_lines(doc):
        normalized = strip_number_prefix(raw_line)
        if normalized.isdigit():
            continue
        maybe_section = detect_section(normalized, section)
        if maybe_section:
            if maybe_section != section:
                finalize_current()
                section = maybe_section
            else:
                question_buffer = []
                pending = None
            continue

        question_part, inline_options = split_question_and_options(normalized)
        inline_question = inline_options and question_part and question_part != normalized

        if (inline_question or is_numbered) and pending and pending.options:
            finalize_current()

        if inline_question or (is_numbered and not normalized.upper().startswith("SECTION")):
            counters[section] += 1
            pending = PendingQuestion(
                section=section,
                exam_index=exam_index,
                local_index=counters[section],
                source_file=path.name,
            )
            target_text = question_part if inline_question else normalized
            pending.append_text(target_text)
            option_source = inline_options if inline_question else []
            for label, value in option_source:
                pending.append_option(label, value)
            if pending and len(pending.options) >= MAX_OPTIONS:
                finalize_current()
            continue

        if is_option_line(normalized) or (
            not normalized.upper().startswith("SECTION")
            and not normalized.endswith("?")
            and len(inline_options) >= 1
        ):
            current = ensure_pending()
            if current is None:
                continue
            opt_match = OPTION_PATTERN.match(normalized)
            if opt_match:
                current.append_option(opt_match.group(1), opt_match.group(2))
            else:
                _, multi_opts = split_question_and_options(normalized)
                for label, text in multi_opts:
                    current.append_option(label, text)
            if pending and len(pending.options) >= MAX_OPTIONS:
                finalize_current()
            continue

        if looks_like_question_intro(normalized) or not question_buffer:
            if pending and pending.options:
                finalize_current()
            question_buffer.append(normalized)
        else:
            if pending and pending.options:
                pending.append_to_last_option(normalized)
            else:
                if pending:
                    pending.append_text(normalized)
                else:
                    question_buffer.append(normalized)

    finalize_current()
    return questions


def parse_all(input_dir: Path) -> List[Dict[str, object]]:
    files = sorted(input_dir.glob("*.docx"))
    combined: List[Dict[str, object]] = []
    for idx, file_path in enumerate(files, 1):
        extracted = parse_docx(file_path, idx)
        combined.extend(extracted)
        print(f"{file_path.name}: extracted {len(extracted)} questions.")
    return combined


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input-dir",
        default="new_questions/cm_examen",
        help="Folder containing the CM examen DOCX files.",
    )
    parser.add_argument(
        "--output",
        default="new_questions/cm_examen/combined_raw.json",
        help="Destination JSON file for the extracted questions.",
    )
    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    if not input_dir.exists():
        raise SystemExit(f"Input directory not found: {input_dir}")

    combined = parse_all(input_dir)
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as handle:
        json.dump(combined, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print(f"\nWrote {len(combined)} questions to {args.output}")


if __name__ == "__main__":
    main()
