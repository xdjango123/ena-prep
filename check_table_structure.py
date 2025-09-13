#!/usr/bin/env python3
"""
Check test_results table structure
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def check_table_structure():
    """Check test_results table structure"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🔍 Checking test_results table structure...")
    
    try:
        # Get table info by trying to insert a record with different values
        print("📋 Current table constraints:")
        
        # Check if category can be null
        try:
            test_record = {
                'user_id': '171029d7-df14-4721-abb9-fbfbf38f61ce',
                'test_type': 'examen_blanc',
                'category': None,  # Try null
                'test_number': 999,
                'score': 100.0,
                'exam_type': 'CS'
            }
            response = supabase.table('test_results').insert([test_record]).execute()
            print("✅ category can be NULL")
            # Clean up
            supabase.table('test_results').delete().eq('test_number', 999).execute()
        except Exception as e:
            print(f"❌ category cannot be NULL: {e}")
        
        # Check if category can be empty string
        try:
            test_record = {
                'user_id': '171029d7-df14-4721-abb9-fbfbf38f61ce',
                'test_type': 'examen_blanc',
                'category': '',  # Try empty string
                'test_number': 998,
                'score': 100.0,
                'exam_type': 'CS'
            }
            response = supabase.table('test_results').insert([test_record]).execute()
            print("✅ category can be empty string")
            # Clean up
            supabase.table('test_results').delete().eq('test_number', 998).execute()
        except Exception as e:
            print(f"❌ category cannot be empty string: {e}")
        
        # Check if category can be 'OVERALL'
        try:
            test_record = {
                'user_id': '171029d7-df14-4721-abb9-fbfbf38f61ce',
                'test_type': 'examen_blanc',
                'category': 'OVERALL',  # Try 'OVERALL'
                'test_number': 997,
                'score': 100.0,
                'exam_type': 'CS'
            }
            response = supabase.table('test_results').insert([test_record]).execute()
            print("✅ category can be 'OVERALL'")
            # Clean up
            supabase.table('test_results').delete().eq('test_number', 997).execute()
        except Exception as e:
            print(f"❌ category cannot be 'OVERALL': {e}")
        
        # Check existing data patterns
        print("\n📊 Existing data patterns:")
        response = supabase.table('test_results').select('category').execute()
        categories = set(record['category'] for record in response.data)
        print(f"Existing categories: {categories}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    check_table_structure()
