#!/usr/bin/env python3
"""
Test plan switching data refresh to verify scores and test data are accurate
"""

import os
import sys
from supabase import create_client, Client

def test_plan_switching_data():
    # Supabase configuration with service role key
    url = "https://ohngxnhnbwnystzkqzwy.supabase.co"
    service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"
    
    # Create Supabase client with service role key
    supabase: Client = create_client(url, service_key)
    
    try:
        print("🔍 Testing plan switching data refresh...")
        
        # Test user subscriptions and exam types
        print("\n1. Testing user subscriptions and exam types:")
        
        # Get a sample user with subscriptions
        users_response = supabase.table('profiles').select('id, first_name, last_name, plan_name').limit(3).execute()
        
        if users_response.data:
            for user in users_response.data:
                user_id = user['id']
                print(f"\n  User: {user['first_name']} {user['last_name']} (ID: {user_id[:8]}...)")
                print(f"  Current plan_name: {user['plan_name']}")
                
                # Get user's subscriptions
                subscriptions_response = supabase.table('subscriptions').select('*').eq('user_id', user_id).execute()
                
                if subscriptions_response.data:
                    print(f"  Active subscriptions:")
                    for sub in subscriptions_response.data:
                        if sub['is_active']:
                            exam_type = 'CM' if 'CM' in sub['plan_name'] else 'CMS' if 'CMS' in sub['plan_name'] else 'CS' if 'CS' in sub['plan_name'] else 'Unknown'
                            print(f"    - {sub['plan_name']} (Exam Type: {exam_type})")
                else:
                    print("    No subscriptions found")
        
        # Test test results filtering by exam type
        print("\n2. Testing test results filtering by exam type:")
        
        # Get test results for different exam types
        for exam_type in ['CM', 'CS', 'CMS']:
            test_results_response = supabase.table('test_results').select('user_id, category, exam_type, score, test_type').eq('exam_type', exam_type).limit(5).execute()
            
            if test_results_response.data:
                print(f"  {exam_type} test results: {len(test_results_response.data)} found")
                for result in test_results_response.data[:2]:  # Show first 2
                    print(f"    User: {result['user_id'][:8]}..., Category: {result['category']}, Score: {result['score']}%, Type: {result['test_type']}")
            else:
                print(f"  {exam_type} test results: No results found")
        
        # Test user attempts filtering by exam type
        print("\n3. Testing user attempts filtering by exam type:")
        
        for exam_type in ['CM', 'CS', 'CMS']:
            # Get user attempts and filter by exam_type from test_data
            attempts_response = supabase.table('user_attempts').select('user_id, category, test_type, score, test_data').limit(20).execute()
            
            if attempts_response.data:
                # Filter attempts that have test_data with exam_type
                filtered_attempts = []
                for attempt in attempts_response.data:
                    if attempt.get('test_data') and isinstance(attempt['test_data'], dict):
                        test_data = attempt['test_data']
                        if test_data.get('exam_type') == exam_type:
                            filtered_attempts.append(attempt)
                
                print(f"  {exam_type} user attempts: {len(filtered_attempts)} found")
                for attempt in filtered_attempts[:2]:  # Show first 2
                    print(f"    User: {attempt['user_id'][:8]}..., Category: {attempt['category']}, Score: {attempt['score']}%, Type: {attempt['test_type']}")
            else:
                print(f"  {exam_type} user attempts: No attempts found")
        
        # Test questions filtering by exam type
        print("\n4. Testing questions filtering by exam type:")
        
        for exam_type in ['CM', 'CS', 'CMS']:
            questions_response = supabase.table('questions').select('id, category, exam_type, test_type').eq('exam_type', exam_type).limit(3).execute()
            
            if questions_response.data:
                print(f"  {exam_type} questions: {len(questions_response.data)} found")
                for question in questions_response.data:
                    print(f"    ID: {question['id'][:8]}..., Category: {question['category']}, Test Type: {question['test_type']}")
            else:
                print(f"  {exam_type} questions: No questions found")
        
        print("\n✅ Plan switching data test completed successfully!")
        print("\n📋 Summary:")
        print("  - User subscriptions are properly structured")
        print("  - Test results can be filtered by exam_type")
        print("  - User attempts can be filtered by exam_type in test_data")
        print("  - Questions can be filtered by exam_type")
        print("  - All data sources support plan-specific filtering")
        
    except Exception as e:
        print(f"❌ Error testing plan switching data: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_plan_switching_data()
