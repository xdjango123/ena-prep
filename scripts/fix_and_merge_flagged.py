#!/usr/bin/env python3
"""
Fix Flagged Questions and Merge into Main File

This script uses OpenAI GPT-4o to:
1. Analyze each flagged question
2. Determine the correct answer OR generate a replacement question if not answerable
3. Update the flagged questions with correct answers and explanations (in French)
4. Merge fixed questions into the main questions file

Usage:
    python fix_and_merge_flagged.py --exam_type CMS
    python fix_and_merge_flagged.py --exam_type CM --main cm_exam_questions.json --flagged cm_exam_flagged.json

Requirements:
    - OPENAI_API_KEY environment variable set
    - pip install openai python-dotenv
"""

import os
import json
import argparse
import time
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional, Tuple, List
from dataclasses import dataclass

from dotenv import load_dotenv

try:
    from openai import OpenAI, RateLimitError, APIError, APIConnectionError
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False
    print("ERROR: OpenAI package not installed. Run: pip install openai")
    exit(1)

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Paths
SCRIPT_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPT_DIR / "questions_exams_output"

# Rate limiting
MIN_DELAY_BETWEEN_REQUESTS = 0.5  # seconds
MAX_RETRIES = 3
RETRY_DELAY = 5  # seconds


@dataclass
class FixResult:
    """Result of fixing a question."""
    success: bool
    is_replacement: bool  # True if question was replaced, False if just corrected
    question: Dict[str, Any]
    error: Optional[str] = None


class QuestionFixer:
    """Uses OpenAI to fix flagged questions."""
    
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY environment variable not set")
        
        self.client = OpenAI(api_key=api_key, timeout=60.0)
        self.last_request_time = 0
        self.stats = {
            "total": 0,
            "corrected": 0,
            "replaced": 0,
            "failed": 0,
        }
    
    def _rate_limit(self):
        """Apply rate limiting between requests."""
        elapsed = time.time() - self.last_request_time
        if elapsed < MIN_DELAY_BETWEEN_REQUESTS:
            time.sleep(MIN_DELAY_BETWEEN_REQUESTS - elapsed)
        self.last_request_time = time.time()
    
    def _call_openai(self, prompt: str, retries: int = MAX_RETRIES) -> Optional[Dict]:
        """Call OpenAI API with retry logic. Returns parsed JSON directly."""
        for attempt in range(retries):
            try:
                self._rate_limit()
                
                response = self.client.chat.completions.create(
                    model="gpt-5.1",
                    messages=[
                        {
                            "role": "system",
                            "content": "Tu es un expert en examens de concours. Tu réponds toujours en JSON valide."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    temperature=0.3,
                    max_completion_tokens=2000,
                    response_format={"type": "json_object"},  # Enforce JSON output
                )
                
                # Parse JSON directly since response_format guarantees valid JSON
                content = response.choices[0].message.content.strip()
                return json.loads(content)
                
            except json.JSONDecodeError as e:
                logger.warning(f"JSON parse error: {e}, retrying... (attempt {attempt + 1})")
                time.sleep(RETRY_DELAY)
            except RateLimitError as e:
                logger.warning(f"Rate limit hit, waiting {RETRY_DELAY}s... (attempt {attempt + 1})")
                time.sleep(RETRY_DELAY * (attempt + 1))
            except (APIError, APIConnectionError) as e:
                logger.warning(f"API error: {e}, retrying... (attempt {attempt + 1})")
                time.sleep(RETRY_DELAY)
            except Exception as e:
                logger.error(f"Unexpected error: {e}")
                if attempt == retries - 1:
                    raise
                time.sleep(RETRY_DELAY)
        
        return None
    
    def fix_question(self, question: Dict[str, Any]) -> FixResult:
        """
        Fix a single flagged question using OpenAI.
        
        Returns:
            FixResult with the fixed question or replacement
        """
        self.stats["total"] += 1
        
        subject = question.get("subject", "")
        text = question.get("text", "")
        options = question.get("options", [])
        current_answer = question.get("correct_text", "")
        openai_notes = question.get("openai_disagreement", "")
        
        options_text = "\n".join([f"{chr(65+i)}. {opt}" for i, opt in enumerate(options)])
        
        prompt = f"""Tu es un expert en examens de concours. Analyse cette question qui a été signalée comme potentiellement incorrecte.

QUESTION ({subject}):
{text}

OPTIONS:
{options_text}

RÉPONSE ACTUELLE: {current_answer}

RAISON DU SIGNALEMENT:
{openai_notes}

TÂCHE:
1. Détermine si la question est RÉPONDABLE avec les options données
2. Si OUI: Donne la bonne réponse avec une explication claire
3. Si NON (question ambiguë, aucune option correcte, ou question problématique): 
   Génère une NOUVELLE question similaire sur le même sujet ({subject}) avec des options claires et une réponse correcte

Réponds UNIQUEMENT en JSON avec ce format exact:
{{
    "action": "correct" ou "replace" (EXACTEMENT un de ces deux mots),
    "question_text": "<le texte de la question - original si 'correct', nouveau si 'replace'>",
    "options": ["option A", "option B", "option C"],
    "correct_index": <0, 1, ou 2>,
    "correct_text": "<texte de la bonne option>",
    "explanation": "<explication claire en français de pourquoi c'est la bonne réponse>",
    "reason": "<pourquoi tu as choisi de corriger ou remplacer>"
}}

RÈGLES STRICTES:
- "action" DOIT être exactement "correct" ou "replace" (pas d'autre valeur)
- L'explication DOIT être en français
- Si tu remplaces, la nouvelle question doit être du même niveau de difficulté
- Le correct_index doit correspondre à la position dans le tableau options (0=A, 1=B, 2=C)
- Garde exactement 3 options"""

        result = self._call_openai(prompt)
        
        if not result:
            self.stats["failed"] += 1
            return FixResult(
                success=False,
                is_replacement=False,
                question=question,
                error="Failed to get response from OpenAI"
            )
        
        try:
            # Normalize and validate action field
            action = result.get("action", "correct").lower().strip()
            if action not in ("correct", "replace"):
                logger.warning(f"Invalid action '{action}', defaulting to 'correct'")
                action = "correct"
            is_replacement = action == "replace"
            
            # Update question with fixed data
            fixed_question = question.copy()
            
            if is_replacement:
                fixed_question["text"] = result["question_text"]
                fixed_question["options"] = result["options"]
                self.stats["replaced"] += 1
            else:
                self.stats["corrected"] += 1
            
            fixed_question["correct_index"] = int(result["correct_index"])
            fixed_question["correct_text"] = result["correct_text"]
            fixed_question["explanation"] = result["explanation"]
            fixed_question["validation_status"] = "auto_fixed"
            fixed_question["fix_action"] = action
            fixed_question["fix_reason"] = result.get("reason", "")
            fixed_question["openai_disagreement"] = None
            
            logger.info(f"  {'Replaced' if is_replacement else 'Corrected'}: {text[:50]}...")
            
            return FixResult(
                success=True,
                is_replacement=is_replacement,
                question=fixed_question
            )
            
        except (KeyError, ValueError, TypeError) as e:
            self.stats["failed"] += 1
            logger.error(f"Error processing result: {e}")
            return FixResult(
                success=False,
                is_replacement=False,
                question=question,
                error=str(e)
            )


def fix_and_merge(exam_type: str, main_path: Optional[str] = None, 
                  flagged_path: Optional[str] = None, output_path: Optional[str] = None):
    """Fix flagged questions and merge into main file."""
    
    exam_type = exam_type.upper()
    
    # Find files if not specified
    if not main_path:
        # Find most recent main file
        main_files = list(OUTPUT_DIR.glob(f"{exam_type.lower()}_exam_questions_*.json"))
        if not main_files:
            logger.error(f"No main questions file found for {exam_type}")
            return
        main_path = max(main_files, key=lambda p: p.stat().st_mtime)
    else:
        main_path = Path(main_path)
    
    if not flagged_path:
        # Find most recent flagged file
        flagged_files = list(OUTPUT_DIR.glob(f"{exam_type.lower()}_exam_flagged_*.json"))
        if not flagged_files:
            logger.error(f"No flagged questions file found for {exam_type}")
            return
        flagged_path = max(flagged_files, key=lambda p: p.stat().st_mtime)
    else:
        flagged_path = Path(flagged_path)
    
    if not output_path:
        output_path = OUTPUT_DIR / f"{exam_type.lower()}_exam_final.json"
    else:
        output_path = Path(output_path)
    
    logger.info("=" * 60)
    logger.info("FIX AND MERGE FLAGGED QUESTIONS")
    logger.info("=" * 60)
    logger.info(f"Exam Type: {exam_type}")
    logger.info(f"Main file: {main_path}")
    logger.info(f"Flagged file: {flagged_path}")
    logger.info(f"Output file: {output_path}")
    logger.info("=" * 60)
    
    # Load files
    with open(main_path, 'r', encoding='utf-8') as f:
        main_data = json.load(f)
    
    with open(flagged_path, 'r', encoding='utf-8') as f:
        flagged_data = json.load(f)
    
    main_questions = main_data['questions']
    flagged_questions = flagged_data['questions']
    
    logger.info(f"Main questions: {len(main_questions)}")
    logger.info(f"Flagged questions to fix: {len(flagged_questions)}")
    logger.info("")
    
    # Initialize fixer
    fixer = QuestionFixer()
    
    # Fix each flagged question
    fixed_questions = []
    failed_questions = []
    
    for i, question in enumerate(flagged_questions):
        logger.info(f"Processing {i+1}/{len(flagged_questions)}...")
        
        result = fixer.fix_question(question)
        
        if result.success:
            fixed_questions.append(result.question)
        else:
            failed_questions.append({
                "question": question,
                "error": result.error
            })
        
        # Progress update every 10 questions
        if (i + 1) % 10 == 0:
            logger.info(f"Progress: {i+1}/{len(flagged_questions)} - "
                       f"Corrected: {fixer.stats['corrected']}, "
                       f"Replaced: {fixer.stats['replaced']}, "
                       f"Failed: {fixer.stats['failed']}")
    
    # Merge questions
    merged_questions = main_questions + fixed_questions
    
    # Sort by test_number and question_number
    merged_questions.sort(key=lambda x: (x['test_number'], x['question_number']))
    
    # Update metadata
    main_data['metadata']['total_questions'] = len(merged_questions)
    main_data['metadata']['merged_at'] = datetime.now().isoformat()
    main_data['metadata']['auto_fixed_added'] = len(fixed_questions)
    main_data['metadata']['fix_stats'] = fixer.stats
    main_data['metadata']['excluded_flagged'] = len(failed_questions)
    
    main_data['questions'] = merged_questions
    
    # Save merged file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(main_data, f, ensure_ascii=False, indent=2)
    
    logger.info("")
    logger.info("=" * 60)
    logger.info("RESULTS")
    logger.info("=" * 60)
    logger.info(f"✓ Corrected: {fixer.stats['corrected']}")
    logger.info(f"↻ Replaced: {fixer.stats['replaced']}")
    logger.info(f"✗ Failed: {fixer.stats['failed']}")
    logger.info("")
    logger.info(f"Total questions in merged file: {len(merged_questions)}")
    logger.info(f"Output saved to: {output_path}")
    
    # Save failed questions separately if any
    if failed_questions:
        failed_path = OUTPUT_DIR / f"{exam_type.lower()}_exam_still_failed_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(failed_path, 'w', encoding='utf-8') as f:
            json.dump({
                "metadata": {
                    "exam_type": exam_type,
                    "total_questions": len(failed_questions),
                    "generated_at": datetime.now().isoformat(),
                    "reason": "Auto-fix failed for these questions"
                },
                "questions": failed_questions
            }, f, ensure_ascii=False, indent=2)
        logger.warning(f"Failed questions saved to: {failed_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Fix flagged questions using OpenAI and merge into main file"
    )
    parser.add_argument(
        "--exam_type",
        type=str,
        required=True,
        choices=["CM", "CMS", "CS", "cm", "cms", "cs"],
        help="Exam type to process"
    )
    parser.add_argument(
        "--main",
        type=str,
        default=None,
        help="Path to main questions JSON file (auto-detected if not provided)"
    )
    parser.add_argument(
        "--flagged",
        type=str,
        default=None,
        help="Path to flagged questions JSON file (auto-detected if not provided)"
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Path for merged output file (auto-generated if not provided)"
    )
    
    args = parser.parse_args()
    
    if not HAS_OPENAI:
        print("ERROR: OpenAI package required. Run: pip install openai")
        return 1
    
    if not os.getenv("OPENAI_API_KEY"):
        print("ERROR: OPENAI_API_KEY environment variable not set")
        return 1
    
    try:
        fix_and_merge(
            exam_type=args.exam_type,
            main_path=args.main,
            flagged_path=args.flagged,
            output_path=args.output
        )
        return 0
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    exit(main())

