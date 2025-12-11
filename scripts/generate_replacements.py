#!/usr/bin/env python3
"""
Generate Replacement Questions for Flagged Questions

STRICT VALIDATIONS:
1. No questions of the same subject should share the same context
2. Unless subject is ANG, questions MUST be in French (not English)
3. Standard structural validations (3 options, no prefix, explanation, etc.)
4. Validated by both Gemini and GPT

If generation fails 3+ times for any question, skip and continue.
"""

import json
import os
import sys
import asyncio
import re
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Set
from collections import defaultdict
from dotenv import load_dotenv

# Unbuffered output
sys.stdout.reconfigure(line_buffering=True)

load_dotenv()

import google.generativeai as genai
from openai import AsyncOpenAI
from supabase import create_client
from rapidfuzz import fuzz

# Initialize clients
supabase = create_client(
    os.getenv('VITE_SUPABASE_URL'),
    os.getenv('VITE_SUPABASE_ANON_KEY')
)

genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
openai_client = AsyncOpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Models
GEMINI_MODEL = 'gemini-2.5-flash'
GPT_MODEL = 'gpt-4o-mini'

# File paths
INPUT_FILE = "diagnostics_output/flagged_questions_final.json"
PROGRESS_FILE = "diagnostics_output/replacement_progress.json"
OUTPUT_FILE = "diagnostics_output/replacement_results.json"

# Constants
MAX_RETRIES = 3
TEXT_SIMILARITY_THRESHOLD = 70  # Stricter: was 70
CONTEXT_SIMILARITY_THRESHOLD = 60  # For semantic context checking
MAX_CONSECUTIVE_FAILURES = 5  # Skip question after this many failures

# Number prefix patterns to reject
PREFIX_PATTERNS = [
    r'^[0-9]+[\.\)\-\s]',
    r'^Q[0-9]+[\.\)\-\s:]',
    r'^Question\s*[0-9]+',
    r'^[0-9]+\s*[\-–]\s*',
    r'^\([0-9]+\)',
    r'^[A-Z][\.\)\-]\s',
]

# English detection patterns (for non-ANG subjects)
ENGLISH_INDICATORS = [
    r'\bthe\b', r'\bis\b', r'\bare\b', r'\bwas\b', r'\bwere\b',
    r'\bwhat\b', r'\bwhich\b', r'\bwho\b', r'\bwhere\b', r'\bwhen\b',
    r'\bhow\b', r'\bwhy\b', r'\bchoose\b', r'\bselect\b', r'\bidentify\b',
    r'\bfollowing\b', r'\bstatement\b', r'\bcorrect\b', r'\banswer\b',
    r'\btrue\b', r'\bfalse\b', r'\ball\b', r'\bnone\b', r'\bboth\b',
    r'\beach\b', r'\bevery\b', r'\bsome\b', r'\bany\b', r'\bmany\b',
    r'\bthis\b', r'\bthat\b', r'\bthese\b', r'\bthose\b',
    r'\bhave\b', r'\bhas\b', r'\bhad\b', r'\bwill\b', r'\bwould\b',
    r'\bcould\b', r'\bshould\b', r'\bmust\b', r'\bmight\b', r'\bmay\b',
]


class ReplacementGenerator:
    def __init__(self):
        self.all_questions: List[Dict] = []
        self.questions_by_subject: Dict[str, List[Dict]] = defaultdict(list)
        self.flagged_ids: Set[str] = set()
        self.flagged_questions: Dict[str, Dict] = {}
        
        # Track generated questions for context duplicate checking
        self.generated_contexts: Dict[str, List[str]] = defaultdict(list)
        
        # Progress tracking
        self.progress = {
            'completed_ids': [],
            'failed_ids': [],
            'replacements': [],
            'current_failures': 0,
            'last_failed_id': None
        }
        
        self.load_progress()
    
    def load_progress(self):
        """Load progress from previous run"""
        if os.path.exists(PROGRESS_FILE):
            try:
                with open(PROGRESS_FILE, 'r') as f:
                    saved = json.load(f)
                    self.progress = saved
                    print(f"🔄 Resumed: {len(self.progress['completed_ids'])} completed, {len(self.progress['failed_ids'])} failed")
                    
                    # Rebuild generated contexts from completed replacements
                    for replacement in self.progress.get('replacements', []):
                        subject = replacement.get('subject', 'CG')
                        context = self.extract_context(replacement.get('text', ''))
                        self.generated_contexts[subject].append(context)
            except Exception as e:
                print(f"⚠️ Could not load progress: {e}")
    
    def save_progress(self):
        """Save progress incrementally"""
        with open(PROGRESS_FILE, 'w') as f:
            json.dump(self.progress, f, indent=2, ensure_ascii=False)
    
    def load_flagged_questions(self):
        """Load flagged question IDs from report"""
        print(f"\n📥 Loading flagged questions from {INPUT_FILE}...")
        
        with open(INPUT_FILE, 'r') as f:
            report = json.load(f)
        
        # Collect all unique flagged IDs
        for issue in report.get('structural_issues', []):
            self.flagged_ids.add(issue.get('id'))
        
        for issue in report.get('prefix_issues', []):
            self.flagged_ids.add(issue.get('id'))
        
        for cluster in report.get('duplicate_clusters', []):
            for q in cluster.get('questions', []):
                self.flagged_ids.add(q.get('id'))
        
        for issue in report.get('quality_issues', []):
            self.flagged_ids.add(issue.get('id'))
        
        self.flagged_ids.discard(None)
        
        print(f"  Total unique flagged IDs: {len(self.flagged_ids)}")
        
        # Previously failed IDs will be RETRIED
        previously_failed = len(self.progress['failed_ids'])
        if previously_failed > 0:
            print(f"  ⚠️ {previously_failed} previously failed IDs will be RETRIED")
            # Clear failed_ids so they can be retried
            self.progress['failed_ids'] = []
        
        # Only exclude completed IDs (not failed ones - they get retried)
        pending = self.flagged_ids - set(self.progress['completed_ids'])
        print(f"  Already completed: {len(self.progress['completed_ids'])}")
        print(f"  Pending (including retries): {len(pending)}")
        
        return list(pending)
    
    def fetch_all_questions(self):
        """Fetch ALL questions from database for duplicate checking"""
        print("\n📥 Fetching all questions from database...")
        
        count_response = supabase.table('questions_v2').select('id', count='exact').execute()
        total = count_response.count or 0
        print(f"  Total questions in database: {total}")
        
        all_questions = []
        seen_ids = set()
        page_size = 500
        offset = 0
        
        while len(all_questions) < total:
            response = supabase.table('questions_v2') \
                .select('id, text, options, correct_index, subject, difficulty, exam_type, test_type, test_number') \
                .order('id') \
                .range(offset, offset + page_size - 1) \
                .execute()
            
            batch = response.data
            if not batch:
                break
            
            for q in batch:
                if q['id'] not in seen_ids:
                    seen_ids.add(q['id'])
                    all_questions.append(q)
                    self.questions_by_subject[q.get('subject', 'UNKNOWN')].append(q)
                    
                    if q['id'] in self.flagged_ids:
                        self.flagged_questions[q['id']] = q
            
            offset += len(batch)
        
        self.all_questions = all_questions
        print(f"  Fetched {len(all_questions)} questions")
        print(f"  By subject: ANG={len(self.questions_by_subject.get('ANG', []))}, " +
              f"CG={len(self.questions_by_subject.get('CG', []))}, " +
              f"LOG={len(self.questions_by_subject.get('LOG', []))}")
    
    def extract_context(self, text: str) -> str:
        """Extract key context/topic from question text"""
        # Remove common question words and keep key terms
        text = text.lower().strip()
        # Remove question marks and punctuation
        text = re.sub(r'[?!.,;:"\']', ' ', text)
        return text
    
    def has_number_prefix(self, text: str) -> bool:
        """Check if text has a number prefix"""
        for pattern in PREFIX_PATTERNS:
            if re.match(pattern, text.strip(), re.IGNORECASE):
                return True
        return False
    
    def is_english(self, text: str) -> Tuple[bool, str]:
        """Check if text is in English (for non-ANG subjects)"""
        text_lower = text.lower()
        english_count = 0
        matched_words = []
        
        for pattern in ENGLISH_INDICATORS:
            matches = re.findall(pattern, text_lower)
            if matches:
                english_count += len(matches)
                matched_words.extend(matches)
        
        # If more than 3 English indicators, likely English
        if english_count >= 3:
            return True, f"English words detected: {', '.join(matched_words[:5])}"
        
        return False, "OK"
    
    def check_structural_issues(self, question: Dict, subject: str) -> Tuple[bool, str]:
        """Check for structural issues in generated question"""
        text = question.get('text', '')
        options = question.get('options', [])
        correct_index = question.get('correct_index')
        explanation = question.get('explanation', '')
        
        # Check text length
        if not text or len(text.strip()) < 10:
            return False, "Question text too short"
        
        # Check options count
        if not options or len(options) != 3:
            return False, f"Must have exactly 3 options, got {len(options) if options else 0}"
        
        # Check each option
        for i, opt in enumerate(options):
            if not opt or len(opt.strip()) < 1:
                return False, f"Option {i+1} is empty"
        
        # Check for duplicate options
        opt_lower = [o.lower().strip() for o in options]
        if len(set(opt_lower)) != len(opt_lower):
            return False, "Duplicate options detected"
        
        # Check correct_index
        if correct_index is None or not isinstance(correct_index, int):
            return False, "correct_index must be an integer"
        if correct_index < 0 or correct_index >= len(options):
            return False, f"correct_index {correct_index} out of range"
        
        # Check for number prefix
        if self.has_number_prefix(text):
            return False, "Question has number prefix"
        
        # Check explanation
        if not explanation or len(explanation.strip()) < 10:
            return False, "Explanation missing or too short"
        
        # STRICT: Check language (non-ANG must be French)
        if subject != 'ANG':
            is_eng, reason = self.is_english(text)
            if is_eng:
                return False, f"Non-ANG question in English: {reason}"
            
            # Also check options for English
            for i, opt in enumerate(options):
                is_eng, reason = self.is_english(opt)
                if is_eng:
                    return False, f"Option {i+1} in English: {reason}"
        
        return True, "OK"
    
    def check_duplicate(self, new_question: Dict, subject: str) -> Tuple[bool, str]:
        """Check if question is duplicate with existing questions"""
        new_text = new_question.get('text', '').lower().strip()
        new_options = new_question.get('options', [])
        new_correct_idx = new_question.get('correct_index', 0)
        new_correct_answer = new_options[new_correct_idx].lower().strip() if new_options else ''
        
        # Check against same subject in database
        subject_questions = self.questions_by_subject.get(subject, [])
        
        for existing in subject_questions:
            existing_text = existing.get('text', '').lower().strip()
            
            # Text similarity check
            similarity = fuzz.ratio(new_text, existing_text)
            if similarity >= TEXT_SIMILARITY_THRESHOLD:
                return False, f"Similar to existing (similarity={similarity}%): {existing.get('id', 'unknown')[:8]}..."
            
            # Same correct answer with moderate similarity
            if similarity >= 40:
                existing_opts = existing.get('options', [])
                existing_correct_idx = existing.get('correct_index', 0)
                if existing_opts and existing_correct_idx < len(existing_opts):
                    existing_correct = existing_opts[existing_correct_idx].lower().strip()
                    if fuzz.ratio(new_correct_answer, existing_correct) >= 80:
                        return False, f"Same answer as: {existing.get('id', 'unknown')[:8]}..."
        
        return True, "OK"
    
    def check_context_duplicate(self, new_question: Dict, subject: str) -> Tuple[bool, str]:
        """STRICT: Check if question shares same context with other generated questions"""
        new_context = self.extract_context(new_question.get('text', ''))
        
        # Check against already generated questions for this subject
        for existing_context in self.generated_contexts.get(subject, []):
            similarity = fuzz.ratio(new_context, existing_context)
            if similarity >= CONTEXT_SIMILARITY_THRESHOLD:
                return False, f"Same context as another generated question (similarity={similarity}%)"
        
        return True, "OK"
    
    async def generate_replacement(self, original: Dict) -> Optional[Dict]:
        """Generate a replacement question using Gemini"""
        subject = original.get('subject', 'CG')
        exam_type = original.get('exam_type', 'CM')
        test_type = original.get('test_type', 'practice')
        
        level_desc = {
            'CM': 'niveau Baccalauréat',
            'CMS': 'niveau Licence',
            'CS': 'niveau Master'
        }.get(exam_type, 'niveau intermédiaire')
        
        subject_desc = {
            'ANG': 'Anglais (grammaire, vocabulaire, compréhension)',
            'CG': 'Culture Générale (histoire, géographie, actualités, notamment liées à l\'Afrique et la Côte d\'Ivoire)',
            'LOG': 'Logique (raisonnement analytique, séquences, patterns, logique mathématique)'
        }.get(subject, 'culture générale')
        
        # Language instruction based on subject
        language_instruction = ""
        if subject == 'ANG':
            language_instruction = "The question should be in ENGLISH or asking to translate to english to test language skills."
        else:
            language_instruction = "La question DOIT être en FRANÇAIS. NE PAS utiliser l'anglais."
        
        prompt = f"""Générer une NOUVELLE question UNIQUE pour un concours en Côte d'Ivoire.

CONTEXTE:
- Matière: {subject} ({subject_desc})
- Type d'examen: {exam_type} ({level_desc})
- Public: Étudiants ivoiriens dont la langue maternelle est le français

EXIGENCES STRICTES:
1. Générer une question COMPLÈTEMENT DIFFÉRENTE de: "{original.get('text', '')[:100]}..."
2. EXACTEMENT 3 options (pas 4)
3. Une seule réponse correcte
4. PAS de numéro au début (pas de "1.", "Q1", etc.)
5. Question claire et sans ambiguïté
6. Difficulté appropriée pour le niveau {exam_type}
7. {language_instruction}
8. Pour CG: Inclure un contexte africain/ivoirien 
9. Pour LOG: question logique, matrices, puzzles, raisonnement, etc.
10. Inclure une explication de la bonne réponse

NE PAS générer de question sur le même sujet/contexte que d'autres questions existantes.

RÉPONDRE UNIQUEMENT avec du JSON valide:
{{
  "text": "Votre question ici",
  "options": ["Option A", "Option B", "Option C"],
  "correct_index": 0,
  "explanation": "Explication de pourquoi la réponse est correcte"
}}
"""
        
        try:
            model = genai.GenerativeModel(GEMINI_MODEL)
            response = await model.generate_content_async(
                prompt,
                generation_config={'temperature': 0.9}  # Higher creativity
            )
            text = response.text
            
            match = re.search(r'\{.*\}', text, re.DOTALL)
            if match:
                question = json.loads(match.group())
                
                question['subject'] = subject
                question['exam_type'] = exam_type
                question['difficulty'] = 'HARD'
                question['test_type'] = test_type
                question['test_number'] = original.get('test_number')
                question['original_id'] = original['id']
                
                if 'explanation' not in question or not question['explanation']:
                    question['explanation'] = ''
                
                return question
        except Exception as e:
            print(f"    ⚠️ Generation error: {str(e)[:50]}")
        
        return None
    
    async def validate_with_gemini(self, question: Dict, subject: str) -> Tuple[bool, str]:
        """Validate question with Gemini (second model check)"""
        correct_idx = question.get('correct_index', 0)
        options = question.get('options', [])
        correct_answer = options[correct_idx] if options and correct_idx < len(options) else 'N/A'
        
        language_check = "Est-ce en français?" if subject != 'ANG' else "Is it in English?"
        
        prompt = f"""Valider cette question d'examen pour étudiants en Côte d'Ivoire:

QUESTION:
Texte: {question.get('text')}
Options: {json.dumps(options, ensure_ascii=False)}
Réponse: {correct_answer}
Explication: {question.get('explanation', 'N/A')}

Matière: {subject}

VÉRIFIER:
1. {language_check}
2. Question claire et sans ambiguïté?
3. 3 options valides?
4. La bonne réponse est-elle correcte?
5. Pas de numéro au début?
6. Explication correcte?

RÉPONDRE JSON: {{"valid": true/false, "reason": "explication brève"}}
"""
        
        try:
            model = genai.GenerativeModel(GEMINI_MODEL)
            response = await model.generate_content_async(
                prompt,
                generation_config={'temperature': 0.1}
            )
            text = response.text
            match = re.search(r'\{[^{}]*\}', text, re.DOTALL)
            if match:
                result = json.loads(match.group())
                return result.get('valid', False), result.get('reason', 'Unknown')
        except Exception as e:
            return False, f"Gemini validation error: {str(e)[:50]}"
        
        return False, "Could not parse Gemini response"
    
    async def validate_with_gpt(self, question: Dict, subject: str) -> Tuple[bool, str]:
        """Validate question with GPT"""
        correct_idx = question.get('correct_index', 0)
        options = question.get('options', [])
        correct_answer = options[correct_idx] if options and correct_idx < len(options) else 'N/A'
        
        language_req = "Must be in FRENCH" if subject != 'ANG' else "Must be in ENGLISH"
        
        prompt = f"""Validate this exam question for students in Côte d'Ivoire:

QUESTION:
Text: {question.get('text')}
Options: {json.dumps(options, ensure_ascii=False)}
Answer: {correct_answer}
Explanation: {question.get('explanation', 'N/A')}

Subject: {subject}
Language requirement: {language_req}

CHECK:
1. Correct language? (REJECT if wrong language)
2. Clear and unambiguous?
3. Valid structure (3 options)?
4. Correct answer is actually correct?
5. No number prefix?
6. Valid explanation?

RESPOND JSON: {{"valid": true/false, "reason": "brief"}}
"""
        
        try:
            response = await openai_client.chat.completions.create(
                model=GPT_MODEL,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
                temperature=0.1
            )
            
            text = response.choices[0].message.content
            match = re.search(r'\{[^{}]*\}', text, re.DOTALL)
            if match:
                result = json.loads(match.group())
                return result.get('valid', False), result.get('reason', 'Unknown')
        except Exception as e:
            return False, f"GPT error: {str(e)[:50]}"
        
        return False, "Could not parse GPT response"
    
    async def validate_subject_match(self, question: Dict, target_subject: str) -> Tuple[bool, str]:
        """
        CRITICAL: Validate that the generated question matches the target subject.
        CG questions should NOT be logic puzzles, LOG questions should NOT be factual, etc.
        """
        text = question.get('text', '')
        options = question.get('options', [])
        
        prompt = f"""Analyze this exam question and determine its TRUE subject category.

QUESTION:
{text}

OPTIONS:
{json.dumps(options, ensure_ascii=False)}

SUBJECT DEFINITIONS:
- CG (Culture Générale): Questions about history, geography, current events, politics, 
  culture, arts, famous people, dates, facts, Africa/Côte d'Ivoire knowledge.
  Requires FACTUAL knowledge to answer.
  
- LOG (Logique): Questions involving logical reasoning, deduction, puzzles, sequences, 
  patterns, mathematical logic, "if-then" reasoning, constraint satisfaction, 
  syllogisms, analytical reasoning. Does NOT require factual knowledge.
  
- ANG (Anglais): Questions testing English language skills.

INDICATORS OF LOG (not CG):
- "On sait que..." followed by numbered conditions
- "Si... alors..." deductive patterns  
- Village/person assignment puzzles
- Sequence/pattern questions
- Abstract logical deduction required
- No factual knowledge needed

TARGET SUBJECT: {target_subject}

Does this question TRULY belong to {target_subject}?

RESPOND JSON: {{"matches": true/false, "actual_subject": "CG"/"LOG"/"ANG", "reason": "brief explanation"}}
"""
        
        try:
            model = genai.GenerativeModel(GEMINI_MODEL)
            response = await model.generate_content_async(
                prompt,
                generation_config={'temperature': 0.1}
            )
            
            text_response = response.text
            match = re.search(r'\{[^{}]*\}', text_response, re.DOTALL)
            
            if match:
                result = json.loads(match.group())
                matches = result.get('matches', False)
                actual = result.get('actual_subject', target_subject)
                reason = result.get('reason', 'Unknown')
                
                if not matches:
                    return False, f"Subject mismatch: should be {actual}. {reason}"
                return True, "Subject matches"
        except Exception as e:
            return False, f"Subject validation error: {str(e)[:50]}"
        
        return False, "Could not validate subject"
    
    async def process_question(self, question_id: str) -> Tuple[bool, Optional[Dict], str]:
        """Process a single flagged question"""
        original = self.flagged_questions.get(question_id)
        
        if not original:
            response = supabase.table('questions_v2').select('*').eq('id', question_id).execute()
            if response.data:
                original = response.data[0]
            else:
                return False, None, "Original question not found"
        
        subject = original.get('subject', 'CG')
        
        for attempt in range(MAX_RETRIES):
            # Generate replacement
            new_question = await self.generate_replacement(original)
            
            if not new_question:
                print(f"      Attempt {attempt+1}: Generation failed")
                continue
            
            # Check structural issues (includes language check)
            valid, reason = self.check_structural_issues(new_question, subject)
            if not valid:
                print(f"      Attempt {attempt+1}: Structural - {reason}")
                continue
            
            # Check duplicates against database
            valid, reason = self.check_duplicate(new_question, subject)
            if not valid:
                print(f"      Attempt {attempt+1}: DB duplicate - {reason}")
                continue
            
            # STRICT: Check context duplicate against generated questions
            valid, reason = self.check_context_duplicate(new_question, subject)
            if not valid:
                print(f"      Attempt {attempt+1}: Context duplicate - {reason}")
                continue
            
            # Validate with Gemini
            gemini_valid, gemini_reason = await self.validate_with_gemini(new_question, subject)
            if not gemini_valid:
                print(f"      Attempt {attempt+1}: Gemini rejected - {gemini_reason}")
                continue
            
            # Validate with GPT
            gpt_valid, gpt_reason = await self.validate_with_gpt(new_question, subject)
            if not gpt_valid:
                print(f"      Attempt {attempt+1}: GPT rejected - {gpt_reason}")
                continue
            
            # CRITICAL: Validate subject match (e.g., CG question is not actually LOG)
            subject_valid, subject_reason = await self.validate_subject_match(new_question, subject)
            if not subject_valid:
                print(f"      Attempt {attempt+1}: Subject mismatch - {subject_reason}")
                continue
            
            # All validations passed!
            return True, new_question, "Success"
        
        return False, None, f"Failed after {MAX_RETRIES} attempts"
    
    async def run(self):
        """Main execution"""
        print("🔄 Question Replacement Generator (STRICT MODE)")
        print("=" * 60)
        print("  Validations:")
        print("    ✓ No same context within subject")
        print("    ✓ French only (except ANG)")
        print("    ✓ Dual LLM validation (Gemini + GPT)")
        print("=" * 60)
        
        # Load flagged questions
        pending_ids = self.load_flagged_questions()
        
        if not pending_ids:
            print("\n✅ All questions already processed!")
            self.generate_final_report()
            return
        
        # Fetch all questions for duplicate checking
        self.fetch_all_questions()
        
        # Process questions
        print(f"\n🔧 Processing {len(pending_ids)} questions...")
        
        total = len(pending_ids)
        consecutive_failures = 0
        
        for i, qid in enumerate(pending_ids):
            print(f"\n[{i+1}/{total}] Processing {qid}...")
            
            success, replacement, reason = await self.process_question(qid)
            
            if success:
                self.progress['completed_ids'].append(qid)
                self.progress['replacements'].append(replacement)
                self.progress['current_failures'] = 0
                consecutive_failures = 0
                
                # Add context for future duplicate checking
                context = self.extract_context(replacement.get('text', ''))
                self.generated_contexts[replacement.get('subject', 'CG')].append(context)
                
                # Add to questions list for duplicate checks
                self.questions_by_subject[replacement.get('subject', 'CG')].append({
                    'id': f"new_{qid}",
                    'text': replacement['text'],
                    'options': replacement['options'],
                    'correct_index': replacement['correct_index']
                })
                
                print(f"  ✅ Success: {replacement.get('text', '')[:50]}...")
            else:
                self.progress['failed_ids'].append(qid)
                self.progress['current_failures'] += 1
                consecutive_failures += 1
                self.progress['last_failed_id'] = qid
                print(f"  ❌ Failed: {reason}")
                
                # Don't stop on failures, just continue
                if consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
                    print(f"  ⚠️ {consecutive_failures} consecutive failures, continuing anyway...")
                    consecutive_failures = 0
            
            # Save progress every 10 questions
            if (i + 1) % 10 == 0:
                self.save_progress()
                print(f"  💾 Progress: {len(self.progress['completed_ids'])} completed, {len(self.progress['failed_ids'])} failed")
        
        # Final save
        self.save_progress()
        self.generate_final_report()
    
    def generate_final_report(self):
        """Generate final report"""
        print("\n📝 Generating final report...")
        
        report = {
            'generated_at': datetime.now().isoformat(),
            'summary': {
                'total_flagged': len(self.flagged_ids),
                'completed': len(self.progress['completed_ids']),
                'failed': len(self.progress['failed_ids']),
                'success_rate': f"{len(self.progress['completed_ids']) / max(len(self.flagged_ids), 1) * 100:.1f}%"
            },
            'replacements': self.progress['replacements'],
            'failed_ids': self.progress['failed_ids']
        }
        
        with open(OUTPUT_FILE, 'w') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"\n{'='*60}")
        print("✅ REPLACEMENT GENERATION COMPLETE")
        print(f"{'='*60}")
        print(f"\n📊 Summary:")
        print(f"  Total flagged: {len(self.flagged_ids)}")
        print(f"  Completed: {len(self.progress['completed_ids'])}")
        print(f"  Failed: {len(self.progress['failed_ids'])}")
        print(f"  Success rate: {report['summary']['success_rate']}")
        print(f"\n📁 Results saved to: {OUTPUT_FILE}")


async def main():
    generator = ReplacementGenerator()
    await generator.run()


if __name__ == '__main__':
    asyncio.run(main())
