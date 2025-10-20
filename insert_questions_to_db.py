#!/usr/bin/env python3
"""
Insert Validated Questions Script
Inserts validated questions into the database with proper metadata
Handles the final step of the question generation pipeline
"""

import os
import sys
import json
import hashlib
from datetime import datetime
from typing import List, Dict, Any
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

class QuestionInserter:
    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        self.questions_inserted = 0
        self.questions_failed = 0
        self.duplicates_skipped = 0
        
        print("✅ Question inserter initialized successfully!")
    
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
    
    def validate_question_data(self, question: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and clean question data before insertion"""
        
        # Required fields
        required_fields = ['question_text', 'answer1', 'answer2', 'answer3', 'correct', 'explanation', 'category', 'difficulty', 'exam_type', 'test_type']
        
        # Check required fields
        missing_fields = []
        for field in required_fields:
            if not question.get(field):
                missing_fields.append(field)
        
        if missing_fields:
            return {
                "valid": False,
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            }
        
        # Validate correct answer
        valid_answers = ['A', 'B', 'C', 'D']
        if question['correct'] not in valid_answers:
            return {
                "valid": False,
                "error": f"Invalid correct answer: {question['correct']}. Must be one of {valid_answers}"
            }
        
        # Validate difficulty
        valid_difficulties = ['EASY', 'MED', 'HARD']
        if question['difficulty'].upper() not in valid_difficulties:
            return {
                "valid": False,
                "error": f"Invalid difficulty: {question['difficulty']}. Must be one of {valid_difficulties}"
            }
        
        # Validate category
        valid_categories = ['ANG', 'CG', 'LOG']
        if question['category'] not in valid_categories:
            return {
                "valid": False,
                "error": f"Invalid category: {question['category']}. Must be one of {valid_categories}"
            }
        
        # Validate exam_type
        valid_exam_types = ['CM', 'CMS', 'CS']
        if question['exam_type'] not in valid_exam_types:
            return {
                "valid": False,
                "error": f"Invalid exam_type: {question['exam_type']}. Must be one of {valid_exam_types}"
            }
        
        # Validate test_type
        valid_test_types = ['quiz_series', 'practice_test', 'examen_blanc']
        if question['test_type'] not in valid_test_types:
            return {
                "valid": False,
                "error": f"Invalid test_type: {question['test_type']}. Must be one of {valid_test_types}"
            }
        
        # Clean and prepare data
        cleaned_question = {
            'question_text': question['question_text'].strip(),
            'answer1': question['answer1'].strip(),
            'answer2': question['answer2'].strip(),
            'answer3': question['answer3'].strip(),
            'answer4': question.get('answer4'),  # Can be None for 3-option questions
            'correct': question['correct'].upper(),
            'explanation': question['explanation'].strip(),
            'category': question['category'],
            'difficulty': question['difficulty'].upper(),
            'exam_type': question['exam_type'],
            'test_type': question['test_type'],
            'sub_category': question.get('sub_category', '').strip(),
            'unique_hash': self.create_unique_hash(question['question_text'].strip()),
            'ai_generated': True,
            'question_pool': f"{question['exam_type']}_{question['category']}_{question['test_type']}",
            'usage_count': 0,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        return {
            "valid": True,
            "data": cleaned_question
        }
    
    def insert_question(self, question: Dict[str, Any]) -> bool:
        """Insert a single question into the database"""
        try:
            # Validate question data
            validation = self.validate_question_data(question)
            if not validation['valid']:
                print(f"❌ Validation failed: {validation['error']}")
                self.questions_failed += 1
                return False
            
            cleaned_question = validation['data']
            
            # Check for duplicates
            if self.check_duplicate(cleaned_question['question_text']):
                self.duplicates_skipped += 1
                print(f"⏭️  Skipped duplicate: {cleaned_question['question_text'][:50]}...")
                return False
            
            # Insert into database
            response = self.supabase.table('questions').insert(cleaned_question).execute()
            
            if response.data:
                self.questions_inserted += 1
                print(f"✅ Inserted: {cleaned_question['exam_type']} {cleaned_question['category']} {cleaned_question['test_type']} {cleaned_question['difficulty']}")
                return True
            else:
                self.questions_failed += 1
                print(f"❌ Failed to insert question: {cleaned_question['question_text'][:50]}...")
                return False
                
        except Exception as e:
            self.questions_failed += 1
            print(f"❌ Error inserting question: {e}")
            return False
    
    def insert_questions_from_file(self, file_path: str):
        """Insert questions from a JSON file"""
        
        if not os.path.exists(file_path):
            print(f"❌ File not found: {file_path}")
            return
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                questions = json.load(f)
            
            if not isinstance(questions, list):
                print(f"❌ Invalid file format. Expected list of questions.")
                return
            
            print(f"📚 Loading {len(questions)} questions from {file_path}")
            
            for i, question in enumerate(questions, 1):
                print(f"  📝 Processing question {i}/{len(questions)}")
                self.insert_question(question)
            
        except json.JSONDecodeError as e:
            print(f"❌ JSON decode error: {e}")
        except Exception as e:
            print(f"❌ Error reading file: {e}")
    
    def insert_questions_from_generator_output(self, questions: List[Dict[str, Any]]):
        """Insert questions directly from generator output"""
        
        print(f"📚 Inserting {len(questions)} questions from generator output")
        
        for i, question in enumerate(questions, 1):
            print(f"  📝 Processing question {i}/{len(questions)}")
            self.insert_question(question)
    
    def get_database_stats(self):
        """Get current database statistics"""
        try:
            # Total questions
            total_response = self.supabase.table('questions').select('id', count='exact').execute()
            total = total_response.count or 0
            
            # AI generated questions
            ai_response = self.supabase.table('questions').select('id', count='exact').eq('ai_generated', True).execute()
            ai_count = ai_response.count or 0
            
            # Manual questions
            manual_response = self.supabase.table('questions').select('id', count='exact').eq('ai_generated', False).execute()
            manual_count = manual_response.count or 0
            
            print(f"\n📊 DATABASE STATISTICS")
            print("=" * 50)
            print(f"Total questions: {total}")
            print(f"AI generated: {ai_count}")
            print(f"Manual questions: {manual_count}")
            
            # By category
            print(f"\nBy Category:")
            categories = ['ANG', 'CG', 'LOG']
            for category in categories:
                cat_response = self.supabase.table('questions').select('id', count='exact').eq('category', category).execute()
                cat_count = cat_response.count or 0
                print(f"  - {category}: {cat_count}")
            
            # By exam type
            print(f"\nBy Exam Type:")
            exam_types = ['CM', 'CMS', 'CS']
            for exam_type in exam_types:
                exam_response = self.supabase.table('questions').select('id', count='exact').eq('exam_type', exam_type).execute()
                exam_count = exam_response.count or 0
                print(f"  - {exam_type}: {exam_count}")
            
            # By test type
            print(f"\nBy Test Type:")
            test_types = ['quiz_series', 'practice_test', 'examen_blanc']
            for test_type in test_types:
                test_response = self.supabase.table('questions').select('id', count='exact').eq('test_type', test_type).execute()
                test_count = test_response.count or 0
                print(f"  - {test_type}: {test_count}")
            
            # By difficulty
            print(f"\nBy Difficulty:")
            difficulties = ['EASY', 'MED', 'HARD']
            for difficulty in difficulties:
                diff_response = self.supabase.table('questions').select('id', count='exact').eq('difficulty', difficulty).execute()
                diff_count = diff_response.count or 0
                print(f"  - {difficulty}: {diff_count}")
            
        except Exception as e:
            print(f"❌ Error getting database stats: {e}")
    
    def verify_insertion(self):
        """Verify that questions were inserted correctly"""
        print(f"\n🔍 VERIFICATION SUMMARY")
        print("=" * 50)
        print(f"✅ Questions inserted: {self.questions_inserted}")
        print(f"⏭️  Duplicates skipped: {self.duplicates_skipped}")
        print(f"❌ Questions failed: {self.questions_failed}")
        
        if self.questions_inserted > 0:
            print(f"\n🎉 Successfully inserted {self.questions_inserted} questions!")
        
        if self.questions_failed > 0:
            print(f"\n⚠️  {self.questions_failed} questions failed to insert. Check logs for details.")

def main():
    """Main function to handle command line arguments"""
    inserter = QuestionInserter()
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python insert_questions.py <file_path>     # Insert from JSON file")
        print("  python insert_questions.py --stats          # Show database statistics")
        print("  python insert_questions.py --verify         # Verify current state")
        return
    
    command = sys.argv[1]
    
    if command == "--stats":
        inserter.get_database_stats()
    elif command == "--verify":
        inserter.verify_insertion()
    else:
        # Assume it's a file path
        file_path = command
        inserter.insert_questions_from_file(file_path)
        inserter.verify_insertion()
        inserter.get_database_stats()

if __name__ == "__main__":
    main()
