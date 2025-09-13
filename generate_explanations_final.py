#!/usr/bin/env python3
"""
Final AI-powered explanation generator for all questions
"""

import os
import sys
from supabase import create_client, Client
from typing import List, Dict, Any
from openai import OpenAI

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

class FinalExplanationGenerator:
    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        
        # Initialize OpenAI
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("❌ OPENAI_API_KEY environment variable not set!")
            print("Please set it with: export OPENAI_API_KEY='your-key-here'")
            sys.exit(1)
        
        self.openai_client = OpenAI(api_key=api_key)
        self.explanations_generated = 0
        self.explanations_updated = 0
        self.explanations_failed = 0
        print("✅ OpenAI client initialized successfully!")
    
    def get_questions_without_explanations(self, limit: int = 1000) -> List[Dict[str, Any]]:
        """Get questions that don't have explanations or have empty explanations"""
        try:
            response = self.supabase.table('questions').select('*').or_('explanation.is.null,explanation.eq.').limit(limit).execute()
            return response.data
        except Exception as e:
            print(f"Error fetching questions: {e}")
            return []
    
    def get_sample_questions(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Get a sample of questions for testing"""
        try:
            response = self.supabase.table('questions').select('*').limit(limit).execute()
            return response.data
        except Exception as e:
            print(f"Error fetching sample questions: {e}")
            return []
    
    def get_all_questions(self, limit: int = 1000) -> List[Dict[str, Any]]:
        """Get all questions for explanation generation"""
        try:
            response = self.supabase.table('questions').select('*').limit(limit).execute()
            return response.data
        except Exception as e:
            print(f"Error fetching questions: {e}")
            return []
    
    def generate_explanation(self, question: Dict[str, Any]) -> str:
        """Generate a French explanation for a question using AI"""
        question_text = question.get('question_text', '')
        correct_answer = question.get('correct', '')
        
        # Get all valid options
        options = []
        option_letters = ['A', 'B', 'C', 'D']
        for i, letter in enumerate(option_letters):
            answer_key = f'answer{i+1}'
            answer_text = question.get(answer_key, '')
            if answer_text and answer_text != 'null' and answer_text.strip():
                options.append({
                    'letter': letter,
                    'text': answer_text.strip()
                })
        
        # Create the prompt for AI
        options_text = '\n'.join([f"{opt['letter']}. {opt['text']}" for opt in options])
        
        prompt = f"""
Tu es un expert en éducation qui génère des explications claires et pédagogiques pour des questions d'examen.

Question: {question_text}

Options:
{options_text}

Réponse correcte: {correct_answer}

Génère une explication en français qui:
1. Explique clairement pourquoi la réponse {correct_answer} est correcte
2. Donne des exemples concrets si possible
3. Explique pourquoi les autres options sont incorrectes
4. Utilise un langage simple et pédagogique
5. Fait maximum 2 phrases
6. Commence par "La réponse correcte est {correct_answer}."

Explication:"""
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "Tu es un expert en éducation qui génère des explications claires et pédagogiques pour des questions d'examen."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=200,
                temperature=0.7
            )
            
            explanation = response.choices[0].message.content.strip()
            return explanation
            
        except Exception as e:
            print(f"Error generating AI explanation: {e}")
            # Fallback to simple explanation
            correct_option = next((opt for opt in options if opt['letter'] == correct_answer), None)
            if correct_option:
                return f"La réponse correcte est {correct_answer}. {correct_option['text']} est la bonne réponse."
            return f"La réponse correcte est {correct_answer}."
    
    def update_question_explanation(self, question_id: str, explanation: str) -> bool:
        """Update the explanation for a question"""
        try:
            response = self.supabase.table('questions').update({
                'explanation': explanation
            }).eq('id', question_id).execute()
            
            return bool(response.data)
        except Exception as e:
            print(f"Error updating question {question_id}: {e}")
            return False
    
    def test_sample_explanations(self, limit: int = 5) -> None:
        """Test explanation generation on a sample of questions"""
        print(f"🧪 Testing AI explanation generation on {limit} sample questions...")
        print("=" * 60)
        
        questions = self.get_sample_questions(limit)
        print(f"📊 Found {len(questions)} sample questions")
        
        if not questions:
            print("❌ No questions found")
            return
        
        for i, question in enumerate(questions):
            question_id = question.get('id', 'N/A')
            question_text = question.get('question_text', 'N/A')
            category = question.get('category', 'N/A')
            correct_answer = question.get('correct', 'N/A')
            current_explanation = question.get('explanation', '')
            
            print(f"\n🔍 Sample Question {i+1}/{len(questions)}")
            print(f"   ID: {question_id[:8]}...")
            print(f"   Category: {category}")
            print(f"   Text: {question_text[:80]}...")
            print(f"   Correct Answer: {correct_answer}")
            print(f"   Current Explanation: {current_explanation[:50] if current_explanation else 'None'}...")
            
            # Generate explanation
            try:
                explanation = self.generate_explanation(question)
                print(f"   📝 Generated Explanation: {explanation}")
                print(f"   {'='*50}")
                
            except Exception as e:
                print(f"   ❌ Error generating explanation: {e}")
    
    def generate_explanations_for_all_questions(self, limit: int = 1000) -> None:
        """Generate explanations for all questions"""
        print(f"📝 Generating AI-powered French explanations for questions...")
        print("=" * 60)
        
        questions = self.get_all_questions(limit)
        print(f"📊 Found {len(questions)} questions to process")
        
        if not questions:
            print("❌ No questions found")
            return
        
        for i, question in enumerate(questions):
            question_id = question.get('id', 'N/A')
            question_text = question.get('question_text', 'N/A')
            current_explanation = question.get('explanation', '')
            
            print(f"\n🔍 Processing question {i+1}/{len(questions)} (ID: {question_id[:8]}...)")
            print(f"   Text: {question_text[:60]}...")
            
            # Skip if already has explanation
            if current_explanation and current_explanation.strip():
                print(f"   ⏭️  Already has explanation, skipping...")
                continue
            
            # Generate explanation
            try:
                explanation = self.generate_explanation(question)
                print(f"   📝 Generated: {explanation[:80]}...")
                
                # Update database
                success = self.update_question_explanation(question_id, explanation)
                
                if success:
                    self.explanations_updated += 1
                    print(f"   ✅ Updated successfully")
                else:
                    self.explanations_failed += 1
                    print(f"   ❌ Failed to update")
                
                self.explanations_generated += 1
                
            except Exception as e:
                print(f"   ❌ Error generating explanation: {e}")
                self.explanations_failed += 1
        
        # Generate summary
        self._generate_summary()
    
    def generate_explanations_for_questions_without_explanations(self, limit: int = 1000) -> None:
        """Generate explanations only for questions without explanations"""
        print(f"📝 Generating AI explanations for questions without explanations...")
        print("=" * 60)
        
        questions = self.get_questions_without_explanations(limit)
        print(f"📊 Found {len(questions)} questions without explanations")
        
        if not questions:
            print("❌ No questions without explanations found")
            return
        
        for i, question in enumerate(questions):
            question_id = question.get('id', 'N/A')
            question_text = question.get('question_text', 'N/A')
            
            print(f"\n�� Processing question {i+1}/{len(questions)} (ID: {question_id[:8]}...)")
            print(f"   Text: {question_text[:60]}...")
            
            # Generate explanation
            try:
                explanation = self.generate_explanation(question)
                print(f"   📝 Generated: {explanation[:80]}...")
                
                # Update database
                success = self.update_question_explanation(question_id, explanation)
                
                if success:
                    self.explanations_updated += 1
                    print(f"   ✅ Updated successfully")
                else:
                    self.explanations_failed += 1
                    print(f"   ❌ Failed to update")
                
                self.explanations_generated += 1
                
            except Exception as e:
                print(f"   ❌ Error generating explanation: {e}")
                self.explanations_failed += 1
        
        # Generate summary
        self._generate_summary()
    
    def _generate_summary(self) -> None:
        """Generate summary report"""
        print(f"\n📊 EXPLANATION GENERATION SUMMARY")
        print(f"{'='*60}")
        print(f"Total questions processed: {self.explanations_generated}")
        print(f"Explanations updated: {self.explanations_updated}")
        print(f"Explanations failed: {self.explanations_failed}")
        print(f"Success rate: {(self.explanations_updated/max(self.explanations_generated, 1)*100):.1f}%")
        print(f"{'='*60}")

def main():
    generator = FinalExplanationGenerator()
    
    print("📝 Final AI-Powered French Explanation Generator")
    print("=" * 60)
    print("This tool uses AI to generate contextual French explanations for all questions in the database.")
    print("=" * 60)
    
    while True:
        print("\nOptions:")
        print("1. Test with sample questions (5 questions)")
        print("2. Generate explanations for all questions")
        print("3. Generate explanations for questions without explanations only")
        print("4. Exit")
        
        choice = input("\nEnter your choice (1-4): ").strip()
        
        if choice == '1':
            generator.test_sample_explanations(5)
        
        elif choice == '2':
            limit = input("Enter limit (default 1000): ").strip()
            limit = int(limit) if limit.isdigit() else 1000
            generator.generate_explanations_for_all_questions(limit)
        
        elif choice == '3':
            limit = input("Enter limit (default 1000): ").strip()
            limit = int(limit) if limit.isdigit() else 1000
            generator.generate_explanations_for_questions_without_explanations(limit)
        
        elif choice == '4':
            print("👋 Goodbye!")
            break
        
        else:
            print("❌ Invalid choice. Please enter 1-4.")

if __name__ == "__main__":
    main()
