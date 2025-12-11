#!/usr/bin/env python3
"""
================================================================================
QUESTION FINAL INGESTION SCRIPT
================================================================================

PURPOSE:
--------
This script ingests the best, CLEANED questions from both `questions` (legacy) 
and `questions_v2` tables into the new `questions_final` table.

Each question must pass through multiple validation checkpoints before being
accepted into questions_final.

PROCESSING ORDER:
-----------------
1. exam (examen_blanc / exam_blanc)
2. practice test (practice_test / practice)
3. free quiz (quiz_series / free_quiz)
4. quick quiz (quiz_series / quick_quiz)

For each test_type, we process by exam_type: CS, CMS, CM

OUTPUT FILES:
-------------
- For exam: cs_exam.json, cms_exam.json, cm_exam.json
- For practice: cs_practice.json, cms_practice.json, cm_practice.json
- For free_quiz: cs_free_quiz.json, cms_free_quiz.json, cm_free_quiz.json
- For quick_quiz: cs_quick_quiz.json, cms_quick_quiz.json, cm_quick_quiz.json

These JSON files contain questions that PASSED all checks and are ready for
manual verification before final insertion.

================================================================================
VALIDATION CHECKPOINTS (10 STRICT CHECKS)
================================================================================

All questions must pass ALL 10 checkpoints before being accepted:

1. STRUCTURAL INTEGRITY (NO LLM)
   - Text not empty, length 15-800 chars
   - Options is valid list with 2-4 items
   - correct_index valid (0 <= idx < len(options))
   - No empty options
   - Explanation exists
   - No encoding issues (control chars, HTML entities)

2. PREFIX DETECTION (NO LLM)
   - Detects number prefixes: "Q5.", "15-", "(3)", etc.
   - Cleans text but doesn't reject
   - Logs detected prefixes

3. TEXT CONTENT QUALITY (LLM - Gemini)
   - Question must be clear and unambiguous
   - User should be able to answer with no issue
   - Options must match the question

4. CONTENT RESTRICTIONS (LLM - Gemini Pro)
   - NO questions about president of Côte d'Ivoire
   - NO questions about books/authors
   - NO questions about soccer/CAN/football
   - NO trivial questions (5x3, premier président, etc.)
   - CG/LOG must be French only

5. CORRECT ANSWER VALIDATION (LLM - Gemini Pro)
   - Verify marked correct answer is actually correct
   - Only flag if LLM confidence >= 70%

6. TEXT+OPTIONS DUPLICATE (NO LLM)
   - Fuzzy similarity on text + options
   - Threshold: >= 75% similarity = REJECTED

7. SEMANTIC DUPLICATE (LLM - Gemini)
   - Ask LLM to compare against recent questions
   - Score 0-1, threshold >= 0.6 = FLAGGED

8. SAME CORRECT ANSWER (NO LLM)
   - Similarity score on correct answer text
   - Threshold: >= 85% similarity = REJECTED

9. CATEGORY VALIDATION (LLM - Gemini + OpenAI)
   - CG: French only, culture générale, history, geography
   - LOG: French only, logic/math/organization, NO culture générale
   - ANG: English grammar/vocabulary only
   - Flag if EITHER model detects mismatch

10. EXPLANATION QUALITY (LLM - Gemini)
    - Must be in French
    - Must explain WHY the answer is correct
    - Must be relevant and useful

================================================================================
TEST TYPE MAPPING
================================================================================

2. TEST TYPE MAPPING (already defined in LEGACY_TO_V2_TEST_TYPE_MAP):
   
   Legacy `questions` table:
   - 'examen_blanc' -> corresponds to 'exam' category
   - 'practice_test' -> corresponds to 'practice' category  
   - 'quiz_series'   -> corresponds to 'free_quiz' or 'quick_quiz'
   
   V2 `questions_v2` table:
   - 'exam_blanc'  -> corresponds to 'exam' category
   - 'practice'    -> corresponds to 'practice' category
   - 'free_quiz'   -> corresponds to 'free_quiz' category
   - 'quick_quiz'  -> corresponds to 'quick_quiz' category

3. COLUMN MAPPING:

   From `questions` (legacy) table:
   - question_text  -> text
   - answer1..4     -> options[] (filter out empty)
   - correct ('A'/'B'/'C'/'D') -> correct_index (0-based)
   - correct        -> also store as correct_text
   - explanation    -> explanation
   - category       -> subject
   - difficulty     -> difficulty (normalize: 'MED' -> 'MEDIUM')
   - test_type      -> map using LEGACY_TO_V2_TEST_TYPE_MAP
   - exam_type      -> exam_type (CM, CMS, CS)
   
   From `questions_v2` table:
   - text          -> text
   - options       -> options (already array)
   - correct_index -> correct_index
   - options[correct_index] -> correct_text
   - explanation   -> explanation
   - subject       -> subject
   - difficulty    -> difficulty
   - test_type     -> test_type (already V2 format)
   - exam_type     -> exam_type

4. OUTPUT FORMAT for JSON files (questions_final schema):
   {
     "text": str,
     "options": list[str],
     "correct_index": int,
     "correct_text": str,
     "explanation": str,
     "subject": str,         # 'ANG' | 'CG' | 'LOG'
     "difficulty": str,      # 'EASY' | 'MEDIUM' | 'HARD'
     "test_type": str,       # 'exam' | 'practice' | 'free_quiz' | 'quick_quiz'
     "exam_type": str,       # 'CM' | 'CMS' | 'CS'
     "source_table": str,    # 'questions' | 'questions_v2'
     "source_id": str,       # Original ID for traceability
     "test_number": null,    # Leave empty for manual assignment
     "question_number": null # Leave empty for manual assignment
   }

5. LOGGING REQUIREMENTS:
   
   The script should output structured logs following this pattern:
   
   ##Question ingestion script starting...##
   
   #starting with test_type = exam#
   
   #pulling questions from questions table...#
   -> Fetched X questions matching criteria
   
   #pulling questions from questions_v2 table...#
   -> Fetched Y questions matching criteria
   
   #converting row format to new format for questions_final#
   -> Converting legacy format (answer1-4) to options array
   -> Mapping correct letter to correct_index
   
   ##question verification##
   -> Running checkpoint 1: Structural integrity... X passed, Y failed
   -> Running checkpoint 2: Duplicate detection... X passed, Y failed
   -> Running checkpoint 3: Prefix detection... X passed, Y cleaned
   -> Running checkpoint 4: Content quality... X passed, Y failed
   -> Running checkpoint 5: Option balance... X passed, Y failed
   
   ##writing output file: cs_exam.json##
   -> Z questions ready for manual verification
   
   ###please verify the json produced###

6. AFTER SCRIPT COMPLETION:
   - Manually review each JSON file
   - Verify question quality and appropriateness
   - Assign test_number and question_number as needed
   - Then run insertion to questions_final table

================================================================================
"""

import os
import re
import json
import hashlib
import logging
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional, Set, Tuple
from dataclasses import dataclass, asdict, field
from collections import defaultdict
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client, Client
from rapidfuzz import fuzz
import google.generativeai as genai
import google.api_core.exceptions

# Optional: OpenAI for dual-model checks
try:
    from openai import AsyncOpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

# =============================================================================
# CONFIGURATION
# =============================================================================

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not all([SUPABASE_URL, SUPABASE_KEY]):
    raise EnvironmentError("Missing SUPABASE_URL or SUPABASE_KEY in environment")

if not GEMINI_API_KEY:
    raise EnvironmentError("Missing GEMINI_API_KEY in environment")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize Gemini
genai.configure(api_key=GEMINI_API_KEY)

# Initialize OpenAI (optional)
openai_client = None
if HAS_OPENAI and OPENAI_API_KEY:
    openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)

# Output directory for JSON reports
OUTPUT_DIR = Path(__file__).parent / "questions_final_output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(message)s'  # Simple format for readable output
)
logger = logging.getLogger(__name__)

# =============================================================================
# CONSTANTS & MAPPINGS
# =============================================================================

# Test type categories for processing order (CLI-facing)
TEST_TYPE_CATEGORIES = ['exam', 'practice', 'practice_test', 'free_quiz', 'quick_quiz']

# Exam types to process for each test_type category
EXAM_TYPES = ['CS', 'CMS', 'CM']

# Subjects
SUBJECTS = ['ANG', 'CG', 'LOG']

# Test type mapping from legacy `questions` table to standardized categories
# Format: legacy_test_type -> category
LEGACY_TEST_TYPE_MAP = {
    'examen_blanc': 'exam',
    'practice_test': 'practice',
    'quiz_series': 'free_quiz', 
}

# Test type mapping from `questions_v2` table (already V2 format)
V2_TEST_TYPE_MAP = {
    'exam_blanc': 'exam',
    'practice': 'practice',
    'free_quiz': 'free_quiz',
    'quick_quiz': 'quick_quiz',
}

# Map CLI-facing test_type values to internal categories used in this script
CLI_TEST_TYPE_NORMALIZATION = {
    'exam': 'exam',
    'practice': 'practice',
    'practice_test': 'practice',  # alias for practice tests
}

# Map internal categories to the actual test_type values stored in DB tables
DB_TEST_TYPE_MAP = {
    'exam': 'exam_blanc',
    'practice': 'practice',
}

# Reverse mapping for database queries
# Maps category -> list of test_type values to query in each table
CATEGORY_TO_LEGACY_TEST_TYPES = {
    'exam': ['examen_blanc'],
    'practice': ['practice_test'],
    'free_quiz': ['quiz_series'],  # Will filter by some criteria
    'quick_quiz': ['quiz_series'],  # Will filter by some criteria
}

CATEGORY_TO_V2_TEST_TYPES = {
    'exam': ['exam_blanc'],
    'practice': ['practice'],
    'free_quiz': ['free_quiz'],
    'quick_quiz': ['quick_quiz'],
}

# Difficulty normalization
DIFFICULTY_MAP = {
    'EASY': 'EASY',
    'MED': 'MEDIUM',
    'MEDIUM': 'MEDIUM',
    'HARD': 'HARD',
}

# Validation thresholds
MIN_QUESTION_LENGTH = 15
MAX_QUESTION_LENGTH = 800
OPTION_LENGTH_RATIO_HIGH = 2.0  # correct answer >2x longer than avg = flag
OPTION_LENGTH_RATIO_LOW = 0.5   # correct answer <0.5x shorter than avg = flag

# Duplicate detection thresholds
TEXT_OPTIONS_SIMILARITY_THRESHOLD = 75  # Text + Options fuzzy match (reject >= 75%)
CORRECT_ANSWER_SIMILARITY_THRESHOLD = 85  # Same correct answer text (reject >= 85%)
LLM_DUPLICATE_THRESHOLD = 0.6  # LLM semantic duplicate score (flag >= 0.6)

# LLM Model settings
GEMINI_MODEL = 'gemini-2.0-flash'  # Fast model for validations
GEMINI_MODEL_ACCURATE = 'gemini-2.5-pro'  # High accuracy model for complex checks
GPT_MODEL = 'gpt-4o-mini'  # For dual model verification

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAY = 1.5  # seconds

# Batch sizes for LLM calls
LLM_BATCH_SIZE = 5

# Concurrency limit for LLM calls
MAX_CONCURRENT_LLM_CALLS = 3

# Minimum length for correct answer similarity check (skip short/common answers)
MIN_CORRECT_ANSWER_LENGTH = 5

# =============================================================================
# TEST NUMBER & QUESTION NUMBER CONFIGURATION
# =============================================================================

# For 'exam' test_type: 
# - 20 exam tests total
# - Each test has 60 questions (20 ANG + 20 CG + 20 LOG in that order)
# - question_number within each test: ANG=1-20, CG=21-40, LOG=41-60
# - Total: 20 tests × 60 questions = 1200 questions (400 per subject)
EXAM_CONFIG = {
    'num_tests': 20,
    'questions_per_test_per_subject': 20,
    'questions_per_test_total': 60,  # 20 × 3 subjects
    'max_per_subject': 400,  # 20 tests × 20 questions = 400
    'subject_order': ['ANG', 'CG', 'LOG'],  # Order within each test
    'subject_offsets': {'ANG': 0, 'CG': 20, 'LOG': 40},  # question_number offset
}

# For 'practice' test_type: 
# - Practice tests are PER SUBJECT (not combined)
# - Each subject has 20 practice tests
# - Each practice test has 15 questions
# - test_number: 1-20 (per subject)
# - question_number: 1-15 (within each test)
# - Total per subject: 20 tests × 15 questions = 300 questions
# - Total per exam_type: 300 × 3 = 900 questions
PRACTICE_CONFIG = {
    'num_tests_per_subject': 20,
    'questions_per_test': 15,
    'max_per_subject': 300,  # 20 tests × 15 questions = 300
    'is_per_subject': True,  # Each test is for a single subject
}

# Test types that get test_number and question_number assigned
TEST_TYPES_WITH_NUMBERS = ['exam', 'practice']

# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class QuestionFinal:
    """Target schema for questions_final table."""
    text: str
    options: List[str]
    correct_index: int
    correct_text: str
    explanation: str
    subject: str
    difficulty: str
    test_type: str  # 'exam' | 'practice' | 'free_quiz' | 'quick_quiz'
    exam_type: str  # 'CM' | 'CMS' | 'CS'
    source_table: str  # 'questions' | 'questions_v2'
    source_id: str
    test_number: Optional[int] = None  # Leave empty for manual assignment
    question_number: Optional[int] = None  # Leave empty for manual assignment
    validation_notes: List[str] = field(default_factory=list)
    # Extra validation metadata for output / debugging
    llm_confidence: Optional[float] = None
    validation_status: str = "validated"


@dataclass
class ValidationResult:
    """Result of validating a question through checkpoints."""
    passed: bool
    issues: List[str]
    cleaned_text: Optional[str] = None  # If prefix was stripped


# =============================================================================
# ASYNC RETRY HELPER
# =============================================================================

async def retry_async(func, *args, max_retries: int = MAX_RETRIES, delay: float = RETRY_DELAY, **kwargs):
    """Retry an async function with exponential backoff."""
    last_exception = None
    for attempt in range(max_retries):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            last_exception = e
            if attempt < max_retries - 1:
                wait_time = delay * (2 ** attempt)
                logger.warning(f"Attempt {attempt + 1} failed: {e}. Retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)
            else:
                logger.error(f"All {max_retries} attempts failed: {e}")
    raise last_exception


# =============================================================================
# CHECKPOINT VALIDATORS
# =============================================================================

class QuestionValidator:
    """
    Comprehensive validation checkpoint runner with 10 strict checks.
    
    Checkpoints:
    1. Structural integrity (no LLM)
    2. Prefix detection (no LLM)
    3. Text content quality - clarity/ambiguity (LLM - Gemini)
    4. Question content restrictions - no politics, soccer, trivial (LLM)
    5. Correct answer validation (LLM - Gemini)
    6. Text+Options duplicate detection (fuzzy similarity >= 75%)
    7. Semantic duplicate detection (LLM similarity score >= 0.6)
    8. Same correct answer text detection (similarity >= 85%)
    9. Category/Subject validation (LLM - Gemini + OpenAI)
    10. Explanation quality check (LLM - Gemini)
    """
    
    def __init__(self):
        self.seen_hashes: Set[str] = set()
        self.stats = defaultdict(lambda: {'passed': 0, 'failed': 0, 'cleaned': 0, 'flagged': 0})
        
        # Storage for duplicate detection across all questions
        self.ingested_questions: List[Dict[str, Any]] = []  # All successfully ingested questions
        self.ingested_by_file: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        self.correct_answers_by_file: Dict[str, List[str]] = defaultdict(list)
        
        # LLM models
        self.gemini_flash = genai.GenerativeModel(GEMINI_MODEL)
        self.gemini_pro = genai.GenerativeModel(GEMINI_MODEL_ACCURATE)
        
        # Semaphore to limit concurrent LLM calls
        self.llm_semaphore = asyncio.Semaphore(MAX_CONCURRENT_LLM_CALLS)
    
    # =========================================================================
    # CHECKPOINT 1: Structural Integrity (NO LLM)
    # =========================================================================
    def check_structural_integrity(self, question: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Verify question has valid structure:
        - text is not empty
        - options is a valid list with 2-4 items
        - correct_index is valid (0 <= idx < len(options))
        - no empty options
        - explanation exists
        """
        issues = []
        
        # Check text
        text = question.get('text', '')
        if not text or not str(text).strip():
            issues.append("STRUCTURAL: Empty question text")
        elif len(str(text).strip()) < MIN_QUESTION_LENGTH:
            issues.append(f"STRUCTURAL: Question too short ({len(str(text).strip())} chars, min={MIN_QUESTION_LENGTH})")
        elif len(str(text).strip()) > MAX_QUESTION_LENGTH:
            issues.append(f"STRUCTURAL: Question too long ({len(str(text).strip())} chars, max={MAX_QUESTION_LENGTH})")
        
        # Check options
        options = question.get('options', [])
        if not options or not isinstance(options, list):
            issues.append("STRUCTURAL: Missing or invalid options array")
        elif len(options) < 2:
            issues.append(f"STRUCTURAL: Too few options ({len(options)}, need at least 2)")
        elif len(options) > 4:
            issues.append(f"STRUCTURAL: Too many options ({len(options)}, max 4)")
        else:
            # Check for empty options
            for i, opt in enumerate(options):
                if not opt or not str(opt).strip():
                    issues.append(f"STRUCTURAL: Empty option at index {i}")
        
        # Check correct_index
        correct_index = question.get('correct_index')
        if correct_index is None:
            issues.append("STRUCTURAL: Missing correct_index")
        elif not isinstance(correct_index, int):
            issues.append(f"STRUCTURAL: Invalid correct_index type: {type(correct_index)}")
        elif options and isinstance(options, list) and (correct_index < 0 or correct_index >= len(options)):
            issues.append(f"STRUCTURAL: correct_index {correct_index} out of bounds (0-{len(options)-1})")
        
        # Check explanation exists
        explanation = question.get('explanation', '')
        if not explanation or not str(explanation).strip():
            issues.append("STRUCTURAL: Missing or empty explanation")
        
        # Check for encoding issues in all content
        full_content = f"{text} {' '.join([str(o) for o in options if o])} {explanation}"
        problematic_patterns = [
            (r'[\x00-\x08\x0b\x0c\x0e-\x1f]', 'control_characters'),
            (r'&[a-z]+;', 'html_entities'),
            (r'\\u[0-9a-fA-F]{4}', 'unicode_escapes'),
            (r'\?{3,}', 'encoding_errors'),
            (r'�+', 'replacement_chars'),
        ]
        for pattern, issue_type in problematic_patterns:
            if re.search(pattern, full_content):
                issues.append(f"STRUCTURAL: Content contains {issue_type}")
        
        passed = len(issues) == 0
        self.stats['1_structural']['passed' if passed else 'failed'] += 1
        return passed, issues
    
    # =========================================================================
    # CHECKPOINT 2: Prefix Detection (NO LLM)
    # =========================================================================
    def check_prefix_detection(self, question: Dict[str, Any]) -> Tuple[bool, List[str], Optional[str]]:
        """
        Detect and remove number prefixes from question text.
        
        Examples:
        - "Q5. Choose the correct..."
        - "15- Correct usage: ..."
        - "1- Choose the correct sentence:"
        - "(3) What is..."
        
        Returns (passed, issues, cleaned_text)
        Note: This doesn't fail the question, but cleans it and logs.
        """
        issues = []
        text = question.get('text', '')
        original_text = text
        cleaned_text = text
        
        # Comprehensive prefix patterns
        prefix_patterns = [
            # Number followed by separator: "15-", "1.", "23:", "5)"
            (r'^[1-9]\d{0,2}[\.\-\−\–\:\)]\s*', 'number-separator'),
            # Q-prefix: "Q5.", "Q.15", "Q 3:"
            (r'^Q\.?\s*\d+[\.\-\:\)]?\s*', 'Q-prefix'),
            # Question prefix: "Question 5:", "Question-3"
            (r'^Question\s*[\-\:]?\s*\d+[\.\-\:\)]?\s*', 'question-prefix'),
            # Parentheses: "(3)", "(15)"
            (r'^\(\d+\)\s*', 'parentheses'),
            # Brackets: "[3]", "[15]"
            (r'^\[\d+\]\s*', 'brackets'),
            # Letter prefix: "A.", "B)", "a-"
            (r'^[A-Da-d][\.\-\)\:]\s*', 'letter-prefix'),
            # French style: "n°5", "n° 3"
            (r'^n°\s*\d+[\.\-\:\)]?\s*', 'n-degree'),
        ]
        
        for pattern, prefix_type in prefix_patterns:
            match = re.match(pattern, text, re.IGNORECASE)
            if match:
                prefix = match.group(0)
                cleaned_text = text[len(prefix):].strip()
                issues.append(f"PREFIX: Detected {prefix_type}: '{prefix.strip()}'")
                break
        
        # Check for leading whitespace or unusual characters
        if cleaned_text and cleaned_text[0] in ['-', '.', ':', ')', ']']:
            cleaned_text = cleaned_text[1:].strip()
            if f"PREFIX:" not in str(issues):
                issues.append(f"PREFIX: Cleaned leading punctuation")
        
        # Prefix detection doesn't fail, just cleans
        passed = True
        if issues:
            self.stats['2_prefix']['cleaned'] += 1
        else:
            self.stats['2_prefix']['passed'] += 1
            
        return passed, issues, cleaned_text if cleaned_text != original_text else None
    
    # =========================================================================
    # SEMAPHORE-WRAPPED LLM CALL HELPER
    # =========================================================================
    async def _call_llm_with_semaphore(self, coro):
        """
        Execute an LLM coroutine with semaphore to limit concurrency.
        Prevents hitting API rate limits by limiting concurrent calls.
        """
        async with self.llm_semaphore:
            return await coro
    
    # =========================================================================
    # CHECKPOINT 3: Text Content Quality - Clarity (LLM - Gemini)
    # =========================================================================
    async def check_text_quality_clarity(self, question: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        LLM check: Question should be straightforward with little ambiguity.
        User should be able to answer the question with no issue.
        """
        issues = []
        text = question.get('text', '')
        options = question.get('options', [])
        
        prompt = f"""Évaluez la CLARTÉ de cette question d'examen.

QUESTION: {text}
OPTIONS: {json.dumps(options, ensure_ascii=False)}

CRITÈRES DE REJET:
1. Question ambiguë ou confuse
2. Question mal formulée ou incomplète
3. Options qui ne correspondent pas à la question
4. Question qui nécessite des informations supplémentaires pour répondre
5. Question avec plusieurs réponses possibles parmi les options

Répondez en JSON:
{{
    "is_clear": true/false,
    "clarity_score": 0.0-1.0,
    "issues": ["liste des problèmes trouvés"],
    "reason": "explication courte"
}}

Si la question est claire et bien formulée, répondez avec is_clear: true et issues: []."""

        try:
            async def _check():
                return await self._call_llm_with_semaphore(
                    self.gemini_flash.generate_content_async(
                        prompt,
                        generation_config={'temperature': 0.1}
                    )
                )
            
            response = await retry_async(_check)
            match = re.search(r'\{[^{}]*\}', response.text, re.DOTALL)
            if match:
                result = json.loads(match.group())
                if not result.get('is_clear', True):
                    issues.append(f"CLARITY: {result.get('reason', 'Question unclear')}")
                    for issue in result.get('issues', []):
                        issues.append(f"CLARITY: {issue}")
        except json.JSONDecodeError as e:
            logger.warning(f"JSON parse error in clarity check: {e}")
        except Exception as e:
            logger.warning(f"Clarity check error: {type(e).__name__}: {e}")
        
        passed = len(issues) == 0
        self.stats['3_clarity']['passed' if passed else 'failed'] += 1
        return passed, issues
    
    # =========================================================================
    # CHECKPOINT 4: Content Restrictions - No Politics/Soccer/Trivial (LLM)
    # =========================================================================
    async def check_content_restrictions(self, question: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        LLM check: Reject questions about:
        - President of Côte d'Ivoire or any political figures
        - Books or authors
        - Soccer teams, CAN, football federation
        - Questions too simple for an educated Ivorian student (5x3, premier président, 7+1, etc.)
        
        Also: If subject = CG or LOG, only accept French content.
        """
        issues = []
        text = question.get('text', '')
        options = question.get('options', [])
        subject = question.get('subject', '')
        
        prompt = f"""Analysez cette question d'examen pour détecter du contenu INTERDIT.

QUESTION: {text}
OPTIONS: {json.dumps(options, ensure_ascii=False)}
SUJET DÉCLARÉ: {subject}

CONTENU INTERDIT - REJETER SI:
1. Question sur le président de la Côte d'Ivoire ou tout dirigeant politique africain
2. Question sur un livre ou un auteur spécifique
3. Question sur une équipe de football, la CAN, la fédération de football, un entraîneur
4. Question TRIVIALE trop simple pour un étudiant ivoirien éduqué:
   - Calculs basiques (5x3, 2+2)
   - "Qui était le premier président de la Côte d'Ivoire?"
   - "Qui a remporté la CAN?"
   - "Capitale de la France?"
5. Question de culture pop ou célébrités

RÈGLE DE LANGUE:
- Si SUJET = CG ou LOG: La question ET les options doivent être en FRANÇAIS UNIQUEMENT
- Aucun mot anglais ne doit apparaître dans une question CG ou LOG

Répondez en JSON:
{{
    "is_allowed": true/false,
    "violation_type": "none"|"political"|"book_author"|"soccer"|"trivial"|"language"|"celebrity",
    "reason": "explication courte",
    "detected_content": "contenu problématique trouvé"
}}"""

        try:
            async def _check():
                return await self._call_llm_with_semaphore(
                    self.gemini_pro.generate_content_async(
                        prompt,
                        generation_config={'temperature': 0.1}
                    )
                )
            
            response = await retry_async(_check)
            match = re.search(r'\{[^{}]*\}', response.text, re.DOTALL)
            if match:
                result = json.loads(match.group())
                if not result.get('is_allowed', True):
                    violation = result.get('violation_type', 'unknown')
                    reason = result.get('reason', 'Content restricted')
                    detected = result.get('detected_content', '')
                    issues.append(f"CONTENT_RESTRICTION: [{violation}] {reason}")
                    if detected:
                        issues.append(f"CONTENT_RESTRICTION: Detected: {detected[:100]}")
        except json.JSONDecodeError as e:
            logger.warning(f"JSON parse error in content restriction check: {e}")
        except Exception as e:
            logger.warning(f"Content restriction check error: {type(e).__name__}: {e}")
        
        passed = len(issues) == 0
        self.stats['4_content_restrictions']['passed' if passed else 'failed'] += 1
        return passed, issues
    
    # =========================================================================
    # CHECKPOINT 5: Correct Answer Validation (LLM - Gemini)
    # =========================================================================
    async def check_correct_answer(self, question: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        LLM check: Verify the marked correct answer is actually correct.
        """
        issues = []
        text = question.get('text', '')
        options = question.get('options', [])
        correct_index = question.get('correct_index', 0)
        correct_text = question.get('correct_text', '')
        
        if not correct_text and options and 0 <= correct_index < len(options):
            correct_text = options[correct_index]
        
        prompt = f"""Vérifiez si la réponse marquée comme correcte est VRAIMENT correcte.

QUESTION: {text}
OPTIONS:
{chr(10).join([f"{i+1}. {opt}" for i, opt in enumerate(options)])}

RÉPONSE MARQUÉE CORRECTE: Option {correct_index + 1}: "{correct_text}"

TÂCHES:
1. Analysez la question et toutes les options
2. Déterminez quelle devrait être la bonne réponse
3. Comparez avec la réponse marquée

Répondez en JSON:
{{
    "marked_answer_is_correct": true/false,
    "actual_correct_option": 1/2/3/4,
    "confidence": 0.0-1.0,
    "reason": "explication de pourquoi la réponse est correcte ou incorrecte"
}}"""

        try:
            async def _check():
                return await self._call_llm_with_semaphore(
                    self.gemini_pro.generate_content_async(
                        prompt,
                        generation_config={'temperature': 0.1}
                    )
                )
            
            response = await retry_async(_check)
            match = re.search(r'\{[^{}]*\}', response.text, re.DOTALL)
            if match:
                result = json.loads(match.group())
                if not result.get('marked_answer_is_correct', True):
                    actual = result.get('actual_correct_option', '?')
                    confidence = result.get('confidence', 0)
                    reason = result.get('reason', 'Answer verification failed')
                    if confidence >= 0.7:  # Only flag if LLM is reasonably confident
                        issues.append(f"WRONG_ANSWER: Marked option {correct_index + 1}, should be option {actual}")
                        issues.append(f"WRONG_ANSWER: {reason}")
        except json.JSONDecodeError as e:
            logger.warning(f"JSON parse error in answer validation: {e}")
        except Exception as e:
            logger.warning(f"Answer validation error: {type(e).__name__}: {e}")
        
        passed = len(issues) == 0
        self.stats['5_answer_validation']['passed' if passed else 'failed'] += 1
        return passed, issues
    
    # =========================================================================
    # CHECKPOINT 6: Text+Options Duplicate Detection (Fuzzy - NO LLM)
    # =========================================================================
    def check_fuzzy_duplicate(self, question: Dict[str, Any], output_filename: str) -> Tuple[bool, List[str]]:
        """
        Check for duplicates using fuzzy similarity on text + options.
        Compare against all questions already ingested in all {exam_type}_{category}.json files.
        
        Threshold: >= 75% similarity = REJECTED
        """
        issues = []
        
        text = question.get('text', '')
        options = question.get('options', [])
        
        # Create combined content string
        current_content = f"{text} {' '.join([str(o) for o in options])}".lower().strip()
        
        # Check against all already ingested questions
        for ingested in self.ingested_questions:
            ingested_text = ingested.get('text', '')
            ingested_options = ingested.get('options', [])
            ingested_content = f"{ingested_text} {' '.join([str(o) for o in ingested_options])}".lower().strip()
            
            similarity = fuzz.ratio(current_content, ingested_content)
            
            if similarity >= TEXT_OPTIONS_SIMILARITY_THRESHOLD:
                issues.append(f"FUZZY_DUPLICATE: {similarity}% similar to question {ingested.get('source_id', 'unknown')[:8]}...")
                issues.append(f"FUZZY_DUPLICATE: Similar text: '{ingested_text[:80]}...'")
                break  # One duplicate is enough to reject
        
        passed = len(issues) == 0
        self.stats['6_fuzzy_duplicate']['passed' if passed else 'failed'] += 1
        return passed, issues
    
    # =========================================================================
    # CHECKPOINT 7: Semantic Duplicate Detection (LLM)
    # =========================================================================
    async def check_semantic_duplicate(self, question: Dict[str, Any], output_filename: str) -> Tuple[bool, List[str]]:
        """
        LLM check: Ask model to compare this question against ALL ingested questions.
        Score 0-1, anything >= 0.6 is flagged.
        
        Process in batches: current question vs batch1, batch2, batch3, etc.
        Pre-filter using fuzzy matching to reduce candidates before LLM calls.
        """
        issues = []
        
        text = question.get('text', '')
        options = question.get('options', [])
        subject = question.get('subject', '')
        
        if not self.ingested_questions:
            self.stats['7_semantic_duplicate']['passed'] += 1
            return True, issues
        
        # Pre-filter ALL ingested questions using fuzzy matching
        # This reduces the number of questions we need to send to LLM
        current_content = f"{text} {' '.join([str(o) for o in options])}".lower()
        
        candidates = []
        for ingested in self.ingested_questions:
            # Only compare within same subject for efficiency
            if ingested.get('subject', '') != subject:
                continue
                
            ingested_content = f"{ingested.get('text', '')} {' '.join([str(o) for o in ingested.get('options', [])])}".lower()
            similarity = fuzz.ratio(current_content, ingested_content)
            
            # Pre-filter threshold: 35-74% similarity (below 35 is too different, >= 75 already caught by fuzzy check)
            if 35 <= similarity < TEXT_OPTIONS_SIMILARITY_THRESHOLD:
                candidates.append({
                    'question': ingested,
                    'fuzzy_score': similarity
                })
        
        if not candidates:
            self.stats['7_semantic_duplicate']['passed'] += 1
            return True, issues
        
        # Sort by fuzzy score (highest first) to prioritize most likely duplicates
        candidates.sort(key=lambda x: x['fuzzy_score'], reverse=True)
        
        # Process candidates in batches of 10 for LLM check
        SEMANTIC_BATCH_SIZE = 10
        total_batches = (len(candidates) + SEMANTIC_BATCH_SIZE - 1) // SEMANTIC_BATCH_SIZE
        
        highest_score = 0.0
        duplicate_found = False
        duplicate_reason = ""
        duplicate_match = ""
        
        for batch_idx in range(total_batches):
            if duplicate_found:
                break  # Stop if we already found a duplicate
                
            start_idx = batch_idx * SEMANTIC_BATCH_SIZE
            end_idx = min(start_idx + SEMANTIC_BATCH_SIZE, len(candidates))
            batch = candidates[start_idx:end_idx]
            
            comparison_text = "\n".join([
                f"Q{i+1}: {c['question'].get('text', '')[:200]}" 
                for i, c in enumerate(batch)
            ])
            
            prompt = f"""Comparez cette NOUVELLE question avec les questions EXISTANTES.
Cherchez des DUPLICATAS SÉMANTIQUES (même sujet/concept/connaissance même si formulé différemment).

NOUVELLE QUESTION:
{text}
OPTIONS: {json.dumps(options, ensure_ascii=False)}

QUESTIONS EXISTANTES (batch {batch_idx + 1}/{total_batches}):
{comparison_text}

CRITÈRES DE DUPLICATION:
- Même fait/événement/personne/concept testé
- Même connaissance requise pour répondre
- Questions qui seraient redondantes dans un examen

Répondez en JSON:
{{
    "highest_similarity": 0.0-1.0,
    "most_similar_to": "Q1"|"Q2"|...|"none",
    "similar_question_text": "texte de la question similaire (si trouvée)",
    "reason": "explication courte",
    "is_semantic_duplicate": true/false
}}

Score >= 0.6 = duplicate sémantique à rejeter."""

            try:
                async def _check():
                    return await self._call_llm_with_semaphore(
                        self.gemini_flash.generate_content_async(
                            prompt,
                            generation_config={'temperature': 0.1}
                        )
                    )
                
                response = await retry_async(_check)
                match = re.search(r'\{[^{}]*\}', response.text, re.DOTALL)
                if match:
                    result = json.loads(match.group())
                    batch_similarity = result.get('highest_similarity', 0)
                    
                    if batch_similarity > highest_score:
                        highest_score = batch_similarity
                    
                    if batch_similarity >= LLM_DUPLICATE_THRESHOLD or result.get('is_semantic_duplicate', False):
                        duplicate_found = True
                        duplicate_match = result.get('most_similar_to', 'unknown')
                        duplicate_reason = result.get('reason', 'Semantic duplicate detected')
                        similar_text = result.get('similar_question_text', '')
                        
                        issues.append(f"SEMANTIC_DUPLICATE: Score {batch_similarity:.2f} with {duplicate_match} (batch {batch_idx + 1})")
                        issues.append(f"SEMANTIC_DUPLICATE: {duplicate_reason}")
                        if similar_text:
                            issues.append(f"SEMANTIC_DUPLICATE: Similar: '{similar_text[:100]}...'")
                        break
                        
            except json.JSONDecodeError as e:
                logger.warning(f"JSON parse error in semantic duplicate check (batch {batch_idx + 1}): {e}")
            except Exception as e:
                logger.warning(f"Semantic duplicate check error (batch {batch_idx + 1}): {type(e).__name__}: {e}")
            
            # Small delay between batches to avoid rate limits
            if batch_idx < total_batches - 1 and not duplicate_found:
                await asyncio.sleep(0.3)
        
        passed = len(issues) == 0
        self.stats['7_semantic_duplicate']['passed' if passed else 'failed'] += 1
        return passed, issues
    
    # =========================================================================
    # CHECKPOINT 8: Same Correct Answer Text Detection (NO LLM)
    # =========================================================================
    def check_same_correct_answer(self, question: Dict[str, Any], output_filename: str) -> Tuple[bool, List[str]]:
        """
        Check if the correct answer text is too similar to other correct answers.
        Avoid questions with nearly identical correct answers.
        
        Threshold: >= 85% similarity = REJECTED
        
        Note: Short answers (< MIN_CORRECT_ANSWER_LENGTH chars) are skipped to avoid
        false positives with common short answers like "True", "False", "Yes", "No", etc.
        """
        issues = []
        
        correct_text = question.get('correct_text', '')
        if not correct_text:
            options = question.get('options', [])
            correct_index = question.get('correct_index', 0)
            if options and 0 <= correct_index < len(options):
                correct_text = str(options[correct_index])
        
        current_answer = correct_text.strip() if correct_text else ''
        
        # Skip check for short/common answers to avoid false positives
        # (e.g., "True", "False", "Yes", "No", numbers like "4", "12")
        if len(current_answer) < MIN_CORRECT_ANSWER_LENGTH:
            self.stats['8_same_answer']['passed'] += 1
            return True, issues
        
        current_answer_lower = current_answer.lower()
        
        # Check against all correct answers from ingested questions
        for existing_answer in self.correct_answers_by_file.get('_all', []):
            existing_stripped = existing_answer.strip()
            
            # Also skip comparison with short existing answers
            if len(existing_stripped) < MIN_CORRECT_ANSWER_LENGTH:
                continue
                
            similarity = fuzz.ratio(current_answer_lower, existing_stripped.lower())
            
            if similarity >= CORRECT_ANSWER_SIMILARITY_THRESHOLD:
                issues.append(f"SAME_ANSWER: {similarity}% similar to existing answer")
                issues.append(f"SAME_ANSWER: '{existing_stripped[:50]}...'")
                break
        
        passed = len(issues) == 0
        self.stats['8_same_answer']['passed' if passed else 'failed'] += 1
        return passed, issues
    
    # =========================================================================
    # CHECKPOINT 9: Category/Subject Validation (LLM - Gemini + OpenAI)
    # =========================================================================
    async def check_category_validation(self, question: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        DUAL MODEL check: Validate question matches its declared subject.
        
        Rules:
        - CG/LOG: Must be French only (no English)
        - CG: Culture générale, history, geography, aptitude verbale. NOT logic/math/English
        - LOG: Aptitude Numérique et Organisation. Logic, math, organization. NOT CG
        - ANG: English grammar, vocabulary only. NOT CG or logic
        """
        issues = []
        
        text = question.get('text', '')
        options = question.get('options', [])
        subject = question.get('subject', 'CG')
        
        prompt = f"""Vérifiez si cette question correspond à sa catégorie déclarée.

QUESTION: {text}
OPTIONS: {json.dumps(options, ensure_ascii=False)}
CATÉGORIE DÉCLARÉE: {subject}

DÉFINITIONS DES CATÉGORIES:
- CG (Culture Générale): Histoire, géographie, politique, faits généraux, connaissances générales, aptitude verbale. 
  DOIT ÊTRE EN FRANÇAIS. PAS de questions de logique/math.
  
- LOG (Logique): Aptitude Numérique et Organisation. Questions de logique, mathématiques, séquences, raisonnement.
  DOIT ÊTRE EN FRANÇAIS. PAS de culture générale.
  
- ANG (Anglais): Grammaire anglaise, vocabulaire anglais UNIQUEMENT.
  PAS de culture générale ni de logique.

VÉRIFICATIONS:
1. La langue correspond-elle à la catégorie? (CG/LOG = français, ANG = anglais)
2. Le contenu correspond-il à la catégorie?
3. Y a-t-il des mots anglais dans une question CG ou LOG?

Répondez en JSON:
{{
    "category_match": true/false,
    "detected_category": "CG"|"LOG"|"ANG",
    "language_correct": true/false,
    "issues": ["liste des problèmes"],
    "reason": "explication"
}}"""

        gemini_result = None
        openai_result = None
        
        # Gemini check
        try:
            async def _gemini_check():
                return await self._call_llm_with_semaphore(
                    self.gemini_pro.generate_content_async(
                        prompt,
                        generation_config={'temperature': 0.1}
                    )
                )
            
            response = await retry_async(_gemini_check)
            match = re.search(r'\{[^{}]*\}', response.text, re.DOTALL)
            if match:
                gemini_result = json.loads(match.group())
        except Exception as e:
            logger.warning(f"Gemini category check error: {e}")
        
        # OpenAI check (if available)
        if HAS_OPENAI and openai_client:
            try:
                async def _openai_check():
                    return await self._call_llm_with_semaphore(
                        openai_client.chat.completions.create(
                            model=GPT_MODEL,
                            messages=[{"role": "user", "content": prompt}],
                            response_format={"type": "json_object"}
                        )
                    )
                
                response = await retry_async(_openai_check)
                content = response.choices[0].message.content
                match = re.search(r'\{[^{}]*\}', content, re.DOTALL)
                if match:
                    openai_result = json.loads(match.group())
            except Exception as e:
                logger.warning(f"OpenAI category check error: {e}")
        
        # Evaluate results - flag if EITHER model detects issues
        should_flag = False
        
        if gemini_result:
            if not gemini_result.get('category_match', True) or not gemini_result.get('language_correct', True):
                should_flag = True
                detected = gemini_result.get('detected_category', subject)
                reason = gemini_result.get('reason', 'Category mismatch')
                issues.append(f"CATEGORY_MISMATCH: [Gemini] Declared {subject}, detected {detected}")
                issues.append(f"CATEGORY_MISMATCH: {reason}")
                for issue in gemini_result.get('issues', []):
                    issues.append(f"CATEGORY_MISMATCH: {issue}")
        
        if openai_result and not should_flag:
            if not openai_result.get('category_match', True) or not openai_result.get('language_correct', True):
                should_flag = True
                detected = openai_result.get('detected_category', subject)
                reason = openai_result.get('reason', 'Category mismatch')
                issues.append(f"CATEGORY_MISMATCH: [OpenAI] Declared {subject}, detected {detected}")
                issues.append(f"CATEGORY_MISMATCH: {reason}")
        
        passed = not should_flag
        self.stats['9_category']['passed' if passed else 'failed'] += 1
        return passed, issues
    
    # =========================================================================
    # CHECKPOINT 10: Explanation Quality Check (LLM - Gemini)
    # =========================================================================
    async def check_explanation_quality(self, question: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        LLM check: Explanation should be in French and address why the correct answer is correct.
        """
        issues = []
        
        text = question.get('text', '')
        explanation = question.get('explanation', '')
        correct_text = question.get('correct_text', '')
        
        if not explanation or len(explanation.strip()) < 10:
            issues.append("EXPLANATION: Missing or too short explanation")
            self.stats['10_explanation']['failed'] += 1
            return False, issues
        
        prompt = f"""Évaluez la qualité de cette EXPLICATION de réponse.

QUESTION: {text}
RÉPONSE CORRECTE: {correct_text}
EXPLICATION: {explanation}

CRITÈRES:
1. L'explication est-elle en FRANÇAIS?
2. L'explication explique-t-elle POURQUOI la réponse est correcte?
3. L'explication est-elle pertinente et utile?
4. L'explication est-elle claire et bien écrite?

Répondez en JSON:
{{
    "is_french": true/false,
    "explains_answer": true/false,
    "is_relevant": true/false,
    "quality_score": 0.0-1.0,
    "issues": ["liste des problèmes"],
    "reason": "explication courte"
}}"""

        try:
            async def _check():
                return await self._call_llm_with_semaphore(
                    self.gemini_flash.generate_content_async(
                        prompt,
                        generation_config={'temperature': 0.1}
                    )
                )
            
            response = await retry_async(_check)
            match = re.search(r'\{[^{}]*\}', response.text, re.DOTALL)
            if match:
                result = json.loads(match.group())
                
                if not result.get('is_french', True):
                    issues.append("EXPLANATION: Not in French")
                if not result.get('explains_answer', True):
                    issues.append("EXPLANATION: Does not explain why the answer is correct")
                if not result.get('is_relevant', True):
                    issues.append("EXPLANATION: Not relevant to the question")
                
                quality = result.get('quality_score', 1.0)
                if quality < 0.5:
                    issues.append(f"EXPLANATION: Low quality score ({quality:.2f})")
                    
                for issue in result.get('issues', []):
                    if issue not in str(issues):
                        issues.append(f"EXPLANATION: {issue}")
                        
        except json.JSONDecodeError as e:
            logger.warning(f"JSON parse error in explanation check: {e}")
        except Exception as e:
            logger.warning(f"Explanation check error: {type(e).__name__}: {e}")
        
        passed = len(issues) == 0
        self.stats['10_explanation']['passed' if passed else 'failed'] += 1
        return passed, issues
    
    # =========================================================================
    # MAIN VALIDATION RUNNER
    # =========================================================================
    async def validate(self, question: Dict[str, Any], output_filename: str = "") -> ValidationResult:
        """
        Run all 10 validation checkpoints on a question.
        
        Checkpoint order (fail-fast where possible):
        1. Structural integrity (NO LLM) - BLOCKING
        2. Prefix detection (NO LLM) - NON-BLOCKING (cleans text)
        3-5. LLM checks run in parallel for efficiency
        6. Fuzzy duplicate (NO LLM) - BLOCKING
        7. Semantic duplicate (LLM) - BLOCKING
        8. Same correct answer (NO LLM) - BLOCKING
        9. Category validation (LLM) - BLOCKING
        10. Explanation quality (LLM) - BLOCKING
        """
        all_issues = []
        cleaned_text = None
        
        # =====================================================================
        # PHASE 1: Non-LLM structural checks (fast, fail early)
        # =====================================================================
        
        # Checkpoint 1: Structural integrity
        passed, issues = self.check_structural_integrity(question)
        all_issues.extend(issues)
        if not passed:
            return ValidationResult(passed=False, issues=all_issues)
        
        # Checkpoint 2: Prefix detection (non-blocking)
        _, issues, cleaned = self.check_prefix_detection(question)
        all_issues.extend(issues)
        if cleaned:
            cleaned_text = cleaned
            # Update question text for subsequent checks
            question = dict(question)
            question['text'] = cleaned
        
        # Checkpoint 6: Fuzzy duplicate check
        passed, issues = self.check_fuzzy_duplicate(question, output_filename)
        all_issues.extend(issues)
        if not passed:
            return ValidationResult(passed=False, issues=all_issues, cleaned_text=cleaned_text)
        
        # Checkpoint 8: Same correct answer check
        passed, issues = self.check_same_correct_answer(question, output_filename)
        all_issues.extend(issues)
        if not passed:
            return ValidationResult(passed=False, issues=all_issues, cleaned_text=cleaned_text)
        
        # =====================================================================
        # PHASE 2: LLM checks (run in parallel for efficiency)
        # =====================================================================
        
        try:
            # Run LLM checks in parallel
            results = await asyncio.gather(
                self.check_text_quality_clarity(question),
                self.check_content_restrictions(question),
                self.check_correct_answer(question),
                self.check_semantic_duplicate(question, output_filename),
                self.check_category_validation(question),
                self.check_explanation_quality(question),
                return_exceptions=True
            )
            
            # Process results
            check_names = [
                'clarity', 'content_restrictions', 'answer_validation',
                'semantic_duplicate', 'category', 'explanation'
            ]
            
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.warning(f"LLM check '{check_names[i]}' failed with exception: {result}")
                    continue
                
                passed, issues = result
                all_issues.extend(issues)
                
                # These checks are blocking
                if not passed and check_names[i] in ['clarity', 'content_restrictions', 'answer_validation', 
                                                       'semantic_duplicate', 'category', 'explanation']:
                    return ValidationResult(passed=False, issues=all_issues, cleaned_text=cleaned_text)
                    
        except Exception as e:
            logger.error(f"Error running LLM validation checks: {e}")
            all_issues.append(f"VALIDATION_ERROR: {str(e)}")
        
        # =====================================================================
        # All checks passed
        # =====================================================================
        
        return ValidationResult(
            passed=True,
            issues=all_issues,
            cleaned_text=cleaned_text
        )
    
    def add_to_ingested(self, question: Dict[str, Any], output_filename: str):
        """
        Add a validated question to the ingested pool for duplicate checking.
        """
        self.ingested_questions.append(question)
        self.ingested_by_file[output_filename].append(question)
        
        # Store correct answer
        correct_text = question.get('correct_text', '')
        if correct_text:
            self.correct_answers_by_file['_all'].append(correct_text)
            self.correct_answers_by_file[output_filename].append(correct_text)
    
    def get_stats_summary(self) -> Dict[str, Dict[str, int]]:
        """Return validation statistics."""
        return dict(self.stats)
    
    def print_stats(self):
        """Print formatted validation statistics."""
        logger.info("\n" + "=" * 60)
        logger.info("VALIDATION STATISTICS")
        logger.info("=" * 60)
        
        total_passed = 0
        total_failed = 0
        
        for checkpoint, counts in sorted(self.stats.items()):
            passed = counts.get('passed', 0)
            failed = counts.get('failed', 0)
            cleaned = counts.get('cleaned', 0)
            flagged = counts.get('flagged', 0)
            
            total_passed += passed
            total_failed += failed
            
            status_parts = [f"✓ {passed}"]
            if failed > 0:
                status_parts.append(f"✗ {failed}")
            if cleaned > 0:
                status_parts.append(f"🔧 {cleaned}")
            if flagged > 0:
                status_parts.append(f"⚠ {flagged}")
            
            logger.info(f"  {checkpoint}: {', '.join(status_parts)}")
        
        logger.info("-" * 60)
        logger.info(f"  TOTAL: {total_passed} passed, {total_failed} failed")
        logger.info("=" * 60)


# =============================================================================
# ROW CONVERTERS
# =============================================================================

class RowConverter:
    """
    Convert rows from legacy `questions` table and `questions_v2` table
    to the unified QuestionFinal format.
    """
    
    @staticmethod
    def from_legacy_questions(row: Dict[str, Any], category: str) -> Optional[Dict[str, Any]]:
        """
        Convert a row from the legacy `questions` table to QuestionFinal format.
        
        Legacy schema:
        - id, question_text, answer1, answer2, answer3, answer4
        - correct ('A'|'B'|'C'|'D'), explanation, category, sub_category
        - exam_type, difficulty, test_type, test_number, passage_id
        """
        try:
            # Extract options (filter out empty)
            options = []
            for key in ['answer1', 'answer2', 'answer3', 'answer4']:
                val = row.get(key, '')
                if val and str(val).strip():
                    options.append(str(val).strip())
            
            if len(options) < 2:
                return None
            
            # Map correct letter to index (normalize to uppercase first)
            correct_letter = row.get('correct', '').strip().upper()
            correct_index = None
            if correct_letter in ['A', 'B', 'C', 'D']:
                correct_index = ord(correct_letter) - ord('A')
                if correct_index >= len(options):
                    correct_index = None
            
            if correct_index is None:
                return None
            
            correct_text = options[correct_index]
            
            # Normalize difficulty
            raw_difficulty = row.get('difficulty', 'MEDIUM')
            difficulty = DIFFICULTY_MAP.get(raw_difficulty.upper(), 'MEDIUM')
            
            return {
                'text': row.get('question_text', ''),
                'options': options,
                'correct_index': correct_index,
                'correct_text': correct_text,
                'explanation': row.get('explanation', ''),
                'subject': row.get('category'),
                'difficulty': difficulty,
                'test_type': category,  # Use the standardized category
                'exam_type': row.get('exam_type'),
                'source_table': 'questions',
                'source_id': row.get('id', ''),
                'test_number': None,
                'question_number': None,
            }
        except Exception as e:
            logger.warning(f"Error converting legacy row {row.get('id')}: {e}")
            return None
    
    @staticmethod
    def from_questions_v2(row: Dict[str, Any], category: str) -> Optional[Dict[str, Any]]:
        """
        Convert a row from the `questions_v2` table to QuestionFinal format.
        
        V2 schema:
        - id, text, options (jsonb), correct_index
        - explanation, subject, exam_type, difficulty
        - test_type, test_number, is_ai_generated, passage_id, metadata
        """
        try:
            options = row.get('options', [])
            if not options or len(options) < 2:
                return None
            
            correct_index = row.get('correct_index')
            if correct_index is None or correct_index >= len(options):
                return None
            
            correct_text = options[correct_index]
            
            return {
                'text': row.get('text', ''),
                'options': options,
                'correct_index': correct_index,
                'correct_text': correct_text,
                'explanation': row.get('explanation', ''),
                'subject': row.get('subject', 'CG'),
                'difficulty': row.get('difficulty', 'MEDIUM'),
                'test_type': category,  # Use the standardized category
                'exam_type': row.get('exam_type', 'CM'),
                'source_table': 'questions_v2',
                'source_id': row.get('id', ''),
                'test_number': None,
                'question_number': None,
            }
        except Exception as e:
            logger.warning(f"Error converting V2 row {row.get('id')}: {e}")
            return None


# =============================================================================
# DATA FETCHERS
# =============================================================================

class DataFetcher:
    """
    Fetch questions from both tables with pagination.
    """
    
    @staticmethod
    def fetch_from_legacy_questions(test_types: List[str], exam_type: str) -> List[Dict[str, Any]]:
        """
        Fetch questions from legacy `questions` table matching criteria.
        
        Handles pagination for large datasets.
        """
        all_rows = []
        page_size = 1000
        
        for test_type in test_types:
            offset = 0
            while True:
                query = supabase.table('questions').select('*')
                query = query.eq('test_type', test_type)
                query = query.eq('exam_type', exam_type)
                query = query.range(offset, offset + page_size - 1)
                
                response = query.execute()
                batch = response.data or []
                
                if not batch:
                    break
                
                all_rows.extend(batch)
                offset += len(batch)
                
                if len(batch) < page_size:
                    break
        
        return all_rows
    
    @staticmethod
    def fetch_from_questions_v2(test_types: List[str], exam_type: str) -> List[Dict[str, Any]]:
        """
        Fetch questions from `questions_v2` table matching criteria.
        
        Handles pagination for large datasets.
        """
        all_rows = []
        page_size = 1000
        
        for test_type in test_types:
            offset = 0
            while True:
                query = supabase.table('questions_v2').select('*')
                query = query.eq('test_type', test_type)
                query = query.eq('exam_type', exam_type)
                query = query.range(offset, offset + page_size - 1)
                
                response = query.execute()
                batch = response.data or []
                
                if not batch:
                    break
                
                all_rows.extend(batch)
                offset += len(batch)
                
                if len(batch) < page_size:
                    break
        
        return all_rows


# =============================================================================
# MAIN INGESTION ENGINE
# =============================================================================

class QuestionIngestionEngine:
    """
    Main engine for ingesting questions into questions_final.
    Uses async/await for LLM-based validation checks.
    """
    
    def __init__(self):
        self.validator = QuestionValidator()
        self.results = defaultdict(list)  # {filename: [questions]}
        self.failed_questions = defaultdict(list)  # {filename: [failed_questions]}
    
    def _load_existing_final_questions(self, cli_test_type: str, exam_type: str) -> List[Dict[str, Any]]:
        """
        Load existing questions from questions_final for the given test_type/exam_type.
        
        Uses CLI_TEST_TYPE_NORMALIZATION and DB_TEST_TYPE_MAP to map CLI-facing
        values (exam, practice_test) to DB test_type values (exam_blanc, practice).
        """
        internal_type = CLI_TEST_TYPE_NORMALIZATION.get(cli_test_type, cli_test_type)
        db_test_type = DB_TEST_TYPE_MAP.get(internal_type)
        if not db_test_type:
            logger.warning(f"Unsupported test_type for questions_final lookup: {cli_test_type} (internal={internal_type})")
            return []
        
        logger.info(f"\n#pulling existing questions from questions_final table...#")
        logger.info(f"-> Filters: exam_type={exam_type}, test_type={db_test_type}")
        
        all_rows: List[Dict[str, Any]] = []
        page_size = 1000
        offset = 0
        
        while True:
            query = supabase.table('questions_final').select('*')
            query = query.eq('exam_type', exam_type)
            query = query.eq('test_type', db_test_type)
            query = query.range(offset, offset + page_size - 1)
            
            response = query.execute()
            batch = response.data or []
            if not batch:
                break
            
            all_rows.extend(batch)
            offset += len(batch)
            if len(batch) < page_size:
                break
        
        logger.info(f"-> Found {len(all_rows)} existing questions in questions_final")
        return all_rows

    def _preload_validator_with_existing(self, existing_rows: List[Dict[str, Any]]):
        """
        Seed the validator's duplicate caches with questions already present
        in questions_final to avoid selecting near-duplicates.
        """
        if not existing_rows:
            return
        
        logger.info("-> Pre-loading validator with existing questions_final entries for duplicate checks")
        for row in existing_rows:
            try:
                options = row.get('options') or []
                correct_index = row.get('correct_index', 0)
                correct_text = row.get('correct_text') or (
                    options[correct_index] if options and 0 <= correct_index < len(options) else ''
                )
                q = {
                    'text': row.get('text', ''),
                    'options': options,
                    'correct_index': correct_index,
                    'correct_text': correct_text,
                    'explanation': row.get('explanation', ''),
                    'subject': row.get('subject', 'CG'),
                    'difficulty': row.get('difficulty', 'MEDIUM'),
                    'test_type': row.get('test_type', ''),
                    'exam_type': row.get('exam_type', ''),
                    'source_table': 'questions_final',
                    'source_id': str(row.get('id', '')),
                    'test_number': row.get('test_number'),
                    'question_number': row.get('question_number'),
                }
                self.validator.add_to_ingested(q, 'questions_final')
            except Exception as e:
                logger.warning(f"Error pre-loading existing questions_final row into validator: {e}")

    def _compute_missing_slots(
        self,
        cli_test_type: str,
        exam_type: str,
        existing_rows: List[Dict[str, Any]],
    ) -> Tuple[Dict[str, List[Tuple[int, int]]], Dict[str, Any]]:
        """
        Strict-mode gap detection:
        - For exam: expect 20 tests × 60 Q/test with ANG(1-20), CG(21-40), LOG(41-60)
        - For practice/practice_test: per subject expect 20 tests × 15 Q/test
        
        Returns:
            missing_slots_by_subject: {subject: [(test_number, question_number), ...]}
            summary: high-level stats for logging/metadata
        """
        internal_type = CLI_TEST_TYPE_NORMALIZATION.get(cli_test_type, cli_test_type)
        
        # Build set of existing (subject, test_number, question_number) slots
        existing_slots_by_subject: Dict[str, set] = defaultdict(set)
        existing_unassigned = 0
        for row in existing_rows:
            subj = row.get('subject')
            tnum = row.get('test_number')
            qnum = row.get('question_number')
            if subj in SUBJECTS and isinstance(tnum, int) and isinstance(qnum, int):
                existing_slots_by_subject[subj].add((tnum, qnum))
            else:
                existing_unassigned += 1
        
        missing_slots_by_subject: Dict[str, List[Tuple[int, int]]] = defaultdict(list)
        summary: Dict[str, Any] = {
            'exam_type': exam_type,
            'cli_test_type': cli_test_type,
            'internal_test_type': internal_type,
            'total_existing': len(existing_rows),
            'existing_unassigned': existing_unassigned,
            'by_subject': {},
        }
        
        if internal_type == 'exam':
            config = EXAM_CONFIG
            num_tests = config['num_tests']
            q_per_subj = config['questions_per_test_per_subject']
            subject_order = config['subject_order']
            offsets = config['subject_offsets']
            
            logger.info("\n##Existing coverage in questions_final (exam mode / strict)##")
            for subject in subject_order:
                expected_slots: List[Tuple[int, int]] = []
                for test_number in range(1, num_tests + 1):
                    for pos in range(1, q_per_subj + 1):
                        question_number = offsets[subject] + pos
                        expected_slots.append((test_number, question_number))
                
                existing_slots = existing_slots_by_subject.get(subject, set())
                missing_for_subject: List[Tuple[int, int]] = [
                    slot for slot in expected_slots if slot not in existing_slots
                ]
                missing_slots_by_subject[subject] = missing_for_subject
                
                summary['by_subject'][subject] = {
                    'expected': len(expected_slots),
                    'existing': len(existing_slots),
                    'missing': len(missing_for_subject),
                }
                
                logger.info(
                    f"  {subject}: existing={len(existing_slots)}/{len(expected_slots)} "
                    f"({len(missing_for_subject)} missing)"
                )
        elif internal_type == 'practice':
            config = PRACTICE_CONFIG
            num_tests = config['num_tests_per_subject']
            q_per_test = config['questions_per_test']
            
            logger.info("\n##Existing coverage in questions_final (practice mode / strict)##")
            for subject in SUBJECTS:
                expected_slots: List[Tuple[int, int]] = []
                for test_number in range(1, num_tests + 1):
                    for qnum in range(1, q_per_test + 1):
                        expected_slots.append((test_number, qnum))
                
                existing_slots = existing_slots_by_subject.get(subject, set())
                missing_for_subject: List[Tuple[int, int]] = [
                    slot for slot in expected_slots if slot not in existing_slots
                ]
                missing_slots_by_subject[subject] = missing_for_subject
                
                summary['by_subject'][subject] = {
                    'expected': len(expected_slots),
                    'existing': len(existing_slots),
                    'missing': len(missing_for_subject),
                }
                
                logger.info(
                    f"  {subject}: existing={len(existing_slots)}/{len(expected_slots)} "
                    f"({len(missing_for_subject)} missing)"
                )
        else:
            logger.info(f"\n-> Strict gap detection not implemented for test_type={cli_test_type} (internal={internal_type})")
        
        total_missing = sum(v['missing'] for v in summary['by_subject'].values())
        summary['total_missing'] = total_missing
        
        if total_missing == 0:
            logger.info("\n-> All tests are complete in questions_final for this test_type/exam_type (strict mode).")
        else:
            logger.info(f"\n-> Detected {total_missing} missing slots across all subjects (strict mode).")
        
        return missing_slots_by_subject, summary

    async def fill_gaps_from_sources(
        self,
        internal_test_type: str,
        cli_test_type: str,
        exam_type: str,
        missing_slots_by_subject: Dict[str, List[Tuple[int, int]]],
    ) -> List[Dict[str, Any]]:
        """
        Pull candidate questions from legacy `questions` and `questions_v2`, run
        them through the 10-check validator, and assign only enough validated
        questions to fill the exact missing (subject, test_number, question_number)
        slots in strict mode.
        """
        # Compute how many questions we actually need per subject
        total_needed = sum(len(slots) for slots in missing_slots_by_subject.values())
        if total_needed == 0:
            logger.info("-> No gaps to fill from legacy tables.")
            return []
        
        logger.info(f"\n#pulling questions from questions table...#")
        legacy_test_types = CATEGORY_TO_LEGACY_TEST_TYPES.get(internal_test_type, [])
        legacy_rows = DataFetcher.fetch_from_legacy_questions(legacy_test_types, exam_type)
        logger.info(f"-> Fetched {len(legacy_rows)} questions from legacy table")
        
        logger.info(f"\n#pulling questions from questions_v2 table...#")
        v2_test_types = CATEGORY_TO_V2_TEST_TYPES.get(internal_test_type, [])
        v2_rows = DataFetcher.fetch_from_questions_v2(v2_test_types, exam_type)
        logger.info(f"-> Fetched {len(v2_rows)} questions from questions_v2 table")
        
        logger.info(f"\n#converting row format to new format for questions_final#")
        converted_questions: List[Dict[str, Any]] = []
        
        # Convert legacy rows
        for row in legacy_rows:
            converted = RowConverter.from_legacy_questions(row, internal_test_type)
            if converted:
                converted_questions.append(converted)
        
        logger.info(
            f"-> Converted {len([q for q in converted_questions if q['source_table'] == 'questions'])} legacy questions"
        )
        
        # Convert V2 rows
        v2_converted_count = 0
        for row in v2_rows:
            converted = RowConverter.from_questions_v2(row, internal_test_type)
            if converted:
                converted_questions.append(converted)
                v2_converted_count += 1
        
        logger.info(f"-> Converted {v2_converted_count} V2 questions")
        
        if not converted_questions:
            logger.info("-> No questions available in legacy tables to fill gaps.")
            return []
        
        # Filename key used for validator stats / duplicate buckets (not actual output)
        filename_key = f"{exam_type.lower()}_{internal_test_type}_gap_fill"
        
        # Run validation and stop once all gaps are filled
        logger.info(f"\n##question verification (gap filling)##")
        logger.info(f"-> Need to fill {total_needed} missing slots across subjects")
        logger.info(
            "-> Checkpoints: structural, prefix, clarity, content, answer, "
            "fuzzy-dup, semantic-dup, same-answer, category, explanation"
        )
        
        filled_questions: List[Dict[str, Any]] = []
        failed_count = 0
        
        # Simple subject-wise slots holder we can mutate
        remaining_slots: Dict[str, List[Tuple[int, int]]] = {
            subj: list(slots) for subj, slots in missing_slots_by_subject.items()
        }
        
        batch_size = LLM_BATCH_SIZE
        total_batches = (len(converted_questions) + batch_size - 1) // batch_size
        
        for batch_idx in range(total_batches):
            start_idx = batch_idx * batch_size
            end_idx = min(start_idx + batch_size, len(converted_questions))
            batch = converted_questions[start_idx:end_idx]
            
            logger.info(f"   Batch {batch_idx + 1}/{total_batches} ({len(batch)} questions)...")
            
            for q in batch:
                # Stop early once all gaps filled
                if len(filled_questions) >= total_needed:
                    break
                
                subject = q.get('subject') or 'CG'
                subject_slots = remaining_slots.get(subject, [])
                if not subject_slots:
                    # No remaining slots for this subject
                    continue
                
                try:
                    result = await self.validator.validate(q, filename_key)
                    
                    if result.passed:
                        # Apply cleaned text if prefix was detected
                        if result.cleaned_text:
                            q['text'] = result.cleaned_text
                        q['validation_notes'] = result.issues
                        q['validation_status'] = "validated"
                        q['llm_confidence'] = None  # Placeholder; detailed scoring not aggregated here
                        
                        # Assign the next available strict slot for this subject
                        slot_test_number, slot_question_number = subject_slots.pop(0)
                        q['test_number'] = slot_test_number
                        q['question_number'] = slot_question_number
                        # For output, keep CLI-facing test_type (e.g. "exam", "practice_test")
                        q['test_type'] = cli_test_type
                        
                        filled_questions.append(q)
                        
                        # Add to validator's ingested pool for duplicate checking
                        self.validator.add_to_ingested(q, filename_key)
                    else:
                        failed_count += 1
                        self.failed_questions[f"{exam_type.lower()}_{internal_test_type}"].append({
                            'question': q,
                            'issues': result.issues
                        })
                except Exception as e:
                    logger.error(f"   Error validating question {q.get('source_id', 'unknown')}: {e}")
                    failed_count += 1
                    self.failed_questions[f"{exam_type.lower()}_{internal_test_type}"].append({
                        'question': q,
                        'issues': [f"VALIDATION_ERROR: {str(e)}"]
                    })
            
            if len(filled_questions) >= total_needed:
                break
            
            # Small delay between batches to avoid rate limits
            if batch_idx < total_batches - 1:
                await asyncio.sleep(0.5)
        
        logger.info(
            f"-> Gap filling validation complete: {len(filled_questions)} selected, {failed_count} rejected/failed"
        )
        return filled_questions
    
    @staticmethod
    def format_question_for_output(question: Dict[str, Any], index: int) -> Dict[str, Any]:
        """
        Format a question for JSON output with proper field ordering.
        
        Output format (per question):
        {
            "id": "",
            "text": "...",
            "options": [...],
            "correct_index": 0,
            "correct_text": "...",
            "explanation": "...",
            "subject": "ANG",
            "difficulty": "MEDIUM",
            "test_type": "exam" | "practice_test",
            "exam_type": "CM" | "CMS" | "CS",
            "test_number": 1,
            "question_number": 5,
            "llm_confidence": null,
            "validation_status": "validated",
            "validation_notes": [...]
        }
        """
        return {
            'id': '',  # Empty for manual assignment or DB auto-generation
            'text': question.get('text', ''),
            'options': question.get('options', []),
            'correct_index': question.get('correct_index', 0),
            'correct_text': question.get('correct_text', ''),
            'explanation': question.get('explanation', ''),
            'subject': question.get('subject', 'CG'),
            'difficulty': question.get('difficulty', 'MEDIUM'),
            # For output, keep the CLI-facing test_type (e.g. "exam", "practice_test")
            'test_type': question.get('test_type', ''),
            'exam_type': question.get('exam_type', ''),
            'test_number': question.get('test_number'),
            'question_number': question.get('question_number'),
            'llm_confidence': question.get('llm_confidence'),
            'validation_status': question.get('validation_status', 'validated'),
            'validation_notes': question.get('validation_notes', []),
        }
    
    def assign_test_question_numbers(
        self, 
        questions: List[Dict[str, Any]], 
        test_type: str
    ) -> List[Dict[str, Any]]:
        """
        Assign test_number and question_number to validated questions.
        
        For 'exam': 
            - 20 combined tests (all subjects in one test)
            - Each test has 60 questions (20 ANG + 20 CG + 20 LOG)
            - Within each test: ANG=1-20, CG=21-40, LOG=41-60
            - test_number: 1-20 (shared across subjects)
            
        For 'practice': 
            - Tests are PER SUBJECT (not combined)
            - Each subject has 20 practice tests × 15 questions
            - test_number: 1-20 (per subject, independent)
            - question_number: 1-15 (within each test)
            
        For 'free_quiz'/'quick_quiz': No assignment, no limits
        
        Args:
            questions: List of validated questions
            test_type: The test type being processed
            
        Returns:
            List of questions with test_number and question_number assigned,
            limited to max allowed per subject for exam/practice.
        """
        # For free_quiz and quick_quiz, return as-is (no limits, no numbers)
        if test_type not in TEST_TYPES_WITH_NUMBERS:
            logger.info(f"\n-> {test_type} does not use test_number/question_number")
            return questions
        
        # Group questions by subject
        by_subject: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for q in questions:
            subject = q.get('subject', 'CG')
            by_subject[subject].append(q)
        
        final_questions = []
        
        if test_type == 'exam':
            # EXAM: Combined tests with subject offsets
            config = EXAM_CONFIG
            num_tests = config['num_tests']
            questions_per_test_per_subject = config['questions_per_test_per_subject']
            questions_per_test_total = config['questions_per_test_total']
            max_per_subject = config['max_per_subject']
            subject_order = config['subject_order']
            subject_offsets = config['subject_offsets']
            
            logger.info(f"\n##Assigning test_number and question_number (EXAM - combined tests)##")
            logger.info(f"-> Config: {num_tests} tests × {questions_per_test_total} questions/test")
            logger.info(f"-> Per subject: {questions_per_test_per_subject} questions/test, {max_per_subject} max total")
            logger.info(f"-> Subject order within each test: {' -> '.join(subject_order)}")
            
            for subject in subject_order:
                subject_questions = by_subject.get(subject, [])
                offset = subject_offsets.get(subject, 0)
                
                if not subject_questions:
                    logger.info(f"-> {subject}: 0 questions available")
                    continue
                
                # Limit to max_per_subject
                limited_questions = subject_questions[:max_per_subject]
                discarded = len(subject_questions) - len(limited_questions)
                
                if discarded > 0:
                    logger.info(f"-> {subject}: {len(subject_questions)} available, {discarded} discarded (limit: {max_per_subject})")
                else:
                    logger.info(f"-> {subject}: {len(limited_questions)} questions to assign")
                
                # Assign test_number and question_number with offset
                for idx, q in enumerate(limited_questions):
                    test_number = (idx // questions_per_test_per_subject) + 1
                    position_in_test = (idx % questions_per_test_per_subject) + 1
                    question_number = offset + position_in_test  # Add subject offset
                    
                    q['test_number'] = test_number
                    q['question_number'] = question_number
                    final_questions.append(q)
                
                # Report coverage
                complete_tests = len(limited_questions) // questions_per_test_per_subject
                remaining = len(limited_questions) % questions_per_test_per_subject
                
                if remaining > 0:
                    logger.info(f"   -> {subject}: {complete_tests} complete tests + {remaining} in test {complete_tests + 1}")
                else:
                    logger.info(f"   -> {subject}: {complete_tests} complete tests")
                logger.info(f"   -> {subject}: question_number range: {offset + 1}-{offset + questions_per_test_per_subject}")
            
            # Sort by test_number, then by question_number (to get proper order within each test)
            final_questions.sort(key=lambda q: (q.get('test_number', 0), q.get('question_number', 0)))
            
        else:  # practice
            # PRACTICE: Tests are per subject (not combined)
            config = PRACTICE_CONFIG
            num_tests = config['num_tests_per_subject']
            questions_per_test = config['questions_per_test']
            max_per_subject = config['max_per_subject']
            
            logger.info(f"\n##Assigning test_number and question_number (PRACTICE - per subject)##")
            logger.info(f"-> Config: {num_tests} tests per subject × {questions_per_test} questions/test")
            logger.info(f"-> Max per subject: {max_per_subject} questions")
            
            for subject in SUBJECTS:
                subject_questions = by_subject.get(subject, [])
                
                if not subject_questions:
                    logger.info(f"-> {subject}: 0 questions available")
                    continue
                
                # Limit to max_per_subject
                limited_questions = subject_questions[:max_per_subject]
                discarded = len(subject_questions) - len(limited_questions)
                
                if discarded > 0:
                    logger.info(f"-> {subject}: {len(subject_questions)} available, {discarded} discarded (limit: {max_per_subject})")
                else:
                    logger.info(f"-> {subject}: {len(limited_questions)} questions to assign")
                
                # Assign test_number and question_number (no offset, each test is single-subject)
                for idx, q in enumerate(limited_questions):
                    test_number = (idx // questions_per_test) + 1  # 1-20
                    question_number = (idx % questions_per_test) + 1  # 1-15
                    
                    q['test_number'] = test_number
                    q['question_number'] = question_number
                    final_questions.append(q)
                
                # Report coverage
                complete_tests = len(limited_questions) // questions_per_test
                remaining = len(limited_questions) % questions_per_test
                
                if remaining > 0:
                    logger.info(f"   -> {subject}: {complete_tests} complete tests + {remaining} in test {complete_tests + 1}")
                else:
                    logger.info(f"   -> {subject}: {complete_tests} complete tests")
                logger.info(f"   -> {subject}: test_number range: 1-{num_tests}, question_number range: 1-{questions_per_test}")
            
            # Sort by subject, then test_number, then question_number
            subject_order_map = {s: i for i, s in enumerate(SUBJECTS)}
            final_questions.sort(key=lambda q: (
                subject_order_map.get(q.get('subject', 'CG'), 99),
                q.get('test_number', 0),
                q.get('question_number', 0)
            ))
        
        logger.info(f"-> Total questions with numbers assigned: {len(final_questions)}")
        
        return final_questions
    
    async def run_async(self, test_type: str, exam_type: str, dry_run: bool = False):
        """
        Run the full ingestion pipeline (async version).
        
        Args:
            test_type: One of 'exam', 'practice', 'free_quiz', 'quick_quiz'
            exam_type: One of 'CM', 'CMS', 'CS'
            dry_run: If True, only validate without writing output files
        """
        logger.info("=" * 60)
        logger.info("##Question ingestion script starting...##")
        logger.info("=" * 60)
        logger.info("")
        logger.info(f"Processing: test_type={test_type}, exam_type={exam_type}")
        logger.info("")
        
        internal_test_type = CLI_TEST_TYPE_NORMALIZATION.get(test_type, test_type)
        if internal_test_type not in ['exam', 'practice']:
            logger.error(
                f"Unsupported test_type for strict gap filling: {test_type} "
                f"(normalized to {internal_test_type}). Only 'exam' and 'practice_test'/'practice' are supported."
            )
            return
        
        # Show configuration for this test_type
        if internal_test_type == 'exam':
            config = EXAM_CONFIG
            logger.info(f"Configuration: {config['num_tests']} combined tests × {config['questions_per_test_total']} questions/test")
            logger.info(f"Per subject: {config['questions_per_test_per_subject']} questions/test")
            logger.info(f"Subject order within each test: {' -> '.join(config['subject_order'])}")
            logger.info(f"Max per subject: {config['max_per_subject']} questions")
        elif internal_test_type == 'practice':
            config = PRACTICE_CONFIG
            logger.info(f"Configuration: Tests are PER SUBJECT (not combined)")
            logger.info(f"Each subject: {config['num_tests_per_subject']} tests × {config['questions_per_test']} questions/test")
            logger.info(f"Max per subject: {config['max_per_subject']} questions")
        else:
            logger.info("Configuration: No limits (free_quiz/quick_quiz)")
        
        logger.info("")
        logger.info("This script validates questions through 10 strict checkpoints:")
        logger.info("  1. Structural integrity (text, options, correct_index)")
        logger.info("  2. Prefix detection (Q5., 15-, etc.)")
        logger.info("  3. Text clarity check (LLM - no ambiguity)")
        logger.info("  4. Content restrictions (LLM - no politics/soccer/trivial)")
        logger.info("  5. Correct answer validation (LLM)")
        logger.info("  6. Fuzzy duplicate detection (>=75% similarity)")
        logger.info("  7. Semantic duplicate detection (LLM, >=0.6 score)")
        logger.info("  8. Same correct answer detection (>=85% similarity)")
        logger.info("  9. Category validation (LLM - Gemini + OpenAI)")
        logger.info(" 10. Explanation quality (LLM - French, addresses answer)")
        logger.info("")
        
        # Process the specified test_type and exam_type in STRICT GAP-FILL mode
        logger.info(f"\n{'=' * 60}")
        logger.info(f"#Processing {exam_type} / {test_type} (strict gap fill)#")
        logger.info(f"{'=' * 60}")
        
        # 1. Load existing rows from questions_final and compute gaps
        existing_rows = self._load_existing_final_questions(test_type, exam_type)
        self._preload_validator_with_existing(existing_rows)
        missing_slots_by_subject, gap_summary = self._compute_missing_slots(
            test_type, exam_type, existing_rows
        )
        
        if gap_summary.get('total_missing', 0) == 0:
            logger.info("\n-> No gaps detected. All tests are complete. Nothing to generate.")
            return
        
        # 2. Fill gaps from legacy tables using the 10-check validator
        final_questions = await self.fill_gaps_from_sources(
            internal_test_type=internal_test_type,
            cli_test_type=test_type,
            exam_type=exam_type,
            missing_slots_by_subject=missing_slots_by_subject,
        )
        
        # Generate output filename: {exam_type}_{test_type}_ready.json (exam_type lowercased)
        filename = f"{exam_type.lower()}_{test_type}_ready.json"
        
        if dry_run:
            logger.info(f"\n{'=' * 60}")
            logger.info("##DRY RUN - No files written##")
            logger.info(f"{'=' * 60}")
            logger.info(f"Would write {len(final_questions)} questions to {filename}")
        else:
            # Write output file
            logger.info(f"\n{'=' * 60}")
            logger.info("##Writing output files##")
            logger.info(f"{'=' * 60}")
            
            if final_questions:
                output_path = OUTPUT_DIR / filename
                
                # Format questions for output with proper field ordering
                formatted_questions = [
                    self.format_question_for_output(q, i) 
                    for i, q in enumerate(final_questions)
                ]
                
                # Build output with proper structure
                output_data = {
                    'generated_at': datetime.now().isoformat(),
                    'test_type': test_type,
                    'exam_type': exam_type,
                    'gap_summary': gap_summary,
                    'count': len(formatted_questions),
                    'by_subject': {},
                    'validation_checkpoints': [
                        '1_structural', '2_prefix', '3_clarity', '4_content_restrictions',
                        '5_answer_validation', '6_fuzzy_duplicate', '7_semantic_duplicate',
                        '8_same_answer', '9_category', '10_explanation'
                    ],
                    'questions': formatted_questions
                }
                
                # Count by subject
                for subj in SUBJECTS:
                    subj_count = len([q for q in formatted_questions if q.get('subject') == subj])
                    output_data['by_subject'][subj] = subj_count
                
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(output_data, f, indent=2, ensure_ascii=False)
                    
                logger.info(f"\n##writing output file: {filename}##")
                logger.info(f"-> {len(final_questions)} questions ready for manual verification")
                for subj, count in output_data['by_subject'].items():
                    logger.info(f"   {subj}: {count} questions")
            
            # Write failed questions report
            total_failed = sum(len(v) for v in self.failed_questions.values())
            if total_failed > 0:
                failed_filename = f"{exam_type.lower()}_{test_type}_failed.json"
                failed_path = OUTPUT_DIR / failed_filename
                with open(failed_path, 'w', encoding='utf-8') as f:
                    json.dump({
                        'generated_at': datetime.now().isoformat(),
                        'test_type': test_type,
                        'exam_type': exam_type,
                        'total_failed': total_failed,
                        'details': dict(self.failed_questions)
                    }, f, indent=2, ensure_ascii=False)
                logger.info(f"\n##writing failed questions report: {failed_filename}##")
                logger.info(f"-> {total_failed} failed questions documented")
        
        # Print summary
        total_passed = len(final_questions)
        total_failed = sum(len(v) for v in self.failed_questions.values())
        
        logger.info(f"\n{'=' * 60}")
        logger.info("##SUMMARY##")
        logger.info(f"{'=' * 60}")
        logger.info(f"Test Type: {test_type}")
        logger.info(f"Exam Type: {exam_type}")
        logger.info(f"Total questions passed validation: {total_passed}")
        logger.info(f"Total questions failed validation: {total_failed}")
        
        if test_type in TEST_TYPES_WITH_NUMBERS:
            # Show test coverage
            if test_type == 'exam':
                config = EXAM_CONFIG
                num_tests = config['num_tests']
            else:
                config = PRACTICE_CONFIG
                num_tests = config['num_tests_per_subject']
            
            for subj in SUBJECTS:
                subj_questions = [q for q in final_questions if q.get('subject') == subj]
                tests_filled = len(set(q.get('test_number') for q in subj_questions if q.get('test_number')))
                logger.info(f"   {subj}: {len(subj_questions)}/{config['max_per_subject']} questions, {tests_filled}/{num_tests} tests")
        
        logger.info(f"Output directory: {OUTPUT_DIR}")
        
        # Validation stats
        self.validator.print_stats()
        
        logger.info(f"\n{'=' * 60}")
        logger.info("###please verify the json produced###")
        logger.info(f"{'=' * 60}")
    
    def run(self, test_type: str, exam_type: str, dry_run: bool = False):
        """
        Synchronous wrapper for async run.
        
        Args:
            test_type: One of 'exam', 'practice', 'free_quiz', 'quick_quiz'
            exam_type: One of 'CM', 'CMS', 'CS'
            dry_run: If True, only validate without writing output files
        """
        asyncio.run(self.run_async(test_type, exam_type, dry_run))


# =============================================================================
# ENTRY POINT
# =============================================================================

def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Ingest cleaned questions into questions_final table',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python question_final_ingestion.py --test_type exam --exam_type CM
  python question_final_ingestion.py --test_type practice_test --exam_type CMS
  python question_final_ingestion.py --test_type free_quiz --exam_type CS

Test Type Configurations:
  exam:       20 COMBINED tests × 60 questions/test (20 ANG + 20 CG + 20 LOG)
              Within each test: ANG=Q1-20, CG=Q21-40, LOG=Q41-60
              Total: 1200 questions (400/subject)
              
  practice_test (alias practice):
              Tests are PER SUBJECT (not combined)
              Each subject: 20 tests × 15 questions/test
              test_number: 1-20 per subject, question_number: 1-15
              Total: 900 questions (300/subject)
              
  free_quiz:  No limits, no test_number/question_number
  quick_quiz: No limits, no test_number/question_number
        """
    )
    parser.add_argument(
        '--test_type',
        type=str,
        choices=TEST_TYPE_CATEGORIES,
        required=True,
        help='Test type to process: exam, practice, free_quiz, or quick_quiz'
    )
    parser.add_argument(
        '--exam_type',
        type=str,
        choices=EXAM_TYPES,
        required=True,
        help='Exam type to process: CM, CMS, or CS'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Run validation only, do not write output files'
    )
    
    args = parser.parse_args()
    
    engine = QuestionIngestionEngine()
    engine.run(test_type=args.test_type, exam_type=args.exam_type, dry_run=args.dry_run)


if __name__ == '__main__':
    main()

