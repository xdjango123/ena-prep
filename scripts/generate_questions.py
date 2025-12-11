#!/usr/bin/env python3
"""
Generate New Questions Script

Generates new questions for the questions_v2 database with full validation.

Usage:
    python generate_questions.py <exam_type> <test_type> <count> [subject] [topic]

Examples:
    python generate_questions.py CM practice 20              # 20 questions for all subjects
    python generate_questions.py CMS exam_blanc 10 LOG       # 10 LOG questions only
    python generate_questions.py CS practice 15 CG "histoire"  # 15 CG questions with topic hint

Parameters:
    exam_type: CM, CMS, or CS
    test_type: practice or exam_blanc
    count: Number of questions per subject
    subject: (optional) ANG, CG, or LOG - if omitted, generates for all
    topic: (optional) Topic/theme hint for generation
"""

import json
import os
import sys
import asyncio
import re
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from collections import defaultdict
from dotenv import load_dotenv

load_dotenv()

import google.generativeai as genai
from openai import AsyncOpenAI
from supabase import create_client
from rapidfuzz import fuzz

# Initialize clients
SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('VITE_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
openai_client = AsyncOpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Models - use latest for generation, standard for validation
GENERATION_MODEL = 'gemini-2.5-flash'  # Best for creative generation
VALIDATOR_MODEL_1 = 'gemini-2.0-flash'  # Validator 1
VALIDATOR_MODEL_2 = 'gpt-4o-mini'  # Validator 2

# Constants
MAX_RETRIES = 3
TEXT_SIMILARITY_THRESHOLD = 70
CONTEXT_SIMILARITY_THRESHOLD = 60

# Subjects
ALL_SUBJECTS = ['ANG', 'CG', 'LOG']

# Number prefix patterns to reject
PREFIX_PATTERNS = [
    r'^[0-9]+[\.\)\-\s]',
    r'^Q[0-9]+[\.\)\-\s:]',
    r'^Question\s*[0-9]+',
    r'^[0-9]+\s*[\-–]\s*',
    r'^\([0-9]+\)',
    r'^[A-Z][\.\)\-]\s',
]

# English detection patterns
ENGLISH_INDICATORS = [
    r'\bthe\b', r'\bis\b', r'\bare\b', r'\bwas\b', r'\bwere\b',
    r'\bwhat\b', r'\bwhich\b', r'\bwho\b', r'\bwhere\b', r'\bwhen\b',
    r'\bhow\b', r'\bwhy\b', r'\bchoose\b', r'\bselect\b', r'\bidentify\b',
    r'\bfollowing\b', r'\bstatement\b', r'\bcorrect\b', r'\banswer\b',
    r'\btrue\b', r'\bfalse\b', r'\ball\b', r'\bnone\b', r'\bboth\b',
]


class QuestionGenerator:
    def __init__(self, exam_type: str, test_type: str, subject: Optional[str] = None, topic: Optional[str] = None):
        self.exam_type = exam_type
        self.test_type = test_type
        self.subjects = [subject] if subject else ALL_SUBJECTS
        self.topic = topic
        
        self.questions_by_subject: Dict[str, List[Dict]] = defaultdict(list)
        self.generated_contexts: Dict[str, List[str]] = defaultdict(list)
        self.results: List[Dict] = []
        self.failed: List[Dict] = []
        
    def fetch_existing_questions(self):
        """Fetch existing questions for duplicate checking"""
        print("\n📥 Fetching existing questions for duplicate checking...")
        
        for subject in self.subjects:
            all_questions = []
            page_size = 500
            offset = 0
            
            while True:
                response = supabase.table('questions_v2') \
                    .select('id, text, options, correct_index') \
                    .eq('subject', subject) \
                    .order('id') \
                    .range(offset, offset + page_size - 1) \
                    .execute()
                
                if not response.data:
                    break
                    
                all_questions.extend(response.data)
                
                if len(response.data) < page_size:
                    break
                    
                offset += page_size
            
            self.questions_by_subject[subject] = all_questions
            print(f"   {subject}: {len(all_questions)} existing questions")
    
    def extract_context(self, text: str) -> str:
        """Extract key context from question text"""
        text = text.lower().strip()
        text = re.sub(r'[?!.,;:"\']', ' ', text)
        return text
    
    def has_number_prefix(self, text: str) -> bool:
        """Check if text has a number prefix"""
        for pattern in PREFIX_PATTERNS:
            if re.match(pattern, text.strip(), re.IGNORECASE):
                return True
        return False
    
    def is_english(self, text: str) -> Tuple[bool, str]:
        """Check if text is in English"""
        text_lower = text.lower()
        english_count = 0
        matched_words = []
        
        for pattern in ENGLISH_INDICATORS:
            matches = re.findall(pattern, text_lower)
            if matches:
                english_count += len(matches)
                matched_words.extend(matches)
        
        if english_count >= 3:
            return True, f"English words: {', '.join(matched_words[:5])}"
        
        return False, "OK"
    
    def check_structural_issues(self, question: Dict, subject: str) -> Tuple[bool, str]:
        """Check for structural issues"""
        text = question.get('text', '')
        options = question.get('options', [])
        correct_index = question.get('correct_index')
        explanation = question.get('explanation', '')
        
        if not text or len(text.strip()) < 10:
            return False, "Question text too short"
        
        if not options or len(options) != 3:
            return False, f"Must have exactly 3 options, got {len(options) if options else 0}"
        
        for i, opt in enumerate(options):
            if not opt or len(opt.strip()) < 1:
                return False, f"Option {i+1} is empty"
        
        opt_lower = [o.lower().strip() for o in options]
        if len(set(opt_lower)) != len(opt_lower):
            return False, "Duplicate options detected"
        
        if correct_index is None or not isinstance(correct_index, int):
            return False, "correct_index must be an integer"
        if correct_index < 0 or correct_index >= len(options):
            return False, f"correct_index {correct_index} out of range"
        
        if self.has_number_prefix(text):
            return False, "Question has number prefix"
        
        if not explanation or len(explanation.strip()) < 10:
            return False, "Explanation missing or too short"
        
        # Language check (non-ANG must be French)
        if subject != 'ANG':
            is_eng, reason = self.is_english(text)
            if is_eng:
                return False, f"Non-ANG question in English: {reason}"
            
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
        
        # Safe access to correct answer
        if new_options and 0 <= new_correct_idx < len(new_options):
            new_correct_answer = new_options[new_correct_idx].lower().strip()
        else:
            new_correct_answer = ''
        
        for existing in self.questions_by_subject.get(subject, []):
            existing_text = existing.get('text', '').lower().strip()
            
            similarity = fuzz.ratio(new_text, existing_text)
            if similarity >= TEXT_SIMILARITY_THRESHOLD:
                return False, f"Similar to existing (similarity={similarity}%)"
            
            if similarity >= 40:
                existing_opts = existing.get('options', [])
                existing_correct_idx = existing.get('correct_index', 0)
                if existing_opts and existing_correct_idx < len(existing_opts):
                    existing_correct = existing_opts[existing_correct_idx].lower().strip()
                    if fuzz.ratio(new_correct_answer, existing_correct) >= 80:
                        return False, "Same answer as existing question"
        
        return True, "OK"
    
    def check_context_duplicate(self, new_question: Dict, subject: str) -> Tuple[bool, str]:
        """Check context duplicate against generated questions"""
        new_context = self.extract_context(new_question.get('text', ''))
        
        for existing_context in self.generated_contexts.get(subject, []):
            similarity = fuzz.ratio(new_context, existing_context)
            if similarity >= CONTEXT_SIMILARITY_THRESHOLD:
                return False, f"Same context as generated question (similarity={similarity}%)"
        
        return True, "OK"
    
    async def generate_question(self, subject: str) -> Optional[Dict]:
        """Generate a new question using Gemini"""
        level_desc = {
            'CM': 'niveau Baccalauréat',
            'CMS': 'niveau Licence',
            'CS': 'niveau Master'
        }.get(self.exam_type, 'niveau intermédiaire')
        
        subject_desc = {
            'ANG': 'Anglais (grammaire, vocabulaire, compréhension)',
            'CG': 'Culture Générale (histoire, géographie, actualités, Afrique et Côte d\'Ivoire)',
            'LOG': 'Logique (raisonnement analytique, séquences, patterns, mathématiques)'
        }.get(subject, 'culture générale')
        
        language_instruction = ""
        if subject == 'ANG':
            language_instruction = "The question MUST be in ENGLISH to test language skills."
        else:
            language_instruction = "La question DOIT être en FRANÇAIS. NE PAS utiliser l'anglais."
        
        topic_hint = f"\nSujet suggéré: {self.topic}" if self.topic else ""
        
        prompt = f"""Générer une question UNIQUE pour un concours en Côte d'Ivoire.

CONTEXTE:
- Matière: {subject} ({subject_desc})
- Type d'examen: {self.exam_type} ({level_desc})
- Type de test: {self.test_type}
- Public: Étudiants ivoiriens dont la langue maternelle est le français
{topic_hint}

EXIGENCES STRICTES:
1. EXACTEMENT 3 options (pas 4)
2. Une seule réponse correcte
3. PAS de numéro au début (pas de "1.", "Q1", etc.)
4. Question claire et sans ambiguïté
5. Difficulté appropriée pour le niveau {self.exam_type}
6. {language_instruction}
7. Pour CG: Inclure un contexte africain/ivoirien quand pertinent
8. Pour LOG: Créer des questions de logique, matrices, puzzles, raisonnement
9. Inclure une explication détaillée de la bonne réponse

RÉPONDRE UNIQUEMENT avec du JSON valide:
{{
  "text": "Votre question ici",
  "options": ["Option A", "Option B", "Option C"],
  "correct_index": 0,
  "explanation": "Explication de pourquoi la réponse est correcte"
}}
"""
        
        try:
            model = genai.GenerativeModel(GENERATION_MODEL)
            response = await model.generate_content_async(
                prompt,
                generation_config={'temperature': 0.9}
            )
            text = response.text
            
            match = re.search(r'\{.*\}', text, re.DOTALL)
            if match:
                question = json.loads(match.group())
                question['subject'] = subject
                question['exam_type'] = self.exam_type
                question['test_type'] = self.test_type
                question['difficulty'] = 'HARD'
                question['test_number'] = None  # Will be assigned by assign_test_numbers.py
                
                return question
        except Exception as e:
            print(f"    ⚠️ Generation error: {str(e)[:50]}")
        
        return None
    
    async def validate_with_gemini(self, question: Dict, subject: str) -> Tuple[bool, str]:
        """Validate with Gemini"""
        correct_idx = question.get('correct_index', 0)
        options = question.get('options', [])
        correct_answer = options[correct_idx] if options and correct_idx < len(options) else 'N/A'
        
        language_check = "Est-ce en français?" if subject != 'ANG' else "Is it in English?"
        
        prompt = f"""Valider cette question d'examen:

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

RÉPONDRE JSON: {{"valid": true/false, "reason": "explication brève"}}
"""
        
        try:
            model = genai.GenerativeModel(VALIDATOR_MODEL_1)
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
            return False, f"Validation error: {str(e)[:50]}"
        
        return False, "Could not parse response"
    
    async def validate_with_gpt(self, question: Dict, subject: str) -> Tuple[bool, str]:
        """Validate with GPT"""
        correct_idx = question.get('correct_index', 0)
        options = question.get('options', [])
        correct_answer = options[correct_idx] if options and correct_idx < len(options) else 'N/A'
        
        language_req = "Must be in FRENCH" if subject != 'ANG' else "Must be in ENGLISH"
        
        prompt = f"""Validate this exam question:

QUESTION:
Text: {question.get('text')}
Options: {json.dumps(options, ensure_ascii=False)}
Answer: {correct_answer}
Explanation: {question.get('explanation', 'N/A')}

Subject: {subject}
Language requirement: {language_req}

CHECK:
1. Correct language?
2. Clear and unambiguous?
3. Valid structure (3 options)?
4. Correct answer is actually correct?
5. No number prefix?

RESPOND JSON: {{"valid": true/false, "reason": "brief"}}
"""
        
        try:
            response = await openai_client.chat.completions.create(
                model=VALIDATOR_MODEL_2,
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
        
        return False, "Could not parse response"
    
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
            model = genai.GenerativeModel(VALIDATOR_MODEL_1)
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
    
    async def generate_one(self, subject: str) -> Tuple[bool, Optional[Dict], str]:
        """Generate and validate one question"""
        for attempt in range(MAX_RETRIES):
            question = await self.generate_question(subject)
            
            if not question:
                print(f"      Attempt {attempt+1}: Generation failed")
                continue
            
            # Structural check
            valid, reason = self.check_structural_issues(question, subject)
            if not valid:
                print(f"      Attempt {attempt+1}: Structural - {reason}")
                continue
            
            # Duplicate check vs DB
            valid, reason = self.check_duplicate(question, subject)
            if not valid:
                print(f"      Attempt {attempt+1}: Duplicate - {reason}")
                continue
            
            # Context duplicate vs generated
            valid, reason = self.check_context_duplicate(question, subject)
            if not valid:
                print(f"      Attempt {attempt+1}: Context dup - {reason}")
                continue
            
            # Gemini validation
            valid, reason = await self.validate_with_gemini(question, subject)
            if not valid:
                print(f"      Attempt {attempt+1}: Gemini - {reason}")
                continue
            
            # GPT validation
            valid, reason = await self.validate_with_gpt(question, subject)
            if not valid:
                print(f"      Attempt {attempt+1}: GPT - {reason}")
                continue
            
            # CRITICAL: Validate subject match (e.g., CG question is not actually LOG)
            valid, reason = await self.validate_subject_match(question, subject)
            if not valid:
                print(f"      Attempt {attempt+1}: Subject mismatch - {reason}")
                continue
            
            return True, question, "Success"
        
        return False, None, f"Failed after {MAX_RETRIES} attempts"
    
    async def run(self, count: int):
        """Main execution"""
        print("🆕 Question Generator")
        print("=" * 60)
        print(f"   Exam Type: {self.exam_type}")
        print(f"   Test Type: {self.test_type}")
        print(f"   Subjects: {', '.join(self.subjects)}")
        print(f"   Count per subject: {count}")
        if self.topic:
            print(f"   Topic hint: {self.topic}")
        print("=" * 60)
        
        # Fetch existing questions
        self.fetch_existing_questions()
        
        # Generate questions
        total_to_generate = count * len(self.subjects)
        print(f"\n🔧 Generating {total_to_generate} questions...")
        
        for subject in self.subjects:
            print(f"\n📝 Generating {count} {subject} questions...")
            
            for i in range(count):
                print(f"   [{i+1}/{count}] ", end="")
                
                success, question, reason = await self.generate_one(subject)
                
                if success:
                    self.results.append(question)
                    
                    # Track context for future duplicate checks
                    context = self.extract_context(question.get('text', ''))
                    self.generated_contexts[subject].append(context)
                    
                    # Add to questions list for duplicate checks
                    self.questions_by_subject[subject].append({
                        'id': f"new_{len(self.results)}",
                        'text': question['text'],
                        'options': question['options'],
                        'correct_index': question['correct_index']
                    })
                    
                    print(f"✅ {question.get('text', '')[:40]}...")
                else:
                    self.failed.append({'subject': subject, 'index': i, 'reason': reason})
                    print(f"❌ {reason}")
        
        # Save results
        filename = self.save_results()
        
        # Ask for confirmation before inserting
        if self.results:
            print("\n" + "=" * 60)
            print("🔴 REVIEW THE QUESTIONS")
            print("=" * 60)
            print(f"   File: {filename}")
            print(f"   Open the file to review all {len(self.results)} questions.")
            print()
            
            confirm = input("Insert these questions into questions_v2? (type 'yes' to confirm): ")
            
            if confirm.lower() == 'yes':
                self.insert_to_db(self.results)
            else:
                print("\n❌ Insertion cancelled.")
                print(f"💡 To insert later, run:")
                print(f"   python scripts/generate_questions.py --insert {filename}")
    
    def save_results(self) -> str:
        """Save generated questions to JSON and return filename"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"diagnostics_output/generated_questions_{self.exam_type}_{self.test_type}_{timestamp}.json"
        
        output = {
            'generated_at': datetime.now().isoformat(),
            'params': {
                'exam_type': self.exam_type,
                'test_type': self.test_type,
                'subjects': self.subjects,
                'topic': self.topic
            },
            'summary': {
                'generated': len(self.results),
                'failed': len(self.failed),
                'by_subject': {subj: sum(1 for q in self.results if q['subject'] == subj) for subj in self.subjects}
            },
            'questions': self.results,
            'failed': self.failed
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        
        print("\n" + "=" * 60)
        print("📊 GENERATION COMPLETE")
        print("=" * 60)
        print(f"   ✅ Generated: {len(self.results)}")
        print(f"   ❌ Failed: {len(self.failed)}")
        for subj in self.subjects:
            count = sum(1 for q in self.results if q['subject'] == subj)
            print(f"      {subj}: {count}")
        print(f"\n📁 Saved to: {filename}")
        
        # Show sample questions for review
        if self.results:
            print("\n" + "-" * 60)
            print("📝 SAMPLE QUESTIONS (first 3):")
            print("-" * 60)
            for i, q in enumerate(self.results[:3]):
                print(f"\n[{i+1}] {q['subject']} - {q['exam_type']} - {q['test_type']}")
                print(f"    Q: {q['text'][:80]}...")
                print(f"    Options: {q['options']}")
                print(f"    Answer: Option {q['correct_index'] + 1}")
        
        return filename
    
    def insert_to_db(self, questions: List[Dict]):
        """Insert questions directly into questions_v2"""
        print(f"\n📥 Inserting {len(questions)} questions into questions_v2...")
        
        inserted = 0
        failed = 0
        
        for i, q in enumerate(questions):
            try:
                # Prepare record for questions_v2
                record = {
                    'text': q['text'],
                    'options': q['options'],
                    'correct_index': q['correct_index'],
                    'explanation': q.get('explanation', ''),
                    'subject': q['subject'],
                    'exam_type': q['exam_type'],
                    'test_type': q['test_type'],
                    'difficulty': q.get('difficulty', 'HARD'),
                    'test_number': q.get('test_number'),  # Will be None
                }
                
                response = supabase.table('questions_v2').insert(record).execute()
                
                if response.data:
                    inserted += 1
                else:
                    failed += 1
                    print(f"   ⚠️ Failed to insert question {i+1}")
                    
            except Exception as e:
                failed += 1
                print(f"   ❌ Error inserting question {i+1}: {str(e)[:50]}")
            
            if (i + 1) % 5 == 0:
                print(f"   Progress: {i+1}/{len(questions)} ({inserted} inserted, {failed} failed)", end="\r")
        
        print(f"\n\n✅ Inserted: {inserted}")
        print(f"❌ Failed: {failed}")


async def main():
    # Handle --insert mode
    if len(sys.argv) >= 3 and sys.argv[1] == '--insert':
        filename = sys.argv[2]
        if not os.path.exists(filename):
            print(f"❌ File not found: {filename}")
            sys.exit(1)
        
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        questions = data.get('questions', [])
        if not questions:
            print("❌ No questions found in file")
            sys.exit(1)
        
        # Use a dummy generator just for the insert method
        generator = QuestionGenerator('CM', 'practice')
        generator.insert_to_db(questions)
        return
    
    # Normal generation mode
    if len(sys.argv) < 4:
        print(__doc__)
        print("\nTo insert from JSON file:")
        print("   python scripts/generate_questions.py --insert <filename.json>")
        sys.exit(1)
    
    exam_type = sys.argv[1].upper()
    test_type = sys.argv[2].lower()
    count = int(sys.argv[3])
    subject = sys.argv[4].upper() if len(sys.argv) > 4 else None
    topic = sys.argv[5] if len(sys.argv) > 5 else None
    
    # Validate inputs
    if exam_type not in ['CM', 'CMS', 'CS']:
        print(f"❌ Invalid exam_type: {exam_type}. Must be CM, CMS, or CS")
        sys.exit(1)
    
    if test_type not in ['practice', 'exam_blanc']:
        print(f"❌ Invalid test_type: {test_type}. Must be practice or exam_blanc")
        sys.exit(1)
    
    if subject and subject not in ALL_SUBJECTS:
        print(f"❌ Invalid subject: {subject}. Must be ANG, CG, or LOG")
        sys.exit(1)
    
    generator = QuestionGenerator(exam_type, test_type, subject, topic)
    await generator.run(count)


if __name__ == '__main__':
    asyncio.run(main())

