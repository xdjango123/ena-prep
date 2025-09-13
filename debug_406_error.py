#!/usr/bin/env python3
"""
Debug 406 error and user answers issue
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def debug_406_error():
    """Debug 406 error and user answers issue"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🔍 Debugging 406 error and user answers issue...")
    
    # Use one of the existing user IDs
    test_user_id = "171029d7-df14-4721-abb9-fbfbf38f61ce"  # Dj Yepidan (CS exam type)
    
    try:
        # Check test_results table
        print("📊 Checking test_results table:")
        response = supabase.table('test_results').select('*').eq('user_id', test_user_id).eq('test_type', 'examen_blanc').eq('exam_type', 'CS').eq('test_number', 1).execute()
        
        print(f"  Found {len(response.data)} records")
        for record in response.data:
            print(f"  - {record['category']}: {record['score']}% (Created: {record['created_at']})")
        
        # Check user_attempts table
        print("\n📊 Checking user_attempts table:")
        attempts_response = supabase.table('user_attempts').select('*').eq('user_id', test_user_id).eq('test_type', 'examen_blanc').execute()
        
        print(f"  Found {len(attempts_response.data)} attempts")
        for attempt in attempts_response.data:
            print(f"  - Attempt ID: {attempt['id']}")
            print(f"  - Test Number: {attempt['test_number']}")
            print(f"  - Score: {attempt['score']}%")
            print(f"  - Created: {attempt['created_at']}")
            if attempt['test_data']:
                print(f"  - Test data exists: {bool(attempt['test_data'])}")
                if attempt['test_data'].get('userAnswers'):
                    print(f"  - User answers: {len(attempt['test_data']['userAnswers'])} answers")
                    # Check for null values
                    for i, (qid, ans) in enumerate(attempt['test_data']['userAnswers'][:3]):
                        print(f"    Answer {i+1}: questionId={qid} (type: {type(qid)}), answer={ans} (type: {type(ans)})")
                else:
                    print(f"  - No userAnswers in test_data")
            else:
                print(f"  - No test_data")
        
        # Test the specific query that's failing
        print("\n🧪 Testing the failing query:")
        try:
            test_query = supabase.table('test_results').select('*').eq('user_id', test_user_id).eq('test_type', 'examen_blanc').eq('exam_type', 'CS').eq('test_number', 1).eq('category', 'OVERALL').single().execute()
            print(f"  Query result: {test_query.data}")
        except Exception as e:
            print(f"  Query error: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    debug_406_error()
