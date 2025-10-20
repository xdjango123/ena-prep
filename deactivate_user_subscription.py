#!/usr/bin/env python3
"""
Script to deactivate a specific user's subscription for testing renewal functionality
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def deactivate_user_subscription(user_id: str):
    """Deactivate all subscriptions for a specific user"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print(f"🔍 Deactivating subscriptions for user: {user_id}")
    
    try:
        # First, check current subscription status
        print("\n1. Checking current subscription status...")
        response = supabase.table('subscriptions').select('*').eq('user_id', user_id).execute()
        
        if not response.data:
            print(f"❌ No subscriptions found for user {user_id}")
            return False
        
        print(f"📊 Found {len(response.data)} subscription(s):")
        for sub in response.data:
            print(f"  - Plan: {sub['plan_name']}, Active: {sub['is_active']}, End Date: {sub['end_date']}")
        
        # Deactivate all subscriptions
        print("\n2. Deactivating all subscriptions...")
        update_response = supabase.table('subscriptions').update({
            'is_active': False
        }).eq('user_id', user_id).execute()
        
        if update_response.data:
            print(f"✅ Successfully deactivated {len(update_response.data)} subscription(s)")
            
            # Verify the changes
            print("\n3. Verifying changes...")
            verify_response = supabase.table('subscriptions').select('*').eq('user_id', user_id).execute()
            
            print("📊 Updated subscription status:")
            for sub in verify_response.data:
                print(f"  - Plan: {sub['plan_name']}, Active: {sub['is_active']}, End Date: {sub['end_date']}")
            
            return True
        else:
            print("❌ Failed to deactivate subscriptions")
            return False
            
    except Exception as e:
        print(f"❌ Error deactivating subscriptions: {e}")
        return False

def check_user_profile(user_id: str):
    """Check user profile information"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print(f"\n🔍 Checking user profile for: {user_id}")
    
    try:
        response = supabase.table('profiles').select('*').eq('id', user_id).execute()
        
        if response.data:
            profile = response.data[0]
            print(f"📊 User Profile:")
            print(f"  - Name: {profile.get('first_name', 'N/A')} {profile.get('last_name', 'N/A')}")
            print(f"  - Email: {profile.get('email', 'N/A')}")
            print(f"  - Plan: {profile.get('plan_name', 'N/A')}")
            print(f"  - Owner: {profile.get('is_owner', False)}")
        else:
            print(f"❌ No profile found for user {user_id}")
            
    except Exception as e:
        print(f"❌ Error checking user profile: {e}")

def main():
    """Main function"""
    user_id = "2a6a2422-1824-4d78-b2fb-906d8567be09"
    
    print("🚀 USER SUBSCRIPTION DEACTIVATION SCRIPT")
    print("=" * 50)
    print(f"Target User ID: {user_id}")
    print("=" * 50)
    
    # Check user profile first
    check_user_profile(user_id)
    
    # Deactivate subscriptions
    success = deactivate_user_subscription(user_id)
    
    if success:
        print(f"\n✅ SUCCESS: User {user_id} subscriptions have been deactivated")
        print("🎯 The user should now see the 'Subscription Expired' modal")
        print("🧪 You can now test the renewal functionality")
    else:
        print(f"\n❌ FAILED: Could not deactivate subscriptions for user {user_id}")
        sys.exit(1)

if __name__ == "__main__":
    main()

