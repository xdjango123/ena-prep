#!/usr/bin/env python3
"""
Test exam results functionality
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def test_exam_results():
    """Test exam results functionality"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("Testing exam results functionality...")
    
    # Test if table exists by trying to query it
    try:
        response = supabase.table('exam_results').select('*').limit(1).execute()
        print("✅ exam_results table exists")
        print(f"Current records: {len(response.data)}")
        return True
    except Exception as e:
        print(f"❌ exam_results table does not exist: {e}")
        return False

def create_test_result():
    """Create a test exam result"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("\nCreating test exam result...")
    
    test_data = {
        'user_id': 'test-user-123',
        'exam_type': 'CS',
        'exam_number': 1,
        'score': 85,
        'total_questions': 60,
        'correct_answers': 51,
        'time_spent': 7200,  # 2 hours
        'completed_at': '2025-01-12T12:00:00Z'
    }
    
    try:
        response = supabase.table('exam_results').insert(test_data).execute()
        print("✅ Test result created successfully")
        print(f"Response: {response.data}")
        return True
    except Exception as e:
        print(f"❌ Error creating test result: {e}")
        return False

if __name__ == "__main__":
    table_exists = test_exam_results()
    
    if table_exists:
        create_test_result()
    else:
        print("\n⚠️  Table does not exist. You need to create it manually in Supabase dashboard.")
        print("SQL to create table:")
        print("""
CREATE TABLE exam_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    exam_type VARCHAR(10) NOT NULL CHECK (exam_type IN ('CM', 'CMS', 'CS')),
    exam_number INTEGER NOT NULL,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    time_spent INTEGER NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, exam_type, exam_number)
);
        """)
