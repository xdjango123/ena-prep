#!/usr/bin/env python3
"""
Clean up test data from test_results table
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def cleanup_test_data():
    """Clean up test data"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🧹 Cleaning up test data...")
    
    try:
        # Check current data
        response = supabase.table('test_results').select('*').eq('test_number', 1).eq('exam_type', 'CS').execute()
        print(f"📊 Found {len(response.data)} records for exam #1")
        
        for record in response.data:
            print(f"  - {record['category']}: {record['score']}% (test_type: {record['test_type']})")
        
        # Delete test data
        delete_response = supabase.table('test_results').delete().eq('test_number', 1).eq('exam_type', 'CS').execute()
        print(f"✅ Deleted {len(delete_response.data)} test records")
        
        # Check if there are any examen_blanc records
        examen_blanc_response = supabase.table('test_results').select('*').eq('test_type', 'examen_blanc').execute()
        print(f"📊 Found {len(examen_blanc_response.data)} examen_blanc records")
        
        if examen_blanc_response.data:
            for record in examen_blanc_response.data:
                print(f"  - {record['category']}: {record['score']}% (exam #{record['test_number']})")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    cleanup_test_data()
