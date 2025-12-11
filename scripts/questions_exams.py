#!/usr/bin/env python3
"""
================================================================================
QUESTIONS EXAMS SCRIPT
================================================================================

PURPOSE:
--------
This script converts question files from Word (.docx) format to JSON format,
ready for insertion into the questions_final table.

INPUT:
------
- Source: ena/questions_final/{exam_type}_exam/ folders
- CM folder: 20 .docx files
- CMS folder: 20 .docx files  
- CS folder: 10 .docx files

Each .docx file contains 3 sections:
- CULTURE GENERALE (CG) - 20 questions
- ANGLAIS (ANG) - 20 questions
- LOGIQUE (LOG) - 20 questions

OUTPUT:
-------
- JSON files ready for questions_final table insertion
- 60 questions per test (20 per subject)
- test_number: 1-20 (CM/CMS) or 1-10 (CS)
- question_number: 1-20 (ANG), 21-40 (CG), 41-60 (LOG)

USAGE:
------
python questions_exams.py --exam_type CM [--dry_run] [--output_dir PATH]

================================================================================
"""

import os
import re
import json
import argparse
import logging
import uuid
import time
import random
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict, field
from enum import Enum

from docx import Document
from dotenv import load_dotenv

# Optional: LLM imports for answer validation
try:
    import google.generativeai as genai
    from google.api_core import exceptions as google_exceptions
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False
    google_exceptions = None

try:
    from openai import OpenAI, APIError, RateLimitError, APIConnectionError, APITimeoutError
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False
    APIError = Exception
    RateLimitError = Exception
    APIConnectionError = Exception
    APITimeoutError = Exception

# =============================================================================
# CONFIGURATION
# =============================================================================

load_dotenv()

# Paths
BASE_DIR = Path(__file__).parent.parent.parent  # ena/
QUESTIONS_FINAL_DIR = BASE_DIR / "questions_final"
OUTPUT_DIR = Path(__file__).parent / "questions_exams_output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Subject mapping
SUBJECT_MAPPING = {
    "culture": "CG",
    "culture générale": "CG",
    "culture generale": "CG",
    "cg": "CG",
    "anglais": "ANG",
    "english": "ANG",
    "ang": "ANG",
    "logique": "LOG",
    "logic": "LOG",
    "raisonnement": "LOG",
    "aptitude": "LOG",
    "log": "LOG",
}

# Section detection patterns - these should match section HEADERS only
# We need to be careful not to match words like "logique" inside question text
SECTION_PATTERNS = {
    "CG": [
        r"^culture\s*g[eé]n[eé]rale",  # Starts with culture générale
        r"^section\s*(1|i)\s*[–\-:]\s*culture",  # Section 1 – Culture
        r"^section\s*(1|i)\s*[:\-–]",  # Section 1 : or Section I –
        r"🌍.*culture",
        r"^test\s+de\s+culture",
    ],
    "ANG": [
        r"^anglais",  # Starts with ANGLAIS
        r"^english",
        r"^section\s*(2|ii)\s*[–\-:]\s*anglais",
        r"^section\s*(2|ii)\s*[:\-–]",  # Section 2 :
        r"🇬🇧",  # UK flag emoji
        r"^test\s+d.anglais",
    ],
    "LOG": [
        r"^logique",  # Starts with LOGIQUE
        r"^raisonnement",
        r"^aptitude\s*num[eé]rique",
        r"^section\s*(3|iii)\s*[–\-:]\s*logique",
        r"^section\s*(3|iii)\s*[:\-–]",  # Section 3 :
        r"🧩",  # Puzzle emoji
        r"^test\s+de\s+logique",
    ],
}

# Question number mapping per subject within each test
# ANG: 1-20, CG: 21-40, LOG: 41-60
SUBJECT_QUESTION_OFFSET = {
    "ANG": 0,      # questions 1-20
    "CG": 20,      # questions 21-40
    "LOG": 40,     # questions 41-60
}

# Exam type configurations
EXAM_TYPE_CONFIG = {
    "CM": {
        "folder": "cm_exam",
        "num_files": 20,
        "questions_per_subject": 20,
    },
    "CMS": {
        "folder": "cms_exam",
        "num_files": 20,
        "questions_per_subject": 20,
    },
    "CS": {
        "folder": "cs_exam",
        "num_files": 10,
        "questions_per_subject": 20,
    },
}

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
    ]
)
logger = logging.getLogger(__name__)


# =============================================================================
# DATA STRUCTURES
# =============================================================================

@dataclass
class ParsedQuestion:
    """Represents a question parsed from a .docx file."""
    text: str
    options: List[str]
    raw_correct_indicator: Optional[str] = None  # The original correct answer marker if found
    correct_index: Optional[int] = None  # Will be filled by LLM
    correct_text: Optional[str] = None  # Will be filled by LLM
    explanation: Optional[str] = None  # Will be filled by LLM (in French)
    subject: str = ""
    source_file: str = ""
    section_index: int = 0  # Position within section (1-20)


class ValidationStatus(Enum):
    """Status of question validation."""
    PENDING = "pending"           # Not yet processed by LLM
    VALIDATED = "validated"       # Gemini answered, OpenAI confirmed
    FLAGGED = "flagged"           # OpenAI disagreed with Gemini
    FAILED = "failed"             # Gemini failed to answer
    GEMINI_ONLY = "gemini_only"   # Gemini answered, no OpenAI validation


@dataclass
class FinalQuestion:
    """Represents a question ready for questions_final table."""
    id: str = ""
    text: str = ""
    options: List[str] = field(default_factory=list)
    correct_index: int = 0
    correct_text: str = ""
    explanation: str = ""
    subject: str = ""  # ANG, CG, LOG
    difficulty: str = "MEDIUM"
    test_type: str = "exam"
    exam_type: str = ""  # CM, CMS, CS
    test_number: int = 0
    question_number: int = 0
    
    # Validation metadata (not inserted into DB)
    llm_confidence: Optional[float] = None
    validation_status: str = "pending"  # pending, validated, flagged, failed, gemini_only
    validation_notes: Optional[str] = None
    openai_disagreement: Optional[str] = None  # OpenAI's suggested correction if it disagreed


# =============================================================================
# DOCUMENT PARSING
# =============================================================================

class DocxParser:
    """
    Parser for extracting questions from Word documents.
    
    The documents have a specific format where questions and options are often
    combined in the same paragraph, separated by newlines:
    
    Example:
        "Question text here?\na. Option A\nb. Option B\nc. Option C"
    
    Or sometimes split across paragraphs:
        "Question text here?"
        "a. Option A\nb. Option B\nc. Option C"
    """
    
    def __init__(self, filepath: Path):
        self.filepath = filepath
        self.doc = Document(filepath)
        # Get raw paragraph text, preserving newlines within paragraphs
        self.raw_paragraphs = [p.text for p in self.doc.paragraphs if p.text.strip()]
        
    def detect_section(self, text: str) -> Optional[str]:
        """Detect which subject section a line belongs to."""
        text_lower = text.lower()
        for subject, patterns in SECTION_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text_lower, re.IGNORECASE):
                    return subject
        return None
    
    def is_section_header(self, text: str) -> bool:
        """Check if a line is a section header."""
        return self.detect_section(text) is not None
    
    def extract_options_from_text(self, text: str) -> Tuple[str, List[str]]:
        """
        Extract question text and options from a paragraph that may contain both.
        
        The format is typically:
        "Question text?\na. Option A\nb. Option B\nc. Option C"
        
        Also handles:
        - "A) Option A\nB) Option B\nC) Option C"
        - Mixed case options
        
        Returns:
            Tuple of (question_text, list_of_options)
        """
        # Split by newlines
        lines = text.split('\n')
        
        question_text = ""
        options = []
        # Pattern to match options: a., a), A., A), a-, A-, (a), (A), etc.
        option_pattern = re.compile(r'^([a-dA-D])[\.\)\-]\s*(.+)', re.IGNORECASE)
        option_pattern_parens = re.compile(r'^\(([a-dA-D])\)\s*(.+)', re.IGNORECASE)
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check if this line is an option (try both patterns)
            match = option_pattern.match(line) or option_pattern_parens.match(line)
            if match:
                option_text = match.group(2).strip()
                if option_text:
                    options.append(option_text)
            else:
                # It's part of the question
                if question_text:
                    question_text += " " + line
                else:
                    question_text = line
        
        # Clean up question text - remove number prefixes
        question_text = re.sub(r"^\d+[\.\)\-]\s*", "", question_text.strip())
        question_text = re.sub(r"^Q\d+[\.\)\-]?\s*", "", question_text, flags=re.IGNORECASE)
        question_text = re.sub(r"^\(\d+\)\s*", "", question_text)
        
        return question_text.strip(), options
    
    def parse_standalone_options(self, text: str) -> List[str]:
        """
        Parse options from a paragraph that contains only options.
        
        Returns:
            List of option texts
        """
        options = []
        lines = text.split('\n')
        option_pattern = re.compile(r'^([a-dA-D])[\.\)\-]\s*(.+)', re.IGNORECASE)
        option_pattern_parens = re.compile(r'^\(([a-dA-D])\)\s*(.+)', re.IGNORECASE)
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            match = option_pattern.match(line) or option_pattern_parens.match(line)
            if match:
                option_text = match.group(2).strip()
                if option_text:
                    options.append(option_text)
        
        return options
    
    def is_options_only_paragraph(self, text: str) -> bool:
        """Check if a paragraph contains only options (no question text)."""
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        if not lines:
            return False
        
        option_pattern = re.compile(r'^([a-dA-D])[\.\)\-]\s*', re.IGNORECASE)
        option_pattern_parens = re.compile(r'^\(([a-dA-D])\)\s*', re.IGNORECASE)
        
        # Check if all lines are options
        for line in lines:
            if not (option_pattern.match(line) or option_pattern_parens.match(line)):
                return False
        return True
    
    def parse_questions(self) -> Dict[str, List[ParsedQuestion]]:
        """
        Parse all questions from the document, organized by subject.
        
        Handles the format where questions and options may be:
        1. Combined in a single paragraph with newlines
        2. Split across multiple paragraphs
        
        Returns:
            Dict mapping subject (CG, ANG, LOG) to list of ParsedQuestion
        """
        questions_by_subject: Dict[str, List[ParsedQuestion]] = {
            "CG": [],
            "ANG": [],
            "LOG": [],
        }
        
        current_subject = None
        pending_question_text = None
        pending_options = []
        
        for para in self.raw_paragraphs:
            para_stripped = para.strip()
            
            # Check for section header
            detected_subject = self.detect_section(para_stripped)
            if detected_subject:
                # Save pending question if exists
                if pending_question_text and pending_options and current_subject:
                    question = ParsedQuestion(
                        text=pending_question_text,
                        options=pending_options,
                        subject=current_subject,
                        source_file=str(self.filepath.name),
                        section_index=len(questions_by_subject[current_subject]),
                    )
                    questions_by_subject[current_subject].append(question)
                
                # Start new section
                current_subject = detected_subject
                pending_question_text = None
                pending_options = []
                logger.debug(f"Detected section: {current_subject}")
                continue
            
            # Skip if no subject detected yet
            if not current_subject:
                continue
            
            # Check if this paragraph is options-only (continuation of previous question)
            if self.is_options_only_paragraph(para_stripped):
                # Add these options to the pending question
                additional_options = self.parse_standalone_options(para_stripped)
                if additional_options:
                    if pending_question_text:
                        pending_options.extend(additional_options)
                    else:
                        # Options without a question - shouldn't happen but log it
                        logger.warning(f"Found options without question: {para_stripped[:50]}...")
                continue
            
            # This paragraph contains a question (possibly with options)
            # First, save any pending question
            if pending_question_text and pending_options:
                question = ParsedQuestion(
                    text=pending_question_text,
                    options=pending_options,
                    subject=current_subject,
                    source_file=str(self.filepath.name),
                    section_index=len(questions_by_subject[current_subject]),
                )
                questions_by_subject[current_subject].append(question)
            
            # Parse the new question
            question_text, options = self.extract_options_from_text(para_stripped)
            
            if question_text:
                pending_question_text = question_text
                pending_options = options
            else:
                # Empty question text - might be continuation or malformed
                if options:
                    logger.debug(f"Found options without clear question text: {para_stripped[:50]}...")
                    pending_options.extend(options)
        
        # Don't forget the last question
        if pending_question_text and pending_options and current_subject:
            question = ParsedQuestion(
                text=pending_question_text,
                options=pending_options,
                subject=current_subject,
                source_file=str(self.filepath.name),
                section_index=len(questions_by_subject[current_subject]),
            )
            questions_by_subject[current_subject].append(question)
        
        return questions_by_subject


# =============================================================================
# LLM ERROR HANDLING & RETRY CONFIGURATION
# =============================================================================

class ErrorCategory(Enum):
    """Categories of LLM errors for handling strategy."""
    RETRYABLE = "retryable"           # Network, rate limit, temporary errors
    NON_RETRYABLE = "non_retryable"   # Invalid API key, model not found
    PARSE_ERROR = "parse_error"        # JSON parsing failed
    UNKNOWN = "unknown"


# Gemini model fallback order (try each if previous fails)
GEMINI_MODELS = [
    "gemini-2.0-flash",      # Latest flash model
    "gemini-1.5-flash",       # Standard flash
    "gemini-1.5-pro",         # Pro model (more capable, slower)
    "gemini-pro",             # Legacy pro
]

# Retry configuration
RETRY_CONFIG = {
    "max_retries": 5,
    "base_delay": 2.0,        # Base delay in seconds
    "max_delay": 60.0,        # Maximum delay between retries
    "exponential_base": 2,    # Exponential backoff multiplier
    "jitter": True,           # Add randomness to prevent thundering herd
}

# Rate limiting configuration
RATE_LIMIT_CONFIG = {
    "gemini_rpm": 15,         # Requests per minute for Gemini
    "openai_rpm": 60,         # Requests per minute for OpenAI
    "min_delay_between_requests": 0.5,  # Minimum seconds between requests
}


def categorize_gemini_error(error: Exception) -> ErrorCategory:
    """Categorize a Gemini API error for handling strategy."""
    error_str = str(error).lower()
    
    # Retryable errors (network, rate limit, temporary)
    retryable_patterns = [
        "503", "504", "500", "502",  # Server errors
        "timeout", "timed out",
        "rate limit", "quota", "resource exhausted",
        "dns resolution", "connection",
        "temporarily unavailable", "overloaded",
        "service unavailable", "try again",
    ]
    
    # Non-retryable errors (configuration, auth, model issues)
    non_retryable_patterns = [
        "404", "not found",
        "401", "403", "invalid api key", "unauthorized",
        "invalid argument", "bad request",
        "model not supported", "not supported for",
    ]
    
    for pattern in non_retryable_patterns:
        if pattern in error_str:
            return ErrorCategory.NON_RETRYABLE
    
    for pattern in retryable_patterns:
        if pattern in error_str:
            return ErrorCategory.RETRYABLE
    
    # Check for JSON parsing errors
    if isinstance(error, json.JSONDecodeError):
        return ErrorCategory.PARSE_ERROR
    
    return ErrorCategory.UNKNOWN


def categorize_openai_error(error: Exception) -> ErrorCategory:
    """Categorize an OpenAI API error for handling strategy."""
    error_str = str(error).lower()
    
    # Check specific OpenAI exception types
    if HAS_OPENAI:
        if isinstance(error, RateLimitError):
            return ErrorCategory.RETRYABLE
        if isinstance(error, APITimeoutError):
            return ErrorCategory.RETRYABLE
        if isinstance(error, APIConnectionError):
            return ErrorCategory.RETRYABLE
    
    # Pattern-based categorization
    retryable_patterns = [
        "rate limit", "429",
        "timeout", "timed out",
        "connection", "503", "502", "500",
        "overloaded", "capacity",
    ]
    
    non_retryable_patterns = [
        "401", "403", "invalid api key",
        "model not found", "404",
        "invalid request",
    ]
    
    for pattern in non_retryable_patterns:
        if pattern in error_str:
            return ErrorCategory.NON_RETRYABLE
    
    for pattern in retryable_patterns:
        if pattern in error_str:
            return ErrorCategory.RETRYABLE
    
    if isinstance(error, json.JSONDecodeError):
        return ErrorCategory.PARSE_ERROR
    
    return ErrorCategory.UNKNOWN


def calculate_retry_delay(attempt: int, config: dict = RETRY_CONFIG) -> float:
    """Calculate delay before next retry using exponential backoff with jitter."""
    delay = min(
        config["base_delay"] * (config["exponential_base"] ** attempt),
        config["max_delay"]
    )
    
    if config["jitter"]:
        # Add random jitter (±25%)
        jitter_range = delay * 0.25
        delay += random.uniform(-jitter_range, jitter_range)
    
    return max(0.1, delay)


# =============================================================================
# CHECKPOINT MANAGER FOR PROGRESS TRACKING
# =============================================================================

class CheckpointManager:
    """Manages checkpoints to save progress and resume processing."""
    
    def __init__(self, exam_type: str, checkpoint_dir: Optional[Path] = None):
        self.exam_type = exam_type
        self.checkpoint_dir = checkpoint_dir or OUTPUT_DIR / "checkpoints"
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)
        self.checkpoint_file = self.checkpoint_dir / f"{exam_type.lower()}_checkpoint.json"
        self.processed_questions: Dict[str, Dict] = {}
        self.failed_questions: List[Dict] = []
        self.stats = {
            "total_processed": 0,
            "successful": 0,
            "failed": 0,
            "retried": 0,
            "skipped": 0,
        }
        self._load_checkpoint()
    
    def _load_checkpoint(self):
        """Load existing checkpoint if available."""
        if self.checkpoint_file.exists():
            try:
                with open(self.checkpoint_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.processed_questions = data.get("processed", {})
                    self.failed_questions = data.get("failed", [])
                    self.stats = data.get("stats", self.stats)
                    logger.info(f"Loaded checkpoint: {len(self.processed_questions)} questions already processed")
            except Exception as e:
                logger.warning(f"Failed to load checkpoint: {e}")
    
    def save_checkpoint(self):
        """Save current progress to checkpoint file."""
        try:
            data = {
                "exam_type": self.exam_type,
                "timestamp": datetime.now().isoformat(),
                "processed": self.processed_questions,
                "failed": self.failed_questions,
                "stats": self.stats,
            }
            with open(self.checkpoint_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Failed to save checkpoint: {e}")
    
    def get_question_key(self, test_number: int, subject: str, question_index: int) -> str:
        """Generate a unique key for a question."""
        return f"{self.exam_type}_{test_number}_{subject}_{question_index}"
    
    def is_processed(self, test_number: int, subject: str, question_index: int) -> bool:
        """Check if a question has already been processed."""
        key = self.get_question_key(test_number, subject, question_index)
        return key in self.processed_questions
    
    def get_processed_result(self, test_number: int, subject: str, question_index: int) -> Optional[Dict]:
        """Get the result of a previously processed question."""
        key = self.get_question_key(test_number, subject, question_index)
        return self.processed_questions.get(key)
    
    def mark_processed(self, test_number: int, subject: str, question_index: int, 
                       result: Dict, success: bool = True):
        """Mark a question as processed."""
        key = self.get_question_key(test_number, subject, question_index)
        self.processed_questions[key] = result
        self.stats["total_processed"] += 1
        if success:
            self.stats["successful"] += 1
        else:
            self.stats["failed"] += 1
    
    def mark_failed(self, test_number: int, subject: str, question_index: int, 
                    question_text: str, error: str):
        """Record a failed question for later retry."""
        self.failed_questions.append({
            "test_number": test_number,
            "subject": subject,
            "question_index": question_index,
            "question_text": question_text[:100],
            "error": error,
            "timestamp": datetime.now().isoformat(),
        })
        self.stats["failed"] += 1
    
    def clear_checkpoint(self):
        """Clear the checkpoint file."""
        if self.checkpoint_file.exists():
            self.checkpoint_file.unlink()
        self.processed_questions = {}
        self.failed_questions = []
        self.stats = {
            "total_processed": 0,
            "successful": 0,
            "failed": 0,
            "retried": 0,
            "skipped": 0,
        }


# =============================================================================
# LLM INTEGRATION FOR ANSWER SELECTION
# =============================================================================

class LLMAnswerSelector:
    """
    Uses LLM to determine the correct answer and generate explanations.
    Features:
    - Retry logic with exponential backoff
    - Multiple model fallbacks for Gemini
    - Rate limiting
    - Error categorization and handling
    - Two-stage validation: Gemini selects, OpenAI validates
    """
    
    def __init__(self, checkpoint_manager: Optional[CheckpointManager] = None):
        self.gemini_models: List[genai.GenerativeModel] = []
        self.current_gemini_model_index = 0
        self.openai_client = None
        self.checkpoint = checkpoint_manager
        
        # Rate limiting state
        self.last_gemini_request = 0
        self.last_openai_request = 0
        self.gemini_request_count = 0
        self.openai_request_count = 0
        self.minute_start = time.time()
        
        # Circuit breaker state
        self.gemini_failures = 0
        self.openai_failures = 0
        self.max_consecutive_failures = 10
        self.circuit_open = False
        self.circuit_open_until = 0
        
        # Initialize Gemini models
        if HAS_GEMINI and os.getenv("GEMINI_API_KEY"):
            genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
            for model_name in GEMINI_MODELS:
                try:
                    model = genai.GenerativeModel(model_name)
                    self.gemini_models.append((model_name, model))
                    logger.info(f"Gemini model '{model_name}' initialized")
                except Exception as e:
                    logger.debug(f"Could not initialize Gemini model '{model_name}': {e}")
            
            if not self.gemini_models:
                logger.error("No Gemini models could be initialized!")
        
        # Initialize OpenAI
        if HAS_OPENAI and os.getenv("OPENAI_API_KEY"):
            try:
                self.openai_client = OpenAI(
                    api_key=os.getenv("OPENAI_API_KEY"),
                    timeout=30.0,  # 30 second timeout
                    max_retries=0,  # We handle retries ourselves
                )
                logger.info("OpenAI client initialized")
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client: {e}")
    
    def _check_circuit_breaker(self) -> bool:
        """Check if circuit breaker allows requests."""
        if self.circuit_open:
            if time.time() > self.circuit_open_until:
                logger.info("Circuit breaker closed, resuming requests")
                self.circuit_open = False
                self.gemini_failures = 0
                self.openai_failures = 0
                return True
            return False
        return True
    
    def _trip_circuit_breaker(self, duration: float = 60.0):
        """Open the circuit breaker to pause requests."""
        self.circuit_open = True
        self.circuit_open_until = time.time() + duration
        logger.warning(f"Circuit breaker opened for {duration} seconds due to repeated failures")
    
    def _rate_limit_gemini(self):
        """Apply rate limiting for Gemini requests."""
        current_time = time.time()
        
        # Reset counter every minute
        if current_time - self.minute_start >= 60:
            self.gemini_request_count = 0
            self.minute_start = current_time
        
        # Check if we've hit the rate limit
        if self.gemini_request_count >= RATE_LIMIT_CONFIG["gemini_rpm"]:
            wait_time = 60 - (current_time - self.minute_start)
            if wait_time > 0:
                logger.info(f"Rate limit reached, waiting {wait_time:.1f}s...")
                time.sleep(wait_time)
                self.gemini_request_count = 0
                self.minute_start = time.time()
        
        # Ensure minimum delay between requests
        time_since_last = current_time - self.last_gemini_request
        min_delay = RATE_LIMIT_CONFIG["min_delay_between_requests"]
        if time_since_last < min_delay:
            time.sleep(min_delay - time_since_last)
        
        self.last_gemini_request = time.time()
        self.gemini_request_count += 1
    
    def _rate_limit_openai(self):
        """Apply rate limiting for OpenAI requests."""
        current_time = time.time()
        time_since_last = current_time - self.last_openai_request
        min_delay = RATE_LIMIT_CONFIG["min_delay_between_requests"]
        if time_since_last < min_delay:
            time.sleep(min_delay - time_since_last)
        self.last_openai_request = time.time()
    
    def _build_gemini_prompt(self, question: ParsedQuestion) -> str:
        """Build the prompt for Gemini."""
        options_text = "\n".join([f"{chr(65+i)}. {opt}" for i, opt in enumerate(question.options)])
        
        return f"""Tu es un expert en examens de concours. Analyse cette question et détermine la bonne réponse.

QUESTION ({question.subject}):
{question.text}

OPTIONS:
{options_text}

Réponds UNIQUEMENT au format JSON suivant (pas de texte avant ou après):
{{
    "correct_index": <numéro de 0 à {len(question.options)-1}>,
    "correct_letter": "<A, B, C ou D>",
    "explanation": "<explication claire en français de pourquoi cette réponse est correcte>",
    "confidence": <score de 0.0 à 1.0 indiquant ta confiance>
}}

Important:
- L'explication doit être en français
- L'explication doit expliquer clairement pourquoi la réponse est correcte
- Sois précis et pédagogique"""
    
    def _parse_json_response(self, response_text: str) -> Dict:
        """Parse JSON from LLM response, handling markdown code blocks."""
        text = response_text.strip()
        
        # Handle markdown code blocks
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        
        # Clean up common issues
        text = text.strip()
        
        return json.loads(text)
    
    def select_answer_gemini(self, question: ParsedQuestion) -> Tuple[int, str, str, float]:
        """
        Use Gemini to select the correct answer with retry logic and model fallback.
        
        Returns:
            Tuple of (correct_index, correct_text, explanation, confidence)
        
        Raises:
            RuntimeError: If all models and retries fail
        """
        if not self.gemini_models:
            raise RuntimeError("No Gemini models available")
        
        if not self._check_circuit_breaker():
            raise RuntimeError("Circuit breaker is open - too many failures")
        
        prompt = self._build_gemini_prompt(question)
        last_error = None
        
        # Try each model
        for model_idx, (model_name, model) in enumerate(self.gemini_models):
            # Retry loop for each model
            for attempt in range(RETRY_CONFIG["max_retries"]):
                try:
                    # Apply rate limiting
                    self._rate_limit_gemini()
                    
                    logger.debug(f"Attempting Gemini ({model_name}), attempt {attempt + 1}")
                    
                    # Make the API call
                    response = model.generate_content(
                        prompt,
                        generation_config=genai.types.GenerationConfig(
                            temperature=0.2,
                            max_output_tokens=1024,
                        ),
                    )
                    
                    response_text = response.text.strip()
                    result = self._parse_json_response(response_text)
                    
                    # Validate response
                    correct_index = int(result.get("correct_index", 0))
                    if correct_index < 0 or correct_index >= len(question.options):
                        raise ValueError(f"Invalid correct_index: {correct_index}")
                    
                    correct_text = question.options[correct_index]
                    explanation = result.get("explanation", "")
                    confidence = float(result.get("confidence", 0.5))
                    
                    # Success - reset failure counter
                    self.gemini_failures = 0
                    
                    return correct_index, correct_text, explanation, confidence
                    
                except json.JSONDecodeError as e:
                    last_error = e
                    error_cat = ErrorCategory.PARSE_ERROR
                    logger.warning(f"JSON parse error on attempt {attempt + 1}: {e}")
                    # Don't switch models for parse errors, just retry
                    if attempt < RETRY_CONFIG["max_retries"] - 1:
                        delay = calculate_retry_delay(attempt)
                        logger.debug(f"Retrying in {delay:.1f}s...")
                        time.sleep(delay)
                    continue
                    
                except Exception as e:
                    last_error = e
                    error_cat = categorize_gemini_error(e)
                    
                    if error_cat == ErrorCategory.NON_RETRYABLE:
                        logger.warning(f"Non-retryable error with {model_name}: {e}")
                        # Try next model immediately
                        break
                    
                    elif error_cat == ErrorCategory.RETRYABLE:
                        self.gemini_failures += 1
                        if self.gemini_failures >= self.max_consecutive_failures:
                            self._trip_circuit_breaker(120.0)  # 2 minute pause
                            raise RuntimeError(f"Too many consecutive failures: {e}")
                        
                        if attempt < RETRY_CONFIG["max_retries"] - 1:
                            delay = calculate_retry_delay(attempt)
                            logger.warning(f"Retryable error on attempt {attempt + 1}, waiting {delay:.1f}s: {e}")
                            time.sleep(delay)
                        continue
                    
                    else:
                        logger.warning(f"Unknown error on attempt {attempt + 1}: {e}")
                        if attempt < RETRY_CONFIG["max_retries"] - 1:
                            delay = calculate_retry_delay(attempt)
                            time.sleep(delay)
                        continue
            
            # All retries for this model failed, try next model
            logger.warning(f"All retries failed for {model_name}, trying next model...")
        
        # All models failed
        self.gemini_failures += 1
        raise RuntimeError(f"All Gemini models failed after retries. Last error: {last_error}")
    
    def validate_answer_openai(self, question: ParsedQuestion, 
                                proposed_index: int, 
                                proposed_explanation: str) -> Tuple[bool, str, float]:
        """
        Use OpenAI to validate the answer with retry logic.
        
        Returns:
            Tuple of (is_valid, validation_notes, confidence)
        """
        if not self.openai_client:
            raise RuntimeError("OpenAI client not initialized")
        
        options_text = "\n".join([f"{chr(65+i)}. {opt}" for i, opt in enumerate(question.options)])
        proposed_letter = chr(65 + proposed_index)
        
        prompt = f"""Tu es un expert en validation de questions d'examen. 
Vérifie si la réponse proposée est correcte.

QUESTION ({question.subject}):
{question.text}

OPTIONS:
{options_text}

RÉPONSE PROPOSÉE: {proposed_letter}. {question.options[proposed_index]}

EXPLICATION PROPOSÉE:
{proposed_explanation}

Analyse et réponds UNIQUEMENT au format JSON:
{{
    "is_correct": <true ou false>,
    "confidence": <score de 0.0 à 1.0>,
    "notes": "<si incorrect, explique pourquoi et donne la bonne réponse. Si correct, confirme.>"
}}"""
        
        last_error = None
        
        for attempt in range(RETRY_CONFIG["max_retries"]):
            try:
                self._rate_limit_openai()
                
                response = self.openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.2,
                    timeout=30.0,
                )
                
                response_text = response.choices[0].message.content.strip()
                result = self._parse_json_response(response_text)
                
                is_valid = result.get("is_correct", False)
                confidence = float(result.get("confidence", 0.5))
                notes = result.get("notes", "")
                
                # Reset failure counter on success
                self.openai_failures = 0
                
                return is_valid, notes, confidence
                
            except json.JSONDecodeError as e:
                last_error = e
                logger.warning(f"JSON parse error on OpenAI attempt {attempt + 1}: {e}")
                if attempt < RETRY_CONFIG["max_retries"] - 1:
                    delay = calculate_retry_delay(attempt)
                    time.sleep(delay)
                continue
                
            except Exception as e:
                last_error = e
                error_cat = categorize_openai_error(e)
                
                if error_cat == ErrorCategory.NON_RETRYABLE:
                    logger.error(f"Non-retryable OpenAI error: {e}")
                    raise
                
                self.openai_failures += 1
                
                if attempt < RETRY_CONFIG["max_retries"] - 1:
                    delay = calculate_retry_delay(attempt)
                    logger.warning(f"OpenAI error on attempt {attempt + 1}, waiting {delay:.1f}s: {e}")
                    time.sleep(delay)
                continue
        
        raise RuntimeError(f"OpenAI validation failed after all retries. Last error: {last_error}")
    
    def process_question(self, question: ParsedQuestion, 
                         test_number: int = 0,
                         question_index: int = 0) -> Tuple[ParsedQuestion, str, Optional[str]]:
        """
        Process a single question through both LLMs.
        
        Returns:
            Tuple of (processed_question, validation_status, openai_notes)
            - validation_status: 'validated', 'flagged', 'failed', 'gemini_only'
            - openai_notes: OpenAI's notes if it disagreed, None otherwise
        """
        validation_status = ValidationStatus.PENDING.value
        openai_notes = None
        
        # Check checkpoint
        if self.checkpoint and self.checkpoint.is_processed(
            test_number, question.subject, question_index
        ):
            cached = self.checkpoint.get_processed_result(
                test_number, question.subject, question_index
            )
            if cached:
                question.correct_index = cached.get("correct_index")
                question.correct_text = cached.get("correct_text", "")
                question.explanation = cached.get("explanation", "")
                # Get validation status from cache
                cached_validation = cached.get("validation")
                if cached_validation:
                    if cached_validation.get("is_valid"):
                        validation_status = ValidationStatus.VALIDATED.value
                    else:
                        validation_status = ValidationStatus.FLAGGED.value
                        openai_notes = cached_validation.get("notes")
                else:
                    validation_status = ValidationStatus.GEMINI_ONLY.value
                logger.debug(f"Loaded from checkpoint: test {test_number}, {question.subject}, Q{question_index}")
                return question, validation_status, openai_notes
        
        # Stage 1: Gemini selection
        try:
            correct_index, correct_text, explanation, gemini_confidence = \
                self.select_answer_gemini(question)
            
            question.correct_index = correct_index
            question.correct_text = correct_text
            question.explanation = explanation
            validation_status = ValidationStatus.GEMINI_ONLY.value  # Default until OpenAI validates
            
            logger.debug(f"Gemini selected: {chr(65+correct_index)} with confidence {gemini_confidence:.2f}")
            
        except Exception as e:
            logger.warning(f"Gemini selection failed for question: {question.text[:50]}... Error: {e}")
            validation_status = ValidationStatus.FAILED.value
            if self.checkpoint:
                self.checkpoint.mark_failed(
                    test_number, question.subject, question_index,
                    question.text, str(e)
                )
            return question, validation_status, None
        
        # Stage 2: OpenAI validation (if available and Gemini succeeded)
        validation_result = None
        if self.openai_client:
            try:
                is_valid, notes, openai_confidence = self.validate_answer_openai(
                    question, correct_index, explanation
                )
                
                validation_result = {
                    "is_valid": is_valid,
                    "notes": notes,
                    "confidence": openai_confidence,
                }
                
                if is_valid:
                    validation_status = ValidationStatus.VALIDATED.value
                    logger.debug(f"OpenAI validated answer with confidence {openai_confidence:.2f}")
                else:
                    validation_status = ValidationStatus.FLAGGED.value
                    openai_notes = notes
                    logger.warning(f"OpenAI disagreed: {notes}")
                    
            except Exception as e:
                logger.warning(f"OpenAI validation failed (Gemini answer kept): {e}")
                # Keep gemini_only status
        
        # Save to checkpoint
        if self.checkpoint and validation_status != ValidationStatus.FAILED.value:
            self.checkpoint.mark_processed(
                test_number, question.subject, question_index,
                {
                    "correct_index": question.correct_index,
                    "correct_text": question.correct_text,
                    "explanation": question.explanation,
                    "validation": validation_result,
                    "validation_status": validation_status,
                },
                success=True
            )
            # Save periodically
            if self.checkpoint.stats["total_processed"] % 10 == 0:
                self.checkpoint.save_checkpoint()
        
        return question, validation_status, openai_notes


# =============================================================================
# MAIN PROCESSOR
# =============================================================================

class ExamQuestionProcessor:
    """Main processor for converting exam files to JSON format."""
    
    def __init__(self, exam_type: str, use_llm: bool = True, dry_run: bool = False, 
                 resume: bool = False, clear_checkpoint: bool = False):
        self.exam_type = exam_type.upper()
        self.use_llm = use_llm
        self.dry_run = dry_run
        self.resume = resume
        
        if self.exam_type not in EXAM_TYPE_CONFIG:
            raise ValueError(f"Invalid exam_type: {exam_type}. Must be one of: {list(EXAM_TYPE_CONFIG.keys())}")
        
        self.config = EXAM_TYPE_CONFIG[self.exam_type]
        self.source_dir = QUESTIONS_FINAL_DIR / self.config["folder"]
        
        if not self.source_dir.exists():
            raise FileNotFoundError(f"Source directory not found: {self.source_dir}")
        
        # Initialize checkpoint manager
        self.checkpoint = CheckpointManager(self.exam_type) if use_llm else None
        
        if clear_checkpoint and self.checkpoint:
            self.checkpoint.clear_checkpoint()
            logger.info("Checkpoint cleared")
        
        # Initialize LLM selector with checkpoint
        self.llm_selector = LLMAnswerSelector(self.checkpoint) if use_llm else None
        
        # Processing statistics
        self.processing_stats = {
            "questions_processed": 0,
            "questions_success": 0,
            "questions_failed": 0,
            "questions_skipped": 0,
        }
        
    def get_docx_files(self) -> List[Tuple[int, Path]]:
        """
        Get all .docx files from the source directory, sorted by test number.
        
        Returns:
            List of (test_number, filepath) tuples
        """
        files = []
        
        for filepath in self.source_dir.glob("*.docx"):
            # Skip temp files
            if filepath.name.startswith("~$"):
                continue
            
            # Extract test number from filename
            # Patterns: "1- EXAMEN CM", "CS- EXAMEN 1", "12-EXAMEN CMS"
            match = re.search(r"(\d+)", filepath.name)
            if match:
                test_number = int(match.group(1))
                files.append((test_number, filepath))
            else:
                logger.warning(f"Could not extract test number from: {filepath.name}")
        
        # Sort by test number
        files.sort(key=lambda x: x[0])
        
        logger.info(f"Found {len(files)} .docx files for {self.exam_type}")
        return files
    
    def process_file(self, test_number: int, filepath: Path) -> List[FinalQuestion]:
        """
        Process a single .docx file and return list of FinalQuestion objects.
        """
        logger.info(f"Processing test {test_number}: {filepath.name}")
        
        parser = DocxParser(filepath)
        questions_by_subject = parser.parse_questions()
        
        final_questions = []
        
        for subject, parsed_questions in questions_by_subject.items():
            logger.info(f"  {subject}: {len(parsed_questions)} questions found")
            
            for idx, pq in enumerate(parsed_questions):
                validation_status = ValidationStatus.PENDING.value
                openai_notes = None
                
                # Process through LLM if enabled
                if self.use_llm and self.llm_selector:
                    try:
                        pq, validation_status, openai_notes = self.llm_selector.process_question(
                            pq, 
                            test_number=test_number, 
                            question_index=idx
                        )
                        self.processing_stats["questions_processed"] += 1
                        
                        if validation_status == ValidationStatus.VALIDATED.value:
                            self.processing_stats["questions_success"] += 1
                        elif validation_status == ValidationStatus.FAILED.value:
                            self.processing_stats["questions_failed"] += 1
                        elif validation_status == ValidationStatus.FLAGGED.value:
                            # Track flagged questions separately
                            if "questions_flagged" not in self.processing_stats:
                                self.processing_stats["questions_flagged"] = 0
                            self.processing_stats["questions_flagged"] += 1
                        else:
                            # gemini_only - count as partial success
                            self.processing_stats["questions_success"] += 1
                            
                    except KeyboardInterrupt:
                        logger.warning("Processing interrupted by user")
                        # Save checkpoint before exiting
                        if self.checkpoint:
                            self.checkpoint.save_checkpoint()
                        raise
                    except Exception as e:
                        logger.error(f"Critical error processing question: {e}")
                        self.processing_stats["questions_failed"] += 1
                        validation_status = ValidationStatus.FAILED.value
                
                # Calculate question_number based on subject
                base_offset = SUBJECT_QUESTION_OFFSET.get(subject, 0)
                question_number = base_offset + idx + 1
                
                # Create FinalQuestion
                final_q = FinalQuestion(
                    id="",  # Will be generated on insert
                    text=pq.text,
                    options=pq.options,
                    correct_index=pq.correct_index if pq.correct_index is not None else 0,
                    correct_text=pq.correct_text or "",
                    explanation=pq.explanation or "",
                    subject=subject,
                    difficulty="MEDIUM",
                    test_type="exam",
                    exam_type=self.exam_type,
                    test_number=test_number,
                    question_number=question_number,
                    validation_status=validation_status,
                    openai_disagreement=openai_notes,
                )
                
                final_questions.append(final_q)
        
        return final_questions
    
    def process_all(self) -> List[FinalQuestion]:
        """Process all files for the exam type."""
        all_questions = []
        
        files = self.get_docx_files()
        
        for test_number, filepath in files:
            questions = self.process_file(test_number, filepath)
            all_questions.extend(questions)
        
        logger.info(f"Total questions processed: {len(all_questions)}")
        return all_questions
    
    def save_output(self, questions: List[FinalQuestion], output_path: Optional[Path] = None):
        """
        Save questions to JSON files, separated by validation status.
        
        Creates:
        - {exam_type}_exam_questions_{timestamp}.json - All validated + gemini_only questions (ready for insert)
        - {exam_type}_exam_flagged_{timestamp}.json - Questions where OpenAI disagreed (need review)
        - {exam_type}_exam_failed_{timestamp}.json - Questions that failed (need manual entry)
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if output_path is None:
            output_path = OUTPUT_DIR / f"{self.exam_type.lower()}_exam_questions_{timestamp}.json"
        
        # Separate questions by validation status
        validated_questions = []
        flagged_questions = []
        failed_questions = []
        
        for q in questions:
            if q.validation_status == ValidationStatus.VALIDATED.value:
                validated_questions.append(q)
            elif q.validation_status == ValidationStatus.GEMINI_ONLY.value:
                validated_questions.append(q)  # Include gemini_only in main output
            elif q.validation_status == ValidationStatus.FLAGGED.value:
                flagged_questions.append(q)
            elif q.validation_status == ValidationStatus.FAILED.value:
                failed_questions.append(q)
            else:  # pending
                failed_questions.append(q)  # Treat pending as failed
        
        # Save validated questions (ready for insert)
        output_data = {
            "metadata": {
                "exam_type": self.exam_type,
                "total_questions": len(validated_questions),
                "expected_questions": self.config["num_files"] * 60,
                "generated_at": datetime.now().isoformat(),
                "test_count": self.config["num_files"],
                "questions_per_test": 60,
                "status": "ready_for_insert",
                "excluded_flagged": len(flagged_questions),
                "excluded_failed": len(failed_questions),
            },
            "questions": [asdict(q) for q in validated_questions],
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"✓ Validated questions saved to: {output_path} ({len(validated_questions)} questions)")
        
        # Save flagged questions (need review)
        if flagged_questions:
            flagged_path = OUTPUT_DIR / f"{self.exam_type.lower()}_exam_flagged_{timestamp}.json"
            flagged_data = {
                "metadata": {
                    "exam_type": self.exam_type,
                    "total_questions": len(flagged_questions),
                    "generated_at": datetime.now().isoformat(),
                    "status": "needs_review",
                    "reason": "OpenAI disagreed with Gemini's answer",
                },
                "questions": [asdict(q) for q in flagged_questions],
            }
            
            with open(flagged_path, 'w', encoding='utf-8') as f:
                json.dump(flagged_data, f, ensure_ascii=False, indent=2)
            
            logger.warning(f"⚠ Flagged questions saved to: {flagged_path} ({len(flagged_questions)} questions)")
        
        # Save failed questions (need manual entry)
        if failed_questions:
            failed_path = OUTPUT_DIR / f"{self.exam_type.lower()}_exam_failed_{timestamp}.json"
            failed_data = {
                "metadata": {
                    "exam_type": self.exam_type,
                    "total_questions": len(failed_questions),
                    "generated_at": datetime.now().isoformat(),
                    "status": "failed",
                    "reason": "LLM failed to process these questions",
                },
                "questions": [asdict(q) for q in failed_questions],
            }
            
            with open(failed_path, 'w', encoding='utf-8') as f:
                json.dump(failed_data, f, ensure_ascii=False, indent=2)
            
            logger.error(f"✗ Failed questions saved to: {failed_path} ({len(failed_questions)} questions)")
        
        return output_path
    
    def generate_summary(self, questions: List[FinalQuestion]) -> Dict[str, Any]:
        """Generate a summary of the processed questions."""
        summary = {
            "exam_type": self.exam_type,
            "total_questions": len(questions),
            "by_subject": {},
            "by_test": {},
            "by_validation_status": {
                "validated": 0,
                "gemini_only": 0,
                "flagged": 0,
                "failed": 0,
                "pending": 0,
            },
            "ready_for_insert": 0,
            "needs_review": 0,
            "missing_answers": 0,
            "missing_explanations": 0,
        }
        
        for q in questions:
            # By subject
            if q.subject not in summary["by_subject"]:
                summary["by_subject"][q.subject] = 0
            summary["by_subject"][q.subject] += 1
            
            # By test
            test_key = f"test_{q.test_number}"
            if test_key not in summary["by_test"]:
                summary["by_test"][test_key] = {"total": 0, "by_subject": {}}
            summary["by_test"][test_key]["total"] += 1
            if q.subject not in summary["by_test"][test_key]["by_subject"]:
                summary["by_test"][test_key]["by_subject"][q.subject] = 0
            summary["by_test"][test_key]["by_subject"][q.subject] += 1
            
            # By validation status
            status = q.validation_status
            if status in summary["by_validation_status"]:
                summary["by_validation_status"][status] += 1
            
            # Count ready vs needs review
            if status in [ValidationStatus.VALIDATED.value, ValidationStatus.GEMINI_ONLY.value]:
                summary["ready_for_insert"] += 1
            else:
                summary["needs_review"] += 1
            
            # Check for missing data
            if q.correct_index is None or (q.correct_index == 0 and not q.correct_text):
                summary["missing_answers"] += 1
            if not q.explanation:
                summary["missing_explanations"] += 1
        
        return summary


# =============================================================================
# CLI ENTRY POINT
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Convert exam question files (.docx) to JSON format for questions_final table",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python questions_exams.py --exam_type CM
  python questions_exams.py --exam_type CMS --dry_run
  python questions_exams.py --exam_type CS --no_llm --output_dir ./output
  python questions_exams.py --exam_type CM --resume    # Resume from checkpoint
  python questions_exams.py --exam_type CM --clear     # Clear checkpoint and start fresh
        """
    )
    
    parser.add_argument(
        "--exam_type",
        type=str,
        required=True,
        choices=["CM", "CMS", "CS", "cm", "cms", "cs"],
        help="Exam type to process (CM, CMS, or CS)"
    )
    
    parser.add_argument(
        "--dry_run",
        action="store_true",
        help="Parse files without LLM processing, just show what would be processed"
    )
    
    parser.add_argument(
        "--no_llm",
        action="store_true",
        help="Skip LLM processing for answer selection (useful for testing parsing)"
    )
    
    parser.add_argument(
        "--output_dir",
        type=str,
        default=None,
        help="Custom output directory for JSON files"
    )
    
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Enable verbose logging"
    )
    
    parser.add_argument(
        "--single_file",
        type=str,
        default=None,
        help="Process only a single file (for testing)"
    )
    
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume processing from checkpoint (skips already processed questions)"
    )
    
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear checkpoint and start fresh processing"
    )
    
    args = parser.parse_args()
    
    # Set logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    exam_type = args.exam_type.upper()
    use_llm = not args.no_llm and not args.dry_run
    
    logger.info("=" * 60)
    logger.info("QUESTIONS EXAMS PROCESSOR")
    logger.info("=" * 60)
    logger.info(f"Exam Type: {exam_type}")
    logger.info(f"LLM Processing: {'Enabled' if use_llm else 'Disabled'}")
    logger.info(f"Dry Run: {'Yes' if args.dry_run else 'No'}")
    logger.info(f"Resume: {'Yes' if args.resume else 'No'}")
    logger.info("=" * 60)
    
    try:
        processor = ExamQuestionProcessor(
            exam_type=exam_type,
            use_llm=use_llm,
            dry_run=args.dry_run,
            resume=args.resume,
            clear_checkpoint=args.clear,
        )
        
        if args.single_file:
            # Process single file for testing
            filepath = Path(args.single_file)
            if not filepath.exists():
                logger.error(f"File not found: {filepath}")
                return 1
            
            # Extract test number from filename
            match = re.search(r"(\d+)", filepath.name)
            test_number = int(match.group(1)) if match else 1
            
            questions = processor.process_file(test_number, filepath)
        else:
            # Process all files
            questions = processor.process_all()
        
        # Generate summary
        summary = processor.generate_summary(questions)
        
        logger.info("\n" + "=" * 60)
        logger.info("SUMMARY")
        logger.info("=" * 60)
        logger.info(f"Total questions parsed: {summary['total_questions']}")
        logger.info(f"By subject: {summary['by_subject']}")
        
        # Show validation status breakdown
        if use_llm:
            logger.info("\n" + "-" * 40)
            logger.info("VALIDATION STATUS")
            logger.info("-" * 40)
            vs = summary['by_validation_status']
            logger.info(f"  ✓ Validated (both LLMs agree): {vs['validated']}")
            logger.info(f"  ○ Gemini only (no OpenAI check): {vs['gemini_only']}")
            logger.info(f"  ⚠ Flagged (OpenAI disagreed): {vs['flagged']}")
            logger.info(f"  ✗ Failed (LLM error): {vs['failed']}")
            logger.info(f"  ? Pending (not processed): {vs['pending']}")
            logger.info("-" * 40)
            logger.info(f"  → Ready for insert: {summary['ready_for_insert']}")
            logger.info(f"  → Needs review: {summary['needs_review']}")
        
        # Show processing stats if LLM was used
        if use_llm:
            logger.info("\n" + "-" * 40)
            logger.info("LLM PROCESSING STATS")
            logger.info("-" * 40)
            logger.info(f"Questions processed: {processor.processing_stats['questions_processed']}")
            logger.info(f"Successful: {processor.processing_stats['questions_success']}")
            logger.info(f"Failed: {processor.processing_stats['questions_failed']}")
            
            # Show checkpoint stats
            if processor.checkpoint:
                logger.info(f"\nCheckpoint saved: {processor.checkpoint.checkpoint_file}")
                if processor.checkpoint.failed_questions:
                    logger.warning(f"Failed questions logged: {len(processor.checkpoint.failed_questions)}")
        
        if not args.dry_run:
            # Save final checkpoint
            if processor.checkpoint:
                processor.checkpoint.save_checkpoint()
            
            # Save output
            output_dir = Path(args.output_dir) if args.output_dir else None
            output_path = processor.save_output(questions, output_dir)
            logger.info(f"\nOutput saved to: {output_path}")
        else:
            logger.info("\nDry run complete. No files were saved.")
        
        logger.info("\n" + "=" * 60)
        logger.info("NEXT STEPS")
        logger.info("=" * 60)
        logger.info("1. Review the generated JSON file")
        logger.info("2. Check questions with missing answers/explanations")
        logger.info("3. Run LLM validation if not already done")
        logger.info("4. Manual review of flagged questions")
        logger.info("5. Insert into questions_final table")
        
        return 0
        
    except Exception as e:
        logger.error(f"Error processing files: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    exit(main())

