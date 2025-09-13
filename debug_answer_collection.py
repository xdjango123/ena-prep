#!/usr/bin/env python3
"""
Debug answer collection issue
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def debug_answer_collection():
    """Debug answer collection issue"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🔍 Debugging answer collection issue...")
    
    # Use one of the existing user IDs
    test_user_id = "171029d7-df14-4721-abb9-fbfbf38f61ce"  # Dj Yepidan (CS exam type)
    
    try:
        # Get the latest examen_blanc attempt
        print("📊 Latest examen_blanc attempt:")
        response = supabase.table('user_attempts').select('*').eq('user_id', test_user_id).eq('test_type', 'examen_blanc').order('created_at', desc=True).limit(1).execute()
        
        if response.data:
            attempt = response.data[0]
            print(f"  - ID: {attempt['id']}")
            print(f"  - Test Type: {attempt['test_type']}")
            print(f"  - Test Number: {attempt['test_number']}")
            print(f"  - Score: {attempt['score']}%")
            print(f"  - Created: {attempt['created_at']}")
            
            if attempt['test_data'] and attempt['test_data'].get('userAnswers'):
                user_answers = attempt['test_data']['userAnswers']
                print(f"\n  - User answers: {user_answers}")
                print(f"  - Number of answers: {len(user_answers)}")
                
                # Check for valid answers
                valid_answers = 0
                for qid, ans in user_answers:
                    if qid is not None and ans is not None:
                        valid_answers += 1
                        print(f"    Question {qid}: {ans}")
                    else:
                        print(f"    Invalid: questionId={qid}, answer={ans}")
                
                print(f"\n  - Valid answers: {valid_answers}/{len(user_answers)}")
                
                if valid_answers == 0:
                    print("  ❌ No valid answers found!")
                    print("  🔍 Possible issues:")
                    print("    1. Answers not being saved during exam")
                    print("    2. handleAnswerSelect not being called")
                    print("    3. UserAnswers Map not being updated")
                    print("    4. Exam finishing before answers are saved")
                else:
                    print(f"  ✅ Found {valid_answers} valid answers")
            else:
                print(f"  ❌ No user answers in test_data")
                print("  🔍 Possible issues:")
                print("    1. UserAttemptService.saveUserAttempt not being called")
                print("    2. test_data not being saved properly")
                print("    3. Exam finishing without saving answers")
        else:
            print("  No examen_blanc attempts found")
        
        # Check test_results for comparison
        print(f"\n📊 Latest test_results:")
        results_response = supabase.table('test_results').select('*').eq('user_id', test_user_id).eq('test_type', 'examen_blanc').order('created_at', desc=True).limit(4).execute()
        
        if results_response.data:
            for result in results_response.data:
                print(f"  - {result['category']}: {result['score']}%")
        else:
            print("  No test_results found")
        
        print(f"\n🧪 Debugging steps:")
        print(f"  1. Take a new exam")
        print(f"  2. Answer at least 3-5 questions")
        print(f"  3. Check console for '🎯 Answer selected' messages")
        print(f"  4. Check console for '📝 User answers updated' messages")
        print(f"  5. Finish exam and check console for score calculation")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    debug_answer_collection()
