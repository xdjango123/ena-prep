#!/usr/bin/env python3
"""
Test if constraints are removed
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def test_constraints_removed():
    """Test if constraints are removed"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🧪 Testing if constraints are removed...")
    
    try:
        # Test examen_blanc as test_type
        print("📝 Testing examen_blanc as test_type...")
        test_record = {
            'user_id': '171029d7-df14-4721-abb9-fbfbf38f61ce',
            'test_type': 'examen_blanc',
            'category': 'OVERALL',
            'test_number': 1,
            'score': 85.0,
            'exam_type': 'CS'
        }
        
        response = supabase.table('test_results').insert([test_record]).execute()
        print("✅ examen_blanc and OVERALL are now allowed!")
        print(f"📋 Inserted record: {response.data[0]}")
        
        # Test retrieving the record
        print("\n🔍 Testing retrieval...")
        retrieve_response = supabase.table('test_results').select('*').eq('test_type', 'examen_blanc').eq('category', 'OVERALL').execute()
        
        if retrieve_response.data:
            print(f"✅ Successfully retrieved: {retrieve_response.data[0]}")
        else:
            print("❌ Could not retrieve record")
        
        # Clean up test record
        supabase.table('test_results').delete().eq('test_number', 1).eq('test_type', 'examen_blanc').execute()
        print("✅ Test record cleaned up")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    test_constraints_removed()
