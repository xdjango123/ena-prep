#!/usr/bin/env python3
"""
Simple script to modify exam questions to show 3 options instead of 4
This modifies the frontend data processing without changing the database
"""

import os
import sys
import random
from supabase import create_client, Client
from typing import List, Dict, Any, Tuple

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

class Exam3OptionsProcessor:
    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    def select_3_options(self, question: Dict[str, Any]) -> Tuple[List[str], str]:
        """
        Select 3 options from 4, ensuring correct answer is included
        """
        # Get all options
        options = [
            question.get('answer1', ''),
            question.get('answer2', ''),
            question.get('answer3', ''),
            question.get('answer4', '')
        ]
        
        # Filter out empty options
        valid_options = [opt for opt in options if opt and opt.strip()]
        
        if len(valid_options) < 3:
            # If less than 3 valid options, return what we have
            return valid_options, question.get('correct', 'A')
        
        # Get correct answer
        correct_letter = question.get('correct', 'A')
        correct_index = ord(correct_letter) - ord('A')  # A=0, B=1, C=2, D=3
        correct_answer = valid_options[correct_index] if correct_index < len(valid_options) else valid_options[0]
        
        # Create list of incorrect options
        incorrect_options = [opt for i, opt in enumerate(valid_options) if i != correct_index]
        
        # Select 2 additional options randomly
        if len(incorrect_options) >= 2:
            selected_incorrect = random.sample(incorrect_options, 2)
        else:
            selected_incorrect = incorrect_options
        
        # Combine correct answer with selected incorrect options
        final_options = [correct_answer] + selected_incorrect
        
        # Shuffle to randomize order
        random.shuffle(final_options)
        
        # Find new correct answer position
        new_correct_index = final_options.index(correct_answer)
        new_correct_letter = chr(ord('A') + new_correct_index)
        
        return final_options, new_correct_letter
    
    def convert_question_to_3_options(self, question: Dict[str, Any]) -> Dict[str, Any]:
        """Convert a 4-option question to 3-option format"""
        # Select 3 options
        selected_options, new_correct = self.select_3_options(question)
        
        # Create new question object
        converted_question = {
            'id': question.get('id'),
            'category': question.get('category'),
            'sub_category': question.get('sub_category'),
            'question_text': question.get('question_text'),
            'answer1': selected_options[0] if len(selected_options) > 0 else '',
            'answer2': selected_options[1] if len(selected_options) > 1 else '',
            'answer3': selected_options[2] if len(selected_options) > 2 else '',
            'correct': new_correct,
            'difficulty': question.get('difficulty'),
            'exam_type': question.get('exam_type'),
            'explanation': question.get('explanation'),
            'is_3_option': True  # Flag to indicate this is a 3-option question
        }
        
        return converted_question
    
    def get_sample_questions(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Get sample questions and convert them to 3-option format"""
        try:
            response = self.supabase.table('questions').select('*').limit(limit).execute()
            questions = response.data
            
            print(f"📊 Found {len(questions)} sample questions")
            
            converted_questions = []
            for question in questions:
                converted = self.convert_question_to_3_options(question)
                converted_questions.append(converted)
            
            return converted_questions
            
        except Exception as e:
            print(f"Error fetching questions: {e}")
            return []
    
    def test_conversion(self, limit: int = 5):
        """Test the 3-option conversion with sample questions"""
        print(f"🧪 Testing 3-option conversion with {limit} sample questions...")
        print("=" * 60)
        
        questions = self.get_sample_questions(limit)
        
        if not questions:
            print("❌ No questions found")
            return
        
        for i, question in enumerate(questions):
            print(f"\n🔍 Question {i+1}/{len(questions)}")
            print(f"   ID: {question.get('id', 'N/A')[:8]}...")
            print(f"   Category: {question.get('category', 'N/A')}")
            print(f"   Text: {question.get('question_text', 'N/A')[:80]}...")
            print(f"   Original Correct: {question.get('correct', 'N/A')}")
            print(f"   Options:")
            print(f"     A. {question.get('answer1', 'N/A')}")
            print(f"     B. {question.get('answer2', 'N/A')}")
            print(f"     C. {question.get('answer3', 'N/A')}")
            print(f"   New Correct: {question.get('correct', 'N/A')}")
            print(f"   {'='*50}")

def main():
    processor = Exam3OptionsProcessor()
    
    print("🎯 Simple 3-Options Exam Processor")
    print("=" * 50)
    print("This tool converts 4-option questions to 3-option format for display.")
    print("=" * 50)
    
    while True:
        print("\nOptions:")
        print("1. Test with sample questions (5 questions)")
        print("2. Test with more questions (10 questions)")
        print("3. Exit")
        
        choice = input("\nEnter your choice (1-3): ").strip()
        
        if choice == '1':
            processor.test_conversion(5)
        
        elif choice == '2':
            processor.test_conversion(10)
        
        elif choice == '3':
            print("👋 Goodbye!")
            break
        
        else:
            print("❌ Invalid choice. Please enter 1-3.")

if __name__ == "__main__":
    main()
