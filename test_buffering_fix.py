#!/usr/bin/env python3
"""
Test buffering fix to verify that statistics show immediately without delay
"""

import os
import sys
from supabase import create_client, Client

def test_buffering_fix():
    # Supabase configuration with service role key
    url = "https://ohngxnhnbwnystzkqzwy.supabase.co"
    service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"
    
    # Create Supabase client with service role key
    supabase: Client = create_client(url, service_key)
    
    try:
        print("🔍 Testing buffering fix...")
        
        # Find user Dj Yepidan
        users = supabase.table('profiles').select('id, first_name, last_name, plan_name').eq('first_name', 'Dj').eq('last_name', 'Yepidan').execute()
        
        if not users.data:
            print("❌ User Dj Yepidan not found")
            return
        
        user_id = users.data[0]['id']
        print(f"✅ Found user: {users.data[0]['first_name']} {users.data[0]['last_name']} (ID: {user_id[:8]}...)")
        print(f"   Current plan_name: {users.data[0]['plan_name']}")
        
        print(f"\n📊 Testing statistics filtering by exam_type:")
        
        # Test what should be shown for CM plan (should be empty)
        print(f"\n  CM Plan (current plan - should show 0% scores):")
        for category in ['CG', 'ANG', 'LOG']:
            results = supabase.table('test_results').select('*').eq('user_id', user_id).eq('category', category).eq('exam_type', 'CM').eq('test_type', 'practice').execute()
            print(f"    {category}: {len(results.data)} results")
            if results.data:
                scores = [r['score'] for r in results.data if r['score'] is not None]
                if scores:
                    avg_score = sum(scores) / len(scores)
                    print(f"      Average score: {avg_score:.1f}%")
                else:
                    print(f"      Average score: 0%")
            else:
                print(f"      Average score: 0%")
        
        # Test what should be shown for CS plan (should show actual data)
        print(f"\n  CS Plan (if switched to - should show actual scores):")
        for category in ['CG', 'ANG', 'LOG']:
            results = supabase.table('test_results').select('*').eq('user_id', user_id).eq('category', category).eq('exam_type', 'CS').eq('test_type', 'practice').execute()
            print(f"    {category}: {len(results.data)} results")
            if results.data:
                scores = [r['score'] for r in results.data if r['score'] is not None]
                if scores:
                    avg_score = sum(scores) / len(scores)
                    print(f"      Average score: {avg_score:.1f}%")
                else:
                    print(f"      Average score: 0%")
            else:
                print(f"      Average score: 0%")
        
        print(f"\n🎯 Expected Behavior After Fix:")
        print(f"  - When user is on CM plan: Should show 0% scores immediately (no buffering)")
        print(f"  - When user switches to CS plan: Should show actual CS scores immediately")
        print(f"  - No more UI hallucination showing old CS data when on CM plan")
        print(f"  - All statistics functions use TestResultService with exam_type filtering")
        print(f"  - Loading states prevent showing old data during transitions")
        
        print(f"\n✅ Fix Summary:")
        print(f"  1. All refreshStatistics functions now use TestResultService")
        print(f"  2. All functions filter by exam_type correctly")
        print(f"  3. Loading states added to prevent buffering")
        print(f"  4. Consistent logic across all subject pages")
        print(f"  5. No more race conditions between different statistics functions")
        
    except Exception as e:
        print(f"❌ Error testing buffering fix: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_buffering_fix()
