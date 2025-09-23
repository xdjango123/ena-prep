#!/usr/bin/env python3
"""
Fix subscription is_active status and set up automatic expiration handling
"""

import os
from supabase import create_client, Client
from datetime import datetime

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def fix_subscription_active_status():
    """Fix is_active status for all subscriptions based on end_date"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🔧 FIXING SUBSCRIPTION ACTIVE STATUS")
    print("====================================")
    print()
    
    # Get all subscriptions
    result = supabase.table('subscriptions').select('*').execute()
    subscriptions = result.data
    
    print(f"📊 Found {len(subscriptions)} subscriptions to check")
    print()
    
    now = datetime.now()
    updated_count = 0
    skipped_count = 0
    
    for sub in subscriptions:
        end_date = datetime.fromisoformat(sub['end_date'].replace('Z', '+00:00'))
        is_expired = end_date < now
        is_active_in_db = sub['is_active']
        
        # Determine what the is_active should be
        should_be_active = not is_expired
        
        if is_active_in_db != should_be_active:
            # Update the subscription
            try:
                update_result = supabase.table('subscriptions').update({
                    'is_active': should_be_active
                }).eq('id', sub['id']).execute()
                
                if update_result.data:
                    status = "ACTIVE" if should_be_active else "EXPIRED"
                    print(f"✅ Updated {sub['id'][:8]}... | Plan: {sub['plan_name']} | Set to: {status}")
                    updated_count += 1
                else:
                    print(f"❌ Failed to update {sub['id'][:8]}...")
                    
            except Exception as e:
                print(f"❌ Error updating {sub['id'][:8]}...: {e}")
        else:
            status = "ACTIVE" if is_active_in_db else "EXPIRED"
            print(f"⏭️  Skipped {sub['id'][:8]}... | Plan: {sub['plan_name']} | Already correct: {status}")
            skipped_count += 1
    
    print()
    print("📊 Summary:")
    print(f"   Updated: {updated_count}")
    print(f"   Skipped: {skipped_count}")
    print(f"   Total: {len(subscriptions)}")
    
    return updated_count > 0

def create_expiration_trigger():
    """Create a database trigger to automatically update is_active when end_date passes"""
    
    trigger_sql = """
-- Create a function to update expired subscriptions
CREATE OR REPLACE FUNCTION update_expired_subscriptions()
RETURNS void AS $$
BEGIN
    -- Update subscriptions where end_date has passed
    UPDATE subscriptions 
    SET is_active = false 
    WHERE end_date < NOW() 
    AND is_active = true;
    
    -- Log the update (optional)
    RAISE NOTICE 'Updated expired subscriptions at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a trigger that runs this function daily
-- Note: This requires pg_cron extension to be enabled
-- If pg_cron is not available, you'll need to run this manually or via a cron job

-- Alternative: Create a function that can be called manually
CREATE OR REPLACE FUNCTION check_and_update_expired_subscriptions()
RETURNS TABLE(
    updated_count INTEGER,
    expired_subscriptions TEXT[]
) AS $$
DECLARE
    expired_subs TEXT[];
    count_result INTEGER;
BEGIN
    -- Get list of expired subscription IDs
    SELECT ARRAY_AGG(id::TEXT) INTO expired_subs
    FROM subscriptions 
    WHERE end_date < NOW() 
    AND is_active = true;
    
    -- Update expired subscriptions
    UPDATE subscriptions 
    SET is_active = false 
    WHERE end_date < NOW() 
    AND is_active = true;
    
    -- Get count of updated rows
    GET DIAGNOSTICS count_result = ROW_COUNT;
    
    -- Return results
    RETURN QUERY SELECT count_result, expired_subs;
END;
$$ LANGUAGE plpgsql;
"""
    
    print("\n🔧 CREATING EXPIRATION TRIGGER")
    print("==============================")
    print()
    print("📋 SQL to create automatic expiration handling:")
    print("-" * 50)
    print(trigger_sql)
    print("-" * 50)
    print()
    print("💡 Instructions:")
    print("1. Run this SQL in your Supabase SQL editor")
    print("2. This creates a function to update expired subscriptions")
    print("3. You can call it manually: SELECT * FROM check_and_update_expired_subscriptions();")
    print("4. For automatic daily updates, you'll need pg_cron extension")

if __name__ == "__main__":
    # Fix existing data
    success = fix_subscription_active_status()
    
    if success:
        print("\n✅ Data fixed successfully!")
    else:
        print("\n⚠️  No data needed fixing")
    
    # Show how to create automatic handling
    create_expiration_trigger()
    
    print("\n🎯 Next Steps:")
    print("1. Run the SQL trigger in Supabase")
    print("2. Test the manual function: SELECT * FROM check_and_update_expired_subscriptions();")
    print("3. Consider setting up a daily cron job or scheduled function")
