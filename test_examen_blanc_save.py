#!/usr/bin/env python3
"""
Test saving examen blanc results
"""

import os
import sys
import uuid
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def test_examen_blanc_save():
    """Test saving examen blanc results"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🧪 Testing examen blanc save functionality...")
    
    # Use one of the existing user IDs
    test_user_id = "171029d7-df14-4721-abb9-fbfbf38f61ce"  # Dj Yepidan (CS exam type)
    
    try:
        # Test data for examen blanc #1
        test_data = [
            # Overall score
            {
                'user_id': test_user_id,
                'test_type': 'examen_blanc',
                'category': None,
                'test_number': 1,
                'score': 85.0,
                'exam_type': 'CS'
            },
            # Subject scores
            {
                'user_id': test_user_id,
                'test_type': 'examen_blanc',
                'category': 'ANG',
                'test_number': 1,
                'score': 90.0,
                'exam_type': 'CS'
            },
            {
                'user_id': test_user_id,
                'test_type': 'examen_blanc',
                'category': 'CG',
                'test_number': 1,
                'score': 80.0,
                'exam_type': 'CS'
            },
            {
                'user_id': test_user_id,
                'test_type': 'examen_blanc',
                'category': 'LOG',
                'test_number': 1,
                'score': 85.0,
                'exam_type': 'CS'
            }
        ]
        
        print("📝 Inserting test examen blanc results...")
        
        # Insert the test data
        response = supabase.table('test_results').insert(test_data).execute()
        
        if response.data:
            print(f"✅ Successfully inserted {len(response.data)} records")
            print("📋 Inserted records:")
            for i, record in enumerate(response.data):
                print(f"  {i+1}. {record}")
            
            # Now test retrieving the overall score
            print("\n🔍 Testing retrieval of overall score...")
            overall_response = supabase.table('test_results').select('*').eq('user_id', test_user_id).eq('test_type', 'examen_blanc').eq('test_number', 1).eq('category', None).execute()
            
            if overall_response.data:
                print(f"✅ Retrieved overall score: {overall_response.data[0]['score']}%")
            else:
                print("❌ Could not retrieve overall score")
            
            # Test retrieving by exam type
            print("\n🔍 Testing retrieval by exam type...")
            exam_type_response = supabase.table('test_results').select('*').eq('user_id', test_user_id).eq('test_type', 'examen_blanc').eq('exam_type', 'CS').eq('category', None).execute()
            
            if exam_type_response.data:
                print(f"✅ Retrieved by exam type: {len(exam_type_response.data)} records")
                for record in exam_type_response.data:
                    print(f"  - Exam {record['test_number']}: {record['score']}%")
            else:
                print("❌ Could not retrieve by exam type")
            
            print("\n🎉 Test completed successfully!")
            print("Now check your exam page - you should see the score for Examen Blanc #1")
            
            return True
        else:
            print("❌ No data returned from insert")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    test_examen_blanc_save()
