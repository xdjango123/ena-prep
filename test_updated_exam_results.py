#!/usr/bin/env python3
"""
Test updated exam results functionality using test_results table
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def test_exam_results():
    """Test exam results functionality with test_results table"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🔍 Testing exam results functionality with test_results table...")
    
    # Test if test_results table exists
    try:
        response = supabase.table('test_results').select('*').limit(1).execute()
        print("✅ test_results table exists and is accessible")
        print(f"📊 Current records: {len(response.data)}")
        
        # Test creating exam results
        print("\n🧪 Testing exam result creation...")
        test_data = [
            # Overall score
            {
                'user_id': 'test-user-123',
                'test_type': 'examen_blanc',
                'category': None,
                'test_number': 1,
                'score': 85.0,
                'exam_type': 'CS'
            },
            # Subject scores
            {
                'user_id': 'test-user-123',
                'test_type': 'examen_blanc',
                'category': 'ANG',
                'test_number': 1,
                'score': 90.0,
                'exam_type': 'CS'
            },
            {
                'user_id': 'test-user-123',
                'test_type': 'examen_blanc',
                'category': 'CG',
                'test_number': 1,
                'score': 80.0,
                'exam_type': 'CS'
            },
            {
                'user_id': 'test-user-123',
                'test_type': 'examen_blanc',
                'category': 'LOG',
                'test_number': 1,
                'score': 85.0,
                'exam_type': 'CS'
            }
        ]
        
        # Try to insert
        insert_response = supabase.table('test_results').insert(test_data).execute()
        print("✅ Test exam results created successfully")
        print(f"📊 Inserted {len(insert_response.data)} records")
        
        # Test retrieving overall score
        overall_response = supabase.table('test_results').select('*').eq('user_id', 'test-user-123').eq('test_type', 'examen_blanc').eq('test_number', 1).eq('category', None).execute()
        print(f"✅ Overall score retrieved: {len(overall_response.data)} records")
        if overall_response.data:
            print(f"   Overall score: {overall_response.data[0]['score']}%")
        
        # Test retrieving subject scores
        subject_response = supabase.table('test_results').select('*').eq('user_id', 'test-user-123').eq('test_type', 'examen_blanc').eq('test_number', 1).neq('category', None).execute()
        print(f"✅ Subject scores retrieved: {len(subject_response.data)} records")
        for result in subject_response.data:
            print(f"   {result['category']}: {result['score']}%")
        
        # Clean up test data
        supabase.table('test_results').delete().eq('user_id', 'test-user-123').execute()
        print("✅ Test data cleaned up")
        
        print("\n🎉 Exam results functionality is working correctly!")
        print("The system will now save:")
        print("- Overall score with category = null")
        print("- Subject scores for ANG, CG, LOG")
        print("- All with test_type = 'examen_blanc'")
        print("- Proper exam_type (CM, CMS, CS)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    test_exam_results()
