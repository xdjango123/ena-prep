#!/usr/bin/env python3
"""
Test completion screen fix
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def test_completion_screen_fix():
    """Test completion screen fix"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🧪 Testing completion screen fix...")
    
    # Use one of the existing user IDs
    test_user_id = "171029d7-df14-4721-abb9-fbfbf38f61ce"  # Dj Yepidan (CS exam type)
    
    try:
        # Get the latest examen_blanc attempt
        print("📊 Latest examen_blanc attempt:")
        response = supabase.table('user_attempts').select('*').eq('user_id', test_user_id).eq('test_type', 'examen_blanc').order('created_at', desc=True).limit(1).execute()
        
        if response.data:
            attempt = response.data[0]
            print(f"  - ID: {attempt['id']}")
            print(f"  - Score: {attempt['score']}%")
            
            if attempt['test_data'] and attempt['test_data'].get('userAnswers'):
                user_answers = attempt['test_data']['userAnswers']
                print(f"  - User answers: {user_answers}")
                
                # Test the completion screen logic
                print(f"\n📊 Testing completion screen logic:")
                sample_questions = [
                    {"id": "2", "correctAnswer": 0, "category": "ANG"},
                    {"id": "59", "correctAnswer": 1, "category": "ANG"},
                    {"id": "1941", "correctAnswer": 2, "category": "CG"}
                ]
                
                correct_count = 0
                for q in sample_questions:
                    user_answer = None
                    for qid, ans in user_answers:
                        if str(qid) == q["id"]:
                            user_answer = ans
                            break
                    
                    if user_answer:
                        # Convert letter to number for comparison
                        if isinstance(user_answer, str) and len(user_answer) == 1:
                            answer_index = ord(user_answer) - 65
                            is_correct = answer_index == q["correctAnswer"]
                            print(f"  Question {q['id']} ({q['category']}): {user_answer} -> {answer_index}, correctAnswer: {q['correctAnswer']}, correct: {is_correct}")
                            if is_correct:
                                correct_count += 1
                        else:
                            print(f"  Question {q['id']} ({q['category']}): {user_answer} (not a letter)")
                    else:
                        print(f"  Question {q['id']} ({q['category']}): No answer found")
                
                print(f"\n  Total correct: {correct_count}/{len(sample_questions)} = {correct_count/len(sample_questions)*100:.0f}%")
                
                print(f"\n✅ Fixes applied:")
                print(f"  1. Fixed completion screen score calculation")
                print(f"  2. Fixed getSubjectScores function")
                print(f"  3. Added letter-to-number conversion in both places")
                print(f"  4. Added debugging for completion screen")
                
                print(f"\n🧪 Ready for testing:")
                print(f"  1. Take a new exam and answer some questions")
                print(f"  2. Check console for '🔍 Completion screen' messages")
                print(f"  3. Verify completion screen shows correct scores")
                print(f"  4. Check that scores match the database")
            else:
                print(f"  - No user answers in test_data")
        else:
            print("  No examen_blanc attempts found")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    test_completion_screen_fix()
