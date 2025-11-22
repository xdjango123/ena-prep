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
import json
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


def prompt_user(message: str, *, default: bool = False, auto_confirm: bool = False) -> bool:
    if auto_confirm:
        return True
    prompt = "Y/n" if default else "y/N"
    try:
        reply = input(f"{message} [{prompt}]: ").strip().lower()
    except EOFError:
        return default
    if not reply:
        return default
    return reply in {"y", "yes", "o", "oui"}


def print_audit_summary(summary_path: Path) -> None:
    if not summary_path.exists():
        print(f">>> Audit summary not found at {summary_path}")
        return
    try:
        with summary_path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    except json.JSONDecodeError as exc:
        print(f">>> Unable to parse audit summary ({exc})")
        return
    print("\n=== Audit Summary ===")
    print(f"Processed: {data.get('processed', 0)}")
    print(f"Flagged:   {data.get('flagged', 0)}")
    generation = data.get("generation", {}) or {}
    print(
        f"Generation – success:{generation.get('success', 0)} "
        f"failed:{generation.get('failed', 0)} skipped:{generation.get('skipped', 0)}"
    )
    ai_review = data.get("ai_review", {}) or {}
    print(
        f"AI review – confirmed:{ai_review.get('confirmed', 0)} "
        f"cleared:{ai_review.get('cleared', 0)} errors:{ai_review.get('error', 0)}"
    )
    if data.get("issue_counts"):
        print("Top issues:")
        for key, value in sorted(data["issue_counts"].items(), key=lambda kv: kv[1], reverse=True)[:8]:
            print(f"  - {key}: {value}")
    print("=====================\n")


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
    parser.add_argument(
        "--yes-generation",
        action="store_true",
        help="Automatically continue to processing after the audit summary.",
    )
    parser.add_argument(
        "--yes-insert",
        action="store_true",
        help="Automatically continue with insertion/deletion after validation.",
    )
    parser.add_argument(
        "--yes-all",
        action="store_true",
        help="Bypass all interactive prompts.",
    )
    parser.add_argument(
        "--categories",
        nargs="+",
        help="Filter audit by specific categories (e.g. ANG LOG CG).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    auto_generation = args.yes_all or args.yes_generation
    auto_insert = args.yes_all or args.yes_insert

    def build_audit_command(*, allow_generation: bool) -> List[str]:
        cmd = [sys.executable, "scripts/collect_replacement_candidates.py"]
        if args.audit_limit is not None:
            cmd.extend(["--limit", str(args.audit_limit)])
        if args.audit_input:
            cmd.extend(["--input", args.audit_input])
        if args.audit_resume:
            cmd.append("--resume")
        if args.audit_flagged_only:
            cmd.append("--flagged-only")
        if args.audit_gemini_model:
            cmd.extend(["--audit-gemini-model", args.audit_gemini_model])
        if args.audit_max_retries is not None:
            cmd.extend(["--max-retries", str(args.audit_max_retries)])
        if args.audit_sleep is not None:
            cmd.extend(["--sleep", str(args.audit_sleep)])
        if args.audit_english_threshold is not None:
            cmd.extend(
                ["--english-threshold", str(args.audit_english_threshold)]
            )
        if args.audit_french_threshold is not None:
            cmd.extend(
                ["--french-threshold", str(args.audit_french_threshold)]
            )
        if not allow_generation or args.audit_dry_run_generation:
            cmd.append("--dry-run-generation")
        if args.categories:
            cmd.append("--categories")
            cmd.extend(args.categories)
        return cmd

    if not args.skip_audit:
        # Check if a valid manifest already exists to allow resuming
        manifest_path = PROJECT_ROOT / "diagnostics_output/replacements_manifest.json"
        replacements_path = PROJECT_ROOT / "ai_validated_questions/replacements_raw.json"
        resume_mode = False
        skip_generation = False
        
        # 1. Check if we already have generated replacements (generation done)
        if replacements_path.exists() and not args.yes_all:
            try:
                with replacements_path.open("r", encoding="utf-8") as f:
                    raw_data = json.load(f)
                    raw_count = len(raw_data) if isinstance(raw_data, list) else 0
                    if raw_count > 0:
                        print(f"\n>>> Found existing generated replacements ({raw_count} questions).")
                        if prompt_user("Skip generation and proceed to validation/insertion?", default=True):
                             resume_mode = True
                             skip_generation = True
            except Exception:
                pass

        # 2. If not skipping generation, check if we have an audit manifest (audit done)
        if not skip_generation and manifest_path.exists() and not args.yes_all:
            try:
                with manifest_path.open("r", encoding="utf-8") as f:
                    mdata = json.load(f)
                    count = mdata.get('total_questions', 0)
                    if count > 0:
                        print(f"\n>>> Found existing audit manifest with {count} flagged questions.")
                        if prompt_user("Resume generation from this manifest (skip re-audit)?", default=True):
                             resume_mode = True
            except Exception:
                pass # If read fails, just proceed with standard flow

        if not resume_mode:
            dry_cmd = build_audit_command(allow_generation=False)
            run_step(dry_cmd, "collect_replacement_candidates.py (audit only)")
        
        # If audit only (dry-run-generation), the output is replacements_manifest.json
        # If generation enabled, the output updates realtime_summary.json
        
        # Try printing manifest stats first if available
        if manifest_path.exists() and not skip_generation:
             if not resume_mode: # Only print if we didn't just see it above
                print(f">>> Found audit manifest at {manifest_path}")
                try:
                    with manifest_path.open("r", encoding="utf-8") as f:
                        mdata = json.load(f)
                        print(f"Total flagged questions: {mdata.get('total_questions', 0)}")
                        if mdata.get('summary_by_pool'):
                            print("Summary by pool:")
                            for k, v in mdata['summary_by_pool'].items():
                                print(f"  - {k}: {v}")
                except Exception as e:
                    print(f">>> Error reading manifest: {e}")
        
        if not skip_generation:
            proceed_generation = prompt_user(
                "Generate replacements for flagged questions?",
                default=False,
                auto_confirm=auto_generation,
            )
            if not proceed_generation:
                print(">>> Stopping after audit.")
                return

            # Use generate_replacements.py for the actual generation step
            gen_cmd = [sys.executable, "scripts/generate_replacements.py"]
            if args.audit_limit:
                gen_cmd.extend(["--limit", str(args.audit_limit)])
            if args.audit_gemini_model:
                 gen_cmd.extend(["--gemini-model", args.audit_gemini_model])
            if args.audit_max_retries:
                 gen_cmd.extend(["--max-retries", str(args.audit_max_retries)])
            if args.audit_sleep:
                 gen_cmd.extend(["--sleep", str(args.audit_sleep)])
            if args.audit_english_threshold:
                 gen_cmd.extend(["--english-threshold", str(args.audit_english_threshold)])
            if args.audit_french_threshold:
                 gen_cmd.extend(["--french-threshold", str(args.audit_french_threshold)])
            
            run_step(gen_cmd, "generate_replacements.py (generation)")

            summary_path = PROJECT_ROOT / "diagnostics_output/realtime_summary.json"
            print_audit_summary(summary_path)

        if not args.skip_process:
            if not prompt_user(
                "Proceed to validation of generated questions?",
                default=False,
                auto_confirm=auto_generation,
            ):
                print(">>> Aborting before validation step.")
                return
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
        
        # Check if validation cache already exists
        ready_path = PROJECT_ROOT / "ai_validated_questions/ready_for_insert.json"
        skip_validation = False
        if ready_path.exists() and not args.yes_all:
             if prompt_user("Found ready-to-insert cache. Skip validation (dry-run)?", default=True):
                 skip_validation = True

        if not skip_validation:
            run_step(dry_cmd, "process_generated_questions.py (dry-run)")
        else:
            print(">>> Skipping validation (dry-run) as requested.")

        if not args.dry_run:
            # If dry-run produced a ready_for_insert.json, use it for the apply step
            # to avoid re-validating everything.
            ready_path = PROJECT_ROOT / "ai_validated_questions/ready_for_insert.json"
            input_arg = "ai_validated_questions/replacements_raw.json"
            extra_args = []
            
            if ready_path.exists():
                print(f">>> Using validated cache: {ready_path}")
                input_arg = "ai_validated_questions/ready_for_insert.json"
                extra_args = ["--use-ready-cache"]

            live_cmd = [
                sys.executable,
                "scripts/process_generated_questions.py",
                "--input",
                input_arg,
                "--insert",
                "--delete-originals",
            ]
            live_cmd.extend(extra_args)
            
            if args.process_limit is not None:
                live_cmd.extend(["--limit", str(args.process_limit)])
            
            if not prompt_user(
                "Ready to insert validated questions and delete originals?",
                default=False,
                auto_confirm=auto_insert,
            ):
                print(">>> Insertion skipped.")
                return
            run_step(live_cmd, "process_generated_questions.py (apply)")
        else:
            print(">>> Dry-run enabled: skipping insert/delete step.")
    else:
        print(">>> Skipping process_generated_questions.py")

    print("\nPipeline complete.")


if __name__ == "__main__":
    main()
