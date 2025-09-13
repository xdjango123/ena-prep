#!/usr/bin/env python3
"""
Check if examen_blanc is allowed as test_type
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def check_examen_blanc_test_type():
    """Check if examen_blanc is allowed as test_type"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🔍 Checking if examen_blanc is allowed as test_type...")
    
    try:
        # Test if examen_blanc is allowed
        test_record = {
            'user_id': '171029d7-df14-4721-abb9-fbfbf38f61ce',
            'test_type': 'examen_blanc',
            'category': 'ALL',
            'test_number': 999,  # Use high number to avoid conflicts
            'score': 100.0,
            'exam_type': 'CS'
        }
        
        response = supabase.table('test_results').insert([test_record]).execute()
        print("✅ 'examen_blanc' is allowed as test_type")
        
        # Clean up
        supabase.table('test_results').delete().eq('test_number', 999).execute()
        print("✅ Test record cleaned up")
        
        return True
        
    except Exception as e:
        print(f"❌ 'examen_blanc' is not allowed as test_type: {e}")
        
        # Check what test_types are allowed
        print("\n🔍 Checking existing test_types...")
        response = supabase.table('test_results').select('test_type').execute()
        test_types = set(record['test_type'] for record in response.data)
        print(f"Existing test_types: {test_types}")
        
        return False

if __name__ == "__main__":
    check_examen_blanc_test_type()
