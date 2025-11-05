#!/usr/bin/env python3
"""Orchestrate the streaming question refresh pipeline.

Steps performed:
1. collect_replacement_candidates.py (modular audit + inline generation)
2. process_generated_questions.py    (dry-run + optional insert/delete)

All required environment variables (Supabase, OpenAI, Gemini) must already
be exported before running this script.
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
        "--skip-audit",
        action="store_true",
        help="Skip collect_replacement_candidates.py",
    )
    parser.add_argument(
        "--skip-process",
        action="store_true",
        help="Skip process_generated_questions.py",
    )
    parser.add_argument(
        "--audit-limit",
        type=int,
        help="Forwarded to collect_replacement_candidates.py as --limit",
    )
    parser.add_argument(
        "--audit-input",
        help="Forwarded to collect_replacement_candidates.py as --input",
    )
    parser.add_argument(
        "--audit-flagged-only",
        action="store_true",
        help="Process only IDs from the audit input (default: scan full catalogue).",
    )
    parser.add_argument(
        "--audit-gemini-model",
        help="Override the Gemini model used for rule confirmation.",
    )
    parser.add_argument(
        "--audit-resume",
        action="store_true",
        help="Forwarded to collect_replacement_candidates.py as --resume",
    )
    parser.add_argument(
        "--audit-dry-run-generation",
        action="store_true",
        help="Forwarded to collect_replacement_candidates.py as --dry-run-generation",
    )
    parser.add_argument(
        "--audit-max-retries",
        type=int,
        help="Forwarded to collect_replacement_candidates.py as --max-retries",
    )
    parser.add_argument(
        "--audit-sleep",
        type=float,
        help="Forwarded to collect_replacement_candidates.py as --sleep",
    )
    parser.add_argument(
        "--audit-english-threshold",
        type=float,
        help="Forwarded to collect_replacement_candidates.py as --english-threshold",
    )
    parser.add_argument(
        "--audit-french-threshold",
        type=float,
        help="Forwarded to collect_replacement_candidates.py as --french-threshold",
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

    if not args.skip_audit:
        audit_cmd = [sys.executable, "scripts/collect_replacement_candidates.py"]
        if args.audit_limit is not None:
            audit_cmd.extend(["--limit", str(args.audit_limit)])
        if args.audit_input:
            audit_cmd.extend(["--input", args.audit_input])
        if args.audit_resume:
            audit_cmd.append("--resume")
        if args.audit_dry_run_generation:
            audit_cmd.append("--dry-run-generation")
        if args.audit_flagged_only:
            audit_cmd.append("--flagged-only")
        if args.audit_gemini_model:
            audit_cmd.extend(["--audit-gemini-model", args.audit_gemini_model])
        if args.audit_max_retries is not None:
            audit_cmd.extend(["--max-retries", str(args.audit_max_retries)])
        if args.audit_sleep is not None:
            audit_cmd.extend(["--sleep", str(args.audit_sleep)])
        if args.audit_english_threshold is not None:
            audit_cmd.extend(
                ["--english-threshold", str(args.audit_english_threshold)]
            )
        if args.audit_french_threshold is not None:
            audit_cmd.extend(
                ["--french-threshold", str(args.audit_french_threshold)]
            )
        run_step(
            audit_cmd,
            "collect_replacement_candidates.py (audit + generation)",
        )
    else:
        print(">>> Skipping collect_replacement_candidates.py")

    if not args.skip_process:
        replacements_path = PROJECT_ROOT / "ai_validated_questions/replacements_raw.json"
        if not replacements_path.exists():
            print(
                ">>> No replacements found. Either no questions were flagged or generation was in dry-run mode."
            )
            print(">>> Skipping process_generated_questions.py")
            print("\nPipeline complete.")
            return

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
