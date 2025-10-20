#!/usr/bin/env python3
"""
Script to process manual review corrections and create final questions for database ingestion
"""

import json
import os
import sys
from typing import Dict, List, Any

class FinalQuestionProcessor:
    def __init__(self):
        self.processed_questions = []
        self.errors = []
    
    def apply_manual_corrections(self, manual_review_file: str) -> List[Dict[str, Any]]:
        """Apply manual corrections to the questions"""
        print(f"📄 Processing manual review corrections from: {manual_review_file}")
        
        try:
            with open(manual_review_file, 'r', encoding='utf-8') as f:
                manual_questions = json.load(f)
            
            corrected_questions = []
            
            # Manual corrections mapping
            corrections = {
                "unknown_59": {"correct_answer": "C", "explanation": "La bonne réponse est C) 11. En analysant la série logique, chaque nombre est multiplié par 2 puis on ajoute 1."},
                "unknown_46": {
                    "question_text": """6. Trois frères :
• Pierre est plus riche que Jacques
• Jacques est plus âgé que Marc
• Marc est moins riche que Pierre
Qui est le plus jeune ?""",
                    "correct_answer": "C",
                    "explanation": "La bonne réponse est C) Marc. Si Jacques est plus âgé que Marc, alors Marc est le plus jeune des trois frères."
                },
                "unknown_58": {"correct_answer": "A", "explanation": "La bonne réponse est A) 15 x 15m. Pour calculer l'aire d'un carré, on multiplie la longueur par la largeur."},
                "unknown_46": {"correct_answer": "A", "explanation": "La bonne réponse est A) 24 h. Une journée complète dure 24 heures."},
                "unknown_30": {"correct_answer": "C", "explanation": "La bonne réponse est C) break. Dans ce contexte, 'break' signifie faire une pause."},
                "unknown_41": {
                    "answer1": "273600",
                    "correct_answer": "A",
                    "explanation": "La bonne réponse est A) 273600. Ce nombre correspond au calcul demandé dans la question."
                },
                "unknown_44": {
                    "answer1": "30",
                    "correct_answer": "A",
                    "explanation": "La bonne réponse est A) 30. Ce nombre correspond à la solution du problème mathématique."
                },
                "unknown_59": {"correct_answer": "C", "explanation": "La bonne réponse est C) égal au prix initial. Après les augmentations et diminutions successives, le prix final est égal au prix initial."}
            }
            
            for question in manual_questions:
                question_id = question["original_question"]["question_id"]
                
                if question_id in corrections:
                    correction = corrections[question_id]
                    
                    # Apply corrections
                    question_data = question["original_question"]["question_data"].copy()
                    
                    # Update question text if provided
                    if "question_text" in correction:
                        question_data["question_text"] = correction["question_text"]
                    
                    # Update answer1 if provided
                    if "answer1" in correction:
                        question_data["answer1"] = correction["answer1"]
                    
                    # Create final question structure
                    final_question = {
                        "question_text": question_data["question_text"],
                        "answer1": question_data["answer1"],
                        "answer2": question_data["answer2"],
                        "answer3": question_data["answer3"],
                        "correct": correction["correct_answer"],
                        "explanation": correction["explanation"],
                        "category": question_data["category"],
                        "difficulty": "HARD",
                        "exam_type": question_data["exam_type"],
                        "test_type": "examen_blanc",
                        "sub_category": None,
                        "unique_hash": question_data["unique_hash"],
                        "ai_generated": True,
                        "question_pool": question_data["question_pool"],
                        "usage_count": 0,
                        "file_source": question_data["file_source"],
                        "question_number": question_data["question_number"]
                    }
                    
                    corrected_questions.append(final_question)
                    print(f"  ✅ Applied corrections to {question_id}")
                else:
                    print(f"  ⚠️  No corrections found for {question_id}")
            
            print(f"✅ Processed {len(corrected_questions)} manually corrected questions")
            return corrected_questions
            
        except Exception as e:
            error_msg = f"Error processing manual corrections: {str(e)}"
            self.errors.append(error_msg)
            print(f"❌ {error_msg}")
            return []
    
    def load_successful_questions(self, successful_file: str) -> List[Dict[str, Any]]:
        """Load successful questions from dual AI validation"""
        print(f"📄 Loading successful questions from: {successful_file}")
        
        try:
            with open(successful_file, 'r', encoding='utf-8') as f:
                successful_data = json.load(f)
            
            successful_questions = []
            
            for result in successful_data:
                if result["status"] == "validated":
                    question_data = result["question_data"]
                    
                    # Convert to database format
                    db_question = {
                        "question_text": question_data["question_text"],
                        "answer1": question_data["answer1"],
                        "answer2": question_data["answer2"],
                        "answer3": question_data["answer3"],
                        "correct": result["final_answer"],
                        "explanation": result["final_explanation"],
                        "category": question_data["category"],
                        "difficulty": "HARD",
                        "exam_type": question_data["exam_type"],
                        "test_type": "examen_blanc",
                        "sub_category": None,
                        "unique_hash": question_data["unique_hash"],
                        "ai_generated": True,
                        "question_pool": question_data["question_pool"],
                        "usage_count": 0,
                        "file_source": question_data["file_source"],
                        "question_number": question_data["question_number"]
                    }
                    
                    successful_questions.append(db_question)
            
            print(f"✅ Loaded {len(successful_questions)} successful questions")
            return successful_questions
            
        except Exception as e:
            error_msg = f"Error loading successful questions: {str(e)}"
            self.errors.append(error_msg)
            print(f"❌ {error_msg}")
            return []
    
    def load_gemini_resolved_questions(self, gemini_file: str) -> List[Dict[str, Any]]:
        """Load Gemini resolved questions"""
        print(f"📄 Loading Gemini resolved questions from: {gemini_file}")
        
        try:
            with open(gemini_file, 'r', encoding='utf-8') as f:
                gemini_data = json.load(f)
            
            resolved_questions = []
            
            for result in gemini_data:
                if result["status"] == "resolved":
                    question_data = result["original_question"]["question_data"]
                    
                    # Convert to database format
                    db_question = {
                        "question_text": question_data["question_text"],
                        "answer1": question_data["answer1"],
                        "answer2": question_data["answer2"],
                        "answer3": question_data["answer3"],
                        "correct": result["final_answer"],
                        "explanation": result["final_explanation"],
                        "category": question_data["category"],
                        "difficulty": "HARD",
                        "exam_type": question_data["exam_type"],
                        "test_type": "examen_blanc",
                        "sub_category": None,
                        "unique_hash": question_data["unique_hash"],
                        "ai_generated": True,
                        "question_pool": question_data["question_pool"],
                        "usage_count": 0,
                        "file_source": question_data["file_source"],
                        "question_number": question_data["question_number"]
                    }
                    
                    resolved_questions.append(db_question)
            
            print(f"✅ Loaded {len(resolved_questions)} Gemini resolved questions")
            return resolved_questions
            
        except Exception as e:
            error_msg = f"Error loading Gemini resolved questions: {str(e)}"
            self.errors.append(error_msg)
            print(f"❌ {error_msg}")
            return []
    
    def create_final_questions_file(self, all_questions: List[Dict[str, Any]], output_file: str):
        """Create the final questions file for database ingestion"""
        print(f"💾 Creating final questions file: {output_file}")
        
        try:
            # Convert to database column names
            db_questions = []
            
            for question in all_questions:
                db_question = {
                    "question_text": question["question_text"],
                    "option_a": question["answer1"],
                    "option_b": question["answer2"],
                    "option_c": question["answer3"],
                    "option_d": None,  # 3-option questions
                    "correct_answer": question["correct"],
                    "explanation": question["explanation"],
                    "category": question["category"],
                    "difficulty_level": question["difficulty"].lower(),
                    "sub_category": question["sub_category"],
                    "exam_type": question["exam_type"],
                    "test_type": question["test_type"],
                    "ai_generated": question["ai_generated"],
                    "unique_hash": question["unique_hash"],
                    "question_pool": question["question_pool"],
                    "usage_count": question["usage_count"],
                    "file_source": question["file_source"],
                    "question_number": question["question_number"]
                }
                
                db_questions.append(db_question)
            
            # Save to file
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(db_questions, f, ensure_ascii=False, indent=2)
            
            print(f"✅ Saved {len(db_questions)} questions to: {output_file}")
            
        except Exception as e:
            error_msg = f"Error creating final questions file: {str(e)}"
            self.errors.append(error_msg)
            print(f"❌ {error_msg}")
    
    def generate_final_summary(self, successful_count: int, gemini_count: int, manual_count: int, total_count: int):
        """Generate final summary report"""
        report = f"""
FINAL QUESTIONS SUMMARY REPORT
==============================
Generated: {os.popen('date').read().strip()}

Question Sources:
- Successful Questions (GPT-5 + Claude Agreement): {successful_count}
- Gemini Resolved Questions: {gemini_count}
- Manual Review Corrected Questions: {manual_count}
- TOTAL QUESTIONS FOR DATABASE: {total_count}

Question Distribution by Category:
"""
        
        # Count by category
        category_counts = {}
        exam_type_counts = {}
        
        for question in self.processed_questions:
            category = question["category"]
            exam_type = question["exam_type"]
            
            category_counts[category] = category_counts.get(category, 0) + 1
            exam_type_counts[exam_type] = exam_type_counts.get(exam_type, 0) + 1
        
        for category, count in category_counts.items():
            report += f"- {category}: {count} questions\n"
        
        report += f"""
Question Distribution by Exam Type:
"""
        
        for exam_type, count in exam_type_counts.items():
            report += f"- {exam_type}: {count} questions\n"
        
        report += f"""
Database Schema Mapping:
- question_text → question_text
- answer1 → option_a
- answer2 → option_b  
- answer3 → option_c
- answer4 → option_d (null for 3-option questions)
- correct → correct_answer
- explanation → explanation (in French)
- category → category (ANG, CG, LOG)
- difficulty → difficulty_level (hard)
- exam_type → exam_type (CMS, CS)
- test_type → test_type (examen_blanc)
- ai_generated → ai_generated (true)
- unique_hash → unique_hash

Next Steps:
1. Review final_questions_for_database.json
2. Run database insertion script
3. Verify questions in database
4. Generate final statistics

Errors Encountered:
"""
        
        for error in self.errors:
            report += f"- {error}\n"
        
        with open("final_questions_summary.txt", "w", encoding="utf-8") as f:
            f.write(report)
        
        print("📋 Final summary report saved to: final_questions_summary.txt")

def main():
    processor = FinalQuestionProcessor()
    
    # Load all question sources
    successful_questions = processor.load_successful_questions("ai_validated_questions/successful_questions_ready.json")
    gemini_questions = processor.load_gemini_resolved_questions("ai_validated_questions/gemini_resolved_questions.json")
    manual_questions = processor.apply_manual_corrections("ai_validated_questions/manual_review_questions.json")
    
    # Combine all questions
    all_questions = successful_questions + gemini_questions + manual_questions
    processor.processed_questions = all_questions
    
    # Create final questions file
    processor.create_final_questions_file(all_questions, "final_questions_for_database.json")
    
    # Generate summary
    processor.generate_final_summary(
        len(successful_questions),
        len(gemini_questions), 
        len(manual_questions),
        len(all_questions)
    )
    
    print("\n🎉 Final question processing complete!")
    print(f"✅ {len(all_questions)} total questions ready for database insertion")
    print(f"📁 Final file: final_questions_for_database.json")
    print(f"📋 Summary: final_questions_summary.txt")

if __name__ == "__main__":
    main()
