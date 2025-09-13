#!/usr/bin/env python3
"""
Check table constraints for test_results
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def check_constraints():
    """Check table constraints"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🔍 Checking test_results table constraints...")
    
    try:
        # Try to get table information
        # This is a workaround to check constraints by testing different values
        print("📋 Testing constraint violations...")
        
        # Test different test_type values
        test_types = ['practice', 'examen_blanc', 'exam', 'test', 'quiz']
        
        for test_type in test_types:
            try:
                test_record = {
                    'user_id': '171029d7-df14-4721-abb9-fbfbf38f61ce',
                    'test_type': test_type,
                    'category': 'CG',
                    'test_number': 999,
                    'score': 100.0,
                    'exam_type': 'CS'
                }
                response = supabase.table('test_results').insert([test_record]).execute()
                print(f"✅ '{test_type}' is allowed")
                # Clean up
                supabase.table('test_results').delete().eq('test_number', 999).execute()
            except Exception as e:
                print(f"❌ '{test_type}' is not allowed: {e}")
        
        print("\n📋 Testing different category values...")
        categories = ['CG', 'ANG', 'LOG', 'ALL', 'OVERALL', 'TOTAL']
        
        for category in categories:
            try:
                test_record = {
                    'user_id': '171029d7-df14-4721-abb9-fbfbf38f61ce',
                    'test_type': 'practice',
                    'category': category,
                    'test_number': 998,
                    'score': 100.0,
                    'exam_type': 'CS'
                }
                response = supabase.table('test_results').insert([test_record]).execute()
                print(f"✅ '{category}' is allowed")
                # Clean up
                supabase.table('test_results').delete().eq('test_number', 998).execute()
            except Exception as e:
                print(f"❌ '{category}' is not allowed: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    check_constraints()
