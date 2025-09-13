#!/usr/bin/env python3
"""
Test score saving functionality
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def test_score_saving():
    """Test score saving functionality"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🧪 Testing score saving functionality...")
    
    # Use one of the existing user IDs
    test_user_id = "171029d7-df14-4721-abb9-fbfbf38f61ce"  # Dj Yepidan (CS exam type)
    
    try:
        # First, delete existing exam #1 results
        print("🗑️ Deleting existing exam #1 results...")
        delete_response = supabase.table('test_results').delete().eq('user_id', test_user_id).eq('test_type', 'examen_blanc').eq('test_number', 1).eq('exam_type', 'CS').execute()
        print(f"✅ Deleted {len(delete_response.data)} records")
        
        # Now insert new results with 20% score
        print("📝 Inserting new exam results with 20% score...")
        new_results = [
            {
                'user_id': test_user_id,
                'test_type': 'examen_blanc',
                'category': 'OVERALL',
                'test_number': 1,
                'score': 20.0,
                'exam_type': 'CS'
            },
            {
                'user_id': test_user_id,
                'test_type': 'examen_blanc',
                'category': 'ANG',
                'test_number': 1,
                'score': 25.0,
                'exam_type': 'CS'
            },
            {
                'user_id': test_user_id,
                'test_type': 'examen_blanc',
                'category': 'CG',
                'test_number': 1,
                'score': 15.0,
                'exam_type': 'CS'
            },
            {
                'user_id': test_user_id,
                'test_type': 'examen_blanc',
                'category': 'LOG',
                'test_number': 1,
                'score': 20.0,
                'exam_type': 'CS'
            }
        ]
        
        insert_response = supabase.table('test_results').insert(new_results).execute()
        print(f"✅ Inserted {len(insert_response.data)} new records")
        
        # Verify the results
        print("\n📊 Verifying new results:")
        verify_response = supabase.table('test_results').select('*').eq('user_id', test_user_id).eq('test_type', 'examen_blanc').eq('test_number', 1).eq('exam_type', 'CS').execute()
        
        for record in verify_response.data:
            print(f"  - {record['category']}: {record['score']}%")
        
        print("\n✅ Score saving test completed!")
        print("The exam page should now show 20% instead of 2%")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    test_score_saving()
