#!/usr/bin/env python3
"""Orchestrate the question refresh pipeline.

Steps performed:
1. collect_replacement_candidates.py     (always run first)
2. generate_replacements.py              (optionally with --limit/--overwrite)
3. process_generated_questions.py        (dry-run + optional insert/delete)

The script assumes all environment variables (Supabase, OpenAI, Gemini)
are already exported.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path
from typing import List

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def run_step(command: List[str], description: str) -> None:
    print(f"\n=== Running: {description} ===")
    print(f"$ {' '.join(command)}")
    result = subprocess.run(
        command,
        cwd=os.fspath(PROJECT_ROOT),
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"{description} failed with exit code {result.returncode}"
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--skip-collect",
        action="store_true",
        help="Skip collect_replacement_candidates.py",
    )
    parser.add_argument(
        "--skip-generate",
        action="store_true",
        help="Skip generate_replacements.py",
    )
    parser.add_argument(
        "--skip-process",
        action="store_true",
        help="Skip process_generated_questions.py",
    )
    parser.add_argument(
        "--generation-limit",
        type=int,
        help="Limit passed to generate_replacements.py (default: all)",
    )
    parser.add_argument(
        "--generation-overwrite",
        action="store_true",
        help="Pass --overwrite to generate_replacements.py",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only run validation (do not insert/delete questions)",
    )
    parser.add_argument(
        "--process-limit",
        type=int,
        help="Limit passed to process_generated_questions.py",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if not args.skip_collect:
        run_step(
            [sys.executable, "scripts/collect_replacement_candidates.py"],
            "collect_replacement_candidates.py",
        )
    else:
        print(">>> Skipping collect_replacement_candidates.py")

    if not args.skip_generate:
        cmd = [sys.executable, "scripts/generate_replacements.py"]
        if args.generation_limit is not None:
            cmd.extend(["--limit", str(args.generation_limit)])
        if args.generation_overwrite:
            cmd.append("--overwrite")
        run_step(cmd, "generate_replacements.py")
    else:
        print(">>> Skipping generate_replacements.py")

    if not args.skip_process:
        replacements_path = PROJECT_ROOT / "ai_validated_questions/replacements_raw.json"
        if not replacements_path.exists():
            raise FileNotFoundError(
                f"{replacements_path} not found. Run generate_replacements.py first."
            )

        dry_cmd = [
            sys.executable,
            "scripts/process_generated_questions.py",
            "--input",
            "ai_validated_questions/replacements_raw.json",
            "--dry-run",
        ]
        if args.process_limit is not None:
            dry_cmd.extend(["--limit", str(args.process_limit)])
        run_step(dry_cmd, "process_generated_questions.py (dry-run)")

        if not args.dry_run:
            live_cmd = [
                sys.executable,
                "scripts/process_generated_questions.py",
                "--input",
                "ai_validated_questions/replacements_raw.json",
                "--insert",
                "--delete-originals",
            ]
            if args.process_limit is not None:
                live_cmd.extend(["--limit", str(args.process_limit)])
            run_step(live_cmd, "process_generated_questions.py (apply)")
        else:
            print(">>> Dry-run enabled: skipping insert/delete step.")
    else:
        print(">>> Skipping process_generated_questions.py")

    print("\nPipeline complete.")


if __name__ == "__main__":
    main()
