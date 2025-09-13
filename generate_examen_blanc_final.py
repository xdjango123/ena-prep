#!/usr/bin/env python3
"""
Final AI-powered question generator for examen blanc questions
Generates questions to support 10 examens blancs with 60 questions each (20 per subject)
Target: 200 questions per subject (160 HARD + 40 MED)
"""

import os
import sys
import hashlib
import json
import uuid
import re
from datetime import datetime
from supabase import create_client, Client
from typing import List, Dict, Any
from openai import OpenAI

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

class FinalExamenBlancGenerator:
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
        self.duplicates_skipped = 0
        print("✅ OpenAI client initialized successfully!")
    
    def get_existing_questions(self, category: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Get existing questions for a category to use as examples"""
        try:
            response = self.supabase.table('questions').select('*').eq('category', category).eq('test_type', 'examen_blanc').limit(limit).execute()
            return response.data
        except Exception as e:
            print(f"Error fetching existing questions: {e}")
            return []
    
    def get_current_counts(self) -> Dict[str, Dict[str, int]]:
        """Get current question counts by category and difficulty"""
        counts = {}
        categories = ['ANG', 'CG', 'LOG']
        difficulties = ['HARD', 'MED', 'EASY']
        
        for category in categories:
            counts[category] = {}
            for difficulty in difficulties:
                try:
                    response = self.supabase.table('questions').select('id', count='exact').eq('category', category).eq('difficulty', difficulty).eq('test_type', 'examen_blanc').execute()
                    counts[category][difficulty] = response.count or 0
                except Exception as e:
                    print(f"Error counting {category} {difficulty}: {e}")
                    counts[category][difficulty] = 0
        
        return counts
    
    def create_unique_hash(self, question_text: str) -> str:
        """Create a unique hash for deduplication"""
        return hashlib.sha256(question_text.encode()).hexdigest()
    
    def check_duplicate(self, question_text: str) -> bool:
        """Check if a question already exists"""
        try:
            unique_hash = self.create_unique_hash(question_text)
            response = self.supabase.table('questions').select('id').eq('unique_hash', unique_hash).execute()
            return len(response.data) > 0
        except Exception as e:
            print(f"Error checking duplicate: {e}")
            return False
    
    def clean_json_response(self, content: str) -> str:
        """Clean AI response to extract valid JSON"""
        # Remove markdown code blocks
        content = re.sub(r'```json\s*', '', content)
        content = re.sub(r'```\s*$', '', content)
        content = content.strip()
        
        # Try to find JSON array in the content
        start_idx = content.find('[')
        end_idx = content.rfind(']') + 1
        
        if start_idx != -1 and end_idx > start_idx:
            return content[start_idx:end_idx]
        
        return content
    
    def generate_questions(self, category: str, difficulty: str, count: int) -> List[Dict[str, Any]]:
        """Generate questions for a specific category and difficulty"""
        
        # Get examples from existing questions
        examples = self.get_existing_questions(category, 3)
        
        # Create prompt based on category
        if category == 'ANG':
            subject_name = "English Language"
            topics = ["grammar", "vocabulary", "reading comprehension", "sentence structure", "tenses", "prepositions", "articles", "pronouns", "phrasal verbs", "idioms"]
            sub_categories = ["Grammar", "Vocabulary", "Reading Comprehension", "Sentence Structure"]
        elif category == 'CG':
            subject_name = "General Knowledge (Culture Générale)"
            topics = ["history", "geography", "science", "literature", "current events", "politics", "economics", "culture", "philosophy", "art"]
            sub_categories = ["Histoire", "Géographie", "Sciences", "Littérature", "Actualités", "Politique", "Économie"]
        else:  # LOG
            subject_name = "Logic (Logique)"
            topics = ["mathematical reasoning", "logical sequences", "problem solving", "arithmetic", "algebra", "geometry", "analytical thinking", "patterns", "deduction"]
            sub_categories = ["Aptitude Numérique et Organisation", "Logique Mathématique", "Raisonnement Analytique"]
        
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
                examples_text += f"Sub-category: {example.get('sub_category', 'N/A')}\n"
        
        prompt = f"""Generate {count} {difficulty} difficulty questions for {subject_name} (ENA exam preparation).

Subject: {subject_name}
Difficulty: {difficulty}
Topics to cover: {', '.join(topics)}
Sub-categories: {', '.join(sub_categories)}

Requirements:
- Questions should be in French (except for ANG which should be in English)
- Each question must have exactly 4 answer options (A, B, C, D)
- Only one correct answer per question
- Questions should test {difficulty.lower()} level knowledge
- Make questions challenging but fair
- Include a brief explanation for each correct answer
- Questions should be suitable for ENA exam preparation
- Assign appropriate sub-category from the list provided
- Ensure variety in question types and topics

Format each question as JSON:
{{
  "question_text": "The question text here",
  "answer1": "First option",
  "answer2": "Second option", 
  "answer3": "Third option",
  "answer4": "Fourth option",
  "correct": "A",
  "explanation": "Brief explanation of why this answer is correct",
  "sub_category": "Appropriate sub-category from the list"
}}

Return only valid JSON array of questions, no other text.{examples_text}"""

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an expert ENA exam question generator. Generate high-quality, challenging questions in the exact JSON format requested. Ensure questions are diverse and cover different aspects of the subject. Return ONLY valid JSON array, no markdown formatting."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=4000
            )
            
            content = response.choices[0].message.content.strip()
            
            # Clean the response
            cleaned_content = self.clean_json_response(content)
            
            # Try to parse JSON
            try:
                questions = json.loads(cleaned_content)
                if isinstance(questions, list):
                    return questions
                else:
                    print(f"❌ Expected list, got {type(questions)}")
                    return []
            except json.JSONDecodeError as e:
                print(f"❌ JSON parse error: {e}")
                print(f"Cleaned content: {cleaned_content[:200]}...")
                return []
                
        except Exception as e:
            print(f"❌ Error generating questions: {e}")
            return []
    
    def save_questions(self, questions: List[Dict[str, Any]], category: str, difficulty: str):
        """Save generated questions to the database"""
        for question in questions:
            try:
                # Check for duplicates
                if self.check_duplicate(question['question_text']):
                    self.duplicates_skipped += 1
                    print(f"⏭️  Skipped duplicate: {question['question_text'][:50]}...")
                    continue
                
                # Create unique hash
                unique_hash = self.create_unique_hash(question['question_text'])
                
                # Prepare question data - include ALL required fields
                question_data = {
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
                    'exam_type': 'CS',  # Fixed: Add required exam_type field
                    'sub_category': question.get('sub_category', ''),
                    'unique_hash': unique_hash,
                    'ai_generated': True,
                    'question_pool': f"{category}_{difficulty}_examen",
                    'usage_count': 0
                    # Note: id, created_at, updated_at, last_used, passage_id are auto-generated
                }
                
                # Insert into database
                response = self.supabase.table('questions').insert(question_data).execute()
                
                if response.data:
                    self.questions_generated += 1
                    print(f"✅ Generated {category} {difficulty}: {question['question_text'][:50]}...")
                else:
                    self.questions_failed += 1
                    print(f"❌ Failed to save question: {question['question_text'][:50]}...")
                    
            except Exception as e:
                self.questions_failed += 1
                print(f"❌ Error saving question: {e}")
    
    def generate_all_questions(self):
        """Generate all needed questions for 10 examens blancs"""
        
        print("🎯 Starting comprehensive question generation for 10 examens blancs...")
        print("Target: 60 questions per exam (20 per subject)")
        print("Distribution: 80% HARD, 20% MED per subject")
        print("=" * 70)
        
        # Get current counts
        current_counts = self.get_current_counts()
        print("\n📊 Current question counts:")
        for category in ['ANG', 'CG', 'LOG']:
            print(f"  {category}: {current_counts[category]['HARD']} HARD, {current_counts[category]['MED']} MED, {current_counts[category]['EASY']} EASY")
        
        # Calculate needed questions per subject
        # For 10 exams: 200 questions per subject (20 × 10)
        # Distribution: 160 HARD + 40 MED per subject
        target_hard = 160
        target_med = 40
        
        categories = ['ANG', 'CG', 'LOG']
        difficulties = ['HARD', 'MED']
        
        for category in categories:
            print(f"\n--- Generating {category} questions ---")
            
            for difficulty in difficulties:
                if difficulty == 'HARD':
                    target_count = target_hard
                else:
                    target_count = target_med
                
                current_count = current_counts[category][difficulty]
                needed = max(0, target_count - current_count)
                
                if needed == 0:
                    print(f"✅ {category} {difficulty}: Already have {current_count} questions (target: {target_count})")
                    continue
                
                print(f"🎯 {category} {difficulty}: Need {needed} more questions (current: {current_count}, target: {target_count})")
                
                # Generate in batches of 10 to avoid token limits
                batch_size = 10
                batches = needed // batch_size
                remainder = needed % batch_size
                
                for batch in range(batches):
                    print(f"  📦 Batch {batch + 1}/{batches + (1 if remainder > 0 else 0)}")
                    questions = self.generate_questions(category, difficulty, batch_size)
                    if questions:
                        self.save_questions(questions, category, difficulty)
                
                # Handle remainder
                if remainder > 0:
                    print(f"  📦 Final batch ({remainder} questions)")
                    questions = self.generate_questions(category, difficulty, remainder)
                    if questions:
                        self.save_questions(questions, category, difficulty)
        
        print(f"\n🎉 Question generation complete!")
        print(f"✅ Generated: {self.questions_generated} questions")
        print(f"⏭️  Skipped duplicates: {self.duplicates_skipped} questions")
        print(f"❌ Failed: {self.questions_failed} questions")
        
        # Show final counts
        print(f"\n📊 Final question counts:")
        final_counts = self.get_current_counts()
        for category in ['ANG', 'CG', 'LOG']:
            print(f"  {category}: {final_counts[category]['HARD']} HARD, {final_counts[category]['MED']} MED, {final_counts[category]['EASY']} EASY")

if __name__ == "__main__":
    generator = FinalExamenBlancGenerator()
    generator.generate_all_questions()
