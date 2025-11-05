#!/usr/bin/env python3
"""Generate HARD replacement questions for flagged items."""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from question_audit.logging_utils import info, warn
from scripts.replacement_utils import (
    ReplacementTarget,
    GenerationConfig,
    generate_replacement_for_target,
)

MANIFEST_PATH = "diagnostics_output/replacements_manifest.json"
OUTPUT_PATH = "ai_validated_questions/replacements_raw.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--manifest",
        default=MANIFEST_PATH,
        help=f"Path to manifest JSON (default: {MANIFEST_PATH})",
    )
    parser.add_argument(
        "--output",
        default=OUTPUT_PATH,
        help=f"Where to store generated questions (default: {OUTPUT_PATH})",
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Generate at most this many replacements",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing output instead of appending",
    )
    parser.add_argument(
        "--sleep",
        type=float,
        default=1.0,
        help="Seconds to sleep between API calls (default: 1.0)",
    )
    parser.add_argument(
        "--max-retries",
        type=int,
        default=2,
        help="Maximum retries per question when generation or validation fails (default: 2)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Prepare prompts and validation without calling OpenAI",
    )
    parser.add_argument(
        "--gemini-model",
        default="gemini-2.0-flash",
        help="Gemini model for validation (default: gemini-2.0-flash)",
    )
    parser.add_argument(
        "--french-threshold",
        type=float,
        default=0.6,
        help="Minimum French probability for CG questions (default: 0.60)",
    )
    parser.add_argument(
        "--english-threshold",
        type=float,
        default=0.6,
        help="Minimum English probability for ANG questions (default: 0.60)",
    )
    return parser.parse_args()


def load_manifest(path: Path, limit: Optional[int]) -> List[ReplacementTarget]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    questions = payload.get("questions", [])
    targets: List[ReplacementTarget] = []
    for item in questions[: limit or None]:
        recommended = item.get("recommended_category")
        original_category = item.get("original_category") or item.get("category")
        target_category = original_category
        target = ReplacementTarget(
            question_id=item["question_id"],
            exam_type=item.get("exam_type"),
            category=target_category,
            original_category=original_category,
            test_type=item.get("test_type"),
            sub_category=item.get("sub_category"),
            reasons=item.get("reasons", []),
            recommended_category=recommended,
            notes=item.get("notes", []),
        )
        targets.append(target)
    return targets

# --- functions from replacement_utils handle generation ---


def main() -> None:
    args = parse_args()

    manifest_path = Path(args.manifest)
    if not manifest_path.exists():
        warn(f"Manifest not found: {manifest_path}")
        return

    targets = load_manifest(manifest_path, args.limit)
    if not targets:
        info("No targets found in manifest. Nothing to generate.")
        return

    output_path = Path(args.output)
    outputs: List[Dict[str, object]] = []
    if not args.overwrite and output_path.exists():
        try:
            with output_path.open("r", encoding="utf-8") as handle:
                outputs = json.load(handle)
        except json.JSONDecodeError:
            warn(f"Could not parse existing output file: {output_path}. Starting fresh.")
            outputs = []

    config = GenerationConfig(
        openai_model=os.getenv("OPENAI_MODEL", "gpt-5"),
        gemini_model=args.gemini_model,
        english_threshold=args.english_threshold,
        french_threshold=args.french_threshold,
        max_retries=args.max_retries,
        sleep_seconds=args.sleep,
        dry_run=args.dry_run,
    )

    attempts_log: List[Dict[str, object]] = []
    success_count = 0
    start_time = time.time()

    for idx, target in enumerate(targets, start=1):
        info(f"[{idx}/{len(targets)}] Generating replacement for {target.question_id}")
        result = generate_replacement_for_target(target, config)
        attempts_log.append(
            {
                "question_id": target.question_id,
                "status": result["status"],
                "attempts": result["attempts"],
            }
        )

        if result["status"] == "success" and result["generated_entry"]:
            outputs.append(result["generated_entry"])
            success_count += 1
            info(f"✅ Replacement generated for {target.question_id}")
        elif result["status"] == "dry_run":
            info(f"[dry-run] Prompt prepared for {target.question_id}")
        else:
            warn(
                f"❌ Unable to generate replacement for {target.question_id} after {config.max_retries + 1} attempts"
            )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(outputs, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    attempts_path = Path("diagnostics_output/replacement_attempts.json")
    attempts_path.parent.mkdir(parents=True, exist_ok=True)
    with attempts_path.open("w", encoding="utf-8") as handle:
        json.dump(attempts_log, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    elapsed = time.time() - start_time
    info(
        f"Generation complete. Successful: {success_count}/{len(targets)} | "
        f"Elapsed: {elapsed:.1f}s"
    )


if __name__ == "__main__":
    main()
