#!/usr/bin/env python3
"""
Script to use Gemini as a 3rd model to resolve flagged questions
"""

import json
import os
import sys
import time
import random
from typing import Dict, List, Any, Optional
import google.generativeai as genai

class GeminiValidator:
    def __init__(self):
        # Initialize Gemini - API key embedded
        gemini_api_key = "AIzaSyDRckxzlghuQ2o-FD-LbM_CMkdOJM7WWhY"
        try:
            genai.configure(api_key=gemini_api_key)
            self.model = genai.GenerativeModel('gemini-2.5-flash')
            print("✅ Gemini client initialized successfully")
        except Exception as e:
            print(f"❌ Failed to initialize Gemini client: {e}")
            print("Please provide a valid Gemini API key")
            sys.exit(1)
        
        self.error_log = []
        self.processed_count = 0
        self.agreements = 0
        self.disagreements = 0
    
    def validate_question_with_gemini(self, question: Dict[str, Any]) -> Dict[str, Any]:
        """Use Gemini to validate a flagged question"""
        try:
            question_data = question["question_data"]
            gpt5_result = question["gpt5_result"]
            claude_result = question["claude_result"]
            
            # Prepare the prompt for Gemini
            prompt = f"""
You are an expert educational content validator. Please analyze this exam question and provide your assessment.

QUESTION:
{question_data['question_text']}

OPTIONS:
A) {question_data['answer1']}
B) {question_data['answer2']}
C) {question_data['answer3']}

CATEGORY: {question_data['category']}
EXAM TYPE: {question_data['exam_type']}

PREVIOUS AI ASSESSMENTS:
GPT-5 Answer: {gpt5_result.get('answer', 'N/A')}
GPT-5 Explanation: {gpt5_result.get('explanation', 'N/A')}

Claude Answer: {claude_result.get('answer', 'N/A')}
Claude Explanation: {claude_result.get('my_explanation', 'N/A')}

Please provide your assessment in the following JSON format:
{{
    "correct_answer": "A", "B", or "C",
    "explanation": "Your detailed explanation in French",
    "confidence_score": 1-10,
    "agrees_with_gpt5": true/false,
    "agrees_with_claude": true/false,
    "reasoning": "Why you chose this answer"
}}

Respond only with valid JSON, no additional text.
"""
            
            # Call Gemini API
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Parse JSON response
            try:
                # Remove any markdown formatting
                if response_text.startswith('```json'):
                    response_text = response_text[7:]
                if response_text.endswith('```'):
                    response_text = response_text[:-3]
                
                gemini_result = json.loads(response_text)
                
                # Determine agreement
                gpt5_answer = gpt5_result.get('answer', '')
                claude_answer = claude_result.get('answer', '')
                gemini_answer = gemini_result.get('correct_answer', '')
                
                agrees_with_gpt5 = gemini_answer == gpt5_answer
                agrees_with_claude = gemini_answer == claude_answer
                
                # Determine final status
                if agrees_with_gpt5 or agrees_with_claude:
                    status = "resolved"
                    final_answer = gemini_answer
                    final_explanation = gemini_result.get('explanation', '')
                else:
                    status = "still_disagreed"
                    final_answer = None
                    final_explanation = None
                
                return {
                    "status": status,
                    "gemini_result": gemini_result,
                    "agrees_with_gpt5": agrees_with_gpt5,
                    "agrees_with_claude": agrees_with_claude,
                    "final_answer": final_answer,
                    "final_explanation": final_explanation,
                    "original_question": question
                }
                
            except json.JSONDecodeError as e:
                error_msg = f"Gemini JSON parse error for question {question['question_id']}: {str(e)}"
                self.error_log.append({
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "error_type": "JSON Parse Error",
                    "question_id": question['question_id'],
                    "error": str(e),
                    "response": response_text[:200] + "..." if len(response_text) > 200 else response_text
                })
                return {
                    "status": "error",
                    "error": error_msg,
                    "original_question": question
                }
                
        except Exception as e:
            error_msg = f"Gemini API error for question {question['question_id']}: {str(e)}"
            self.error_log.append({
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "error_type": "API Error",
                "question_id": question['question_id'],
                "error": str(e)
            })
            return {
                "status": "error",
                "error": error_msg,
                "original_question": question
            }
    
    def process_flagged_questions(self, flagged_file: str) -> Dict[str, List[Dict[str, Any]]]:
        """Process all flagged questions with Gemini"""
        print(f"📄 Processing flagged questions with Gemini from: {flagged_file}")
        
        try:
            with open(flagged_file, 'r', encoding='utf-8') as f:
                flagged_questions = json.load(f)
            
            resolved_questions = []
            still_disagreed = []
            errors = []
            
            total_questions = len(flagged_questions)
            print(f"📊 Processing {total_questions} flagged questions...")
            
            for i, question in enumerate(flagged_questions, 1):
                print(f"  📝 Question {i}/{total_questions}: {question['question_id']}")
                
                result = self.validate_question_with_gemini(question)
                
                if result["status"] == "resolved":
                    resolved_questions.append(result)
                    self.agreements += 1
                    print(f"    ✅ Resolved - Agrees with {'GPT-5' if result['agrees_with_gpt5'] else 'Claude'}")
                elif result["status"] == "still_disagreed":
                    still_disagreed.append(result)
                    self.disagreements += 1
                    print(f"    ⚠️  Still disagreed - Gemini has different answer")
                else:
                    errors.append(result)
                    print(f"    ❌ Error: {result['error']}")
                
                self.processed_count += 1
                
                # Small delay to avoid rate limiting
                time.sleep(1)
            
            return {
                "resolved": resolved_questions,
                "still_disagreed": still_disagreed,
                "errors": errors
            }
            
        except Exception as e:
            print(f"❌ Error processing flagged questions: {e}")
            return {"resolved": [], "still_disagreed": [], "errors": []}
    
    def save_results(self, results: Dict[str, List[Dict[str, Any]]]):
        """Save the Gemini validation results"""
        # Save resolved questions (ready for database)
        resolved_file = "ai_validated_questions/gemini_resolved_questions.json"
        with open(resolved_file, 'w', encoding='utf-8') as f:
            json.dump(results["resolved"], f, ensure_ascii=False, indent=2)
        print(f"💾 Saved {len(results['resolved'])} resolved questions to: {resolved_file}")
        
        # Save still disagreed questions (need manual review)
        disagreed_file = "ai_validated_questions/manual_review_questions.json"
        with open(disagreed_file, 'w', encoding='utf-8') as f:
            json.dump(results["still_disagreed"], f, ensure_ascii=False, indent=2)
        print(f"🚩 Saved {len(results['still_disagreed'])} questions for manual review to: {disagreed_file}")
        
        # Save error log
        error_file = "ai_validated_questions/gemini_error_log.json"
        with open(error_file, 'w', encoding='utf-8') as f:
            json.dump(self.error_log, f, ensure_ascii=False, indent=2)
        print(f"📋 Saved {len(self.error_log)} errors to: {error_file}")
    
    def generate_summary_report(self, results: Dict[str, List[Dict[str, Any]]]):
        """Generate a summary report"""
        report = f"""
GEMINI VALIDATION SUMMARY REPORT
===============================
Generated: {time.strftime("%Y-%m-%d %H:%M:%S")}

Processing Results:
- Total Questions Processed: {self.processed_count}
- Resolved Questions (Ready for DB): {len(results['resolved'])}
- Still Disagreed (Manual Review): {len(results['still_disagreed'])}
- Processing Errors: {len(results['errors'])}

Agreement Analysis:
- Questions where Gemini agreed with GPT-5 or Claude: {self.agreements}
- Questions where Gemini disagreed with both: {self.disagreements}

Files Generated:
- Resolved Questions: ai_validated_questions/gemini_resolved_questions.json
- Manual Review: ai_validated_questions/manual_review_questions.json
- Error Log: ai_validated_questions/gemini_error_log.json

Next Steps:
1. Review manual_review_questions.json for final decisions
2. Combine resolved questions with successful questions
3. Insert all final questions into database
4. Generate final statistics report

Errors Encountered:
"""
        
        for error in self.error_log:
            report += f"- {error['error_type']}: {error['error']}\n"
        
        with open("gemini_validation_report.txt", "w", encoding="utf-8") as f:
            f.write(report)
        
        print("📋 Summary report saved to: gemini_validation_report.txt")

def main():
    print("🤖 Starting Gemini validation of flagged questions...")
    
    # Initialize validator with embedded API key
    validator = GeminiValidator()
    
    # Process flagged questions
    flagged_file = "ai_validated_questions/flagged_questions_fixed.json"
    results = validator.process_flagged_questions(flagged_file)
    
    # Save results
    validator.save_results(results)
    
    # Generate summary report
    validator.generate_summary_report(results)
    
    print("\n🎉 Gemini validation complete!")
    print(f"✅ {len(results['resolved'])} questions resolved and ready for database")
    print(f"⚠️  {len(results['still_disagreed'])} questions need manual review")
    print(f"❌ {len(results['errors'])} questions had processing errors")

if __name__ == "__main__":
    main()
