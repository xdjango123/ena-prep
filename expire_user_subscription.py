#!/usr/bin/env python3
"""
Expire User Subscription - Testing Script

This script expires a user's subscription(s) by setting end_date to a past date
and is_active to false. Useful for testing renewal flows.

Usage:
    python expire_user_subscription.py <user_id>

Example:
    python expire_user_subscription.py 2a6a2422-1824-4d78-b2fb-906d8567be09
"""

import os
import sys
from supabase import create_client, Client
from datetime import datetime, timedelta

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"  # ✅ Correct API URL
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"  # ✅ Service role key

def get_supabase_client() -> Client:
    """Initialize Supabase client"""
    url = os.getenv('SUPABASE_URL', SUPABASE_URL)
    key = os.getenv('SUPABASE_KEY', SUPABASE_KEY)
    
    if url == "https://your-project.supabase.co" or key == "your-service-role-key":
        print("❌ Please set your Supabase credentials!")
        print("Set environment variables:")
        print("export SUPABASE_URL='your-actual-url'")
        print("export SUPABASE_KEY='your-actual-service-role-key'")
        print("\nOr edit this script and replace the placeholder values.")
        sys.exit(1)
    
    return create_client(url, key)

def expire_user_subscription(user_id: str, days_ago: int = 1):
    """Expire user's subscription(s) by setting end_date to past date"""
    supabase = get_supabase_client()
    
    print(f"⏰ Expiring subscription for user: {user_id}")
    print(f"📅 Setting end_date to {days_ago} day(s) ago")
    print(f"⏰ Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("-" * 60)
    
    try:
        # Calculate past date
        past_date = datetime.now() - timedelta(days=days_ago)
        past_date_str = past_date.strftime('%Y-%m-%d')
        
        # First, check what subscriptions exist
        print("1️⃣  Checking existing subscriptions...")
        result = supabase.table('subscriptions').select('*').eq('user_id', user_id).execute()
        
        if not result.data:
            print("   ❌ No subscriptions found for this user")
            return False
        
        print(f"   📋 Found {len(result.data)} subscription(s):")
        for sub in result.data:
            print(f"      - {sub['plan_name']} (Active: {sub['is_active']}, End: {sub['end_date']})")
        
        # Update all subscriptions for this user
        print("2️⃣  Updating subscriptions...")
        update_result = supabase.table('subscriptions').update({
            'end_date': past_date_str,
            'is_active': False
        }).eq('user_id', user_id).execute()
        
        print(f"   ✅ Updated {len(update_result.data)} subscription(s)")
        
        # Verify the update
        print("3️⃣  Verifying update...")
        verify_result = supabase.table('subscriptions').select('*').eq('user_id', user_id).execute()
        
        print("   📋 Updated subscriptions:")
        for sub in verify_result.data:
            print(f"      - {sub['plan_name']} (Active: {sub['is_active']}, End: {sub['end_date']})")
        
        print("-" * 60)
        print("🎉 Subscription expiration completed successfully!")
        print(f"✅ User {user_id} subscription(s) expired on {past_date_str}")
        print("🔄 User should now see renewal prompts")
        
        return True
        
    except Exception as e:
        print(f"❌ Error expiring subscription: {e}")
        return False

def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("❌ Usage: python expire_user_subscription.py <user_id> [days_ago]")
        print("\nExamples:")
        print("python expire_user_subscription.py 2a6a2422-1824-4d78-b2fb-906d8567be09")
        print("python expire_user_subscription.py 2a6a2422-1824-4d78-b2fb-906d8567be09 7")
        sys.exit(1)
    
    user_id = sys.argv[1]
    days_ago = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    
    # Validate UUID format (basic check)
    if len(user_id) != 36 or user_id.count('-') != 4:
        print("❌ Invalid user ID format. Expected UUID format.")
        print("Example: 2a6a2422-1824-4d78-b2fb-906d8567be09")
        sys.exit(1)
    
    # Validate days_ago
    if days_ago < 1:
        print("❌ days_ago must be at least 1")
        sys.exit(1)
    
    # Show what will happen
    past_date = datetime.now() - timedelta(days=days_ago)
    print("⚠️  This will expire the user's subscription(s):")
    print(f"User ID: {user_id}")
    print(f"New end_date: {past_date.strftime('%Y-%m-%d')} ({days_ago} day(s) ago)")
    print(f"New is_active: false")
    
    confirm = input("\nProceed? (y/N): ")
    if confirm.lower() != 'y':
        print("❌ Operation cancelled.")
        sys.exit(0)
    
    # Proceed with expiration
    success = expire_user_subscription(user_id, days_ago)
    
    if success:
        print("\n✅ Subscription expiration completed successfully!")
        print("🔄 The user should now see renewal prompts when they log in.")
    else:
        print("\n❌ Subscription expiration failed. Check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()