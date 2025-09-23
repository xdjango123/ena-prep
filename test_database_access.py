#!/usr/bin/env python3
"""
Test database access with service role key
"""

import os
import sys
from supabase import create_client, Client

def test_database_access():
    # Supabase configuration with service role key
    url = "https://ohngxnhnbwnystzkqzwy.supabase.co"
    service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"
    
    # Create Supabase client with service role key
    supabase: Client = create_client(url, service_key)
    
    try:
        print("🔍 Testing database access with service role...")
        
        # Test questions table access
        print("\n1. Testing questions table...")
        questions_response = supabase.table('questions').select('id, category, exam_type, test_type').limit(5).execute()
        
        if questions_response.data:
            print("✅ Questions table accessible")
            print("Sample questions:")
            for q in questions_response.data:
                print(f"  ID: {q['id']}, Category: {q['category']}, Exam Type: {q['exam_type']}, Test Type: {q['test_type']}")
        else:
            print("❌ No questions found")
        
        # Test subscriptions table access
        print("\n2. Testing subscriptions table...")
        subscriptions_response = supabase.table('subscriptions').select('id, plan_name, is_active, user_id').limit(3).execute()
        
        if subscriptions_response.data:
            print("✅ Subscriptions table accessible")
            print("Sample subscriptions:")
            for s in subscriptions_response.data:
                print(f"  ID: {s['id']}, Plan: {s['plan_name']}, Active: {s['is_active']}, User: {s['user_id']}")
        else:
            print("❌ No subscriptions found")
        
        # Test profiles table access
        print("\n3. Testing profiles table...")
        profiles_response = supabase.table('profiles').select('id, plan_name, first_name, last_name').limit(3).execute()
        
        if profiles_response.data:
            print("✅ Profiles table accessible")
            print("Sample profiles:")
            for p in profiles_response.data:
                print(f"  ID: {p['id']}, Plan: {p['plan_name']}, Name: {p['first_name']} {p['last_name']}")
        else:
            print("❌ No profiles found")
        
        # Test question filtering by exam_type
        print("\n4. Testing question filtering by exam_type...")
        cm_questions = supabase.table('questions').select('id, category, exam_type').eq('exam_type', 'CM').limit(3).execute()
        cs_questions = supabase.table('questions').select('id, category, exam_type').eq('exam_type', 'CS').limit(3).execute()
        
        print(f"CM questions found: {len(cm_questions.data) if cm_questions.data else 0}")
        print(f"CS questions found: {len(cs_questions.data) if cs_questions.data else 0}")
        
        if cm_questions.data:
            print("Sample CM questions:")
            for q in cm_questions.data:
                print(f"  ID: {q['id']}, Category: {q['category']}, Exam Type: {q['exam_type']}")
        
        if cs_questions.data:
            print("Sample CS questions:")
            for q in cs_questions.data:
                print(f"  ID: {q['id']}, Category: {q['category']}, Exam Type: {q['exam_type']}")
        
        print("\n🎉 Database access test completed successfully!")
        
    except Exception as e:
        print(f"❌ Error testing database access: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_database_access()
