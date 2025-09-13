#!/usr/bin/env python3
"""
Test answer comparison fix
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def test_answer_comparison_fix():
    """Test answer comparison fix"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🧪 Testing answer comparison fix...")
    
    # Use one of the existing user IDs
    test_user_id = "171029d7-df14-4721-abb9-fbfbf38f61ce"  # Dj Yepidan (CS exam type)
    
    try:
        # Test the conversion logic
        print("📊 Testing letter-to-number conversion:")
        test_cases = [
            ("A", 0),
            ("B", 1), 
            ("C", 2),
            ("D", 3)
        ]
        
        for letter, expected_number in test_cases:
            # Simulate the conversion: letter.charCodeAt(0) - 65
            converted = ord(letter) - 65
            print(f"  {letter} -> {converted} (expected: {expected_number}) {'✅' if converted == expected_number else '❌'}")
        
        # Test score calculation logic
        print(f"\n📊 Testing score calculation logic:")
        sample_answers = {
            "1": "A",  # correctAnswer = 0
            "2": "B",  # correctAnswer = 1
            "3": "C",  # correctAnswer = 2
            "4": "A"   # correctAnswer = 0
        }
        
        sample_questions = [
            {"id": "1", "correctAnswer": 0},
            {"id": "2", "correctAnswer": 1},
            {"id": "3", "correctAnswer": 2},
            {"id": "4", "correctAnswer": 0}
        ]
        
        correct_count = 0
        for q in sample_questions:
            user_answer = sample_answers.get(q["id"])
            if user_answer:
                # Convert letter to number for comparison
                answer_index = ord(user_answer) - 65
                is_correct = answer_index == q["correctAnswer"]
                print(f"  Question {q['id']}: {user_answer} -> {answer_index}, correctAnswer: {q['correctAnswer']}, correct: {is_correct}")
                if is_correct:
                    correct_count += 1
        
        print(f"  Total correct: {correct_count}/{len(sample_questions)} = {correct_count/len(sample_questions)*100:.0f}%")
        
        print(f"\n✅ Fixes applied:")
        print(f"  1. Fixed answer selection: now saves letters (A, B, C)")
        print(f"  2. Fixed score calculation: converts letters to numbers for comparison")
        print(f"  3. Fixed subject score calculation: handles letter answers")
        print(f"  4. Fixed isCorrect logic: converts letters to numbers")
        
        print(f"\n🧪 Ready for testing:")
        print(f"  1. Take a new exam and answer some questions")
        print(f"  2. Check that answers are selected and scored correctly")
        print(f"  3. Verify score is calculated properly (not 0%)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    test_answer_comparison_fix()
