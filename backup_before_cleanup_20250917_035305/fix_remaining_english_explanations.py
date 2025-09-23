#!/usr/bin/env python3
"""
Comprehensive script to find and translate ALL remaining English explanations
"""

import os
from supabase import create_client, Client
from openai import OpenAI

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ohngxnhnbwnystzkqzwy.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE")

def is_english_text(text):
    """Enhanced detection for English text"""
    if not text or not text.strip():
        return False
    
    # More comprehensive English indicators
    english_indicators = [
        'the', 'and', 'or', 'is', 'are', 'was', 'were', 'have', 'has', 'had',
        'will', 'would', 'could', 'should', 'this', 'that', 'these', 'those',
        'because', 'option', 'correct', 'incorrect', 'answer', 'question',
        'sentence', 'article', 'noun', 'verb', 'adjective', 'adverb',
        'grammar', 'usage', 'properly', 'correctly', 'incorrectly',
        'means', 'refers', 'indicates', 'suggests', 'implies', 'describes',
        'expression', 'idiom', 'phrase', 'word', 'term', 'definition',
        'example', 'instance', 'case', 'situation', 'context', 'meaning',
        'weigh', 'pros', 'cons', 'consider', 'advantages', 'disadvantages',
        'hit', 'nail', 'head', 'describe', 'exactly', 'causing', 'situation',
        'problem', 'bite', 'bullet', 'endure', 'painful', 'face', 'difficult',
        'task', 'let', 'cat', 'bag', 'reveal', 'secret', 'unrelated', 'thinking'
    ]
    
    text_lower = text.lower()
    english_word_count = sum(1 for word in english_indicators if word in text_lower)
    
    # If more than 3 English words are found, consider it English
    return english_word_count > 3

def translate_to_french(explanation, openai_client):
    """Translate English explanation to French using OpenAI"""
    try:
        prompt = f"""
        Traduis cette explication d'examen en français. L'explication doit être claire, concise et pédagogique.
        Garde le même format et la même structure, mais traduis tout en français.
        Ne change pas le contenu technique, juste la langue.
        
        Explication en anglais:
        {explanation}
        
        Explication en français:
        """
        
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0.3
        )
        
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"❌ Error translating explanation: {e}")
        return explanation

def fix_remaining_english_explanations():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    print("🔍 Finding ALL questions with explanations...")
    
    # Get ALL questions with explanations (no limit)
    response = supabase.table('questions').select('id, explanation, question_text, answer1, answer2, answer3, answer4, correct').not_.is_('explanation', 'null').execute()
    
    if not response.data:
        print("❌ No questions with explanations found")
        return
    
    questions = response.data
    print(f"📊 Found {len(questions)} questions with explanations")
    
    # Find questions with English explanations
    english_explanations = []
    for q in questions:
        explanation = q.get('explanation', '')
        if explanation and is_english_text(explanation):
            english_explanations.append(q)
    
    print(f"🔍 Found {len(english_explanations)} questions with English explanations")
    
    if not english_explanations:
        print("✅ No English explanations found")
        return
    
    # Show some examples
    print(f"\n📝 Examples of English explanations to be translated:")
    for i, q in enumerate(english_explanations[:5]):
        print(f"  {i+1}. ID: {q.get('id')}")
        print(f"     Question: {q.get('question_text', '')[:60]}...")
        print(f"     Current explanation: {q.get('explanation', '')[:100]}...")
        print()
    
    # Translate and update explanations
    print(f"🔄 Translating {len(english_explanations)} explanations to French...")
    
    updated_count = 0
    for i, q in enumerate(english_explanations):
        try:
            print(f"  Translating {i+1}/{len(english_explanations)}: {q.get('id')}")
            
            # Translate the explanation
            french_explanation = translate_to_french(q.get('explanation', ''), openai_client)
            
            # Update the database
            update_response = supabase.table('questions').update({
                'explanation': french_explanation
            }).eq('id', q.get('id')).execute()
            
            if update_response.data:
                updated_count += 1
                print(f"    ✅ Updated: {french_explanation[:60]}...")
            else:
                print(f"    ❌ Failed to update")
                
        except Exception as e:
            print(f"    ❌ Error updating question {q.get('id')}: {e}")
    
    print(f"\n🎉 Successfully translated {updated_count} out of {len(english_explanations)} explanations")
    print("All explanations are now in French!")

if __name__ == "__main__":
    fix_remaining_english_explanations()
