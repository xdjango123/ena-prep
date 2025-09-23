#!/usr/bin/env python3
"""
Generate 10 examens blancs using the new questions
Each exam: 20 questions per subject (60 total)
Ensure randomization and no duplicates within same exam
"""

import os
import sys
import random
import uuid
from datetime import datetime
from supabase import create_client, Client
from typing import List, Dict, Any

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

class ExamenBlancGenerator:
    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        print("✅ Supabase client initialized successfully!")
    
    def get_questions_by_category_and_exam_type(self, category: str, exam_type: str, limit: int = None) -> List[Dict[str, Any]]:
        """Get questions for a specific category and exam type"""
        try:
            query = self.supabase.table('questions').select('*').eq('category', category).eq('test_type', 'examen_blanc').eq('exam_type', exam_type)
            if limit:
                query = query.limit(limit)
            response = query.execute()
            return response.data
        except Exception as e:
            print(f"❌ Error fetching {category} {exam_type} questions: {e}")
            return []
    
    def format_question_for_display(self, question: Dict[str, Any]) -> Dict[str, Any]:
        """Format question for display, especially handling exponents in LOG questions"""
        formatted_question = question.copy()
        
        # Handle exponents in LOG questions
        if question['category'] == 'LOG':
            # Convert x^2 to x², x^3 to x³, etc.
            question_text = question['question_text']
            for i in range(2, 10):
                question_text = question_text.replace(f'x^{i}', f'x{self.get_superscript(i)}')
                question_text = question_text.replace(f'^{i}', f'{self.get_superscript(i)}')
            
            formatted_question['question_text'] = question_text
            
            # Also format answers if they contain exponents
            for i in range(1, 4):
                answer_key = f'answer{i}'
                if answer_key in question and question[answer_key]:
                    answer_text = question[answer_key]
                    for j in range(2, 10):
                        answer_text = answer_text.replace(f'x^{j}', f'x{self.get_superscript(j)}')
                        answer_text = answer_text.replace(f'^{j}', f'{self.get_superscript(j)}')
                    formatted_question[answer_key] = answer_text
        
        return formatted_question
    
    def get_superscript(self, num: int) -> str:
        """Convert number to superscript"""
        superscripts = {
            0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 
            6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹'
        }
        return ''.join(superscripts[int(d)] for d in str(num))
    
    def select_random_questions(self, questions: List[Dict[str, Any]], count: int) -> List[Dict[str, Any]]:
        """Select random questions without replacement"""
        if len(questions) < count:
            print(f"⚠️  Only {len(questions)} questions available, need {count}")
            return questions
        
        return random.sample(questions, count)
    
    def generate_examen_blanc(self, exam_number: int) -> Dict[str, Any]:
        """Generate a single examen blanc with 20 questions per subject"""
        print(f"\n🎯 Generating Examen Blanc {exam_number}...")
        
        # Get questions for each category and exam type
        categories = ['ANG', 'CG', 'LOG']
        exam_types = ['CS', 'CMS', 'CM']
        questions_per_subject = 20
        
        examen_questions = []
        used_question_ids = set()
        
        for category in categories:
            print(f"  📝 Selecting {questions_per_subject} {category} questions...")
            
            # Get all questions for this category across all exam types
            all_category_questions = []
            for exam_type in exam_types:
                questions = self.get_questions_by_category_and_exam_type(category, exam_type)
                all_category_questions.extend(questions)
            
            # Filter out already used questions
            available_questions = [q for q in all_category_questions if q['id'] not in used_question_ids]
            
            if len(available_questions) < questions_per_subject:
                print(f"    ⚠️  Only {len(available_questions)} {category} questions available, need {questions_per_subject}")
                selected_questions = available_questions
            else:
                selected_questions = self.select_random_questions(available_questions, questions_per_subject)
            
            # Format questions for display
            formatted_questions = [self.format_question_for_display(q) for q in selected_questions]
            
            # Add to used questions set
            for q in selected_questions:
                used_question_ids.add(q['id'])
            
            examen_questions.extend(formatted_questions)
            print(f"    ✅ Selected {len(selected_questions)} {category} questions")
        
        # Create examen blanc record
        examen_data = {
            'id': str(uuid.uuid4()),
            'exam_number': exam_number,
            'total_questions': len(examen_questions),
            'questions_per_subject': questions_per_subject,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        return {
            'examen_data': examen_data,
            'questions': examen_questions
        }
    
    def generate_all_examens_blancs(self):
        """Generate all 10 examens blancs"""
        print("🎯 Starting generation of 10 Examens Blancs...")
        print("Format: 20 questions per subject (60 total per exam)")
        print("=" * 60)
        
        # First, check available questions
        print("\n📊 Available questions by category and exam type:")
        for category in ['ANG', 'CG', 'LOG']:
            print(f"\n{category} Questions:")
            for exam_type in ['CS', 'CMS', 'CM']:
                questions = self.get_questions_by_category_and_exam_type(category, exam_type)
                print(f"  {exam_type}: {len(questions)} questions")
        
        # Generate each examen blanc
        all_examens = []
        for exam_number in range(1, 11):
            examen = self.generate_examen_blanc(exam_number)
            all_examens.append(examen)
        
        print(f"\n🎉 Generated {len(all_examens)} Examens Blancs!")
        
        # Save to database (you'll need to implement this based on your schema)
        self.save_examens_to_database(all_examens)
        
        return all_examens
    
    def save_examens_to_database(self, examens: List[Dict[str, Any]]):
        """Save examens blancs to database"""
        print("\n💾 Saving examens to database...")
        
        # This is a placeholder - you'll need to implement based on your actual database schema
        # For now, we'll just print the structure
        for i, examen in enumerate(examens, 1):
            print(f"Examen {i}: {len(examen['questions'])} questions")
            
            # Show question distribution
            categories = {}
            for q in examen['questions']:
                cat = q['category']
                categories[cat] = categories.get(cat, 0) + 1
            
            print(f"  Distribution: {categories}")
            
            # Show a sample question
            if examen['questions']:
                sample_q = examen['questions'][0]
                print(f"  Sample: {sample_q['question_text'][:50]}... ({sample_q['category']})")
        
        print("✅ Examens structure prepared for database insertion")

if __name__ == "__main__":
    generator = ExamenBlancGenerator()
    generator.generate_all_examens_blancs()
