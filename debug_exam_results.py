#!/usr/bin/env python3
"""
Debug exam results functionality
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def debug_exam_results():
    """Debug exam results in test_results table"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🔍 Debugging exam results in test_results table...")
    
    try:
        # Check all records in test_results
        response = supabase.table('test_results').select('*').execute()
        print(f"📊 Total records in test_results: {len(response.data)}")
        
        if response.data:
            print("\n📋 All records:")
            for i, record in enumerate(response.data):
                print(f"  {i+1}. {record}")
        
        # Check for examen_blanc records specifically
        examen_blanc_response = supabase.table('test_results').select('*').eq('test_type', 'examen_blanc').execute()
        print(f"\n🎯 Examen blanc records: {len(examen_blanc_response.data)}")
        
        if examen_blanc_response.data:
            print("\n📋 Examen blanc records:")
            for i, record in enumerate(examen_blanc_response.data):
                print(f"  {i+1}. {record}")
        
        # Check for overall scores (category = null)
        overall_response = supabase.table('test_results').select('*').eq('test_type', 'examen_blanc').eq('category', None).execute()
        print(f"\n🏆 Overall scores (category=null): {len(overall_response.data)}")
        
        if overall_response.data:
            print("\n📋 Overall scores:")
            for i, record in enumerate(overall_response.data):
                print(f"  {i+1}. {record}")
        
        # Check for subject scores
        subject_response = supabase.table('test_results').select('*').eq('test_type', 'examen_blanc').neq('category', None).execute()
        print(f"\n📚 Subject scores: {len(subject_response.data)}")
        
        if subject_response.data:
            print("\n📋 Subject scores:")
            for i, record in enumerate(subject_response.data):
                print(f"  {i+1}. {record}")
        
        # Check if there are any users in the auth.users table
        try:
            users_response = supabase.table('auth.users').select('id').execute()
            print(f"\n👥 Users in auth.users: {len(users_response.data)}")
            if users_response.data:
                print("User IDs:", [user['id'] for user in users_response.data[:5]])  # Show first 5
        except Exception as e:
            print(f"❌ Could not access auth.users: {e}")
        
        # Check profiles table
        try:
            profiles_response = supabase.table('profiles').select('*').execute()
            print(f"\n👤 Profiles: {len(profiles_response.data)}")
            if profiles_response.data:
                for profile in profiles_response.data[:3]:  # Show first 3
                    print(f"  - {profile}")
        except Exception as e:
            print(f"❌ Could not access profiles: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    debug_exam_results()
