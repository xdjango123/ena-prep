#!/usr/bin/env python3
"""
Script to deactivate a specific user's subscription for testing renewal functionality
"""

import sys
from supabase import Client
from question_audit.db import SupabaseConfigError, get_supabase_client

try:
    from dotenv import load_dotenv  # type: ignore
except ImportError:  # pragma: no cover
    load_dotenv = None
else:
    load_dotenv()

def deactivate_user_subscription(client: Client, user_id: str) -> bool:
    """Deactivate all subscriptions for a specific user."""
    print(f"🔍 Deactivating subscriptions for user: {user_id}")
    
    supabase = client
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

def check_user_profile(client: Client, user_id: str) -> None:
    """Check user profile information."""
    print(f"\n🔍 Checking user profile for: {user_id}")
    
    supabase = client
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
    
    try:
        supabase = get_supabase_client()
    except SupabaseConfigError as exc:
        print(f"❌ {exc}")
        sys.exit(1)
    
    # Check user profile first
    check_user_profile(supabase, user_id)
    
    # Deactivate subscriptions
    success = deactivate_user_subscription(supabase, user_id)
    
    if success:
        print(f"\n✅ SUCCESS: User {user_id} subscriptions have been deactivated")
        print("🎯 The user should now see the 'Subscription Expired' modal")
        print("🧪 You can now test the renewal functionality")
    else:
        print(f"\n❌ FAILED: Could not deactivate subscriptions for user {user_id}")
        sys.exit(1)

if __name__ == "__main__":
    main()

