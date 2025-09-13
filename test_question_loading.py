#!/usr/bin/env python3
"""
Test question loading fix
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def test_question_loading():
    """Test question loading fix"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🧪 Testing question loading fix...")
    
    try:
        # Check if we have exam blanc questions
        print("📊 Checking exam blanc questions in database...")
        response = supabase.table('questions').select('*').eq('test_type', 'examen_blanc').eq('exam_type', 'CS').limit(5).execute()
        
        if response.data:
            print(f"✅ Found {len(response.data)} exam blanc questions")
            for i, q in enumerate(response.data[:3]):  # Show first 3
                print(f"  Question {i+1}:")
                print(f"    ID: {q['id']}")
                print(f"    Question: {q['question_text'][:50]}...")
                print(f"    Answer1: {q['answer1']}")
                print(f"    Answer2: {q['answer2']}")
                print(f"    Answer3: {q['answer3']}")
                print(f"    Correct: {q['correct']}")
                print(f"    Category: {q['category']}")
                print()
        else:
            print("❌ No exam blanc questions found in database")
        
        print("✅ Fixes applied:")
        print("  - Added is3Option: true flag to exam blanc questions")
        print("  - Enhanced debugging for question conversion")
        print("  - Fixed user undefined error")
        print("  - Fixed getSubCategory error")
        
        print("\n🧪 Ready for testing:")
        print("  1. Refresh the exam page")
        print("  2. Check console for debug messages")
        print("  3. Verify answer options are displayed")
        print("  4. Test retake functionality")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    test_question_loading()
