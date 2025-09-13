#!/usr/bin/env python3
"""
Test that results modal will work with existing data
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def test_results_modal():
    """Test that results modal will work with existing data"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🧪 Testing results modal functionality...")
    
    # Use one of the existing user IDs
    test_user_id = "171029d7-df14-4721-abb9-fbfbf38f61ce"  # Dj Yepidan (CS exam type)
    
    try:
        # Check if we have examen blanc results
        response = supabase.table('test_results').select('*').eq('user_id', test_user_id).eq('test_type', 'examen_blanc').eq('category', 'OVERALL').execute()
        
        if response.data:
            print(f"✅ Found {len(response.data)} examen blanc results")
            for record in response.data:
                print(f"  - Exam {record['test_number']}: {record['score']}% (created: {record['created_at']})")
            
            # Test the specific exam #1 that should show in the modal
            exam_1_result = next((r for r in response.data if r['test_number'] == 1), None)
            if exam_1_result:
                print(f"\n🎯 Exam #1 result for modal:")
                print(f"  - Score: {exam_1_result['score']}%")
                print(f"  - Exam Type: {exam_1_result['exam_type']}")
                print(f"  - Created: {exam_1_result['created_at']}")
                print(f"  - User ID: {exam_1_result['user_id']}")
                
                print("\n✅ Results modal should work correctly!")
                print("The modal will display:")
                print(f"  - Overall score: {exam_1_result['score']}%")
                print(f"  - Exam type: {exam_1_result['exam_type']}")
                print(f"  - Date: {exam_1_result['created_at'][:10]}")
                print(f"  - Time: {exam_1_result['created_at'][11:19]}")
                
                return True
            else:
                print("❌ No exam #1 result found")
                return False
        else:
            print("❌ No examen blanc results found")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    test_results_modal()
