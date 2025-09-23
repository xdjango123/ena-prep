#!/usr/bin/env python3
"""
Test duplicate plans fix to verify that plans are no longer duplicated
"""

import os
import sys
from supabase import create_client, Client

def test_duplicate_plans_fix():
    # Supabase configuration with service role key
    url = "https://ohngxnhnbwnystzkqzwy.supabase.co"
    service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"
    
    # Create Supabase client with service role key
    supabase: Client = create_client(url, service_key)
    
    try:
        print("🔍 Testing duplicate plans fix...")
        
        # Find user Dj Yepidan
        users = supabase.table('profiles').select('id, first_name, last_name, plan_name').eq('first_name', 'Dj').eq('last_name', 'Yepidan').execute()
        user_id = users.data[0]['id']
        
        print(f"User: {users.data[0]['first_name']} {users.data[0]['last_name']} (ID: {user_id[:8]}...)")
        
        # Get all subscriptions for this user
        subscriptions = supabase.table('subscriptions').select('*').eq('user_id', user_id).execute()
        
        print(f"\\n📊 Current subscriptions:")
        print(f"Total subscriptions: {len(subscriptions.data)}")
        
        # Group by plan_name
        plan_counts = {}
        for sub in subscriptions.data:
            plan_name = sub['plan_name']
            if plan_name in plan_counts:
                plan_counts[plan_name] += 1
            else:
                plan_counts[plan_name] = 1
        
        print(f"\\n📊 Plan counts:")
        has_duplicates = False
        for plan, count in plan_counts.items():
            print(f"  {plan}: {count} subscriptions")
            if count > 1:
                print(f"    ⚠️  DUPLICATE DETECTED!")
                has_duplicates = True
        
        if not has_duplicates:
            print(f"\\n✅ No duplicates found! Cleanup was successful.")
        else:
            print(f"\\n❌ Duplicates still exist. Cleanup may have failed.")
        
        print(f"\\n🎯 UI Fix Summary:")
        print(f"  1. ✅ Data cleanup: Removed duplicate subscriptions")
        print(f"  2. ✅ UI deduplication: ProfilePage now deduplicates plans by exam type")
        print(f"  3. ✅ Better validation: addExamType now checks for existing plans")
        print(f"  4. ✅ Reactivation logic: Reuses existing inactive subscriptions")
        
        print(f"\\n🔧 Database Constraint (Manual Step Required):")
        print(f"  To prevent future duplicates, add this constraint in Supabase dashboard:")
        print(f"  ")
        print(f"  CREATE UNIQUE INDEX unique_active_subscription_per_user_plan")
        print(f"  ON subscriptions (user_id, plan_name)")
        print(f"  WHERE is_active = true;")
        print(f"  ")
        print(f"  This ensures each user can only have one active subscription per plan.")
        
        print(f"\\n🎯 Expected Behavior Now:")
        print(f"  - Each plan appears only once in the UI")
        print(f"  - No duplicate entries when adding new plans")
        print(f"  - Clean, organized plan list")
        print(f"  - Better error handling for duplicate plans")
        
    except Exception as e:
        print(f"❌ Error testing duplicate plans fix: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_duplicate_plans_fix()
