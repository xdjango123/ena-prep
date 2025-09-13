#!/usr/bin/env python3
"""
Debug retake issue - check what's happening in the database
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def debug_retake_issue():
    """Debug retake issue"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🔍 Debugging retake issue...")
    
    # Use one of the existing user IDs
    test_user_id = "171029d7-df14-4721-abb9-fbfbf38f61ce"  # Dj Yepidan (CS exam type)
    
    try:
        # Check all exam results for this user
        print("📊 All exam results for user:")
        response = supabase.table('test_results').select('*').eq('user_id', test_user_id).eq('test_type', 'examen_blanc').order('created_at', desc=True).execute()
        
        for record in response.data:
            print(f"  - {record['category']}: {record['score']}% (Exam #{record['test_number']}, Created: {record['created_at']})")
        
        # Check user attempts
        print("\n📊 User attempts:")
        attempts_response = supabase.table('user_attempts').select('*').eq('user_id', test_user_id).eq('test_type', 'examen_blanc').order('created_at', desc=True).execute()
        
        if attempts_response.data:
            for attempt in attempts_response.data:
                print(f"  - Attempt ID: {attempt['id']}")
                print(f"  - Score: {attempt['score']}%")
                print(f"  - Test Number: {attempt['test_number']}")
                print(f"  - Created: {attempt['created_at']}")
                if attempt['test_data']:
                    print(f"  - User answers: {len(attempt['test_data'].get('userAnswers', []))} answers")
        else:
            print("  - No user attempts found")
        
        # Check if there are multiple records for exam #1
        print("\n📊 Exam #1 records specifically:")
        exam_1_response = supabase.table('test_results').select('*').eq('user_id', test_user_id).eq('test_type', 'examen_blanc').eq('test_number', 1).order('created_at', desc=True).execute()
        
        for record in exam_1_response.data:
            print(f"  - {record['category']}: {record['score']}% (Created: {record['created_at']})")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    debug_retake_issue()
