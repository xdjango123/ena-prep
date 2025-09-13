#!/usr/bin/env python3
"""
Debug latest user attempt to see what's in test_data
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def debug_latest_attempt():
    """Debug latest user attempt to see what's in test_data"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🔍 Debugging latest user attempt...")
    
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
            print(f"  - Category: {attempt['category']}")
            print(f"  - Test Number: {attempt['test_number']}")
            print(f"  - Score: {attempt['score']}%")
            print(f"  - Created: {attempt['created_at']}")
            
            if attempt['test_data']:
                print(f"  - Test data exists: {bool(attempt['test_data'])}")
                print(f"  - Test data keys: {list(attempt['test_data'].keys())}")
                
                if 'userAnswers' in attempt['test_data']:
                    user_answers = attempt['test_data']['userAnswers']
                    print(f"  - User answers: {len(user_answers)} answers")
                    
                    for i, (qid, ans) in enumerate(user_answers[:5]):  # Show first 5
                        print(f"    Answer {i+1}: questionId={qid} (type: {type(qid)}), answer={ans} (type: {type(ans)})")
                    
                    # Test the filtering logic
                    print(f"\n  - Testing filtering logic:")
                    valid_answers = []
                    for i, (qid, ans) in enumerate(user_answers):
                        if qid is not None and ans is not None:
                            valid_answers.append((qid, ans))
                        else:
                            print(f"    Skipping invalid answer {i+1}: questionId={qid}, answer={ans}")
                    
                    print(f"  - Valid answers after filtering: {len(valid_answers)}")
                    for i, (qid, ans) in enumerate(valid_answers[:3]):
                        print(f"    Valid answer {i+1}: questionId={qid}, answer={ans}")
                else:
                    print(f"  - No userAnswers in test_data")
            else:
                print(f"  - No test_data")
        else:
            print("  No examen_blanc attempts found")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    debug_latest_attempt()
