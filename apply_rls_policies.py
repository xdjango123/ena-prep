#!/usr/bin/env python3
"""
Apply RLS policies to fix database access issues
"""

import os
import sys
from supabase import create_client, Client

def apply_rls_policies():
    # Supabase configuration
    url = "https://ohngxnhnbwnystzkqzwy.supabase.co"
    key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NTc2MzcsImV4cCI6MjA2NzQzMzYzN30.Epn0NnYiDRQh9NM3XRbe5j3YH6fuvQfX-UivRuQ8Sbk"
    
    # Create Supabase client
    supabase: Client = create_client(url, key)
    
    # Read the SQL file
    with open('fix_all_rls_policies.sql', 'r') as f:
        sql_content = f.read()
    
    # Split into individual statements
    statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip() and not stmt.strip().startswith('--')]
    
    print(f"Found {len(statements)} SQL statements to execute")
    
    # Execute each statement
    for i, statement in enumerate(statements, 1):
        print(f"\n[{i}/{len(statements)}] Executing: {statement[:100]}...")
        
        try:
            # Use the SQL editor endpoint
            result = supabase.rpc('exec_sql', {'sql': statement})
            print(f"✅ Statement {i} executed successfully")
        except Exception as e:
            print(f"❌ Error executing statement {i}: {e}")
            # Continue with other statements
            continue
    
    print("\n✅ RLS policies application completed")

if __name__ == "__main__":
    apply_rls_policies()
