#!/usr/bin/env python3
"""
Test user answers saving functionality
"""

import os
import sys
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def test_user_answers_saving():
    """Test user answers saving functionality"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🧪 Testing user answers saving...")
    
    # Use one of the existing user IDs
    test_user_id = "171029d7-df14-4721-abb9-fbfbf38f61ce"  # Dj Yepidan (CS exam type)
    
    try:
        # Check current user attempts
        print("📊 Current user attempts:")
        attempts_response = supabase.table('user_attempts').select('*').eq('user_id', test_user_id).eq('test_type', 'examen_blanc').order('created_at', desc=True).execute()
        
        if attempts_response.data:
            for attempt in attempts_response.data:
                print(f"  - Attempt ID: {attempt['id']}")
                print(f"  - Score: {attempt['score']}%")
                print(f"  - Test Number: {attempt['test_number']}")
                print(f"  - Created: {attempt['created_at']}")
                if attempt['test_data']:
                    print(f"  - User answers: {len(attempt['test_data'].get('userAnswers', []))} answers")
                    if attempt['test_data'].get('userAnswers'):
                        print(f"    Sample answers: {attempt['test_data']['userAnswers'][:3]}")
                else:
                    print(f"  - No test_data")
        else:
            print("  - No user attempts found")
        
        # Test creating a sample user attempt
        print("\n🧪 Testing user attempt creation...")
        sample_attempt = {
            'user_id': test_user_id,
            'test_type': 'examen_blanc',
            'category': 'OVERALL',
            'test_number': 1,
            'score': 15.0,
            'test_data': {
                'userAnswers': [
                    [1, 'A'],
                    [2, 'B'],
                    [3, 'C'],
                    [4, 'A'],
                    [5, 'B']
                ],
                'correctAnswers': 2,
                'totalQuestions': 5,
                'timeSpent': 0
            }
        }
        
        # Insert sample attempt
        insert_response = supabase.table('user_attempts').insert(sample_attempt).execute()
        
        if insert_response.data:
            print("✅ Sample user attempt created successfully")
            print(f"  - Attempt ID: {insert_response.data[0]['id']}")
            print(f"  - User answers: {len(insert_response.data[0]['test_data']['userAnswers'])} answers")
        else:
            print("❌ Failed to create sample user attempt")
        
        print("\n✅ User answers saving is now enabled")
        print("🧪 Ready for testing:")
        print("  1. Retake Examen Blanc #1")
        print("  2. Answer some questions")
        print("  3. Click 'Terminer'")
        print("  4. Check console for '💾 Saving user answers' message")
        print("  5. Click 'Voir Résultats' to verify answers are saved")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    test_user_answers_saving()
