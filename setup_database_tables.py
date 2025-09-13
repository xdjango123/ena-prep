#!/usr/bin/env python3
"""
Setup database tables for examens blancs
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def setup_tables():
    """Create the necessary database tables"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🔧 Setting up database tables...")
    
    # SQL commands to create tables
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
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_examens_blancs_exam_type ON examens_blancs(exam_type);
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_examens_blancs_exam_number ON examens_blancs(exam_number);
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_examen_blanc_questions_examen_id ON examen_blanc_questions(examen_blanc_id);
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_examen_blanc_questions_question_id ON examen_blanc_questions(question_id);
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_examen_blanc_questions_order ON examen_blanc_questions(examen_blanc_id, question_order);
        """
    ]
    
    for i, sql in enumerate(sql_commands, 1):
        try:
            print(f"  {i}. Executing SQL command...")
            result = supabase.rpc('exec_sql', {'sql': sql}).execute()
            print(f"     ✅ Success")
        except Exception as e:
            print(f"     ❌ Error: {e}")
            # Try alternative method
            try:
                result = supabase.postgrest.rpc('exec_sql', {'sql': sql}).execute()
                print(f"     ✅ Success (alternative method)")
            except Exception as e2:
                print(f"     ❌ Alternative method also failed: {e2}")
    
    print("✅ Database setup complete!")

if __name__ == "__main__":
    setup_tables()
