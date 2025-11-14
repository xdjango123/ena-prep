#!/usr/bin/env python3
"""
Normalize question payloads so that `correct` stores letters (A-D) instead of
`answer1`/`answer2` style tokens. Adds a `correct_letter` mirror as well.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Iterable, List


MAPPING = {
    "answer1": "A",
    "answer2": "B",
    "answer3": "C",
    "answer4": "D",
    "a": "A",
    "b": "B",
    "c": "C",
    "d": "D",
}


def load_questions(path: Path) -> List[dict]:
    try:
        with path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
        if not isinstance(payload, list):
            raise ValueError("Expected a list of questions")
        return payload
    except Exception as exc:
        raise RuntimeError(f"Failed to load {path}: {exc}") from exc


def normalize_file(path: Path, dry_run: bool) -> int:
    questions = load_questions(path)
    updated = 0
    for entry in questions:
        raw = str(entry.get("correct") or "").strip().lower()
        letter = MAPPING.get(raw)
        if not letter:
            continue
        if entry.get("correct") == letter and entry.get("correct_letter") == letter:
            continue
        entry["correct"] = letter
        entry["correct_letter"] = letter
        updated += 1

    if updated and not dry_run:
        with path.open("w", encoding="utf-8") as handle:
            json.dump(questions, handle, ensure_ascii=False, indent=4)
            handle.write("\n")
    return updated


def iter_files(targets: Iterable[str]) -> Iterable[Path]:
    for target in targets:
        folder = Path(target)
        if folder.is_dir():
            yield from sorted(folder.glob("*.JSON"))
        elif folder.is_file():
            yield folder


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "paths",
        nargs="+",
        help="Files or folders (globbed) containing question batches",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report changes without rewriting files",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    files = list(iter_files(args.paths))
    if not files:
        raise SystemExit("No JSON files found.")
    total = 0
    for file_path in files:
        updated = normalize_file(file_path, args.dry_run)
        print(f"{file_path}: normalized {updated} entries")
        total += updated
    print(f"\nTotal entries normalized: {total}")


if __name__ == "__main__":
    main()
