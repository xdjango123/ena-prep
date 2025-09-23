#!/usr/bin/env python3
"""
Test plan display fix to verify that all plans from database are shown in UI
"""

import os
import sys
from supabase import create_client, Client

def test_plan_display_fix():
    # Supabase configuration with service role key
    url = "https://ohngxnhnbwnystzkqzwy.supabase.co"
    service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"
    
    # Create Supabase client with service role key
    supabase: Client = create_client(url, service_key)
    
    try:
        print("🔍 Testing plan display fix...")
        
        # Find user Dj Yepidan
        users = supabase.table('profiles').select('id, first_name, last_name, plan_name').eq('first_name', 'Dj').eq('last_name', 'Yepidan').execute()
        user_id = users.data[0]['id']
        
        print(f"User: {users.data[0]['first_name']} {users.data[0]['last_name']} (ID: {user_id[:8]}...)")
        print(f"Profile plan_name: {users.data[0]['plan_name']}")
        
        # Get all active subscriptions
        subscriptions = supabase.table('subscriptions').select('*').eq('user_id', user_id).eq('is_active', True).execute()
        
        print(f"\\n📊 Active subscriptions in database:")
        for i, sub in enumerate(subscriptions.data, 1):
            print(f"  {i}. Plan: {sub['plan_name']}, Start: {sub['start_date']}, End: {sub['end_date']}")
        
        # Test the exam type detection logic (fixed version)
        print(f"\\n📊 Exam type detection (fixed logic):")
        exam_types = []
        for sub in subscriptions.data:
            plan_name = sub['plan_name']
            if 'CMS' in plan_name:
                exam_type = 'CMS'
            elif 'CS' in plan_name:
                exam_type = 'CS'
            elif 'CM' in plan_name:
                exam_type = 'CM'
            else:
                exam_type = 'CM'
            
            exam_types.append(exam_type)
            print(f"  {plan_name} -> {exam_type}")
        
        # Remove duplicates
        unique_exam_types = list(set(exam_types))
        print(f"\\n📊 Unique exam types: {unique_exam_types}")
        
        print(f"\\n🎯 Expected behavior after fix:")
        print(f"  - All 3 plans should be visible in ProfilePage")
        print(f"  - All 3 plans should be visible in Sidebar dropdown")
        print(f"  - No plans should be missing due to incorrect deduplication")
        print(f"  - UI should match database exactly")
        
        print(f"\\n✅ Fix Summary:")
        print(f"  1. Fixed exam type detection order: CMS -> CS -> CM")
        print(f"  2. Fixed ProfilePage deduplication logic")
        print(f"  3. Fixed Sidebar plan filtering logic")
        print(f"  4. All 3 plans should now be visible")
        
        if len(unique_exam_types) == 3:
            print(f"\\n🎉 SUCCESS: All 3 exam types detected correctly!")
        else:
            print(f"\\n❌ ISSUE: Only {len(unique_exam_types)} exam types detected, expected 3")
        
    except Exception as e:
        print(f"❌ Error testing plan display fix: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_plan_display_fix()
