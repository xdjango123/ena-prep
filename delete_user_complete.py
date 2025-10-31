#!/usr/bin/env python3
"""
Delete User Completely - Testing Script

This script deletes a user from all relevant tables in the correct order
to avoid foreign key constraint violations.

Usage:
    python delete_user_complete.py <user_id>

Example:
    python delete_user_complete.py 2a6a2422-1824-4d78-b2fb-906d8567be09
"""

import os
import sys
from supabase import create_client, Client
from datetime import datetime

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

def delete_user_completely(user_id: str):
    """Delete user from all tables in correct order"""
    supabase = get_supabase_client()
    
    print(f"🗑️  Starting complete deletion of user: {user_id}")
    print(f"⏰ Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("-" * 60)
    
    try:
        # Step 1: Delete from exam_results (if exists)
        print("1️⃣  Deleting exam results...")
        try:
            result = supabase.table('exam_results').delete().eq('user_id', user_id).execute()
            print(f"   ✅ Deleted {len(result.data)} exam results")
        except Exception as e:
            print(f"   ⚠️  No exam results found or error: {e}")
        
        # Step 2: Delete from user_attempts (foreign key constraint)
        print("2️⃣  Deleting user attempts...")
        try:
            result = supabase.table('user_attempts').delete().eq('user_id', user_id).execute()
            print(f"   ✅ Deleted {len(result.data)} user attempts")
        except Exception as e:
            print(f"   ⚠️  No user attempts found or error: {e}")
        
        # Step 2.5: Delete from any other tables that might reference the user
        print("2️⃣.5️⃣  Checking for other user references...")
        other_tables = ['user_plans', 'exam_results', 'test_results']  # Add any other tables that might reference user_id
        for table_name in other_tables:
            try:
                result = supabase.table(table_name).delete().eq('user_id', user_id).execute()
                if len(result.data) > 0:
                    print(f"   ✅ Deleted {len(result.data)} records from {table_name}")
            except Exception as e:
                print(f"   ⚠️  No records in {table_name} or error: {e}")
        
        # Step 3: Delete from subscriptions
        print("3️⃣  Deleting subscriptions...")
        try:
            result = supabase.table('subscriptions').delete().eq('user_id', user_id).execute()
            print(f"   ✅ Deleted {len(result.data)} subscriptions")
        except Exception as e:
            print(f"   ❌ Error deleting subscriptions: {e}")
            return False
        
        # Step 4: Delete from profiles
        print("4️⃣  Deleting profile...")
        try:
            result = supabase.table('profiles').delete().eq('id', user_id).execute()
            print(f"   ✅ Deleted {len(result.data)} profile")
        except Exception as e:
            print(f"   ❌ Error deleting profile: {e}")
            return False
        
        # Step 5: Delete from auth.users (Supabase Auth)
        print("5️⃣  Deleting from auth.users...")
        try:
            # Note: This requires admin privileges
            result = supabase.auth.admin.delete_user(user_id)
            print(f"   ✅ Deleted user from auth.users")
        except Exception as e:
            print(f"   ❌ Error deleting from auth.users: {e}")
            print(f"   ⚠️  You may need to delete this manually from Supabase Dashboard")
            return False
        
        print("-" * 60)
        print("🎉 User deletion completed successfully!")
        print(f"✅ User {user_id} has been completely removed from the system")
        
        return True
        
    except Exception as e:
        print(f"❌ Unexpected error during deletion: {e}")
        return False

def main():
    """Main function"""
    if len(sys.argv) != 2:
        print("❌ Usage: python delete_user_complete.py <user_id>")
        print("\nExample:")
        print("python delete_user_complete.py 2a6a2422-1824-4d78-b2fb-906d8567be09")
        sys.exit(1)
    
    user_id = sys.argv[1]
    
    # Validate UUID format (basic check)
    if len(user_id) != 36 or user_id.count('-') != 4:
        print("❌ Invalid user ID format. Expected UUID format.")
        print("Example: 2a6a2422-1824-4d78-b2fb-906d8567be09")
        sys.exit(1)
    
    # Confirm deletion
    print("⚠️  WARNING: This will PERMANENTLY DELETE the user and all their data!")
    print(f"User ID: {user_id}")
    print("\nThis action cannot be undone!")
    
    confirm = input("\nType 'DELETE' to confirm: ")
    if confirm != 'DELETE':
        print("❌ Deletion cancelled.")
        sys.exit(0)
    
    # Proceed with deletion
    success = delete_user_completely(user_id)
    
    if success:
        print("\n✅ User deletion completed successfully!")
    else:
        print("\n❌ User deletion failed. Check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
