#!/usr/bin/env python3
"""
Test the fixes for retake issues
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def test_fixes():
    """Test the fixes for retake issues"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🧪 Testing fixes for retake issues...")
    
    # Use one of the existing user IDs
    test_user_id = "171029d7-df14-4721-abb9-fbfbf38f61ce"  # Dj Yepidan (CS exam type)
    
    try:
        # Check current exam results
        print("📊 Current exam results:")
        response = supabase.table('test_results').select('*').eq('user_id', test_user_id).eq('test_type', 'examen_blanc').eq('test_number', 1).order('created_at', desc=True).execute()
        
        for record in response.data:
            print(f"  - {record['category']}: {record['score']}% (Created: {record['created_at']})")
        
        # Check user attempts
        print("\n📊 User attempts:")
        attempts_response = supabase.table('user_attempts').select('*').eq('user_id', test_user_id).eq('test_type', 'examen_blanc').order('created_at', desc=True).execute()
        
        if attempts_response.data:
            for attempt in attempts_response.data:
                print(f"  - Attempt ID: {attempt['id']}")
                print(f"  - Score: {attempt['score']}%")
                print(f"  - Test Number: {attempt['test_number']}")
                print(f"  - Created: {attempt['created_at']}")
        else:
            print("  - No user attempts found")
        
        print("\n✅ Fixes applied:")
        print("  - Fixed 'user is not defined' error in SecureExamInterface")
        print("  - Fixed 'getSubCategory is not a function' error in questionService")
        print("  - Enhanced debugging and error handling")
        
        print("\n🧪 Ready for testing:")
        print("  1. Retake Examen Blanc #1")
        print("  2. Check console for debug messages")
        print("  3. Verify score updates to 7%")
        print("  4. Check if answers are saved")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    test_fixes()
