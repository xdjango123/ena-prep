#!/usr/bin/env python3
"""
Debug user_attempts table constraints
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def debug_user_attempts_constraints():
    """Debug user_attempts table constraints"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🔍 Debugging user_attempts table constraints...")
    
    # Use one of the existing user IDs
    test_user_id = "171029d7-df14-4721-abb9-fbfbf38f61ce"  # Dj Yepidan (CS exam type)
    
    try:
        # Check current user_attempts records
        print("📊 Current user_attempts records:")
        attempts_response = supabase.table('user_attempts').select('*').eq('user_id', test_user_id).order('created_at', desc=True).execute()
        
        print(f"  Found {len(attempts_response.data)} total attempts")
        for attempt in attempts_response.data:
            print(f"  - ID: {attempt['id']}")
            print(f"  - Test Type: {attempt['test_type']}")
            print(f"  - Category: {attempt['category']}")
            print(f"  - Test Number: {attempt['test_number']}")
            print(f"  - Score: {attempt['score']}%")
            print(f"  - Created: {attempt['created_at']}")
            print()
        
        # Check for examen_blanc attempts specifically
        print("📊 Examen blanc attempts:")
        exam_attempts = supabase.table('user_attempts').select('*').eq('user_id', test_user_id).eq('test_type', 'examen_blanc').execute()
        
        if exam_attempts.data:
            print(f"  Found {len(exam_attempts.data)} examen_blanc attempts")
            for attempt in exam_attempts.data:
                print(f"  - ID: {attempt['id']}")
                print(f"  - Test Type: {attempt['test_type']}")
                print(f"  - Category: {attempt['category']}")
                print(f"  - Test Number: {attempt['test_number']}")
                print(f"  - Score: {attempt['score']}%")
        else:
            print("  No examen_blanc attempts found")
        
        # Test creating an examen_blanc attempt
        print("\n🧪 Testing examen_blanc attempt creation:")
        test_attempt = {
            'user_id': test_user_id,
            'test_type': 'examen_blanc',
            'category': 'OVERALL',
            'test_number': 1,
            'score': 15.0,
            'test_data': {
                'userAnswers': [
                    [1, 'A'],
                    [2, 'B'],
                    [3, 'C']
                ],
                'correctAnswers': 1,
                'totalQuestions': 3,
                'timeSpent': 0
            }
        }
        
        try:
            insert_response = supabase.table('user_attempts').insert(test_attempt).execute()
            if insert_response.data:
                print("  ✅ examen_blanc attempt created successfully")
                print(f"  - ID: {insert_response.data[0]['id']}")
            else:
                print("  ❌ Failed to create examen_blanc attempt")
        except Exception as e:
            print(f"  ❌ Error creating examen_blanc attempt: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    debug_user_attempts_constraints()
