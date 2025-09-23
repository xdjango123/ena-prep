#!/usr/bin/env python3
"""
Delete all examen blanc questions to start fresh
"""

import os
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def delete_questions():
    """Delete all examen blanc questions"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    try:
        print("🔄 Fetching examen blanc questions to delete...")
        response = supabase.table('questions').select('id').eq('test_type', 'examen_blanc').execute()
        questions = response.data
        
        if not questions:
            print("❌ No examen blanc questions found!")
            return
        
        print(f"📊 Found {len(questions)} examen blanc questions to delete")
        
        # Confirm deletion
        confirm = input(f"⚠️  Are you sure you want to delete {len(questions)} examen blanc questions? (yes/no): ")
        if confirm.lower() != 'yes':
            print("❌ Deletion cancelled")
            return
        
        # Delete questions
        print("🗑️  Deleting questions...")
        delete_response = supabase.table('questions').delete().eq('test_type', 'examen_blanc').execute()
        
        print(f"✅ Deleted {len(questions)} examen blanc questions")
        
        # Verify deletion
        verify_response = supabase.table('questions').select('id').eq('test_type', 'examen_blanc').execute()
        remaining = len(verify_response.data) if verify_response.data else 0
        
        if remaining == 0:
            print("✅ All examen blanc questions successfully deleted")
        else:
            print(f"⚠️  {remaining} examen blanc questions still remain")
        
    except Exception as e:
        print(f"❌ Error deleting questions: {e}")

if __name__ == "__main__":
    delete_questions()
