#!/usr/bin/env python3
"""
Check if user_attempts table exists
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def check_user_attempts_table():
    """Check if user_attempts table exists"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🔍 Checking user_attempts table...")
    
    try:
        # Try to select from user_attempts table
        response = supabase.table('user_attempts').select('*').limit(1).execute()
        print("✅ user_attempts table exists")
        print(f"📊 Records: {len(response.data)}")
        
        if response.data:
            print("Sample record:")
            for key, value in response.data[0].items():
                print(f"  - {key}: {value}")
        
        return True
        
    except Exception as e:
        print(f"❌ user_attempts table does not exist: {e}")
        return False

if __name__ == "__main__":
    check_user_attempts_table()
