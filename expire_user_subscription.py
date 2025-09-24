#!/usr/bin/env python3
"""
Script to expire a specific user's subscription by setting end_date to past
This is more realistic than just deactivating
"""

import os
import sys
from datetime import datetime, timedelta
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def expire_user_subscription(user_id: str):
    """Expire user subscription by setting end_date to past"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print(f"🔍 Expiring subscriptions for user: {user_id}")
    
    try:
        # Set end_date to 7 days ago
        expired_date = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
        
        print(f"📅 Setting end_date to: {expired_date}")
        
        # Update all subscriptions for this user
        update_response = supabase.table('subscriptions').update({
            'end_date': expired_date,
            'is_active': False  # Also deactivate
        }).eq('user_id', user_id).execute()
        
        if update_response.data:
            print(f"✅ Successfully expired {len(update_response.data)} subscription(s)")
            
            # Verify the changes
            verify_response = supabase.table('subscriptions').select('*').eq('user_id', user_id).execute()
            
            print("📊 Updated subscription status:")
            for sub in verify_response.data:
                print(f"  - Plan: {sub['plan_name']}, Active: {sub['is_active']}, End Date: {sub['end_date']}")
            
            return True
        else:
            print("❌ Failed to expire subscriptions")
            return False
            
    except Exception as e:
        print(f"❌ Error expiring subscriptions: {e}")
        return False

if __name__ == "__main__":
    user_id = "2a6a2422-1824-4d78-b2fb-906d8567be09"
    expire_user_subscription(user_id)
