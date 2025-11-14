#!/usr/bin/env python3
"""Wrap flat question payloads in the structure expected by process_generated_questions."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List


def load_questions(path: Path) -> List[Dict[str, object]]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise SystemExit(f"{path} must contain a list.")
    return data


def wrap(entries: List[Dict[str, object]]) -> List[Dict[str, object]]:
    wrapped: List[Dict[str, object]] = []
    for entry in entries:
        question_id = entry.get("id") or entry.get("question_id")
        if not question_id:
            continue
        wrapped.append(
            {
                "id": question_id,
                "question_id": question_id,
                "question_data": entry,
            }
        )
    return wrapped


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="Original enriched JSON.")
    parser.add_argument("--output", required=True, help="Wrapped output JSON.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    entries = load_questions(Path(args.input))
    wrapped = wrap(entries)
    write_json(Path(args.output), wrapped)
    print(f"Wrote {len(wrapped)} wrapped entries to {args.output}")


if __name__ == "__main__":
    main()
