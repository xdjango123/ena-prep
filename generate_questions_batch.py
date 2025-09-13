#!/usr/bin/env python3
"""
AI-powered question generator for examen blanc questions - BATCH VERSION
Generates questions in manageable batches to support 10 examens blancs
"""

import os
import sys
import hashlib
import json
import uuid
import re
from datetime import datetime, timezone
from supabase import create_client, Client
from typing import List, Dict, Any
from openai import OpenAI

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

class BatchQuestionGenerator:
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
    
    def get_current_counts(self):
        """Get current question counts by category and difficulty"""
        print("\n📊 Current question counts:")
        for category in ['ANG', 'CG', 'LOG']:
            for difficulty in ['HARD', 'MED', 'EASY']:
                count_response = self.supabase.table('questions').select('id', count='exact').eq('category', category).eq('difficulty', difficulty).eq('test_type', 'examen_blanc').execute()
                count = count_response.count if count_response.count else 0
                print(f"  {category} {difficulty}: {count}")
    
    def clean_json_response(self, content: str) -> str:
        """Clean JSON response by removing markdown code blocks"""
        content = re.sub(r'```json\s*', '', content)
        content = re.sub(r'```\s*$', '', content)
        content = content.strip()
        return content
    
    def generate_questions(self, category: str, difficulty: str, count: int) -> List[Dict[str, Any]]:
        """Generate questions for a specific category and difficulty"""
        
        # Create prompt based on category
        if category == 'ANG':
            subject_name = "English Language"
            sub_category = "English Language Skills"
            topics = ["grammar", "vocabulary", "reading comprehension", "sentence structure", "tenses", "prepositions", "articles", "pronouns", "phrasal verbs", "idioms"]
            language = "English"
        elif category == 'CG':
            subject_name = "General Knowledge (Culture Générale)"
            sub_category = "Culture Générale"
            topics = ["history", "geography", "science", "literature", "current events", "politics", "economics", "culture", "art", "philosophy"]
            language = "French"
        else:  # LOG
            subject_name = "Logic (Logique)"
            sub_category = "Aptitude Numérique et Organisation"
            topics = ["mathematical reasoning", "logical sequences", "problem solving", "arithmetic", "algebra", "geometry", "analytical thinking", "data interpretation", "logical puzzles"]
            language = "French"
        
        prompt = f"""Generate {count} {difficulty} difficulty questions for {subject_name} (ENA exam preparation).

Subject: {subject_name}
Sub-category: {sub_category}
Difficulty: {difficulty}
Language: {language}
Topics to cover: {', '.join(topics)}

Requirements:
- Questions should be in {language}
- Each question must have exactly 4 answer options (A, B, C, D)
- Only one correct answer per question
- Questions should test {difficulty.lower()} level knowledge
- Make questions challenging but fair for ENA exam preparation
- Include a detailed explanation for each correct answer
- Questions should be original and not duplicate existing ones
- Focus on practical application and critical thinking

IMPORTANT: Return ONLY a valid JSON array, no markdown formatting, no code blocks, no additional text.

Format each question as JSON:
{{
  "question_text": "The question text here",
  "answer1": "First option",
  "answer2": "Second option", 
  "answer3": "Third option",
  "answer4": "Fourth option",
  "correct": "A",
  "explanation": "Detailed explanation of why this answer is correct and why others are wrong"
}}"""

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an expert ENA exam question generator. Generate high-quality, challenging questions in the exact JSON format requested. Return ONLY valid JSON array, no markdown, no code blocks, no additional text."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=3000
            )
            
            content = response.choices[0].message.content.strip()
            
            # Clean the response
            content = self.clean_json_response(content)
            
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
    
    def save_questions(self, questions: List[Dict[str, Any]], category: str, difficulty: str):
        """Save generated questions to the database with all required columns"""
        for question in questions:
            try:
                # Create unique hash
                unique_hash = self.create_unique_hash(question['question_text'])
                
                # Generate question pool name
                question_pool = f"CS_{category}_examen"
                
                # Get current UTC time
                now = datetime.now(timezone.utc).isoformat()
                
                # Prepare question data with all required columns
                question_data = {
                    'id': str(uuid.uuid4()),
                    'question_text': question['question_text'],
                    'answer1': question['answer1'],
                    'answer2': question['answer2'],
                    'answer3': question['answer3'],
                    'answer4': question['answer4'],
                    'correct': question['correct'],
                    'explanation': question.get('explanation', ''),
                    'category': category,
                    'difficulty': difficulty.upper(),
                    'test_type': 'examen_blanc',
                    'exam_type': 'CS',
                    'sub_category': self.get_sub_category(category),
                    'passage_id': None,
                    'ai_generated': True,
                    'unique_hash': unique_hash,
                    'question_pool': question_pool,
                    'usage_count': 0,
                    'last_used': None,
                    'created_at': now,
                    'updated_at': now
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
                print(f"❌ Error saving question: {e}")
    
    def create_unique_hash(self, question_text: str) -> str:
        """Create a unique hash for deduplication"""
        return hashlib.sha256(question_text.encode()).hexdigest()
    
    def get_sub_category(self, category: str) -> str:
        """Get appropriate sub-category for each category"""
        sub_categories = {
            'ANG': 'English Language Skills',
            'CG': 'Culture Générale',
            'LOG': 'Aptitude Numérique et Organisation'
        }
        return sub_categories.get(category, 'General')
    
    def generate_batch(self, category: str, difficulty: str, count: int):
        """Generate a batch of questions for a specific category and difficulty"""
        print(f"\n🎯 Generating {count} {difficulty} questions for {category}...")
        
        # Generate in smaller sub-batches of 3
        sub_batch_size = 3
        sub_batches = count // sub_batch_size
        remainder = count % sub_batch_size
        
        for i in range(sub_batches):
            print(f"  Sub-batch {i + 1}/{sub_batches + (1 if remainder > 0 else 0)}")
            questions = self.generate_questions(category, difficulty, sub_batch_size)
            if questions:
                self.save_questions(questions, category, difficulty)
            else:
                print(f"  ⚠️  No questions generated for sub-batch {i + 1}")
        
        # Handle remainder
        if remainder > 0:
            print(f"  Final sub-batch ({remainder} questions)")
            questions = self.generate_questions(category, difficulty, remainder)
            if questions:
                self.save_questions(questions, category, difficulty)
            else:
                print(f"  ⚠️  No questions generated for final sub-batch")
    
    def generate_for_category(self, category: str, hard_count: int, med_count: int):
        """Generate questions for a specific category"""
        print(f"\n{'='*60}")
        print(f"🎯 Generating questions for {category}")
        print(f"Target: {hard_count} HARD + {med_count} MED = {hard_count + med_count} total")
        print(f"{'='*60}")
        
        if hard_count > 0:
            self.generate_batch(category, 'HARD', hard_count)
        
        if med_count > 0:
            self.generate_batch(category, 'MED', med_count)
    
    def interactive_generation(self):
        """Interactive question generation"""
        print("🎯 Interactive Question Generation for Examen Blanc")
        print("Target: 10 examens blancs with 60 questions each (20 per subject)")
        print("Distribution: 80% HARD, 20% MED per subject")
        print("=" * 80)
        
        # Show current counts
        self.get_current_counts()
        
        # Calculate what we need
        target_per_subject = 200  # 20 questions × 10 exams
        target_hard = 160  # 80% of 200
        target_med = 40    # 20% of 200
        
        print(f"\n📋 Target per subject: {target_hard} HARD + {target_med} MED = {target_per_subject} total")
        
        # Get current counts
        current_counts = {}
        for category in ['ANG', 'CG', 'LOG']:
            current_counts[category] = {}
            for difficulty in ['HARD', 'MED']:
                count_response = self.supabase.table('questions').select('id', count='exact').eq('category', category).eq('difficulty', difficulty).eq('test_type', 'examen_blanc').execute()
                current_counts[category][difficulty] = count_response.count if count_response.count else 0
        
        # Calculate what we need to generate
        for category in ['ANG', 'CG', 'LOG']:
            needed_hard = max(0, target_hard - current_counts[category]['HARD'])
            needed_med = max(0, target_med - current_counts[category]['MED'])
            
            if needed_hard > 0 or needed_med > 0:
                print(f"\n{category}: Need {needed_hard} HARD + {needed_med} MED")
                self.generate_for_category(category, needed_hard, needed_med)
            else:
                print(f"\n{category}: ✅ Already has enough questions!")
        
        # Show final counts
        print(f"\n🎉 Generation complete!")
        print(f"✅ Generated: {self.questions_generated} questions")
        print(f"❌ Failed: {self.questions_failed} questions")
        self.get_current_counts()

if __name__ == "__main__":
    generator = BatchQuestionGenerator()
    generator.interactive_generation()
