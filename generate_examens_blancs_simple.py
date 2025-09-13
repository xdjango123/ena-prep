#!/usr/bin/env python3
"""
Generate examens blancs using existing database structure
Store exam configurations in a simple JSON file for now
"""

import os
import sys
import random
import json
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
    
    def generate_all_examens_blancs(self):
        """Generate all 10 examens blancs for each exam type"""
        print("🎯 Starting generation of Examens Blancs...")
        print("Format: 20 questions per subject (60 total per exam)")
        print("=" * 60)
        
        exam_types = ['CS', 'CMS', 'CM']
        all_examens = {}
        
        for exam_type in exam_types:
            print(f"\n{'='*60}")
            print(f"🎯 GENERATING {exam_type} EXAMENS BLANCS")
            print(f"{'='*60}")
            
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
            examens = []
            generated_count = 0
            for exam_number in range(1, 11):
                try:
                    examen_data = self.generate_examen_blanc(exam_number, exam_type)
                    examens.append(examen_data)
                    generated_count += 1
                except Exception as e:
                    print(f"    ❌ Failed to generate {exam_type} Examen Blanc {exam_number}: {e}")
                    break
            
            all_examens[exam_type] = examens
            print(f"\n✅ Generated {generated_count} {exam_type} Examens Blancs")
        
        # Save to JSON file
        self.save_examens_to_file(all_examens)
        
        print(f"\n🎉 Examen Blanc generation complete!")
        return all_examens
    
    def save_examens_to_file(self, all_examens: Dict[str, List[Dict[str, Any]]]):
        """Save examens blancs to JSON file"""
        print("\n💾 Saving examens to JSON file...")
        
        # Create a simplified structure for the frontend
        examens_data = {
            'generated_at': datetime.now().isoformat(),
            'exam_types': {}
        }
        
        for exam_type, examens in all_examens.items():
            examens_data['exam_types'][exam_type] = []
            
            for examen in examens:
                # Create simplified examen structure
                simplified_examen = {
                    'id': str(uuid.uuid4()),
                    'exam_number': examen['exam_number'],
                    'exam_type': examen['exam_type'],
                    'total_questions': examen['total_questions'],
                    'questions_per_subject': examen['questions_per_subject'],
                    'questions': []
                }
                
                # Add questions with proper formatting
                for i, question in enumerate(examen['questions']):
                    simplified_question = {
                        'id': question['id'],
                        'question_text': question['question_text'],
                        'answer1': question['answer1'],
                        'answer2': question['answer2'],
                        'answer3': question['answer3'],
                        'correct': question['correct'],
                        'explanation': question['explanation'],
                        'category': question['category'],
                        'difficulty': question['difficulty'],
                        'question_order': i + 1,
                        'subject_order': {'ANG': 1, 'CG': 2, 'LOG': 3}[question['category']]
                    }
                    simplified_examen['questions'].append(simplified_question)
                
                examens_data['exam_types'][exam_type].append(simplified_examen)
        
        # Save to file
        filename = f"examens_blancs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(examens_data, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Saved examens to {filename}")
        
        # Also create a summary
        self.create_summary_file(all_examens)
    
    def create_summary_file(self, all_examens: Dict[str, List[Dict[str, Any]]]):
        """Create a summary file"""
        summary_filename = f"examens_blancs_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        
        with open(summary_filename, 'w', encoding='utf-8') as f:
            f.write("# Examens Blancs Summary\n\n")
            f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            for exam_type, examens in all_examens.items():
                f.write(f"## {exam_type} Examens Blancs\n\n")
                f.write(f"Total generated: {len(examens)}\n\n")
                
                for examen in examens:
                    f.write(f"### Examen Blanc #{examen['exam_number']}\n")
                    f.write(f"- Total questions: {examen['total_questions']}\n")
                    f.write(f"- Questions per subject: {examen['questions_per_subject']}\n")
                    
                    # Count by category
                    categories = {}
                    for q in examen['questions']:
                        cat = q['category']
                        categories[cat] = categories.get(cat, 0) + 1
                    
                    f.write(f"- Distribution: {categories}\n")
                    
                    # Show sample questions
                    f.write("- Sample questions:\n")
                    for i, question in enumerate(examen['questions'][:3]):  # Show first 3
                        f.write(f"  {i+1}. {question['question_text'][:80]}... ({question['category']})\n")
                    f.write("\n")
        
        print(f"✅ Created summary file: {summary_filename}")

if __name__ == "__main__":
    generator = ExamenBlancGenerator()
    generator.generate_all_examens_blancs()
