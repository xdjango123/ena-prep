#!/usr/bin/env python3
"""
Check test_results table columns
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def check_table_columns():
    """Check test_results table columns"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🔍 Checking test_results table columns...")
    
    try:
        # Try to insert a record with user_answer to see if the column exists
        test_record = {
            'user_id': '171029d7-df14-4721-abb9-fbfbf38f61ce',
            'test_type': 'examen_blanc',
            'category': 'TEST_COLUMN',
            'test_number': 999,
            'score': 100.0,
            'exam_type': 'CS',
            'user_answer': 'A'  # Try to add user_answer
        }
        
        response = supabase.table('test_results').insert([test_record]).execute()
        print("✅ user_answer column exists")
        
        # Clean up
        supabase.table('test_results').delete().eq('test_number', 999).execute()
        print("✅ Test record cleaned up")
        
        return True
        
    except Exception as e:
        print(f"❌ user_answer column does not exist: {e}")
        
        # Check existing columns by looking at a sample record
        print("\n📋 Checking existing columns...")
        response = supabase.table('test_results').select('*').limit(1).execute()
        
        if response.data:
            print("Existing columns:")
            for key in response.data[0].keys():
                print(f"  - {key}")
        else:
            print("No records found to check columns")
        
        return False

if __name__ == "__main__":
    check_table_columns()
