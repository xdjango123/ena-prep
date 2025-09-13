#!/usr/bin/env python3
"""
Test script for question generation - generates a small batch first
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

class TestQuestionGenerator:
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
        print("✅ OpenAI client initialized successfully!")
    
    def generate_test_questions(self, category: str, difficulty: str, count: int = 2) -> List[Dict[str, Any]]:
        """Generate a small test batch of questions"""
        
        # Create prompt based on category
        if category == 'ANG':
            subject_name = "English Language"
            sub_category = "English Language Skills"
            topics = ["grammar", "vocabulary", "reading comprehension"]
            language = "English"
        elif category == 'CG':
            subject_name = "General Knowledge (Culture Générale)"
            sub_category = "Culture Générale"
            topics = ["history", "geography", "science", "literature"]
            language = "French"
        else:  # LOG
            subject_name = "Logic (Logique)"
            sub_category = "Aptitude Numérique et Organisation"
            topics = ["mathematical reasoning", "logical sequences", "problem solving"]
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

Format each question as JSON:
{{
  "question_text": "The question text here",
  "answer1": "First option",
  "answer2": "Second option", 
  "answer3": "Third option",
  "answer4": "Fourth option",
  "correct": "A",
  "explanation": "Detailed explanation of why this answer is correct"
}}

Return only valid JSON array of questions, no other text."""

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an expert ENA exam question generator. Generate high-quality, challenging questions in the exact JSON format requested."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=2000
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
    
    def save_test_questions(self, questions: List[Dict[str, Any]], category: str, difficulty: str):
        """Save test questions to the database"""
        for question in questions:
            try:
                # Create unique hash
                unique_hash = hashlib.sha256(question['question_text'].encode()).hexdigest()
                
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
                    'exam_type': 'CS',
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
                    print(f"✅ Generated {category} {difficulty} question: {question['question_text'][:50]}...")
                    return True
                else:
                    print(f"❌ Failed to save question: {question['question_text'][:50]}...")
                    return False
                    
            except Exception as e:
                print(f"❌ Error saving question: {e}")
                return False
    
    def get_sub_category(self, category: str) -> str:
        """Get appropriate sub-category for each category"""
        sub_categories = {
            'ANG': 'English Language Skills',
            'CG': 'Culture Générale',
            'LOG': 'Aptitude Numérique et Organisation'
        }
        return sub_categories.get(category, 'General')
    
    def test_generation(self):
        """Test question generation for each category"""
        print("🧪 Testing question generation...")
        
        categories = ['ANG', 'CG', 'LOG']
        difficulties = ['HARD', 'MED']
        
        for category in categories:
            print(f"\n--- Testing {category} ---")
            for difficulty in difficulties:
                print(f"Generating 2 {difficulty} questions for {category}...")
                questions = self.generate_test_questions(category, difficulty, 2)
                if questions:
                    print(f"✅ Generated {len(questions)} questions")
                    # Save first question as test
                    if self.save_test_questions([questions[0]], category, difficulty):
                        print(f"✅ Successfully saved test question to database")
                    else:
                        print(f"❌ Failed to save test question")
                else:
                    print(f"❌ No questions generated")

if __name__ == "__main__":
    generator = TestQuestionGenerator()
    generator.test_generation()
