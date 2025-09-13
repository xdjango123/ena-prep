#!/usr/bin/env python3
"""
AI-powered question generator for examen blanc questions
Generates questions to support 10 examens blancs with 60 questions each (20 per subject)
Target: 200 questions per subject (160 HARD + 40 MED)
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

class ExamenBlancQuestionGenerator:
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
    
    def get_existing_questions(self, category: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Get existing questions for a category to use as examples"""
        try:
            response = self.supabase.table('questions').select('*').eq('category', category).eq('test_type', 'examen_blanc').limit(limit).execute()
            return response.data
        except Exception as e:
            print(f"Error fetching existing questions: {e}")
            return []
    
    def create_unique_hash(self, question_text: str) -> str:
        """Create a unique hash for deduplication"""
        return hashlib.sha256(question_text.encode()).hexdigest()
    
    def generate_questions(self, category: str, difficulty: str, count: int) -> List[Dict[str, Any]]:
        """Generate questions for a specific category and difficulty"""
        
        # Get examples from existing questions
        examples = self.get_existing_questions(category, 3)
        
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
        
        # Create examples text
        examples_text = ""
        if examples:
            examples_text = "\n\nExamples of existing questions:\n"
            for i, example in enumerate(examples[:2], 1):
                examples_text += f"\nExample {i}:\n"
                examples_text += f"Question: {example['question_text']}\n"
                examples_text += f"A) {example['answer1']}\n"
                examples_text += f"B) {example['answer2']}\n"
                examples_text += f"C) {example['answer3']}\n"
                examples_text += f"D) {example['answer4']}\n"
                examples_text += f"Correct: {example['correct']}\n"
                examples_text += f"Explanation: {example.get('explanation', 'N/A')}\n"
        
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

Format each question as JSON:
{{
  "question_text": "The question text here",
  "answer1": "First option",
  "answer2": "Second option", 
  "answer3": "Third option",
  "answer4": "Fourth option",
  "correct": "A",
  "explanation": "Detailed explanation of why this answer is correct and why others are wrong"
}}

Return only valid JSON array of questions, no other text.{examples_text}"""

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an expert ENA exam question generator. Generate high-quality, challenging questions in the exact JSON format requested. Ensure questions are original and appropriate for the specified difficulty level."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=4000
            )
            
            content = response.choices[0].message.content.strip()
            
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
                    'exam_type': 'CS',  # Default to CS for examen blanc
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
                print(f"❌ Error saving question: {e}")
    
    def get_sub_category(self, category: str) -> str:
        """Get appropriate sub-category for each category"""
        sub_categories = {
            'ANG': 'English Language Skills',
            'CG': 'Culture Générale',
            'LOG': 'Aptitude Numérique et Organisation'
        }
        return sub_categories.get(category, 'General')
    
    def generate_all_questions(self):
        """Generate all needed questions for 10 examens blancs"""
        
        print("🎯 Starting question generation for 10 examens blancs...")
        print("Target: 60 questions per exam (20 per subject)")
        print("Distribution: 80% HARD, 20% MED per subject")
        print("Total needed: 200 questions per subject (160 HARD + 40 MED)")
        print("=" * 80)
        
        # Calculate needed questions per subject
        categories = ['ANG', 'CG', 'LOG']
        difficulties = ['HARD', 'MED']
        
        for category in categories:
            print(f"\n--- Generating {category} questions ---")
            
            for difficulty in difficulties:
                if difficulty == 'HARD':
                    count = 160  # 80% of 200
                else:
                    count = 40   # 20% of 200
                
                print(f"Generating {count} {difficulty} questions for {category}...")
                
                # Generate in batches of 5 to avoid token limits and ensure quality
                batch_size = 5
                batches = count // batch_size
                remainder = count % batch_size
                
                for batch in range(batches):
                    print(f"  Batch {batch + 1}/{batches + (1 if remainder > 0 else 0)}")
                    questions = self.generate_questions(category, difficulty, batch_size)
                    if questions:
                        self.save_questions(questions, category, difficulty)
                    else:
                        print(f"  ⚠️  No questions generated for batch {batch + 1}")
                
                # Handle remainder
                if remainder > 0:
                    print(f"  Final batch ({remainder} questions)")
                    questions = self.generate_questions(category, difficulty, remainder)
                    if questions:
                        self.save_questions(questions, category, difficulty)
                    else:
                        print(f"  ⚠️  No questions generated for final batch")
        
        print(f"\n🎉 Question generation complete!")
        print(f"✅ Generated: {self.questions_generated} questions")
        print(f"❌ Failed: {self.questions_failed} questions")
        
        # Verify final counts
        print(f"\n📊 Final question counts:")
        for category in ['ANG', 'CG', 'LOG']:
            for difficulty in ['HARD', 'MED', 'EASY']:
                count_response = self.supabase.table('questions').select('id', count='exact').eq('category', category).eq('difficulty', difficulty).eq('test_type', 'examen_blanc').execute()
                count = count_response.count if count_response.count else 0
                print(f"  {category} {difficulty}: {count}")

if __name__ == "__main__":
    generator = ExamenBlancQuestionGenerator()
    generator.generate_all_questions()
