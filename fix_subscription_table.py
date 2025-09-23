#!/usr/bin/env python3
"""
Fix subscription table to add exam_type column and update existing data
"""

from supabase import create_client
import json

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def fix_subscription_table():
    """Fix subscription table structure and data"""
    
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🔧 FIXING SUBSCRIPTION TABLE")
    print("=" * 35)
    
    # Step 1: Add exam_type column to subscriptions table
    print("\n📋 Step 1: Adding exam_type column to subscriptions table...")
    
    try:
        # Add exam_type column
        result = supabase.rpc('add_exam_type_column').execute()
        print("✅ Column added successfully")
    except Exception as e:
        print(f"⚠️  Column might already exist: {e}")
    
    # Step 2: Get all profiles with their exam_type
    print("\n📋 Step 2: Getting profiles with exam_type...")
    
    profiles = supabase.table('profiles').select('id, exam_type, first_name').execute()
    print(f"✅ Found {len(profiles.data)} profiles")
    
    # Create mapping of user_id to exam_type
    user_exam_types = {}
    for profile in profiles.data:
        if profile['exam_type']:
            user_exam_types[profile['id']] = profile['exam_type']
            print(f"   - {profile['first_name']}: {profile['exam_type']}")
    
    # Step 3: Update subscriptions with correct exam_type
    print("\n📋 Step 3: Updating subscriptions with exam_type...")
    
    subscriptions = supabase.table('subscriptions').select('*').execute()
    print(f"✅ Found {len(subscriptions.data)} subscriptions")
    
    updated_count = 0
    for sub in subscriptions.data:
        user_id = sub['user_id']
        exam_type = user_exam_types.get(user_id)
        
        if exam_type:
            # Update the subscription with exam_type
            result = supabase.table('subscriptions').update({
                'exam_type': exam_type
            }).eq('id', sub['id']).execute()
            
            if result.data:
                updated_count += 1
                print(f"   ✅ Updated subscription {sub['id'][:8]}... with exam_type: {exam_type}")
            else:
                print(f"   ❌ Failed to update subscription {sub['id'][:8]}...")
        else:
            print(f"   ⚠️  No exam_type found for user {user_id[:8]}...")
    
    print(f"\n✅ Updated {updated_count} subscriptions")
    
    # Step 4: Verify the fix
    print("\n📋 Step 4: Verifying the fix...")
    
    updated_subs = supabase.table('subscriptions').select('*').limit(5).execute()
    if updated_subs.data:
        print("✅ Updated subscriptions:")
        for sub in updated_subs.data:
            print(f"   - Plan: {sub['plan_name']}, Exam Type: {sub.get('exam_type', 'MISSING')}")
    
    print("\n🎉 SUBSCRIPTION TABLE FIXED!")
    print("=" * 30)

if __name__ == "__main__":
    fix_subscription_table()
