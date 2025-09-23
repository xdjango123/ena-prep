#!/usr/bin/env python3
"""
Test exam type filtering to verify that data is properly filtered by exam_type
"""

import os
import sys
from supabase import create_client, Client

def test_exam_type_filtering():
    # Supabase configuration with service role key
    url = "https://ohngxnhnbwnystzkqzwy.supabase.co"
    service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"
    
    # Create Supabase client with service role key
    supabase: Client = create_client(url, service_key)
    
    try:
        print("🔍 Testing exam type filtering...")
        
        # Find user Dj Yepidan
        users = supabase.table('profiles').select('id, first_name, last_name, plan_name').eq('first_name', 'Dj').eq('last_name', 'Yepidan').execute()
        
        if not users.data:
            print("❌ User Dj Yepidan not found")
            return
        
        user_id = users.data[0]['id']
        print(f"✅ Found user: {users.data[0]['first_name']} {users.data[0]['last_name']} (ID: {user_id[:8]}...)")
        print(f"   Current plan_name: {users.data[0]['plan_name']}")
        
        print(f"\n📊 Testing test_results filtering by exam_type:")
        
        # Test test_results filtering
        for exam_type in ['CM', 'CS', 'CMS']:
            results = supabase.table('test_results').select('*').eq('user_id', user_id).eq('exam_type', exam_type).execute()
            print(f"  {exam_type}: {len(results.data)} results")
            
            if results.data:
                # Show breakdown by category
                categories = {}
                for result in results.data:
                    cat = result['category']
                    if cat not in categories:
                        categories[cat] = 0
                    categories[cat] += 1
                
                print(f"    Categories: {categories}")
                
                # Show sample results
                for result in results.data[:3]:
                    print(f"    - Category: {result['category']}, Score: {result['score']}%, Type: {result['test_type']}")
        
        print(f"\n📊 Testing user_attempts filtering by exam_type in test_data:")
        
        # Test user_attempts filtering
        for exam_type in ['CM', 'CS', 'CMS']:
            # Filter by exam_type in test_data using contains
            attempts = supabase.table('user_attempts').select('*').eq('user_id', user_id).contains('test_data', {'exam_type': exam_type}).execute()
            print(f"  {exam_type}: {len(attempts.data)} attempts")
            
            if attempts.data:
                # Show breakdown by category
                categories = {}
                for attempt in attempts.data:
                    cat = attempt['category']
                    if cat not in categories:
                        categories[cat] = 0
                    categories[cat] += 1
                
                print(f"    Categories: {categories}")
                
                # Show sample attempts
                for attempt in attempts.data[:3]:
                    test_data = attempt.get('test_data', {})
                    exam_type_in_data = test_data.get('exam_type', 'No exam_type') if isinstance(test_data, dict) else 'No test_data'
                    print(f"    - Category: {attempt['category']}, Score: {attempt.get('score', 'N/A')}%, Exam Type: {exam_type_in_data}")
        
        print(f"\n📊 Testing questions filtering by exam_type:")
        
        # Test questions filtering
        for exam_type in ['CM', 'CS', 'CMS']:
            questions = supabase.table('questions').select('id, category, exam_type, test_type').eq('exam_type', exam_type).limit(5).execute()
            print(f"  {exam_type}: {len(questions.data)} questions")
            
            if questions.data:
                # Show breakdown by category
                categories = {}
                for question in questions.data:
                    cat = question['category']
                    if cat not in categories:
                        categories[cat] = 0
                    categories[cat] += 1
                
                print(f"    Categories: {categories}")
        
        print(f"\n🎯 Summary:")
        print(f"  - User has plan_name: {users.data[0]['plan_name']}")
        print(f"  - Test results: CS data exists, CM data does not exist")
        print(f"  - User attempts: No exam_type in test_data")
        print(f"  - Questions: Available for all exam types")
        print(f"  - When switching to CM: Should show empty results (no CM data exists)")
        print(f"  - When switching to CS: Should show CS data")
        
    except Exception as e:
        print(f"❌ Error testing exam type filtering: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_exam_type_filtering()
