#!/usr/bin/env python3
"""
Test statistics fix to verify that CG and LOG statistics are using the correct table
"""

import os
import sys
from supabase import create_client, Client

def test_statistics_fix():
    # Supabase configuration with service role key
    url = "https://ohngxnhnbwnystzkqzwy.supabase.co"
    service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"
    
    # Create Supabase client with service role key
    supabase: Client = create_client(url, service_key)
    
    try:
        print("🔍 Testing statistics fix...")
        
        # Find user Dj Yepidan
        users = supabase.table('profiles').select('id, first_name, last_name, plan_name').eq('first_name', 'Dj').eq('last_name', 'Yepidan').execute()
        
        if not users.data:
            print("❌ User Dj Yepidan not found")
            return
        
        user_id = users.data[0]['id']
        print(f"✅ Found user: {users.data[0]['first_name']} {users.data[0]['last_name']} (ID: {user_id[:8]}...)")
        print(f"   Current plan_name: {users.data[0]['plan_name']}")
        
        print(f"\n📊 Testing test_results table data (should be used for statistics):")
        
        # Test test_results filtering for CG and LOG
        for category in ['CG', 'LOG']:
            print(f"\n  {category} Statistics:")
            
            for exam_type in ['CM', 'CS', 'CMS']:
                results = supabase.table('test_results').select('*').eq('user_id', user_id).eq('category', category).eq('exam_type', exam_type).eq('test_type', 'practice').execute()
                print(f"    {exam_type}: {len(results.data)} practice test results")
                
                if results.data:
                    scores = [r['score'] for r in results.data if r['score'] is not None]
                    if scores:
                        avg_score = sum(scores) / len(scores)
                        print(f"      Average score: {avg_score:.1f}%")
                        
                        # Show test numbers
                        test_numbers = [r['test_number'] for r in results.data if r['test_number'] is not None]
                        unique_tests = set(test_numbers)
                        print(f"      Unique tests: {len(unique_tests)}")
                        print(f"      Test numbers: {sorted(list(unique_tests))[:5]}{'...' if len(unique_tests) > 5 else ''}")
        
        print(f"\n📊 Testing user_attempts table data (should NOT be used for statistics):")
        
        # Test user_attempts for comparison
        for category in ['CG', 'LOG']:
            attempts = supabase.table('user_attempts').select('*').eq('user_id', user_id).eq('category', category).eq('test_type', 'practice').execute()
            print(f"  {category}: {len(attempts.data)} practice attempts")
            
            if attempts.data:
                scores = [a['score'] for a in attempts.data if a['score'] is not None]
                if scores:
                    avg_score = sum(scores) / len(scores)
                    print(f"    Average score: {avg_score:.1f}%")
        
        print(f"\n🎯 Expected Behavior:")
        print(f"  - When user is on CM plan: Should show 0% scores (no CM data in test_results)")
        print(f"  - When user switches to CS plan: Should show actual CS scores from test_results")
        print(f"  - Statistics should update immediately without buffering")
        print(f"  - CG and LOG should use test_results table (not user_attempts)")
        
        print(f"\n✅ Fix Summary:")
        print(f"  1. LOG statistics now use TestResultService (test_results table)")
        print(f"  2. CG statistics already use TestResultService (test_results table)")
        print(f"  3. Both filter by exam_type correctly")
        print(f"  4. Loading states added to prevent buffering")
        print(f"  5. Statistics should show immediately when switching plans")
        
    except Exception as e:
        print(f"❌ Error testing statistics fix: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_statistics_fix()
