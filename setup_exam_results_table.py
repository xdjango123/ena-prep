#!/usr/bin/env python3
"""
Setup exam_results table in Supabase
"""

import requests
import json

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def create_table():
    """Create exam_results table"""
    
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json"
    }
    
    # SQL to create the table
    sql = """
    CREATE TABLE IF NOT EXISTS exam_results (
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
    """
    
    print("Creating exam_results table...")
    
    # Use the SQL execution endpoint
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    data = {"sql": sql}
    
    try:
        response = requests.post(url, headers=headers, json=data)
        if response.status_code == 200:
            print("✅ exam_results table created successfully")
        else:
            print(f"❌ Error creating table: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Exception creating table: {e}")

if __name__ == "__main__":
    create_table()
