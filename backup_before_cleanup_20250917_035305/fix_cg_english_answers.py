#!/usr/bin/env python3
"""
Fix CG questions that have French question text but English answer options
"""

import os
from supabase import create_client, Client
from openai import OpenAI

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ohngxnhnbwnystzkqzwy.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE")

def is_english_text(text):
    """Detect if text is in English"""
    if not text or not text.strip():
        return False
    
    english_indicators = [
        'the', 'and', 'or', 'is', 'are', 'was', 'were', 'have', 'has', 'had',
        'will', 'would', 'could', 'should', 'this', 'that', 'these', 'those',
        'because', 'option', 'correct', 'incorrect', 'answer', 'question',
        'sentence', 'article', 'noun', 'verb', 'adjective', 'adverb',
        'grammar', 'usage', 'properly', 'correctly', 'incorrectly',
        'means', 'refers', 'indicates', 'suggests', 'implies', 'describes',
        'expression', 'idiom', 'phrase', 'word', 'term', 'definition',
        'which', 'what', 'where', 'when', 'why', 'how', 'who', 'whose',
        'identify', 'select', 'choose', 'following', 'correctly', 'uses',
        'some', 'any', 'all', 'none', 'both', 'either', 'neither',
        'a', 'an', 'one', 'two', 'three', 'first', 'second', 'third',
        'good', 'bad', 'big', 'small', 'long', 'short', 'high', 'low',
        'fast', 'slow', 'hot', 'cold', 'new', 'old', 'young', 'old'
    ]
    
    text_lower = text.lower().strip()
    english_word_count = sum(1 for word in english_indicators if word in text_lower)
    return english_word_count > 0

def is_french_text(text):
    """Detect if text is in French"""
    if not text or not text.strip():
        return False
    
    french_indicators = [
        'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'dans', 'sur',
        'sous', 'avec', 'sans', 'pour', 'par', 'vers', 'chez', 'entre',
        'est', 'sont', 'était', 'étaient', 'sera', 'seront', 'a', 'ont',
        'et', 'ou', 'mais', 'donc', 'car', 'parce', 'que', 'si', 'quand',
        'comme', 'tandis', 'bien', 'afin', 'sans', 'antonyme', 'synonyme',
        'féminin', 'masculin', 'pluriel', 'singulier', 'verbe', 'nom',
        'adjectif', 'adverbe', 'préposition', 'conjonction', 'pronom',
        'article', 'temps', 'mode', 'voix', 'actif', 'passif', 'indicatif',
        'subjonctif', 'conditionnel', 'infinitif', 'participe', 'gérondif',
        'correctement', 'incorrectement', 'bon', 'mauvais', 'vrai', 'faux',
        'juste', 'fausse', 'exact', 'inexact', 'précis', 'imprécis',
        'clair', 'obscur', 'quel', 'quelle', 'quels', 'quelles', 'qui',
        'que', 'quoi', 'où', 'quand', 'comment', 'pourquoi', 'combien'
    ]
    
    text_lower = text.lower().strip()
    french_word_count = sum(1 for word in french_indicators if word in text_lower)
    return french_word_count > 0

def translate_to_french(text, openai_client):
    """Translate English text to French using OpenAI"""
    try:
        prompt = f"""
        Traduis ce texte en français. Le texte doit être naturel et adapté à un examen de culture générale.
        Garde le même format et la même structure.
        
        Texte en anglais:
        {text}
        
        Texte en français:
        """
        
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=100,
            temperature=0.3
        )
        
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"❌ Error translating text: {e}")
        return text

def safe_get_text(obj, key, max_len=30):
    """Safely get text from object with None handling"""
    text = obj.get(key, '') or ''
    return text[:max_len] + '...' if len(text) > max_len else text

def fix_cg_english_answers():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    print("🔍 Finding CG questions with English answer options...")
    
    # Get CG questions
    cg_response = supabase.table('questions').select('*').eq('category', 'CG').execute()
    
    if not cg_response.data:
        print("❌ No CG questions found")
        return
    
    questions = cg_response.data
    print(f"📊 Found {len(questions)} CG questions")
    
    # Find questions with French text but English answers
    mixed_language_questions = []
    for q in questions:
        question_text = q.get('question_text', '')
        answer1 = q.get('answer1', '') or ''
        answer2 = q.get('answer2', '') or ''
        answer3 = q.get('answer3', '') or ''
        answer4 = q.get('answer4', '') or ''
        
        # Check if question is in French but answers are in English
        if (is_french_text(question_text) and 
            (is_english_text(answer1) or is_english_text(answer2) or 
             is_english_text(answer3) or is_english_text(answer4))):
            mixed_language_questions.append(q)
    
    print(f"🔍 Found {len(mixed_language_questions)} CG questions with mixed languages")
    
    if not mixed_language_questions:
        print("✅ No mixed language questions found")
        return
    
    # Show some examples
    print(f"\n📝 Examples of mixed language questions:")
    for i, q in enumerate(mixed_language_questions[:3]):
        print(f"  {i+1}. ID: {q.get('id')}")
        print(f"     Question: {safe_get_text(q, 'question_text', 60)}")
        print(f"     Answer1: {safe_get_text(q, 'answer1', 30)}")
        print(f"     Answer2: {safe_get_text(q, 'answer2', 30)}")
        print(f"     Answer3: {safe_get_text(q, 'answer3', 30)}")
        print(f"     Answer4: {safe_get_text(q, 'answer4', 30)}")
        print()
    
    # Fix the mixed language questions
    print(f"🔄 Translating English answers to French...")
    
    updated_count = 0
    for i, q in enumerate(mixed_language_questions):
        try:
            print(f"  Fixing {i+1}/{len(mixed_language_questions)}: {q.get('id')}")
            
            # Translate each answer option
            answer1 = q.get('answer1', '') or ''
            answer2 = q.get('answer2', '') or ''
            answer3 = q.get('answer3', '') or ''
            answer4 = q.get('answer4', '') or ''
            
            translated_answers = {}
            
            if is_english_text(answer1):
                translated_answers['answer1'] = translate_to_french(answer1, openai_client)
                print(f"    A: '{answer1}' → '{translated_answers['answer1']}'")
            
            if is_english_text(answer2):
                translated_answers['answer2'] = translate_to_french(answer2, openai_client)
                print(f"    B: '{answer2}' → '{translated_answers['answer2']}'")
            
            if is_english_text(answer3):
                translated_answers['answer3'] = translate_to_french(answer3, openai_client)
                print(f"    C: '{answer3}' → '{translated_answers['answer3']}'")
            
            if is_english_text(answer4):
                translated_answers['answer4'] = translate_to_french(answer4, openai_client)
                print(f"    D: '{answer4}' → '{translated_answers['answer4']}'")
            
            # Update the database
            if translated_answers:
                update_response = supabase.table('questions').update(translated_answers).eq('id', q.get('id')).execute()
                
                if update_response.data:
                    updated_count += 1
                    print(f"    ✅ Updated successfully")
                else:
                    print(f"    ❌ Failed to update")
            else:
                print(f"    ⚠️  No English answers found to translate")
                
        except Exception as e:
            print(f"    ❌ Error updating question {q.get('id')}: {e}")
    
    print(f"\n🎉 Successfully fixed {updated_count} out of {len(mixed_language_questions)} questions")
    print("All CG questions now have consistent French language!")

if __name__ == "__main__":
    fix_cg_english_answers()
