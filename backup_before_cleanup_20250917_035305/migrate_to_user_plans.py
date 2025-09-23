#!/usr/bin/env python3
"""
Migration script to convert existing user subscriptions to the new user_plans system
"""

import os
import sys
from supabase import create_client, Client
from datetime import datetime, timedelta

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def migrate_users_to_plans():
    """Migrate existing users from subscriptions to user_plans"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🔄 Starting migration to user_plans system...")
    
    try:
        # Get all profiles with exam_type
        profiles_response = supabase.table('profiles').select('id, exam_type, selected_plan').execute()
        profiles = profiles_response.data
        
        print(f"📊 Found {len(profiles)} profiles to migrate")
        
        migrated_count = 0
        skipped_count = 0
        
        for profile in profiles:
            user_id = profile['id']
            exam_type = profile.get('exam_type')
            selected_plan = profile.get('selected_plan')
            
            if not exam_type:
                print(f"⚠️  Skipping user {user_id}: no exam_type")
                skipped_count += 1
                continue
            
            # Check if user already has plans
            existing_plans = supabase.table('user_plans').select('id').eq('user_id', user_id).execute()
            
            if existing_plans.data:
                print(f"⚠️  Skipping user {user_id}: already has plans")
                skipped_count += 1
                continue
            
            # Map exam_type to plan_name
            plan_mapping = {
                'CM': 'Prépa CM',
                'CMS': 'Prépa CMS', 
                'CS': 'Prépa CS'
            }
            
            plan_name = plan_mapping.get(exam_type)
            if not plan_name:
                print(f"⚠️  Skipping user {user_id}: invalid exam_type {exam_type}")
                skipped_count += 1
                continue
            
            # Create user plan
            start_date = datetime.now()
            end_date = start_date + timedelta(days=30)  # 30 days from now
            
            plan_data = {
                'user_id': user_id,
                'plan_name': plan_name,
                'exam_type': exam_type,
                'is_active': True,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            }
            
            # Insert the plan
            result = supabase.table('user_plans').insert(plan_data).execute()
            
            if result.data:
                print(f"✅ Created plan for user {user_id}: {plan_name}")
                
                # Update profile with selected_plan if not already set
                if not selected_plan:
                    supabase.table('profiles').update({
                        'selected_plan': exam_type
                    }).eq('id', user_id).execute()
                    print(f"✅ Set selected_plan for user {user_id}: {exam_type}")
                
                migrated_count += 1
            else:
                print(f"❌ Failed to create plan for user {user_id}")
                skipped_count += 1
        
        print(f"\n🎉 Migration completed!")
        print(f"✅ Migrated: {migrated_count} users")
        print(f"⚠️  Skipped: {skipped_count} users")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    migrate_users_to_plans()

