#!/usr/bin/env python3
"""
Debug data format issue in user_attempts
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def debug_data_format_issue():
    """Debug data format issue in user_attempts"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🔍 Debugging data format issue in user_attempts...")
    
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
                print(f"\n  - Raw user answers: {user_answers}")
                
                # Analyze the data format
                print(f"\n  - Data format analysis:")
                for i, (qid, ans) in enumerate(user_answers):
                    print(f"    Answer {i+1}: questionId={qid} (type: {type(qid)}), answer={ans} (type: {type(ans)})")
                    if qid is None:
                        print(f"      ❌ NULL questionId - this will be skipped")
                    if isinstance(ans, int):
                        print(f"      ⚠️  Answer is number {ans}, should be letter")
                
                # Test conversion logic
                print(f"\n  - Testing conversion logic:")
                valid_answers = {}
                for qid, ans in user_answers:
                    if qid is not None and ans is not None:
                        # Convert number to letter (0=A, 1=B, 2=C)
                        if isinstance(ans, int):
                            letter_answer = chr(ord('A') + ans) if 0 <= ans <= 2 else str(ans)
                        else:
                            letter_answer = str(ans)
                        valid_answers[str(qid)] = letter_answer
                        print(f"    Question {qid}: {ans} -> {letter_answer}")
                
                print(f"\n  - Valid answers after conversion: {len(valid_answers)}")
                for qid, ans in valid_answers.items():
                    print(f"    Question {qid}: {ans}")
            else:
                print(f"  - No user answers in test_data")
        else:
            print("  No examen_blanc attempts found")
        
        print("\n🔧 Issues identified:")
        print("  1. NULL questionId values in userAnswers array")
        print("  2. Answers stored as numbers (0,1,2) instead of letters (A,B,C)")
        print("  3. Frontend expects [questionId, 'A'] format")
        print("  4. Need to convert number answers to letter answers")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    debug_data_format_issue()
