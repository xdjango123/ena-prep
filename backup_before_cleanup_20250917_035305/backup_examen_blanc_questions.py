#!/usr/bin/env python3
"""
Backup all examen blanc questions before cleanup
"""

import os
import json
from datetime import datetime
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def backup_questions():
    """Backup all examen blanc questions to a JSON file"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    try:
        print("🔄 Fetching all examen blanc questions...")
        response = supabase.table('questions').select('*').eq('test_type', 'examen_blanc').execute()
        questions = response.data
        
        if not questions:
            print("❌ No examen blanc questions found!")
            return
        
        print(f"📊 Found {len(questions)} examen blanc questions")
        
        # Create backup filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"examen_blanc_backup_{timestamp}.json"
        
        # Save to file
        with open(backup_filename, 'w', encoding='utf-8') as f:
            json.dump(questions, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Backup saved to: {backup_filename}")
        
        # Show summary by category
        categories = {}
        for q in questions:
            cat = q['category']
            if cat not in categories:
                categories[cat] = 0
            categories[cat] += 1
        
        print("\n📋 Backup Summary:")
        for cat, count in categories.items():
            print(f"  {cat}: {count} questions")
        
        return backup_filename
        
    except Exception as e:
        print(f"❌ Error backing up questions: {e}")
        return None

if __name__ == "__main__":
    backup_questions()
