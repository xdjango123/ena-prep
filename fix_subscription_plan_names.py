#!/usr/bin/env python3
"""
Fix subscription plan_names to match profile exam_types
"""

from supabase import create_client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def fix_subscription_plan_names():
    """Fix subscription plan_names to match profile exam_types"""
    
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🔧 FIXING SUBSCRIPTION PLAN NAMES")
    print("=" * 40)
    
    # Get all profiles with exam_type
    print("\n📋 Step 1: Getting profiles with exam_type...")
    profiles = supabase.table('profiles').select('id, first_name, exam_type').execute()
    
    # Create mapping of user_id to exam_type
    user_exam_types = {}
    for profile in profiles.data:
        if profile['exam_type']:
            user_exam_types[profile['id']] = profile['exam_type']
            print(f"   - {profile['first_name']}: {profile['exam_type']}")
    
    print(f"\n✅ Found {len(user_exam_types)} profiles with exam_type")
    
    # Get all subscriptions
    print("\n📋 Step 2: Getting all subscriptions...")
    subscriptions = supabase.table('subscriptions').select('*').execute()
    print(f"✅ Found {len(subscriptions.data)} subscriptions")
    
    # Fix each subscription
    print("\n📋 Step 3: Fixing subscription plan_names...")
    
    updated_count = 0
    skipped_count = 0
    
    for sub in subscriptions.data:
        user_id = sub['user_id']
        exam_type = user_exam_types.get(user_id)
        current_plan = sub['plan_name']
        
        if exam_type:
            # Determine correct plan name
            correct_plan = {
                'CM': 'Prépa CM',
                'CMS': 'Prépa CMS', 
                'CS': 'Prépa CS'
            }.get(exam_type, 'Prépa CM')
            
            if current_plan != correct_plan:
                # Update the subscription
                result = supabase.table('subscriptions').update({
                    'plan_name': correct_plan
                }).eq('id', sub['id']).execute()
                
                if result.data:
                    updated_count += 1
                    print(f"   ✅ Updated {sub['id'][:8]}... from '{current_plan}' to '{correct_plan}'")
                else:
                    print(f"   ❌ Failed to update {sub['id'][:8]}...")
            else:
                skipped_count += 1
                print(f"   ⏭️  Skipped {sub['id'][:8]}... (already correct: {current_plan})")
        else:
            print(f"   ⚠️  No exam_type found for user {user_id[:8]}... (keeping: {current_plan})")
    
    print(f"\n✅ Updated {updated_count} subscriptions")
    print(f"⏭️  Skipped {skipped_count} subscriptions (already correct)")
    
    # Verify the fix
    print("\n📋 Step 4: Verifying the fix...")
    updated_subs = supabase.table('subscriptions').select('*').execute()
    
    print("✅ Updated subscriptions:")
    for sub in updated_subs.data:
        user_id = sub['user_id']
        exam_type = user_exam_types.get(user_id, 'Unknown')
        plan_name = sub['plan_name']
        print(f"   - User {user_id[:8]}... ({exam_type}): {plan_name}")
    
    print("\n🎉 SUBSCRIPTION PLAN NAMES FIXED!")
    print("=" * 35)

if __name__ == "__main__":
    fix_subscription_plan_names()
