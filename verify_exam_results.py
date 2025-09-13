#!/usr/bin/env python3
"""
Verify exam results functionality after table creation
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def verify_exam_results():
    """Verify exam results functionality"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🔍 Verifying exam results functionality...")
    
    # Test if table exists
    try:
        response = supabase.table('exam_results').select('*').limit(1).execute()
        print("✅ exam_results table exists and is accessible")
        print(f"📊 Current records: {len(response.data)}")
        
        # Test creating a sample result
        print("\n🧪 Testing result creation...")
        test_data = {
            'user_id': 'test-user-123',
            'exam_type': 'CS',
            'exam_number': 1,
            'score': 85,
            'total_questions': 60,
            'correct_answers': 51,
            'time_spent': 7200,
            'completed_at': '2025-01-12T12:00:00Z'
        }
        
        # Try to insert
        insert_response = supabase.table('exam_results').insert(test_data).execute()
        print("✅ Test result created successfully")
        
        # Try to retrieve
        retrieve_response = supabase.table('exam_results').select('*').eq('user_id', 'test-user-123').execute()
        print(f"✅ Test result retrieved: {len(retrieve_response.data)} records")
        
        # Clean up test data
        supabase.table('exam_results').delete().eq('user_id', 'test-user-123').execute()
        print("✅ Test data cleaned up")
        
        print("\n🎉 Exam results functionality is working correctly!")
        print("You can now take an exam and the results should be saved and displayed.")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("\n⚠️  Please make sure you've created the exam_results table in Supabase dashboard")
        return False

if __name__ == "__main__":
    verify_exam_results()
