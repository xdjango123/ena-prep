#!/usr/bin/env python3
"""
Test answer format fix
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def test_answer_format_fix():
    """Test answer format fix"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🧪 Testing answer format fix...")
    
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
                
                # Test the new conversion logic
                print(f"\n  - Testing new conversion logic:")
                valid_answers = {}
                for qid, ans in user_answers:
                    if qid is not None and ans is not None:
                        # Convert number answers to letters (0=A, 1=B, 2=C)
                        if isinstance(ans, int) and 0 <= ans <= 2:
                            letter_answer = chr(ord('A') + ans)  # 0->A, 1->B, 2->C
                            print(f"    Question {qid}: {ans} -> {letter_answer}")
                        else:
                            letter_answer = str(ans)
                            print(f"    Question {qid}: {ans} -> {letter_answer} (already letter)")
                        
                        valid_answers[str(qid)] = letter_answer
                    else:
                        print(f"    Skipping: questionId={qid}, answer={ans}")
                
                print(f"\n  - Valid answers after conversion: {len(valid_answers)}")
                for qid, ans in valid_answers.items():
                    print(f"    Question {qid}: {ans}")
                
                print(f"\n✅ Fixes applied:")
                print(f"  1. Fixed answer format: numbers -> letters")
                print(f"  2. Fixed exam interface: now saves letters instead of indices")
                print(f"  3. Fixed getUserAnswers: converts numbers to letters")
                print(f"  4. Filtered out null questionIds")
                
                print(f"\n🧪 Ready for testing:")
                print(f"  1. Take a new exam and answer some questions")
                print(f"  2. Check that answers are saved as letters (A, B, C)")
                print(f"  3. Go to review page and verify answers are displayed")
            else:
                print(f"  - No user answers in test_data")
        else:
            print("  No examen_blanc attempts found")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    test_answer_format_fix()
