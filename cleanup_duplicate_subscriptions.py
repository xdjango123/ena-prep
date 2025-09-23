#!/usr/bin/env python3
"""
Clean up duplicate subscriptions from the database
"""

import os
import sys
from supabase import create_client, Client

def cleanup_duplicate_subscriptions():
    # Supabase configuration with service role key
    url = "https://ohngxnhnbwnystzkqzwy.supabase.co"
    service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"
    
    # Create Supabase client with service role key
    supabase: Client = create_client(url, service_key)
    
    try:
        print("🧹 Cleaning up duplicate subscriptions...")
        
        # Find user Dj Yepidan
        users = supabase.table('profiles').select('id, first_name, last_name, plan_name').eq('first_name', 'Dj').eq('last_name', 'Yepidan').execute()
        user_id = users.data[0]['id']
        
        print(f"User: {users.data[0]['first_name']} {users.data[0]['last_name']} (ID: {user_id[:8]}...)")
        
        # Get all subscriptions for this user
        subscriptions = supabase.table('subscriptions').select('*').eq('user_id', user_id).execute()
        
        print(f"\\n📊 Before cleanup:")
        print(f"Total subscriptions: {len(subscriptions.data)}")
        
        # Group subscriptions by plan_name
        plan_groups = {}
        for sub in subscriptions.data:
            plan_name = sub['plan_name']
            if plan_name not in plan_groups:
                plan_groups[plan_name] = []
            plan_groups[plan_name].append(sub)
        
        # Keep only the most recent subscription for each plan
        subscriptions_to_keep = []
        subscriptions_to_delete = []
        
        for plan_name, subs in plan_groups.items():
            if len(subs) > 1:
                print(f"\\n🔍 Plan '{plan_name}' has {len(subs)} subscriptions:")
                
                # Sort by start_date (most recent first)
                subs.sort(key=lambda x: x['start_date'], reverse=True)
                
                # Keep the first one (most recent)
                keep_sub = subs[0]
                subscriptions_to_keep.append(keep_sub)
                print(f"  ✅ Keeping: ID {keep_sub['id'][:8]}... (Start: {keep_sub['start_date']})")
                
                # Mark others for deletion
                for sub in subs[1:]:
                    subscriptions_to_delete.append(sub)
                    print(f"  ❌ Deleting: ID {sub['id'][:8]}... (Start: {sub['start_date']})")
            else:
                # Only one subscription for this plan, keep it
                subscriptions_to_keep.append(subs[0])
                print(f"\\n✅ Plan '{plan_name}' has only 1 subscription, keeping it")
        
        # Delete duplicate subscriptions
        if subscriptions_to_delete:
            print(f"\\n🗑️  Deleting {len(subscriptions_to_delete)} duplicate subscriptions...")
            
            for sub in subscriptions_to_delete:
                result = supabase.table('subscriptions').delete().eq('id', sub['id']).execute()
                if result.data:
                    print(f"  ✅ Deleted subscription ID {sub['id'][:8]}...")
                else:
                    print(f"  ❌ Failed to delete subscription ID {sub['id'][:8]}...")
            
            print(f"\\n✅ Cleanup completed!")
        else:
            print(f"\\n✅ No duplicates found, no cleanup needed")
        
        # Verify the cleanup
        print(f"\\n📊 After cleanup:")
        final_subscriptions = supabase.table('subscriptions').select('*').eq('user_id', user_id).execute()
        print(f"Total subscriptions: {len(final_subscriptions.data)}")
        
        for sub in final_subscriptions.data:
            print(f"  - {sub['plan_name']} (ID: {sub['id'][:8]}..., Start: {sub['start_date']})")
        
        print(f"\\n🎯 Expected result:")
        print(f"  - Each plan should appear only once")
        print(f"  - No duplicate entries in the UI")
        print(f"  - Clean, organized plan list")
        
    except Exception as e:
        print(f"❌ Error cleaning up duplicate subscriptions: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    cleanup_duplicate_subscriptions()
