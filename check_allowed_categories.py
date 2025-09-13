#!/usr/bin/env python3
"""
Check what categories are allowed in test_results table
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def check_allowed_categories():
    """Check what categories are allowed"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🔍 Checking allowed categories in test_results table...")
    
    # Test different category values
    test_categories = ['CG', 'ANG', 'LOG', 'OVERALL', 'TOTAL', 'ALL', 'EXAM', 'FINAL']
    
    for category in test_categories:
        try:
            test_record = {
                'user_id': '171029d7-df14-4721-abb9-fbfbf38f61ce',
                'test_type': 'practice',
                'category': category,
                'test_number': 900,  # Use a high number to avoid conflicts
                'score': 100.0,
                'exam_type': 'CS'
            }
            response = supabase.table('test_results').insert([test_record]).execute()
            print(f"✅ '{category}' is allowed")
            # Clean up
            supabase.table('test_results').delete().eq('test_number', 900).execute()
        except Exception as e:
            print(f"❌ '{category}' is not allowed: {e}")
    
    # Check existing data to see what's actually used
    print("\n📊 Existing data analysis:")
    response = supabase.table('test_results').select('category, test_type, exam_type').execute()
    
    # Group by category
    category_counts = {}
    for record in response.data:
        cat = record['category']
        if cat not in category_counts:
            category_counts[cat] = 0
        category_counts[cat] += 1
    
    print("Category usage:")
    for cat, count in category_counts.items():
        print(f"  {cat}: {count} records")
    
    # Check if there are any records with exam_type
    exam_type_records = [r for r in response.data if r['exam_type'] is not None]
    print(f"\nRecords with exam_type: {len(exam_type_records)}")
    
    return True

if __name__ == "__main__":
    check_allowed_categories()
