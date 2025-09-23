#!/usr/bin/env python3
"""
Test question filtering by exam type to verify subject pages work correctly
"""

import os
import sys
from supabase import create_client, Client

def test_question_filtering():
    # Supabase configuration with service role key
    url = "https://ohngxnhnbwnystzkqzwy.supabase.co"
    service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"
    
    # Create Supabase client with service role key
    supabase: Client = create_client(url, service_key)
    
    try:
        print("🔍 Testing question filtering by exam type...")
        
        # Test questions for each subject and exam type
        subjects = ['ANG', 'CG', 'LOG']
        exam_types = ['CM', 'CS', 'CMS']
        
        for subject in subjects:
            print(f"\n📚 Testing {subject} questions:")
            
            for exam_type in exam_types:
                # Get questions for this subject and exam type
                questions_response = supabase.table('questions').select('id, category, exam_type, test_type').eq('category', subject).eq('exam_type', exam_type).limit(5).execute()
                
                if questions_response.data:
                    print(f"  {exam_type}: {len(questions_response.data)} questions found")
                    # Show first question as example
                    first_q = questions_response.data[0]
                    print(f"    Example: ID={first_q['id'][:8]}..., Test Type={first_q['test_type']}")
                else:
                    print(f"  {exam_type}: No questions found")
        
        # Test the getQuestionsBySubject equivalent logic
        print(f"\n🧪 Testing getQuestionsBySubject equivalent logic:")
        
        # Simulate the logic from getQuestionsBySubject function
        def test_get_questions_by_subject(subject_key: str, exam_type: str, test_number: int = None):
            # Map subject keys to database categories
            subject_mapping = {
                'english': 'ANG',
                'culture-generale': 'CG', 
                'logique': 'LOG'
            }
            
            category = subject_mapping.get(subject_key, subject_key.upper())
            
            # Build query
            query = supabase.table('questions').select('*').eq('category', category).eq('exam_type', exam_type)
            
            if test_number:
                query = query.eq('test_number', test_number)
            
            result = query.limit(10).execute()
            return result.data
        
        # Test each subject
        test_subjects = [
            ('english', 'CM'),
            ('english', 'CS'),
            ('culture-generale', 'CM'),
            ('culture-generale', 'CS'),
            ('logique', 'CM'),
            ('logique', 'CS')
        ]
        
        for subject_key, exam_type in test_subjects:
            questions = test_get_questions_by_subject(subject_key, exam_type)
            print(f"  {subject_key} ({exam_type}): {len(questions)} questions")
            
            if questions:
                # Show question details
                q = questions[0]
                print(f"    Sample: ID={q['id'][:8]}..., Category={q['category']}, Exam Type={q['exam_type']}")
                print(f"    Test Type: {q.get('test_type', 'N/A')}")
        
        print("\n✅ Question filtering test completed successfully!")
        
    except Exception as e:
        print(f"❌ Error testing question filtering: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_question_filtering()
