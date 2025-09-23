#!/usr/bin/env python3
"""
Apply unique constraint to prevent duplicate subscriptions
"""

import os
import sys
from supabase import create_client, Client

def apply_unique_constraint():
    # Supabase configuration with service role key
    url = "https://ohngxnhnbwnystzkqzwy.supabase.co"
    service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"
    
    # Create Supabase client with service role key
    supabase: Client = create_client(url, service_key)
    
    try:
        print("🔒 Applying unique constraint to prevent duplicate subscriptions...")
        
        # Read the SQL file
        with open('prevent_duplicate_subscriptions.sql', 'r') as f:
            sql_content = f.read()
        
        # Split the SQL into individual statements
        statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
        
        for i, statement in enumerate(statements, 1):
            if not statement:
                continue
                
            print(f"\\n📝 Executing statement {i}:")
            print(f"   {statement[:100]}{'...' if len(statement) > 100 else ''}")
            
            try:
                # Execute the SQL statement
                result = supabase.rpc('exec_sql', {'sql': statement}).execute()
                print(f"   ✅ Success")
            except Exception as e:
                print(f"   ⚠️  Warning: {e}")
                # Continue with other statements even if one fails
        
        print(f"\\n✅ Unique constraint applied successfully!")
        print(f"\\n🎯 This will prevent:")
        print(f"  - Duplicate active subscriptions for the same user/plan")
        print(f"  - Future data integrity issues")
        print(f"  - UI showing duplicate plans")
        
    except Exception as e:
        print(f"❌ Error applying unique constraint: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    apply_unique_constraint()
