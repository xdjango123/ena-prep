#!/usr/bin/env python3
"""
Regenerate exam data with updated Côte d'Ivoire questions
"""

import os
import json
import hashlib
import time
from typing import List, Dict, Any
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

class ExamDataRegenerator:
    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    def get_questions_by_category(self, category: str, exam_type: str = 'CS', limit: int = 20) -> List[Dict[str, Any]]:
        """Get questions from database for a specific category"""
        try:
            if category == 'CG':
                # For CG questions, prioritize Côte d'Ivoire questions
                cote_response = self.supabase.table('questions').select('*').eq('category', 'CG').eq('test_type', 'examen_blanc').eq('exam_type', exam_type).ilike('question_text', '%côte%').limit(limit).execute()
                if len(cote_response.data) >= limit:
                    return cote_response.data
                
                # If not enough Côte d'Ivoire questions, get more general CG questions
                remaining = limit - len(cote_response.data)
                general_response = self.supabase.table('questions').select('*').eq('category', 'CG').eq('test_type', 'examen_blanc').eq('exam_type', exam_type).not_.ilike('question_text', '%côte%').not_.ilike('question_text', '%france%').limit(remaining).execute()
                
                return cote_response.data + general_response.data
            else:
                response = self.supabase.table('questions').select('*').eq('category', category).eq('test_type', 'examen_blanc').eq('exam_type', exam_type).limit(limit).execute()
                return response.data
        except Exception as e:
            print(f"Error fetching {category} questions: {e}")
            return []

    def generate_exam_data(self, exam_type: str = 'CS', num_exams: int = 10) -> Dict[str, Any]:
        """Generate exam data with updated questions"""
        
        print(f"🎯 Generating {num_exams} {exam_type} exams with updated questions...")
        
        exam_data = {
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S.%f"),
            "exam_types": {
                exam_type: []
            }
        }
        
        for exam_number in range(1, num_exams + 1):
            print(f"  📝 Generating exam {exam_number}...")
            
            # Get questions for each category
            ang_questions = self.get_questions_by_category('ANG', exam_type, 20)
            cg_questions = self.get_questions_by_category('CG', exam_type, 20)
            log_questions = self.get_questions_by_category('LOG', exam_type, 20)
            
            print(f"    ANG: {len(ang_questions)} questions")
            print(f"    CG: {len(cg_questions)} questions")
            print(f"    LOG: {len(log_questions)} questions")
            
            # Combine all questions
            all_questions = []
            question_order = 1
            
            # Add ANG questions (1-20)
            for i, q in enumerate(ang_questions):
                all_questions.append({
                    "id": q['id'],
                    "question_text": q['question_text'],
                    "answer1": q['answer1'],
                    "answer2": q['answer2'],
                    "answer3": q['answer3'],
                    "correct": q['correct'],
                    "explanation": q['explanation'],
                    "category": "ANG",
                    "difficulty": q['difficulty'],
                    "question_order": question_order,
                    "subject_order": i + 1
                })
                question_order += 1
            
            # Add CG questions (21-40)
            for i, q in enumerate(cg_questions):
                all_questions.append({
                    "id": q['id'],
                    "question_text": q['question_text'],
                    "answer1": q['answer1'],
                    "answer2": q['answer2'],
                    "answer3": q['answer3'],
                    "correct": q['correct'],
                    "explanation": q['explanation'],
                    "category": "CG",
                    "difficulty": q['difficulty'],
                    "question_order": question_order,
                    "subject_order": i + 1
                })
                question_order += 1
            
            # Add LOG questions (41-60)
            for i, q in enumerate(log_questions):
                all_questions.append({
                    "id": q['id'],
                    "question_text": q['question_text'],
                    "answer1": q['answer1'],
                    "answer2": q['answer2'],
                    "answer3": q['answer3'],
                    "correct": q['correct'],
                    "explanation": q['explanation'],
                    "category": "LOG",
                    "difficulty": q['difficulty'],
                    "question_order": question_order,
                    "subject_order": i + 1
                })
                question_order += 1
            
            # Create exam object
            exam = {
                "id": f"{exam_type.lower()}-exam-{exam_number}",
                "exam_number": exam_number,
                "exam_type": exam_type,
                "total_questions": len(all_questions),
                "questions_per_subject": 20,
                "questions": all_questions
            }
            
            exam_data["exam_types"][exam_type].append(exam)
            print(f"    ✅ Generated exam {exam_number} with {len(all_questions)} questions")
        
        return exam_data

    def save_exam_data(self, exam_data: Dict[str, Any], filename: str = None):
        """Save exam data to JSON file"""
        
        if not filename:
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            filename = f"examens_blancs_{timestamp}.json"
        
        # Save to project root
        project_path = "/Users/joasyepidan/Documents/projects/ena/project"
        file_path = os.path.join(project_path, filename)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(exam_data, f, ensure_ascii=False, indent=2)
        
        print(f"💾 Saved exam data to: {file_path}")
        
        # Also save to public folder
        public_path = os.path.join(project_path, "public", filename)
        with open(public_path, 'w', encoding='utf-8') as f:
            json.dump(exam_data, f, ensure_ascii=False, indent=2)
        
        print(f"💾 Saved exam data to: {public_path}")
        
        return filename

    def verify_cote_d_ivoire_questions(self, exam_data: Dict[str, Any]):
        """Verify that Côte d'Ivoire questions are included"""
        
        print("\n🔍 Verifying Côte d'Ivoire questions...")
        
        cote_d_ivoire_count = 0
        france_count = 0
        
        for exam_type, exams in exam_data["exam_types"].items():
            for exam in exams:
                for question in exam["questions"]:
                    if question["category"] == "CG":
                        question_text = question["question_text"].lower()
                        if "côte" in question_text or "ivoire" in question_text:
                            cote_d_ivoire_count += 1
                        elif "france" in question_text:
                            france_count += 1
        
        print(f"📊 Verification results:")
        print(f"  - Côte d'Ivoire questions: {cote_d_ivoire_count}")
        print(f"  - France questions: {france_count}")
        
        if cote_d_ivoire_count > 0 and france_count == 0:
            print("✅ Success! Côte d'Ivoire questions are included, France questions removed")
        elif france_count > 0:
            print("⚠️ Warning: France questions still present")
        else:
            print("❌ Error: No Côte d'Ivoire questions found")

def main():
    regenerator = ExamDataRegenerator()
    
    # Generate exam data for CS exam type
    exam_data = regenerator.generate_exam_data('CS', 10)
    
    # Save to file
    filename = regenerator.save_exam_data(exam_data)
    
    # Verify results
    regenerator.verify_cote_d_ivoire_questions(exam_data)
    
    print(f"\n🎉 Exam data regeneration complete!")
    print(f"📁 New file: {filename}")
    print(f"🔄 Please restart the application to use the updated exam data")

if __name__ == "__main__":
    main()
