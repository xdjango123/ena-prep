#!/usr/bin/env python3
"""
Test fixes for 406 error and null values
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def test_fixes():
    """Test fixes for 406 error and null values"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🧪 Testing fixes for 406 error and null values...")
    
    # Use one of the existing user IDs
    test_user_id = "171029d7-df14-4721-abb9-fbfbf38f61ce"  # Dj Yepidan (CS exam type)
    
    try:
        # Test the fixed query (should get latest OVERALL score)
        print("📊 Testing fixed query for OVERALL score:")
        response = supabase.table('test_results').select('*').eq('user_id', test_user_id).eq('test_type', 'examen_blanc').eq('exam_type', 'CS').eq('test_number', 1).eq('category', 'OVERALL').order('created_at', desc=True).limit(1).single().execute()
        
        if response.data:
            print(f"  ✅ Query successful: {response.data['score']}% (Created: {response.data['created_at']})")
        else:
            print("  ❌ No data returned")
        
        # Test user attempts with null filtering
        print("\n📊 Testing user attempts with null filtering:")
        attempts_response = supabase.table('user_attempts').select('*').eq('user_id', test_user_id).eq('test_type', 'examen_blanc').order('created_at', desc=True).execute()
        
        if attempts_response.data:
            latest_attempt = attempts_response.data[0]
            print(f"  Latest attempt: {latest_attempt['id']} (Score: {latest_attempt['score']}%)")
            
            if latest_attempt['test_data'] and latest_attempt['test_data'].get('userAnswers'):
                user_answers = latest_attempt['test_data']['userAnswers']
                print(f"  Raw user answers: {len(user_answers)} answers")
                
                # Filter out null values
                valid_answers = []
                for i, (qid, ans) in enumerate(user_answers):
                    if qid is not None and ans is not None:
                        valid_answers.append((qid, ans))
                    else:
                        print(f"    Skipping invalid answer {i+1}: questionId={qid}, answer={ans}")
                
                print(f"  Valid answers after filtering: {len(valid_answers)} answers")
                for i, (qid, ans) in enumerate(valid_answers[:3]):
                    print(f"    Valid answer {i+1}: questionId={qid}, answer={ans}")
            else:
                print("  No user answers in test_data")
        else:
            print("  No user attempts found")
        
        print("\n✅ Fixes applied:")
        print("  - Fixed 406 error by adding order and limit to query")
        print("  - Fixed null values by filtering them out")
        print("  - Added comprehensive debugging")
        
        print("\n🧪 Ready for testing:")
        print("  1. Refresh the review page")
        print("  2. Check console for debug messages")
        print("  3. Verify user answers are displayed")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    test_fixes()
