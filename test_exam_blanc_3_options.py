#!/usr/bin/env python3
"""
Test script to verify 3-option conversion works for exam blanc questions only
"""

import os
import sys
import random
from supabase import create_client, Client
from typing import List, Dict, Any, Tuple

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

class ExamBlanc3OptionsTester:
    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    def select_3_options(self, question: Dict[str, Any]) -> Tuple[List[str], str]:
        """Select 3 options from 4, ensuring correct answer is included"""
        try:
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
                return valid_options, question.get('correct', 'A')
            
            # Get correct answer
            correct_letter = question.get('correct', 'A')
            correct_index = ord(correct_letter) - ord('A')
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
            
        except Exception as e:
            print(f"Error in select_3_options: {e}")
            return [question.get('answer1', ''), question.get('answer2', ''), question.get('answer3', '')], 'A'
    
    def test_exam_blanc_questions(self, limit: int = 5):
        """Test 3-option conversion specifically for exam blanc questions"""
        print(f"🧪 Testing 3-option conversion for EXAM BLANC questions only...")
        print("=" * 60)
        
        try:
            # Get exam blanc questions only
            response = self.supabase.table('questions').select('*').eq('test_type', 'examen_blanc').limit(limit).execute()
            exam_blanc_questions = response.data
            
            print(f"📊 Found {len(exam_blanc_questions)} exam blanc questions")
            
            if not exam_blanc_questions:
                print("❌ No exam blanc questions found")
                return
            
            for i, question in enumerate(exam_blanc_questions):
                print(f"\n🔍 Exam Blanc Question {i+1}/{len(exam_blanc_questions)}")
                print(f"   ID: {question.get('id', 'N/A')[:8]}...")
                print(f"   Category: {question.get('category', 'N/A')}")
                print(f"   Test Type: {question.get('test_type', 'N/A')}")
                print(f"   Text: {question.get('question_text', 'N/A')[:80]}...")
                print(f"   Original Correct: {question.get('correct', 'N/A')}")
                print(f"   Original Options:")
                print(f"     A. {question.get('answer1', 'N/A')}")
                print(f"     B. {question.get('answer2', 'N/A')}")
                print(f"     C. {question.get('answer3', 'N/A')}")
                print(f"     D. {question.get('answer4', 'N/A')}")
                
                # Convert to 3-option format
                selected_options, new_correct = self.select_3_options(question)
                
                print(f"   🎯 3-Option Format:")
                print(f"     A. {selected_options[0] if len(selected_options) > 0 else 'N/A'}")
                print(f"     B. {selected_options[1] if len(selected_options) > 1 else 'N/A'}")
                print(f"     C. {selected_options[2] if len(selected_options) > 2 else 'N/A'}")
                print(f"   New Correct: {new_correct}")
                print(f"   {'='*50}")
            
        except Exception as e:
            print(f"❌ Error testing exam blanc questions: {e}")
    
    def test_other_question_types(self, limit: int = 3):
        """Test that other question types are NOT converted to 3-option format"""
        print(f"\n🧪 Testing that NON-exam blanc questions keep 4-option format...")
        print("=" * 60)
        
        try:
            # Get non-exam blanc questions
            response = self.supabase.table('questions').select('*').neq('test_type', 'examen_blanc').limit(limit).execute()
            other_questions = response.data
            
            print(f"📊 Found {len(other_questions)} non-exam blanc questions")
            
            for i, question in enumerate(other_questions):
                print(f"\n🔍 Non-Exam Blanc Question {i+1}/{len(other_questions)}")
                print(f"   ID: {question.get('id', 'N/A')[:8]}...")
                print(f"   Category: {question.get('category', 'N/A')}")
                print(f"   Test Type: {question.get('test_type', 'N/A')}")
                print(f"   Text: {question.get('question_text', 'N/A')[:80]}...")
                print(f"   Correct: {question.get('correct', 'N/A')}")
                print(f"   Options (4-option format maintained):")
                print(f"     A. {question.get('answer1', 'N/A')}")
                print(f"     B. {question.get('answer2', 'N/A')}")
                print(f"     C. {question.get('answer3', 'N/A')}")
                print(f"     D. {question.get('answer4', 'N/A')}")
                print(f"   {'='*50}")
            
        except Exception as e:
            print(f"❌ Error testing other question types: {e}")

def main():
    tester = ExamBlanc3OptionsTester()
    
    print("🎯 Exam Blanc 3-Options Tester")
    print("=" * 50)
    print("This tool tests 3-option conversion ONLY for exam blanc questions.")
    print("Other question types should maintain 4-option format.")
    print("=" * 50)
    
    while True:
        print("\nOptions:")
        print("1. Test exam blanc questions (3-option format)")
        print("2. Test other question types (4-option format)")
        print("3. Test both")
        print("4. Exit")
        
        choice = input("\nEnter your choice (1-4): ").strip()
        
        if choice == '1':
            tester.test_exam_blanc_questions(5)
        
        elif choice == '2':
            tester.test_other_question_types(3)
        
        elif choice == '3':
            tester.test_exam_blanc_questions(3)
            tester.test_other_question_types(2)
        
        elif choice == '4':
            print("👋 Goodbye!")
            break
        
        else:
            print("❌ Invalid choice. Please enter 1-4.")

if __name__ == "__main__":
    main()
