#!/usr/bin/env python3
"""
Claude Question Validation Script
Validates generated questions using Claude API for quality and correctness
"""

import os
import sys
import json
from datetime import datetime
from typing import List, Dict, Any
import anthropic
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

class ClaudeQuestionValidator:
    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        
        # Initialize Claude
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            print("❌ ANTHROPIC_API_KEY environment variable not set!")
            print("Please set your Anthropic API key:")
            print("export ANTHROPIC_API_KEY='your-api-key-here'")
            sys.exit(1)
        
        self.claude_client = anthropic.Anthropic(api_key=api_key)
        
        # Validation statistics
        self.total_questions = 0
        self.passed_questions = 0
        self.warning_questions = 0
        self.failed_questions = 0
        self.validation_issues = {
            "incorrect_answers": 0,
            "ambiguous_questions": 0,
            "near_duplicates": 0,
            "quality_concerns": 0,
            "explanation_issues": 0,
            "difficulty_mismatch": 0
        }
        
        print("✅ Claude client initialized successfully!")
    
    def get_questions_to_validate(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get AI-generated questions from database for validation"""
        try:
            response = self.supabase.table('questions').select('*').eq('ai_generated', True).limit(limit).execute()
            return response.data or []
        except Exception as e:
            print(f"❌ Error fetching questions: {e}")
            return []
    
    def validate_question(self, question: Dict[str, Any]) -> Dict[str, Any]:
        """Validate a single question using Claude"""
        
        # Prepare question data for validation
        question_text = f"""
Question ID: {question.get('id', 'Unknown')}
Category: {question.get('category', 'Unknown')}
Exam Type: {question.get('exam_type', 'Unknown')}
Test Type: {question.get('test_type', 'Unknown')}
Difficulty: {question.get('difficulty', 'Unknown')}
Sub-category: {question.get('sub_category', 'Unknown')}

Question: {question.get('question_text', '')}

Options:
A) {question.get('answer1', '')}
B) {question.get('answer2', '')}
C) {question.get('answer3', '')}
D) {question.get('answer4', 'N/A (3-option question)')}

Correct Answer: {question.get('correct', '')}
Explanation: {question.get('explanation', '')}
"""

        prompt = f"""You are an expert educational content validator for the École Nationale d'Administration (ENA) entrance exam preparation for Côte d'Ivoire.

Please validate this question and provide a detailed assessment:

{question_text}

Validation Criteria:
1. **Correctness**: Is the marked correct answer actually correct?
2. **Quality**: Is the question clear, unambiguous, and well-formed?
3. **Difficulty**: Does the difficulty level match the actual challenge level?
4. **Options**: Are all distractors plausible but clearly incorrect?
5. **Explanation**: Is the explanation accurate and helpful?
6. **Context**: For CG questions, is there appropriate Côte d'Ivoire context?
7. **Language**: Is the language appropriate for the subject (English for ANG, French for CG/LOG)?
8. **Format**: Is the question properly formatted with exactly 3 options?

Please respond with a JSON object containing:
{{
  "status": "PASS|WARNING|FAIL",
  "correctness": "CORRECT|INCORRECT|UNCLEAR",
  "quality_score": 1-10,
  "difficulty_match": "APPROPRIATE|TOO_EASY|TOO_HARD",
  "issues": ["list", "of", "specific", "issues"],
  "recommendations": ["list", "of", "recommendations"],
  "explanation_quality": "GOOD|NEEDS_IMPROVEMENT|POOR",
  "context_relevance": "APPROPRIATE|NEEDS_MORE_CONTEXT|IRRELEVANT"
}}

Be thorough but concise. Focus on educational value and exam appropriateness."""

        try:
            response = self.claude_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1000,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            content = response.content[0].text.strip()
            
            # Try to parse JSON response
            try:
                # Clean the response to extract JSON
                start_idx = content.find('{')
                end_idx = content.rfind('}') + 1
                
                if start_idx != -1 and end_idx > start_idx:
                    json_content = content[start_idx:end_idx]
                    validation_result = json.loads(json_content)
                    
                    # Add question ID for tracking
                    validation_result['question_id'] = question.get('id')
                    validation_result['question_text'] = question.get('question_text', '')[:100] + "..."
                    
                    return validation_result
                else:
                    return {
                        "status": "FAIL",
                        "error": "Could not parse Claude response",
                        "question_id": question.get('id'),
                        "question_text": question.get('question_text', '')[:100] + "..."
                    }
                    
            except json.JSONDecodeError as e:
                return {
                    "status": "FAIL",
                    "error": f"JSON parse error: {e}",
                    "question_id": question.get('id'),
                    "question_text": question.get('question_text', '')[:100] + "..."
                }
                
        except Exception as e:
            return {
                "status": "FAIL",
                "error": f"Claude API error: {e}",
                "question_id": question.get('id'),
                "question_text": question.get('question_text', '')[:100] + "..."
            }
    
    def validate_questions_batch(self, questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Validate a batch of questions"""
        results = []
        
        print(f"🔍 Validating {len(questions)} questions...")
        
        for i, question in enumerate(questions, 1):
            print(f"  📝 Validating question {i}/{len(questions)}: {question.get('question_text', '')[:50]}...")
            
            result = self.validate_question(question)
            results.append(result)
            
            # Update statistics
            self.total_questions += 1
            status = result.get('status', 'FAIL')
            
            if status == 'PASS':
                self.passed_questions += 1
            elif status == 'WARNING':
                self.warning_questions += 1
            else:
                self.failed_questions += 1
            
            # Count specific issues
            issues = result.get('issues', [])
            for issue in issues:
                issue_lower = issue.lower()
                if 'incorrect' in issue_lower or 'wrong' in issue_lower:
                    self.validation_issues["incorrect_answers"] += 1
                elif 'ambiguous' in issue_lower or 'unclear' in issue_lower:
                    self.validation_issues["ambiguous_questions"] += 1
                elif 'duplicate' in issue_lower or 'similar' in issue_lower:
                    self.validation_issues["near_duplicates"] += 1
                elif 'explanation' in issue_lower:
                    self.validation_issues["explanation_issues"] += 1
                elif 'difficulty' in issue_lower:
                    self.validation_issues["difficulty_mismatch"] += 1
                else:
                    self.validation_issues["quality_concerns"] += 1
        
        return results
    
    def generate_validation_report(self, results: List[Dict[str, Any]]) -> str:
        """Generate a comprehensive validation report"""
        
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        report = f"""
VALIDATION REPORT
=================
Generated: {timestamp}
Total Questions: {self.total_questions}
✅ Passed: {self.passed_questions} ({self.passed_questions/self.total_questions*100:.1f}%)
⚠️  Warnings: {self.warning_questions} ({self.warning_questions/self.total_questions*100:.1f}%)
❌ Failed: {self.failed_questions} ({self.failed_questions/self.total_questions*100:.1f}%)

Issues by Category:
- Incorrect answers: {self.validation_issues['incorrect_answers']}
- Ambiguous questions: {self.validation_issues['ambiguous_questions']}
- Near-duplicates: {self.validation_issues['near_duplicates']}
- Quality concerns: {self.validation_issues['quality_concerns']}
- Explanation issues: {self.validation_issues['explanation_issues']}
- Difficulty mismatch: {self.validation_issues['difficulty_mismatch']}

Detailed Results:
"""
        
        # Add detailed results
        for result in results:
            status = result.get('status', 'UNKNOWN')
            question_id = result.get('question_id', 'Unknown')
            question_text = result.get('question_text', 'Unknown')
            
            report += f"\nQuestion {question_id}: {status}\n"
            report += f"Text: {question_text}\n"
            
            if 'issues' in result:
                report += f"Issues: {', '.join(result['issues'])}\n"
            
            if 'recommendations' in result:
                report += f"Recommendations: {', '.join(result['recommendations'])}\n"
            
            report += "-" * 50 + "\n"
        
        return report
    
    def save_validation_report(self, report: str):
        """Save validation report to file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = f"/Users/joasyepidan/Documents/projects/ena/project/validation_report_{timestamp}.txt"
        
        try:
            with open(report_file, 'w', encoding='utf-8') as f:
                f.write(report)
            print(f"📄 Validation report saved to: {report_file}")
        except Exception as e:
            print(f"❌ Error saving report: {e}")
    
    def get_questions_needing_review(self, results: List[Dict[str, Any]]) -> List[str]:
        """Get list of question IDs that need manual review"""
        review_needed = []
        
        for result in results:
            status = result.get('status', 'FAIL')
            if status in ['WARNING', 'FAIL']:
                review_needed.append(result.get('question_id', 'Unknown'))
        
        return review_needed
    
    def validate_all_questions(self, limit: int = 100):
        """Validate all AI-generated questions"""
        
        print("🔍 Starting question validation with Claude...")
        print(f"📊 Will validate up to {limit} questions")
        print("-" * 60)
        
        # Get questions to validate
        questions = self.get_questions_to_validate(limit)
        
        if not questions:
            print("❌ No questions found to validate")
            return
        
        print(f"📚 Found {len(questions)} questions to validate")
        
        # Validate questions
        results = self.validate_questions_batch(questions)
        
        # Generate report
        report = self.generate_validation_report(results)
        
        # Print summary
        print("\n" + report)
        
        # Save detailed report
        self.save_validation_report(report)
        
        # Get questions needing review
        review_needed = self.get_questions_needing_review(results)
        
        if review_needed:
            print(f"\n⚠️  Questions needing manual review: {len(review_needed)}")
            print("Question IDs:", ", ".join(review_needed[:10]) + ("..." if len(review_needed) > 10 else ""))
        
        print(f"\n🎉 Validation completed!")
        print(f"📊 Pass rate: {self.passed_questions/self.total_questions*100:.1f}%")

if __name__ == "__main__":
    validator = ClaudeQuestionValidator()
    
    # Get limit from command line argument or use default
    limit = 100
    if len(sys.argv) > 1:
        try:
            limit = int(sys.argv[1])
        except ValueError:
            print("❌ Invalid limit. Using default of 100.")
    
    validator.validate_all_questions(limit)


