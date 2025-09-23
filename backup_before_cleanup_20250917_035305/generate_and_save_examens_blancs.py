#!/usr/bin/env python3
"""
Generate and save 10 examens blancs to the database
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
    
    def get_superscript(self, num: int) -> str:
        """Convert number to superscript"""
        superscripts = {
            0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 
            6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹'
        }
        return ''.join(superscripts[int(d)] for d in str(num))
    
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
    
    def get_questions_by_category_and_exam_type(self, category: str, exam_type: str) -> List[Dict[str, Any]]:
        """Get questions for a specific category and exam type"""
        try:
            response = self.supabase.table('questions').select('*').eq('category', category).eq('test_type', 'examen_blanc').eq('exam_type', exam_type).execute()
            return response.data
        except Exception as e:
            print(f"❌ Error fetching {category} {exam_type} questions: {e}")
            return []
    
    def select_random_questions(self, questions: List[Dict[str, Any]], count: int) -> List[Dict[str, Any]]:
        """Select random questions without replacement"""
        if len(questions) < count:
            print(f"⚠️  Only {len(questions)} questions available, need {count}")
            return questions
        
        return random.sample(questions, count)
    
    def clear_existing_examens_blancs(self, exam_type: str):
        """Clear existing examens blancs for the given exam type"""
        print(f"🗑️  Clearing existing {exam_type} examens blancs...")
        
        try:
            # Get existing examens blancs
            response = self.supabase.table('examens_blancs').select('id').eq('exam_type', exam_type).execute()
            
            if response.data:
                examen_ids = [examen['id'] for examen in response.data]
                
                # Delete examen blanc questions first (due to foreign key constraint)
                for examen_id in examen_ids:
                    self.supabase.table('examen_blanc_questions').delete().eq('examen_blanc_id', examen_id).execute()
                
                # Delete examens blancs
                self.supabase.table('examens_blancs').delete().eq('exam_type', exam_type).execute()
                
                print(f"✅ Cleared {len(examen_ids)} existing {exam_type} examens blancs")
            else:
                print(f"ℹ️  No existing {exam_type} examens blancs found")
                
        except Exception as e:
            print(f"❌ Error clearing existing examens blancs: {e}")
    
    def generate_examen_blanc(self, exam_number: int, exam_type: str) -> Dict[str, Any]:
        """Generate a single examen blanc with 20 questions per subject"""
        print(f"  🎯 Generating {exam_type} Examen Blanc {exam_number}...")
        
        # Get questions for each category
        categories = ['ANG', 'CG', 'LOG']
        questions_per_subject = 20
        
        all_questions = []
        used_question_ids = set()
        
        for category in categories:
            print(f"    📝 Selecting {questions_per_subject} {category} questions...")
            
            # Get all questions for this category and exam type
            category_questions = self.get_questions_by_category_and_exam_type(category, exam_type)
            
            # Filter out already used questions
            available_questions = [q for q in category_questions if q['id'] not in used_question_ids]
            
            if len(available_questions) < questions_per_subject:
                print(f"      ⚠️  Only {len(available_questions)} {category} questions available, need {questions_per_subject}")
                selected_questions = available_questions
            else:
                selected_questions = self.select_random_questions(available_questions, questions_per_subject)
            
            # Format questions for display
            formatted_questions = [self.format_question_for_display(q) for q in selected_questions]
            
            # Add to used questions set
            for q in selected_questions:
                used_question_ids.add(q['id'])
            
            all_questions.extend(formatted_questions)
            print(f"      ✅ Selected {len(selected_questions)} {category} questions")
        
        return {
            'exam_number': exam_number,
            'exam_type': exam_type,
            'total_questions': len(all_questions),
            'questions_per_subject': questions_per_subject,
            'questions': all_questions
        }
    
    def save_examen_blanc_to_database(self, examen_data: Dict[str, Any]) -> str:
        """Save a single examen blanc to the database"""
        try:
            # Create examen blanc record
            examen_record = {
                'id': str(uuid.uuid4()),
                'exam_number': examen_data['exam_number'],
                'exam_type': examen_data['exam_type'],
                'total_questions': examen_data['total_questions'],
                'questions_per_subject': examen_data['questions_per_subject'],
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            # Insert examen blanc
            response = self.supabase.table('examens_blancs').insert(examen_record).execute()
            
            if not response.data:
                raise Exception(f"Failed to insert examen blanc: {response}")
            
            examen_id = response.data[0]['id']
            print(f"    ✅ Saved {examen_data['exam_type']} Examen Blanc {examen_data['exam_number']} (ID: {examen_id})")
            
            # Save question assignments
            question_assignments = []
            question_order = 1
            
            for i, question in enumerate(examen_data['questions']):
                # Determine subject order (1=ANG, 2=CG, 3=LOG)
                subject_order = {'ANG': 1, 'CG': 2, 'LOG': 3}[question['category']]
                
                assignment = {
                    'id': str(uuid.uuid4()),
                    'examen_blanc_id': examen_id,
                    'question_id': question['id'],
                    'question_order': question_order,
                    'subject_order': subject_order,
                    'created_at': datetime.utcnow().isoformat()
                }
                question_assignments.append(assignment)
                question_order += 1
            
            # Insert question assignments
            if question_assignments:
                self.supabase.table('examen_blanc_questions').insert(question_assignments).execute()
                print(f"    ✅ Saved {len(question_assignments)} question assignments")
            
            return examen_id
            
        except Exception as e:
            print(f"    ❌ Error saving examen blanc: {e}")
            raise
    
    def generate_all_examens_blancs(self):
        """Generate and save all 10 examens blancs for each exam type"""
        print("🎯 Starting generation of Examens Blancs...")
        print("Format: 20 questions per subject (60 total per exam)")
        print("=" * 60)
        
        exam_types = ['CS', 'CMS', 'CM']
        
        for exam_type in exam_types:
            print(f"\n{'='*60}")
            print(f"🎯 GENERATING {exam_type} EXAMENS BLANCS")
            print(f"{'='*60}")
            
            # Clear existing examens blancs for this exam type
            self.clear_existing_examens_blancs(exam_type)
            
            # Check available questions
            print(f"\n📊 Available {exam_type} questions by category:")
            total_available = 0
            for category in ['ANG', 'CG', 'LOG']:
                questions = self.get_questions_by_category_and_exam_type(category, exam_type)
                print(f"  {category}: {len(questions)} questions")
                total_available += len(questions)
            
            if total_available < 600:  # 10 exams * 60 questions
                print(f"⚠️  Only {total_available} questions available, need 600 for 10 exams")
                print("   Will generate as many exams as possible...")
            
            # Generate 10 examens blancs
            generated_count = 0
            for exam_number in range(1, 11):
                try:
                    examen_data = self.generate_examen_blanc(exam_number, exam_type)
                    examen_id = self.save_examen_blanc_to_database(examen_data)
                    generated_count += 1
                except Exception as e:
                    print(f"    ❌ Failed to generate {exam_type} Examen Blanc {exam_number}: {e}")
                    break
            
            print(f"\n✅ Generated {generated_count} {exam_type} Examens Blancs")
        
        print(f"\n🎉 Examen Blanc generation complete!")
        
        # Verify final counts
        print(f"\n📊 Final examen blanc counts:")
        for exam_type in exam_types:
            count_response = self.supabase.table('examens_blancs').select('id', count='exact').eq('exam_type', exam_type).execute()
            count = count_response.count if count_response.count else 0
            print(f"  {exam_type}: {count} examens blancs")

if __name__ == "__main__":
    generator = ExamenBlancGenerator()
    generator.generate_all_examens_blancs()
