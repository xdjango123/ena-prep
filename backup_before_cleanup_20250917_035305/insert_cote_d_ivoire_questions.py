#!/usr/bin/env python3
"""
Insert Côte d'Ivoire questions to replace deleted France questions
"""

import os
import json
import hashlib
import time
from typing import List, Dict, Any
from supabase import create_client, Client
from openai import OpenAI

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

class CoteDIvoireInserter:
    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        
        # Initialize OpenAI
        api_key = "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"
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
                hash_string = f"{q['question_text']}{q['answer1']}{q['answer2']}{q['answer3']}{q['correct']}{time.time()}"
                formatted_q["unique_hash"] = hashlib.md5(hash_string.encode()).hexdigest()
                
                formatted_questions.append(formatted_q)
            
            return formatted_questions
            
        except Exception as e:
            print(f"Error generating questions: {e}")
            return []

    def insert_questions(self, count: int = 92):
        """Insert Côte d'Ivoire questions"""
        
        print(f"🎯 Generating {count} Côte d'Ivoire questions...")
        
        # Generate questions in smaller batches
        all_questions = []
        batch_size = 20
        
        for i in range(0, count, batch_size):
            current_batch_size = min(batch_size, count - i)
            print(f"  Generating batch {i//batch_size + 1}: {current_batch_size} questions...")
            
            batch_questions = self.generate_cote_d_ivoire_questions(current_batch_size)
            if batch_questions:
                all_questions.extend(batch_questions)
                print(f"  ✅ Generated {len(batch_questions)} questions")
            else:
                print(f"  ❌ Failed to generate batch {i//batch_size + 1}")
                break
        
        if not all_questions:
            print("❌ No questions generated")
            return
        
        print(f"\n📝 Sample of generated questions:")
        for i, q in enumerate(all_questions[:5]):
            print(f"{i+1}. {q['question_text']}")
            print(f"   A) {q['answer1']}")
            print(f"   B) {q['answer2']}")
            print(f"   C) {q['answer3']}")
            print(f"   Correct: {q['correct']}")
            print()
        
        # Insert questions
        print(f"➕ Inserting {len(all_questions)} Côte d'Ivoire questions...")
        
        for i in range(0, len(all_questions), 50):  # Process in batches of 50
            batch_questions = all_questions[i:i+50]
            try:
                insert_response = self.supabase.table('questions').insert(batch_questions).execute()
                print(f"✅ Inserted batch {i//50 + 1}: {len(batch_questions)} questions")
            except Exception as e:
                print(f"❌ Error inserting batch {i//50 + 1}: {e}")
                # Try inserting one by one
                print("  Trying individual insertions...")
                for j, question in enumerate(batch_questions):
                    try:
                        self.supabase.table('questions').insert([question]).execute()
                        print(f"    ✅ Inserted question {j+1}")
                    except Exception as individual_error:
                        print(f"    ❌ Failed to insert question {j+1}: {individual_error}")
        
        # Verify insertion
        print("\n🔍 Verifying insertion...")
        verify_response = self.supabase.table('questions').select('*').eq('category', 'CG').eq('test_type', 'examen_blanc').ilike('question_text', '%côte%').execute()
        cote_d_ivoire_count = len(verify_response.data)
        
        print(f"📊 Results:")
        print(f"  - Côte d'Ivoire questions in database: {cote_d_ivoire_count}")
        
        if cote_d_ivoire_count > 0:
            print("🎉 Successfully inserted Côte d'Ivoire questions!")
        else:
            print("⚠️ No Côte d'Ivoire questions found. Please check the insertion.")

def main():
    inserter = CoteDIvoireInserter()
    inserter.insert_questions(92)

if __name__ == "__main__":
    main()
