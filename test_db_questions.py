import os
import sys
sys.path.append('src')

# Test if we can import the supabase client
try:
    from lib.supabase import supabase
    print("✅ Successfully imported supabase client")
    
    # Test a simple query
    result = supabase.table('questions').select('*').limit(5).execute()
    print(f"✅ Database query successful: {len(result.data)} questions found")
    
    if result.data:
        print("Sample question structure:")
        print(result.data[0])
    else:
        print("❌ No questions found in database")
        
except Exception as e:
    print(f"❌ Error: {e}")
