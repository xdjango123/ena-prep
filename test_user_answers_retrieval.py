#!/usr/bin/env python3
"""
Test user answers retrieval
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def test_user_answers_retrieval():
    """Test user answers retrieval"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🧪 Testing user answers retrieval...")
    
    # Use one of the existing user IDs
    test_user_id = "171029d7-df14-4721-abb9-fbfbf38f61ce"  # Dj Yepidan (CS exam type)
    
    try:
        # Get all user attempts
        print("📊 All user attempts:")
        attempts_response = supabase.table('user_attempts').select('*').eq('user_id', test_user_id).order('created_at', desc=True).execute()
        
        print(f"  Found {len(attempts_response.data)} total attempts")
        
        # Filter for examen_blanc attempts
        exam_attempts = [a for a in attempts_response.data if a['test_type'] == 'examen_blanc']
        print(f"  Found {len(exam_attempts)} examen_blanc attempts")
        
        # Find the latest examen_blanc attempt for test_number 1
        latest_exam_attempt = None
        for attempt in exam_attempts:
            if attempt['test_number'] == 1:
                latest_exam_attempt = attempt
                break
        
        if latest_exam_attempt:
            print(f"\n✅ Found latest examen_blanc attempt:")
            print(f"  - ID: {latest_exam_attempt['id']}")
            print(f"  - Test Type: {latest_exam_attempt['test_type']}")
            print(f"  - Test Number: {latest_exam_attempt['test_number']}")
            print(f"  - Score: {latest_exam_attempt['score']}%")
            print(f"  - Created: {latest_exam_attempt['created_at']}")
            
            if latest_exam_attempt['test_data'] and latest_exam_attempt['test_data'].get('userAnswers'):
                user_answers = latest_exam_attempt['test_data']['userAnswers']
                print(f"  - User Answers: {len(user_answers)} answers")
                
                # Convert to Map format like the frontend
                user_answers_map = {}
                for qid, ans in user_answers:
                    if qid is not None and ans is not None:
                        user_answers_map[str(qid)] = str(ans)
                
                print(f"  - Valid answers after conversion: {len(user_answers_map)}")
                for qid, ans in list(user_answers_map.items())[:5]:
                    print(f"    Question {qid}: {ans}")
                
                print(f"\n✅ User answers retrieval should work!")
                print(f"   The frontend should find {len(user_answers_map)} answers")
            else:
                print(f"  ❌ No user answers in test_data")
        else:
            print(f"❌ No examen_blanc attempt found for test_number 1")
        
        print("\n🧪 Ready for testing:")
        print("  1. Go to review page")
        print("  2. Check console for debug messages")
        print("  3. Verify user answers are displayed")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    test_user_answers_retrieval()
