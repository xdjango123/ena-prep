#!/usr/bin/env python3
"""
Test small batch generation to verify fixes
"""

import os
import sys
import json
import uuid
from supabase import create_client, Client
from openai import OpenAI

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

def test_small_batch():
    """Test generating just 2 questions to verify fixes"""
    
    # Initialize clients
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    os.environ["OPENAI_API_KEY"] = "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"
    openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    print("🧪 Testing small batch generation...")
    
    # Test ANG question generation
    prompt = """Generate 2 example English questions for CM exam format.

IMPORTANT: Follow the CM exam format exactly:
- Questions should be in English
- Each question must have exactly 3 answer options (A, B, C)
- Options should be short and consistent in length
- Explanations should be in French
- Focus on basic to intermediate English appropriate for French speakers

Format each question as JSON:
{
  "question_text": "The question text here",
  "answer1": "First option",
  "answer2": "Second option", 
  "answer3": "Third option",
  "correct": "A",
  "explanation": "Explication détaillée en français de pourquoi cette réponse est correcte"
}

Return only valid JSON array of questions, no other text, no markdown formatting."""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert ENA exam question generator. Generate high-quality questions in the exact JSON format requested. Follow the CM exam format with 3 options (A, B, C) and ensure questions are appropriate for French speakers. Return ONLY valid JSON array, no markdown, no extra text."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        content = response.choices[0].message.content.strip()
        print(f"Raw response: {content[:200]}...")
        
        # Clean up markdown formatting if present
        if content.startswith('```json'):
            content = content[7:]  # Remove ```json
        elif content.startswith('```'):
            content = content[3:]  # Remove ```
        if content.endswith('```'):
            content = content[:-3]  # Remove ```
        content = content.strip()
        
        # Additional cleanup for common issues
        if content.startswith('[') and content.endswith(']'):
            pass  # Good JSON array
        elif '[' in content and ']' in content:
            # Extract JSON array from text
            start = content.find('[')
            end = content.rfind(']') + 1
            content = content[start:end]
        
        print(f"Cleaned content: {content[:200]}...")
        
        # Try to parse JSON
        questions = json.loads(content)
        print(f"✅ Successfully parsed {len(questions)} questions")
        
        # Test saving one question
        if questions:
            question = questions[0]
            print(f"Testing save with question: {question['question_text'][:50]}...")
            
            question_data = {
                'id': str(uuid.uuid4()),
                'question_text': question['question_text'],
                'answer1': question['answer1'],
                'answer2': question['answer2'],
                'answer3': question['answer3'],
                'answer4': None,
                'correct': question['correct'],
                'explanation': question.get('explanation', ''),
                'category': 'ANG',
                'difficulty': 'MED',
                'test_type': 'examen_blanc',
                'exam_type': 'CS',
                'sub_category': 'English Language Skills',
                'passage_id': None,
                'ai_generated': True,
                'unique_hash': 'test-hash',
                'question_pool': 'CS_ANG_examen',
                'usage_count': 0,
                'last_used': None,
                'created_at': '2025-01-01T00:00:00Z',
                'updated_at': '2025-01-01T00:00:00Z'
            }
            
            # Try to insert
            response = supabase.table('questions').insert(question_data).execute()
            
            if response.data:
                print("✅ Successfully saved test question!")
                # Clean up test question
                test_id = question_data['id']
                supabase.table('questions').delete().eq('id', test_id).execute()
                print("✅ Cleaned up test question")
            else:
                print(f"❌ Failed to save: {response}")
        
        return True
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON parse error: {e}")
        print(f"Content: {content}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = test_small_batch()
    if success:
        print("\n🎉 Test passed! Ready to run full generation.")
    else:
        print("\n❌ Test failed. Need to fix issues first.")
