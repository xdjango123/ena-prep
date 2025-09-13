#!/usr/bin/env python3
"""
Replace France-focused CG questions with Côte d'Ivoire questions
"""

import os
import sys
import json
import hashlib
from typing import List, Dict, Any
from supabase import create_client, Client
from openai import OpenAI

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

class CoteDIvoireQuestionGenerator:
    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        
        # Initialize OpenAI
        api_key = os.getenv("OPENAI_API_KEY", "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")
        self.client = OpenAI(api_key=api_key)

    def generate_cote_d_ivoire_questions(self, count: int) -> List[Dict[str, Any]]:
        """Generate CG questions about Côte d'Ivoire"""
        
        prompt = f"""Generate {count} Culture Générale questions about Côte d'Ivoire for ENA exam.

IMPORTANT: Follow the exam format exactly:
- Questions should be in French
- Each question must have exactly 3 answer options (A, B, C) - NOT 4
- Options should be short and consistent in length (single words or short phrases)
- Explanations should be in French
- Focus on Côte d'Ivoire: geography, history, culture, politics, economy, cities, regions, etc.

Topics to cover:
- Geography: cities, regions, rivers, climate, natural resources
- History: independence, presidents, important dates
- Culture: languages, traditions, arts, music
- Politics: current government, institutions, constitution
- Economy: main industries, agriculture, exports
- Demographics: population, ethnic groups, languages
- Current events: recent developments, achievements

Question format examples:
- "Quelle est la capitale de la Côte d'Ivoire ?" (A) Abidjan, B) Yamoussoukro, C) Bouaké)
- "En quelle année la Côte d'Ivoire a-t-elle obtenu son indépendance ?" (A) 1958, B) 1960, C) 1962)
- "Quel est le principal produit d'exportation de la Côte d'Ivoire ?" (A) Cacao, B) Pétrole, C) Diamants)

Format each question as JSON:
{{
  "question_text": "La question en français",
  "answer1": "Première option",
  "answer2": "Deuxième option", 
  "answer3": "Troisième option",
  "correct": "A",
  "explanation": "Explication détaillée en français de pourquoi cette réponse est correcte"
}}

Return only valid JSON array of questions, no other text."""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=4000
            )
            
            content = response.choices[0].message.content.strip()
            
            # Clean the response
            if content.startswith('```json'):
                content = content[7:]
            if content.endswith('```'):
                content = content[:-3]
            
            # Try to parse JSON with better error handling
            try:
                questions = json.loads(content)
            except json.JSONDecodeError as e:
                print(f"JSON parsing error: {e}")
                print(f"Content preview: {content[:200]}...")
                return []
            
            # Convert to database format
            formatted_questions = []
            for q in questions:
                formatted_q = {
                    "question_text": q["question_text"],
                    "answer1": q["answer1"],
                    "answer2": q["answer2"],
                    "answer3": q["answer3"],
                    "answer4": None,  # 3-option format
                    "correct": q["correct"],
                    "explanation": q["explanation"],
                    "category": "CG",
                    "sub_category": "Culture Générale",
                    "difficulty": "MED",  # Medium difficulty
                    "exam_type": "CS",
                    "test_type": "examen_blanc",
                    "ai_generated": True,
                    "question_pool": "examen_blanc",
                    "usage_count": 0,
                    "last_used": None
                }
                
                # Generate unique hash with timestamp to avoid duplicates
                import time
                hash_string = f"{q['question_text']}{q['answer1']}{q['answer2']}{q['answer3']}{q['correct']}{time.time()}"
                formatted_q["unique_hash"] = hashlib.md5(hash_string.encode()).hexdigest()
                
                formatted_questions.append(formatted_q)
            
            return formatted_questions
            
        except Exception as e:
            print(f"Error generating questions: {e}")
            return []

    def replace_france_questions(self):
        """Replace France questions with Côte d'Ivoire questions"""
        
        print("🔄 Starting replacement of France questions with Côte d'Ivoire questions...")
        
        # Get all France-related questions
        print("📊 Fetching France-related questions...")
        france_response = self.supabase.table('questions').select('*').eq('category', 'CG').eq('test_type', 'examen_blanc').ilike('question_text', '%france%').execute()
        
        france_questions = france_response.data
        print(f"Found {len(france_questions)} France-related questions")
        
        if not france_questions:
            print("No France questions found to replace")
            return
        
        # Generate new Côte d'Ivoire questions in batches
        print(f"🎯 Generating {len(france_questions)} Côte d'Ivoire questions in batches...")
        new_questions = []
        batch_size = 20  # Generate in smaller batches
        
        for i in range(0, len(france_questions), batch_size):
            batch_count = min(batch_size, len(france_questions) - i)
            print(f"  Generating batch {i//batch_size + 1}: {batch_count} questions...")
            
            batch_questions = self.generate_cote_d_ivoire_questions(batch_count)
            if batch_questions:
                new_questions.extend(batch_questions)
                print(f"  ✅ Generated {len(batch_questions)} questions")
            else:
                print(f"  ❌ Failed to generate batch {i//batch_size + 1}")
                break
        
        if not new_questions:
            print("Failed to generate new questions")
            return
        
        print(f"✅ Generated {len(new_questions)} new Côte d'Ivoire questions")
        
        # Show sample of new questions
        print("\n📝 Sample of new Côte d'Ivoire questions:")
        for i, q in enumerate(new_questions[:5]):
            print(f"{i+1}. {q['question_text']}")
            print(f"   A) {q['answer1']}")
            print(f"   B) {q['answer2']}")
            print(f"   C) {q['answer3']}")
            print(f"   Correct: {q['correct']}")
            print()
        
        # Ask for confirmation
        confirm = input(f"\n❓ Replace {len(france_questions)} France questions with {len(new_questions)} Côte d'Ivoire questions? (y/N): ")
        
        if confirm.lower() != 'y':
            print("❌ Operation cancelled")
            return
        
        # Delete France questions
        print("🗑️ Deleting France questions...")
        france_ids = [q['id'] for q in france_questions]
        
        for i in range(0, len(france_ids), 100):  # Process in batches of 100
            batch_ids = france_ids[i:i+100]
            delete_response = self.supabase.table('questions').delete().in_('id', batch_ids).execute()
            print(f"Deleted batch {i//100 + 1}: {len(batch_ids)} questions")
        
        print(f"✅ Deleted {len(france_questions)} France questions")
        
        # Insert new Côte d'Ivoire questions
        print("➕ Inserting new Côte d'Ivoire questions...")
        
        for i in range(0, len(new_questions), 100):  # Process in batches of 100
            batch_questions = new_questions[i:i+100]
            try:
                insert_response = self.supabase.table('questions').insert(batch_questions).execute()
                print(f"✅ Inserted batch {i//100 + 1}: {len(batch_questions)} questions")
            except Exception as e:
                print(f"❌ Error inserting batch {i//100 + 1}: {e}")
                # Try inserting one by one to identify problematic questions
                print("  Trying individual insertions...")
                for j, question in enumerate(batch_questions):
                    try:
                        self.supabase.table('questions').insert([question]).execute()
                        print(f"    ✅ Inserted question {j+1}")
                    except Exception as individual_error:
                        print(f"    ❌ Failed to insert question {j+1}: {individual_error}")
                        print(f"    Question: {question['question_text'][:50]}...")
        
        print(f"✅ Inserted {len(new_questions)} Côte d'Ivoire questions")
        
        # Verify replacement
        print("🔍 Verifying replacement...")
        verify_response = self.supabase.table('questions').select('*').eq('category', 'CG').eq('test_type', 'examen_blanc').ilike('question_text', '%france%').execute()
        remaining_france = len(verify_response.data)
        
        cote_d_ivoire_response = self.supabase.table('questions').select('*').eq('category', 'CG').eq('test_type', 'examen_blanc').ilike('question_text', '%côte%').execute()
        new_cote_d_ivoire = len(cote_d_ivoire_response.data)
        
        print(f"📊 Results:")
        print(f"  - Remaining France questions: {remaining_france}")
        print(f"  - New Côte d'Ivoire questions: {new_cote_d_ivoire}")
        
        if remaining_france == 0 and new_cote_d_ivoire > 0:
            print("🎉 Successfully replaced France questions with Côte d'Ivoire questions!")
        else:
            print("⚠️ Replacement may not be complete. Please check the results.")

def main():
    generator = CoteDIvoireQuestionGenerator()
    generator.replace_france_questions()

if __name__ == "__main__":
    main()
