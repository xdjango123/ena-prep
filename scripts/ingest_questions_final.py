#!/usr/bin/env python3
"""
================================================================================
QUESTIONS_FINAL INGESTION SCRIPT
================================================================================

PURPOSE:
--------
This script ingests verified questions from JSON files in the 
`questions_final_output/` directory into the `questions_final` Supabase table.

The questions have already been validated and are ready for insertion.

After successful ingestion, processed files are automatically moved to the
`questions_final_backlog/` directory for archival.

USAGE:
------
    python ingest_questions_final.py                      # Ingest all JSON files
    python ingest_questions_final.py cm_exam_final.json   # Ingest specific file
    python ingest_questions_final.py --stats              # Show database statistics
    python ingest_questions_final.py --dry-run            # Preview without inserting

================================================================================
"""

import os
import sys
import json
import hashlib
import shutil
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from supabase import Client
from question_audit.db import SupabaseConfigError, get_supabase_client

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None
else:
    load_dotenv()


# Configuration
INPUT_DIR = Path(__file__).parent / "questions_final_output"
BACKLOG_DIR = Path(__file__).parent / "questions_final_backlog"
TABLE_NAME = "questions_final"
BATCH_SIZE = 100  # Insert in batches for better performance

# Valid values for enum fields
VALID_SUBJECTS = {"ANG", "CG", "LOG"}
VALID_EXAM_TYPES = {"CM", "CMS", "CS"}
VALID_DIFFICULTIES = {"EASY", "MEDIUM", "HARD"}
VALID_TEST_TYPES = {"free_quiz", "quick_quiz", "practice", "exam_blanc"}

# Test type mapping from source files
TEST_TYPE_MAP = {
    "exam": "exam_blanc",
    "practice": "practice",
    "free_quiz": "free_quiz",
    "quick_quiz": "quick_quiz",
}


class QuestionsIngester:
    """Handles ingestion of validated questions into questions_final table."""

    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.supabase: Optional[Client] = None
        
        # Statistics
        self.stats = {
            "files_processed": 0,
            "questions_read": 0,
            "questions_inserted": 0,
            "questions_skipped": 0,
            "questions_failed": 0,
            "duplicates_skipped": 0,
            "validation_errors": [],
        }
        
        # Track successfully processed files for moving to backlog
        self.processed_files: List[Path] = []
        
        if not dry_run:
            try:
                self.supabase = get_supabase_client()
                print("✅ Connected to Supabase successfully!")
            except SupabaseConfigError as exc:
                print(f"❌ {exc}")
                sys.exit(1)
        else:
            print("🔍 DRY RUN MODE - No data will be inserted")

    def create_unique_hash(self, text: str, options: List[str]) -> str:
        """Create a unique hash for deduplication based on text and options."""
        content = f"{text}|{'|'.join(sorted(options))}"
        return hashlib.sha256(content.encode()).hexdigest()

    def check_duplicate(self, text: str, options: List[str]) -> bool:
        """Check if a question already exists in questions_final using text + options."""
        if self.dry_run or not self.supabase:
            return False
        
        try:
            # Check by text + options (matches the unique constraint idx_questions_final_content_unique)
            options_json = json.dumps(options)
            response = (
                self.supabase.table(TABLE_NAME)
                .select("id")
                .eq("text", text)
                .eq("options", options_json)
                .limit(1)
                .execute()
            )
            return len(response.data) > 0
        except Exception as e:
            print(f"  ⚠️  Error checking duplicate: {e}")
            return False
    
    def get_existing_questions(self) -> set:
        """Fetch all existing text+options combinations from questions_final for fast lookup."""
        if self.dry_run or not self.supabase:
            return set()
        
        print("  📊 Loading existing questions for duplicate check...")
        existing = set()
        
        try:
            # Fetch in batches
            offset = 0
            batch_size = 1000
            
            while True:
                response = (
                    self.supabase.table(TABLE_NAME)
                    .select("text, options")
                    .range(offset, offset + batch_size - 1)
                    .execute()
                )
                
                if not response.data:
                    break
                
                for row in response.data:
                    # Create a hashable key from text + options
                    text = row.get("text", "")
                    options = row.get("options", [])
                    if isinstance(options, list):
                        key = (text, tuple(options))
                    else:
                        key = (text, tuple(options) if options else ())
                    existing.add(key)
                
                offset += len(response.data)
                
                if len(response.data) < batch_size:
                    break
            
            print(f"  📊 Found {len(existing)} existing questions in database")
            return existing
            
        except Exception as e:
            print(f"  ⚠️  Error fetching existing questions: {e}")
            return set()
    
    def is_duplicate(self, text: str, options: List[str], existing_set: set) -> bool:
        """Check if question exists in the pre-loaded set."""
        key = (text, tuple(options))
        return key in existing_set

    def validate_question(self, question: Dict[str, Any], index: int) -> Optional[Dict[str, Any]]:
        """
        Validate and transform a question for insertion.
        Returns the cleaned question dict or None if validation fails.
        """
        errors = []
        
        # Required fields check
        text = question.get("text", "").strip()
        if not text:
            errors.append("Missing or empty 'text' field")
        
        options = question.get("options", [])
        if not isinstance(options, list) or len(options) < 2:
            errors.append(f"Invalid options: must be list with at least 2 items, got {type(options).__name__}")
        
        correct_index = question.get("correct_index")
        if correct_index is None:
            errors.append("Missing 'correct_index' field")
        elif not isinstance(correct_index, int) or correct_index < 0:
            errors.append(f"Invalid correct_index: {correct_index}")
        elif isinstance(options, list) and correct_index >= len(options):
            errors.append(f"correct_index {correct_index} out of range for {len(options)} options")
        
        # Subject validation
        subject = question.get("subject", "").upper()
        if subject not in VALID_SUBJECTS:
            errors.append(f"Invalid subject: '{subject}'. Must be one of {VALID_SUBJECTS}")
        
        # Exam type validation
        exam_type = question.get("exam_type", "").upper()
        if exam_type not in VALID_EXAM_TYPES:
            errors.append(f"Invalid exam_type: '{exam_type}'. Must be one of {VALID_EXAM_TYPES}")
        
        # Difficulty validation
        difficulty = question.get("difficulty", "MEDIUM").upper()
        if difficulty not in VALID_DIFFICULTIES:
            errors.append(f"Invalid difficulty: '{difficulty}'. Must be one of {VALID_DIFFICULTIES}")
        
        # Test type mapping and validation
        raw_test_type = question.get("test_type", "exam")
        test_type = TEST_TYPE_MAP.get(raw_test_type, raw_test_type)
        if test_type not in VALID_TEST_TYPES:
            errors.append(f"Invalid test_type: '{test_type}'. Must be one of {VALID_TEST_TYPES}")
        
        if errors:
            self.stats["validation_errors"].append({
                "index": index,
                "text_preview": text[:50] if text else "(empty)",
                "errors": errors
            })
            return None
        
        # Build clean question object matching questions_final schema
        correct_text = options[correct_index] if correct_index < len(options) else ""
        
        cleaned = {
            "text": text,
            "options": options,  # Will be stored as JSONB
            "correct_index": correct_index,
            "correct_text": question.get("correct_text", correct_text),
            "explanation": question.get("explanation", "").strip() or None,
            "subject": subject,
            "exam_type": exam_type,
            "difficulty": difficulty,
            "test_type": test_type,
            "test_number": question.get("test_number"),
            "question_number": question.get("question_number"),
            "is_ai_generated": True,  # These are AI-generated and validated
            "passage_id": None,  # No passages for these questions
            "metadata": {
                "validation_status": question.get("validation_status", "validated"),
                "source_file": question.get("source_file"),
                "ingested_at": datetime.now().isoformat(),
            }
        }
        
        return cleaned

    def insert_batch(self, questions: List[Dict[str, Any]]) -> tuple:
        """Insert a batch of questions. Returns (count, list of inserted questions)."""
        if self.dry_run or not self.supabase:
            return len(questions), questions
        
        try:
            response = self.supabase.table(TABLE_NAME).insert(questions).execute()
            if response.data:
                return len(response.data), questions
            return 0, []
        except Exception as e:
            print(f"  ❌ Batch insert error: {e}")
            # Try inserting one by one to identify problematic questions
            success_count = 0
            inserted_questions = []
            for q in questions:
                try:
                    self.supabase.table(TABLE_NAME).insert(q).execute()
                    success_count += 1
                    inserted_questions.append(q)
                except Exception as single_err:
                    print(f"    ❌ Failed: {q['text'][:50]}... - {single_err}")
                    self.stats["questions_failed"] += 1
            return success_count, inserted_questions

    def process_file(self, file_path: Path, existing_questions: set = None) -> Dict[str, int]:
        """Process a single JSON file and ingest questions."""
        file_stats = {
            "read": 0,
            "inserted": 0,
            "skipped": 0,
            "duplicates": 0,
            "failed": 0
        }
        
        print(f"\n📄 Processing: {file_path.name}")
        
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            print(f"  ❌ JSON decode error: {e}")
            return file_stats
        except Exception as e:
            print(f"  ❌ Error reading file: {e}")
            return file_stats
        
        # Handle both formats: direct list or {"questions": [...], "metadata": {...}}
        if isinstance(data, dict):
            questions = data.get("questions", [])
            metadata = data.get("metadata", {})
            print(f"  📊 Metadata: {metadata.get('total_questions', len(questions))} questions, "
                  f"exam_type: {metadata.get('exam_type')}, status: {metadata.get('status')}")
        elif isinstance(data, list):
            questions = data
            metadata = {}
        else:
            print(f"  ❌ Invalid file format: expected list or object with 'questions' key")
            return file_stats
        
        file_stats["read"] = len(questions)
        print(f"  📚 Found {len(questions)} questions")
        
        # Load existing questions if not provided (for single file processing)
        if existing_questions is None:
            existing_questions = self.get_existing_questions()
        
        # Track questions added in this session to catch intra-file duplicates
        session_questions = set()
        
        # Validate and prepare questions
        valid_questions = []
        for i, q in enumerate(questions):
            # Add source file to question for metadata
            q["source_file"] = file_path.name
            
            cleaned = self.validate_question(q, i)
            if cleaned is None:
                file_stats["skipped"] += 1
                continue
            
            # Create key for duplicate checking
            question_key = (cleaned["text"], tuple(cleaned["options"]))
            
            # Check for duplicates in database
            if question_key in existing_questions:
                file_stats["duplicates"] += 1
                self.stats["duplicates_skipped"] += 1
                continue
            
            # Check for duplicates within this session (same file or previous files)
            if question_key in session_questions:
                file_stats["duplicates"] += 1
                self.stats["duplicates_skipped"] += 1
                continue
            
            # Add to session tracking
            session_questions.add(question_key)
            valid_questions.append(cleaned)
        
        if not valid_questions:
            print(f"  ⚠️  No valid questions to insert")
            return file_stats
        
        print(f"  ✅ {len(valid_questions)} questions validated, {file_stats['skipped']} skipped, {file_stats['duplicates']} duplicates")
        
        # Insert in batches
        total_inserted = 0
        for i in range(0, len(valid_questions), BATCH_SIZE):
            batch = valid_questions[i:i + BATCH_SIZE]
            batch_num = i // BATCH_SIZE + 1
            total_batches = (len(valid_questions) + BATCH_SIZE - 1) // BATCH_SIZE
            
            inserted, inserted_questions = self.insert_batch(batch)
            total_inserted += inserted
            
            # Track successfully inserted questions for cross-file duplicate detection
            if hasattr(self, 'session_questions'):
                for q in inserted_questions:
                    key = (q["text"], tuple(q["options"]))
                    self.session_questions.add(key)
            
            if not self.dry_run:
                print(f"    📦 Batch {batch_num}/{total_batches}: {inserted}/{len(batch)} inserted")
        
        file_stats["inserted"] = total_inserted
        file_stats["failed"] = len(valid_questions) - total_inserted
        
        print(f"  🎯 Result: {total_inserted} inserted, {file_stats['failed']} failed")
        
        # Track file for moving to backlog if insertion was successful
        if total_inserted > 0 and file_stats["failed"] == 0:
            self.processed_files.append(file_path)
        
        return file_stats

    def move_to_backlog(self):
        """Move successfully processed files to the backlog directory."""
        if self.dry_run:
            print(f"\n🔍 DRY RUN - Would move {len(self.processed_files)} files to backlog")
            for f in self.processed_files:
                print(f"    → {f.name}")
            return
        
        if not self.processed_files:
            print("\n⚠️  No files to move to backlog")
            return
        
        # Create backlog directory if it doesn't exist
        BACKLOG_DIR.mkdir(parents=True, exist_ok=True)
        
        print(f"\n📦 Moving {len(self.processed_files)} processed files to backlog...")
        
        moved_count = 0
        for file_path in self.processed_files:
            try:
                dest_path = BACKLOG_DIR / file_path.name
                
                # If file already exists in backlog, add timestamp
                if dest_path.exists():
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    stem = file_path.stem
                    suffix = file_path.suffix
                    dest_path = BACKLOG_DIR / f"{stem}_{timestamp}{suffix}"
                
                shutil.move(str(file_path), str(dest_path))
                print(f"  ✅ Moved: {file_path.name} → {dest_path.name}")
                moved_count += 1
            except Exception as e:
                print(f"  ❌ Failed to move {file_path.name}: {e}")
        
        print(f"\n📁 Backlog location: {BACKLOG_DIR}")
        print(f"   {moved_count}/{len(self.processed_files)} files moved successfully")

    def process_all_files(self):
        """Process all JSON files in the input directory."""
        if not INPUT_DIR.exists():
            print(f"❌ Input directory not found: {INPUT_DIR}")
            return
        
        json_files = sorted(INPUT_DIR.glob("*.json"))
        if not json_files:
            print(f"❌ No JSON files found in {INPUT_DIR}")
            return
        
        print(f"📂 Found {len(json_files)} JSON files in {INPUT_DIR}")
        
        # Pre-load existing questions once for all files
        existing_questions = self.get_existing_questions()
        
        # Track all questions added across files to catch cross-file duplicates
        self.session_questions: set = set()
        
        for file_path in json_files:
            # Combine existing DB questions with session questions
            combined_existing = existing_questions | self.session_questions
            file_stats = self.process_file(file_path, combined_existing)
            
            self.stats["files_processed"] += 1
            self.stats["questions_read"] += file_stats["read"]
            self.stats["questions_inserted"] += file_stats["inserted"]
            self.stats["questions_skipped"] += file_stats["skipped"]
            self.stats["questions_failed"] += file_stats["failed"]
        
        self.print_summary()
        self.move_to_backlog()

    def process_single_file(self, filename: str):
        """Process a single specified file."""
        file_path = INPUT_DIR / filename
        if not file_path.exists():
            # Try as absolute path
            file_path = Path(filename)
        
        if not file_path.exists():
            print(f"❌ File not found: {filename}")
            return
        
        file_stats = self.process_file(file_path)
        
        self.stats["files_processed"] = 1
        self.stats["questions_read"] = file_stats["read"]
        self.stats["questions_inserted"] = file_stats["inserted"]
        self.stats["questions_skipped"] = file_stats["skipped"]
        self.stats["questions_failed"] = file_stats["failed"]
        
        self.print_summary()
        self.move_to_backlog()

    def print_summary(self):
        """Print ingestion summary."""
        print("\n" + "=" * 60)
        print("📊 INGESTION SUMMARY")
        print("=" * 60)
        print(f"  Files processed:      {self.stats['files_processed']}")
        print(f"  Questions read:       {self.stats['questions_read']}")
        print(f"  Questions inserted:   {self.stats['questions_inserted']}")
        print(f"  Questions skipped:    {self.stats['questions_skipped']}")
        print(f"  Duplicates skipped:   {self.stats['duplicates_skipped']}")
        print(f"  Questions failed:     {self.stats['questions_failed']}")
        
        if self.stats["validation_errors"]:
            print(f"\n⚠️  Validation errors ({len(self.stats['validation_errors'])} questions):")
            for err in self.stats["validation_errors"][:10]:  # Show first 10
                print(f"    - Q{err['index']}: {err['text_preview']}...")
                for e in err["errors"]:
                    print(f"        → {e}")
            if len(self.stats["validation_errors"]) > 10:
                print(f"    ... and {len(self.stats['validation_errors']) - 10} more")
        
        if self.dry_run:
            print("\n🔍 DRY RUN - No data was actually inserted")
        elif self.stats["questions_inserted"] > 0:
            print(f"\n✅ Successfully inserted {self.stats['questions_inserted']} questions!")

    def show_database_stats(self):
        """Display current statistics from questions_final table."""
        if not self.supabase:
            print("❌ Cannot show stats: not connected to Supabase")
            return
        
        print("\n" + "=" * 60)
        print("📊 QUESTIONS_FINAL TABLE STATISTICS")
        print("=" * 60)
        
        try:
            # Total count
            response = self.supabase.table(TABLE_NAME).select("id", count="exact").execute()
            total = response.count or 0
            print(f"\n  Total questions: {total}")
            
            if total == 0:
                print("  (table is empty)")
                return
            
            # By exam type
            print("\n  By Exam Type:")
            for exam_type in sorted(VALID_EXAM_TYPES):
                response = self.supabase.table(TABLE_NAME).select("id", count="exact").eq("exam_type", exam_type).execute()
                count = response.count or 0
                print(f"    - {exam_type}: {count}")
            
            # By subject
            print("\n  By Subject:")
            for subject in sorted(VALID_SUBJECTS):
                response = self.supabase.table(TABLE_NAME).select("id", count="exact").eq("subject", subject).execute()
                count = response.count or 0
                print(f"    - {subject}: {count}")
            
            # By test type
            print("\n  By Test Type:")
            for test_type in sorted(VALID_TEST_TYPES):
                response = self.supabase.table(TABLE_NAME).select("id", count="exact").eq("test_type", test_type).execute()
                count = response.count or 0
                print(f"    - {test_type}: {count}")
            
            # By difficulty
            print("\n  By Difficulty:")
            for difficulty in sorted(VALID_DIFFICULTIES):
                response = self.supabase.table(TABLE_NAME).select("id", count="exact").eq("difficulty", difficulty).execute()
                count = response.count or 0
                print(f"    - {difficulty}: {count}")
            
        except Exception as e:
            print(f"  ❌ Error fetching stats: {e}")


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        # Default: process all files
        ingester = QuestionsIngester()
        ingester.process_all_files()
        ingester.show_database_stats()
        return
    
    command = sys.argv[1]
    
    if command == "--stats":
        ingester = QuestionsIngester()
        ingester.show_database_stats()
    
    elif command == "--dry-run":
        ingester = QuestionsIngester(dry_run=True)
        if len(sys.argv) > 2:
            ingester.process_single_file(sys.argv[2])
        else:
            ingester.process_all_files()
    
    elif command == "--help" or command == "-h":
        print(__doc__)
    
    elif command.endswith(".json"):
        # Process specific file
        ingester = QuestionsIngester()
        ingester.process_single_file(command)
        ingester.show_database_stats()
    
    else:
        print(f"Unknown command: {command}")
        print("Use --help for usage information")
        sys.exit(1)


if __name__ == "__main__":
    main()

