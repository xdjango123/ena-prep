#!/usr/bin/env python3
"""
Create database tables using Supabase REST API
"""

import requests
import json

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def create_tables():
    """Create tables using SQL execution"""
    
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json"
    }
    
    # SQL commands
    sql_commands = [
        """
        CREATE TABLE IF NOT EXISTS examens_blancs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            exam_number INTEGER NOT NULL,
            exam_type VARCHAR(10) NOT NULL CHECK (exam_type IN ('CM', 'CMS', 'CS')),
            total_questions INTEGER NOT NULL DEFAULT 60,
            questions_per_subject INTEGER NOT NULL DEFAULT 20,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(exam_number, exam_type)
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS examen_blanc_questions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            examen_blanc_id UUID NOT NULL REFERENCES examens_blancs(id) ON DELETE CASCADE,
            question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
            question_order INTEGER NOT NULL,
            subject_order INTEGER NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(examen_blanc_id, question_id),
            UNIQUE(examen_blanc_id, question_order)
        );
        """
    ]
    
    for i, sql in enumerate(sql_commands, 1):
        print(f"Creating table {i}...")
        
        # Use the SQL execution endpoint
        url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
        data = {"sql": sql}
        
        try:
            response = requests.post(url, headers=headers, json=data)
            if response.status_code == 200:
                print(f"  ✅ Table {i} created successfully")
            else:
                print(f"  ❌ Error creating table {i}: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"  ❌ Exception creating table {i}: {e}")

if __name__ == "__main__":
    create_tables()
