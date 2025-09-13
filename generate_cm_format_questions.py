#!/usr/bin/env python3
"""
Generate examen blanc questions following CM exam format
- 3 options (A, B, C) instead of 4
- Language consistency (French for CG/LOG, appropriate English for ANG)
- Consistent option lengths
- Appropriate difficulty for French speakers
"""

import os
import sys
import hashlib
import json
import uuid
from datetime import datetime
from supabase import create_client, Client
from typing import List, Dict, Any
from openai import OpenAI

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

class CMFormatQuestionGenerator:
    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        
        # Set OpenAI API key
        os.environ["OPENAI_API_KEY"] = "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"
        
        # Initialize OpenAI
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("❌ OPENAI_API_KEY environment variable not set!")
            sys.exit(1)
        
        self.openai_client = OpenAI(api_key=api_key)
        self.questions_generated = 0
        self.questions_failed = 0
        print("✅ OpenAI client initialized successfully!")
    
    def create_unique_hash(self, question_text: str, answer1: str = "", answer2: str = "", answer3: str = "") -> str:
        """Create a unique hash for deduplication using question and all answers"""
        combined_text = f"{question_text}|{answer1}|{answer2}|{answer3}"
        return hashlib.sha256(combined_text.encode()).hexdigest()
    
    def generate_questions(self, category: str, difficulty: str, count: int, exam_type: str = 'CS') -> List[Dict[str, Any]]:
        """Generate questions following CM exam format"""
        
        # Create prompt based on category and CM format
        if category == 'ANG':
            subject_name = "English Language"
            sub_category = "English Language Skills"
            language = "English"
            explanation_language = "French"
            
            # Based on CM exam examples - simple grammar for French speakers
            topics = [
                "verb patterns (suggest + gerund, agree to + infinitive, stop + gerund/infinitive)",
                "simple tenses (past simple, present perfect, future simple)",
                "basic grammar (articles a/an/the, prepositions in/on/at)",
                "common vocabulary (everyday words)",
                "sentence structure (subject-verb agreement)",
                "phrasal verbs (basic ones like 'look up', 'turn on')"
            ]
            
            prompt = f"""Generate {count} {difficulty} difficulty English questions for French speakers preparing for ENA {exam_type} exam.

IMPORTANT: Follow the {exam_type} exam format exactly:
- Questions should be in English
- Each question must have exactly 3 answer options (A, B, C) - NOT 4
- Options should be short and consistent in length
- Explanations should be in French
- Focus on basic to intermediate English appropriate for French speakers
- Avoid advanced concepts like subjunctive mood, complex conditionals

Topics to cover: {', '.join(topics)}

Question format examples from CM exams:
- "I suggest...........a cab." (a) taking, b) to take, c) to taking)
- "They agreed to............" (a) leave, b) leaving, c) leving)
- "Stop...............me!" (a) bothering, b) to bothering, c) to bother)

Format each question as JSON:
{{
  "question_text": "The question text here",
  "answer1": "First option",
  "answer2": "Second option", 
  "answer3": "Third option",
  "correct": "A",
  "explanation": "Explication détaillée en français de pourquoi cette réponse est correcte"
}}

Return only valid JSON array of questions, no other text, no markdown formatting."""

        elif category == 'CG':
            subject_name = "Culture Générale"
            sub_category = "Culture Générale"
            language = "French"
            explanation_language = "French"
            
            # Based on CM exam examples - vocabulary, proverbs, basic knowledge
            topics = [
                "vocabulary and spelling (correct spelling of common words)",
                "proverbs and sayings (common French proverbs)",
                "idioms and expressions (basic French idioms)",
                "general knowledge (history, geography, science basics)",
                "units of measurement (ares, hectares, etc.)",
                "basic facts about France and the world"
            ]
            
            prompt = f"""Generate {count} {difficulty} difficulty Culture Générale questions for ENA {exam_type} exam.

IMPORTANT: Follow the {exam_type} exam format exactly:
- Questions should be in French
- Each question must have exactly 3 answer options (A, B, C) - NOT 4
- Options should be short and consistent in length (single words or short phrases)
- Explanations should be in French
- Focus on basic general knowledge appropriate for French speakers

Topics to cover: {', '.join(topics)}

Question format examples from CM exams:
- "Une substance sans principe actif, mais qui peut avoir un effet psychologique bénéfique est un." (a) plasébo, b) placébo, c) placébeau)
- "...........est mère de sûreté." (a) L'honnêteté, b) L'amour, c) La prudence)
- "« Filer du mauvais coton » signifie ...." (a) travailler avec un outil inadapté, b) Ne pas aller aussi vite que l'on voudrait, c) Voir sa santé se dégrader)

Format each question as JSON:
{{
  "question_text": "La question en français",
  "answer1": "Première option",
  "answer2": "Deuxième option", 
  "answer3": "Troisième option",
  "correct": "A",
  "explanation": "Explication détaillée en français de pourquoi cette réponse est correcte"
}}

Return only valid JSON array of questions, no other text, no markdown formatting."""

        else:  # LOG
            subject_name = "Logique"
            sub_category = "Aptitude Numérique et Organisation"
            language = "French"
            explanation_language = "French"
            
            # Based on CM exam examples - basic math and logic
            topics = [
                "basic arithmetic (addition, subtraction, multiplication, division)",
                "simple algebra (solving for x in basic equations)",
                "logical sequences (number patterns, letter patterns)",
                "word problems (age problems, work problems, distance problems)",
                "basic geometry (area, perimeter, angles)",
                "analytical reasoning (analogies, code breaking)"
            ]
            
            prompt = f"""Generate {count} {difficulty} difficulty Logic questions for ENA {exam_type} exam.

IMPORTANT: Follow the {exam_type} exam format exactly:
- Questions should be in French
- Each question must have exactly 3 answer options (A, B, C) - NOT 4
- Options should be short and consistent in length (numbers or brief answers)
- Explanations should be in French
- Focus on basic mathematical and logical reasoning

Topics to cover: {', '.join(topics)}

Question format examples from CM exams:
- "Je suis le tiers de la moitié du carré du quart de 24. Qui suis-je ?" (a) 12, b) 6, c) 4)
- "Complétez cette analogie : « Pardon est à 437125 ce que Pondra est à .... »" (a) 425173, b) 425178, c) 452178)
- "Quel nombre peut-on logiquement mettre sous la quatrième figure?" (a) 4, b) 8, c) 6)

Format each question as JSON:
{{
  "question_text": "La question en français",
  "answer1": "Première option",
  "answer2": "Deuxième option", 
  "answer3": "Troisième option",
  "correct": "A",
  "explanation": "Explication détaillée en français de pourquoi cette réponse est correcte"
}}

Return only valid JSON array of questions, no other text, no markdown formatting."""

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": f"You are an expert ENA exam question generator. Generate high-quality questions in the exact JSON format requested. Follow the CM exam format with 3 options (A, B, C) and ensure questions are appropriate for French speakers. Return ONLY valid JSON array, no markdown, no extra text."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=4000
            )
            
            content = response.choices[0].message.content.strip()
            
            # Clean up markdown formatting if present
            if content.startswith('```json'):
                content = content[7:]  # Remove ```json
            elif content.startswith('```'):
                content = content[3:]  # Remove ```
            if content.endswith('```'):
                content = content[:-3]  # Remove ```
            content = content.strip()
            
            # Additional cleanup for common issues
            if content.startswith('[') and content.endswith(']'):
                pass  # Good JSON array
            elif '[' in content and ']' in content:
                # Extract JSON array from text
                start = content.find('[')
                end = content.rfind(']') + 1
                content = content[start:end]
            
            # Try to parse JSON
            try:
                questions = json.loads(content)
                if isinstance(questions, list):
                    return questions
                else:
                    print(f"❌ Expected list, got {type(questions)}")
                    return []
            except json.JSONDecodeError as e:
                print(f"❌ JSON parse error: {e}")
                print(f"Raw content: {content[:200]}...")
                return []
                
        except Exception as e:
            print(f"❌ Error generating questions: {e}")
            return []
    
    def save_questions(self, questions: List[Dict[str, Any]], category: str, difficulty: str, exam_type: str = 'CS'):
        """Save generated questions to the database with CM format"""
        for question in questions:
            try:
                # Create unique hash using question and all answers
                unique_hash = self.create_unique_hash(
                    question['question_text'], 
                    question['answer1'], 
                    question['answer2'], 
                    question['answer3']
                )
                
                # Generate question pool name
                question_pool = f"CS_{category}_examen"
                
                # Prepare question data with 3 options format (all exam types)
                question_data = {
                    'id': str(uuid.uuid4()),
                    'question_text': question['question_text'],
                    'answer1': question['answer1'],
                    'answer2': question['answer2'],
                    'answer3': question['answer3'],
                    'answer4': None,  # All exam types use only 3 options
                    'correct': question['correct'],
                    'explanation': question.get('explanation', ''),
                    'category': category,
                    'difficulty': 'MED',  # Use MED for all questions
                    'test_type': 'examen_blanc',
                    'exam_type': exam_type,
                    'sub_category': self.get_sub_category(category),
                    'passage_id': None,
                    'ai_generated': True,
                    'unique_hash': unique_hash,
                    'question_pool': question_pool,
                    'usage_count': 0,
                    'last_used': None,
                    'created_at': datetime.utcnow().isoformat(),
                    'updated_at': datetime.utcnow().isoformat()
                }
                
                # Insert into database
                response = self.supabase.table('questions').insert(question_data).execute()
                
                if response.data:
                    self.questions_generated += 1
                    print(f"✅ Generated {category} {difficulty} question: {question['question_text'][:50]}...")
                else:
                    self.questions_failed += 1
                    print(f"❌ Failed to save question: {question['question_text'][:50]}...")
                    
            except Exception as e:
                self.questions_failed += 1
                error_msg = str(e)
                if "duplicate key value violates unique constraint" in error_msg:
                    print(f"⚠️  Duplicate question skipped: {question['question_text'][:50]}...")
                else:
                    print(f"❌ Error saving question: {e}")
    
    def get_sub_category(self, category: str) -> str:
        """Get appropriate sub-category for each category"""
        sub_categories = {
            'ANG': 'English Language Skills',
            'CG': 'Culture Générale',
            'LOG': 'Aptitude Numérique et Organisation'
        }
        return sub_categories.get(category, 'General')
    
    def check_existing_questions(self):
        """Check how many questions already exist"""
        print("🔍 Checking existing questions...")
        for category in ['ANG', 'CG', 'LOG']:
            count_response = self.supabase.table('questions').select('id', count='exact').eq('category', category).eq('test_type', 'examen_blanc').execute()
            count = count_response.count if count_response.count else 0
            print(f"  {category}: {count} questions")
        print()
    
    def generate_all_questions(self):
        """Generate all needed questions for all exam types (CS, CMS, CM)"""
        
        print("🎯 Starting question generation for all exam types...")
        print("Target: 200 questions per category per exam type (1800 total)")
        print("Format: 3 options (A, B, C) for all exam types")
        print("Language: French for CG/LOG, appropriate English for ANG")
        print("=" * 80)
        
        # Check existing questions first
        self.check_existing_questions()
        
        # Generate questions for each exam type
        exam_types = ['CS', 'CMS', 'CM']
        categories = ['ANG', 'CG', 'LOG']
        questions_per_category_per_exam = 200
        
        for exam_type in exam_types:
            print(f"\n{'='*60}")
            print(f"🎯 GENERATING {exam_type} QUESTIONS")
            print(f"{'='*60}")
            
            for category in categories:
                print(f"\n--- Generating {category} questions for {exam_type} ---")
                
                # Generate in batches of 5 to avoid token limits
                batch_size = 5
                batches = questions_per_category_per_exam // batch_size
                remainder = questions_per_category_per_exam % batch_size
                
                for batch in range(batches):
                    print(f"  {exam_type} {category} Batch {batch + 1}/{batches + (1 if remainder > 0 else 0)}")
                    questions = self.generate_questions(category, 'MED', batch_size, exam_type)
                    if questions:
                        self.save_questions(questions, category, 'MED', exam_type)
                    else:
                        print(f"  ⚠️  No questions generated for {exam_type} {category} batch {batch + 1}")
                
                # Handle remainder
                if remainder > 0:
                    print(f"  {exam_type} {category} Final batch ({remainder} questions)")
                    questions = self.generate_questions(category, 'MED', remainder, exam_type)
                    if questions:
                        self.save_questions(questions, category, 'MED', exam_type)
                    else:
                        print(f"  ⚠️  No questions generated for {exam_type} {category} final batch")
        
        print(f"\n🎉 Question generation complete!")
        print(f"✅ Generated: {self.questions_generated} questions")
        print(f"❌ Failed: {self.questions_failed} questions")
        
        # Verify final counts
        print(f"\n📊 Final question counts by exam type:")
        for exam_type in ['CS', 'CMS', 'CM']:
            print(f"\n{exam_type} Questions:")
            for category in ['ANG', 'CG', 'LOG']:
                count_response = self.supabase.table('questions').select('id', count='exact').eq('category', category).eq('test_type', 'examen_blanc').eq('exam_type', exam_type).execute()
                count = count_response.count if count_response.count else 0
                print(f"  {category}: {count}")

if __name__ == "__main__":
    generator = CMFormatQuestionGenerator()
    generator.generate_all_questions()
