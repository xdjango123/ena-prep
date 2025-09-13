#!/usr/bin/env python3
"""
Validate generated CM format questions for quality and consistency
"""

import os
import json
from supabase import create_client, Client
from typing import List, Dict, Any

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

class CMQuestionValidator:
    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    def detect_language(self, text: str) -> str:
        """Detect if text is in French or English"""
        if not text:
            return "unknown"
        
        # Simple heuristic: count French vs English words
        french_indicators = ['le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'ou', 'que', 'qui', 'dans', 'sur', 'avec', 'pour', 'par', 'est', 'sont', 'a', 'ont', 'ce', 'cette', 'ces', 'son', 'sa', 'ses', 'notre', 'votre', 'leur']
        english_indicators = ['the', 'a', 'an', 'and', 'or', 'that', 'which', 'in', 'on', 'with', 'for', 'by', 'is', 'are', 'has', 'have', 'this', 'these', 'his', 'her', 'its', 'our', 'your', 'their']
        
        text_lower = text.lower()
        french_count = sum(1 for word in french_indicators if word in text_lower)
        english_count = sum(1 for word in english_indicators if word in text_lower)
        
        if french_count > english_count:
            return "french"
        elif english_count > french_count:
            return "english"
        else:
            return "mixed"
    
    def validate_question(self, question: Dict[str, Any]) -> Dict[str, Any]:
        """Validate a single question for CM format compliance"""
        issues = {
            'id': question['id'],
            'category': question['category'],
            'question_text': question['question_text'],
            'issues': []
        }
        
        # Check format: should have exactly 3 options for all exam types
        if question.get('answer4') is not None:
            issues['issues'].append("Has 4 options instead of 3 (should be 3 options for all exam types)")
        
        # Check that we have 3 options
        options = [question.get('answer1'), question.get('answer2'), question.get('answer3')]
        if not all(options):
            issues['issues'].append("Missing one or more options")
        
        # Check language consistency
        if question['category'] == 'CG':
            # CG should be all French
            question_lang = self.detect_language(question['question_text'])
            if question_lang == 'english':
                issues['issues'].append("CG question in English (should be French)")
            
            explanation_lang = self.detect_language(question.get('explanation', ''))
            if explanation_lang == 'english':
                issues['issues'].append("CG explanation in English (should be French)")
            
            # Check options language
            for i, option in enumerate(options, 1):
                if option:
                    option_lang = self.detect_language(option)
                    if option_lang == 'english':
                        issues['issues'].append(f"CG option {i} in English: '{option}'")
                        break
        
        elif question['category'] == 'LOG':
            # LOG should be all French
            question_lang = self.detect_language(question['question_text'])
            if question_lang == 'english':
                issues['issues'].append("LOG question in English (should be French)")
            
            explanation_lang = self.detect_language(question.get('explanation', ''))
            if explanation_lang == 'english':
                issues['issues'].append("LOG explanation in English (should be French)")
        
        elif question['category'] == 'ANG':
            # ANG questions in English, explanations in French
            question_lang = self.detect_language(question['question_text'])
            if question_lang == 'french':
                issues['issues'].append("ANG question in French (should be English)")
            
            explanation_lang = self.detect_language(question.get('explanation', ''))
            if explanation_lang == 'english':
                issues['issues'].append("ANG explanation in English (should be French)")
        
        # Check option consistency (length)
        if all(options):
            lengths = [len(opt) for opt in options]
            max_length = max(lengths)
            min_length = min(lengths)
            # If one option is significantly longer (more than 3x), it's inconsistent
            if max_length > min_length * 3:
                issues['issues'].append("Options have very different lengths")
        
        # Check for explanation mismatch (references to specific answer letters)
        explanation = question.get('explanation', '')
        if 'Answer A' in explanation or 'Answer B' in explanation or 'Answer C' in explanation:
            issues['issues'].append("Explanation references specific answer letters")
        
        # Check for advanced English concepts in ANG questions
        if question['category'] == 'ANG':
            question_text = question['question_text'].lower()
            advanced_concepts = ['subjunctive', 'gerund', 'participle', 'conditional perfect', 'past perfect continuous', 'future perfect continuous']
            if any(concept in question_text for concept in advanced_concepts):
                issues['issues'].append("ANG question may be too advanced for French speakers")
        
        return issues
    
    def validate_all_questions(self):
        """Validate all examen blanc questions"""
        print("🔍 Validating CM format questions...")
        
        try:
            response = self.supabase.table('questions').select('*').eq('test_type', 'examen_blanc').execute()
            questions = response.data
            
            if not questions:
                print("❌ No examen blanc questions found!")
                return
            
            print(f"📊 Found {len(questions)} examen blanc questions to validate")
            
            # Validate each question
            all_issues = []
            issues_by_category = {'ANG': [], 'CG': [], 'LOG': []}
            
            for question in questions:
                issues = self.validate_question(question)
                all_issues.append(issues)
                issues_by_category[question['category']].append(issues)
            
            # Print summary
            print("\n" + "="*80)
            print("📋 VALIDATION SUMMARY")
            print("="*80)
            
            total_issues = sum(1 for q in all_issues if q['issues'])
            print(f"Total questions with issues: {total_issues}/{len(questions)}")
            
            for category in ['ANG', 'CG', 'LOG']:
                cat_issues = issues_by_category[category]
                cat_total = len(cat_issues)
                cat_problematic = sum(1 for q in cat_issues if q['issues'])
                
                print(f"\n{category} Questions: {cat_problematic}/{cat_total} have issues")
                
                if cat_problematic > 0:
                    # Show specific issue types
                    issue_types = {}
                    for q in cat_issues:
                        if q['issues']:
                            for issue in q['issues']:
                                issue_type = issue.split(':')[0] if ':' in issue else issue
                                issue_types[issue_type] = issue_types.get(issue_type, 0) + 1
                    
                    for issue_type, count in issue_types.items():
                        print(f"  - {issue_type}: {count}")
            
            # Show some examples of issues
            print("\n" + "="*80)
            print("🔍 EXAMPLE ISSUES")
            print("="*80)
            
            for category in ['ANG', 'CG', 'LOG']:
                cat_issues = [q for q in issues_by_category[category] if q['issues']]
                if cat_issues:
                    print(f"\n{category} Examples:")
                    for i, issue in enumerate(cat_issues[:3]):  # Show first 3 examples
                        print(f"\nExample {i+1}:")
                        print(f"Question: {issue['question_text'][:100]}...")
                        print(f"Issues: {', '.join(issue['issues'])}")
            
            # Save detailed report
            with open('cm_validation_report.json', 'w', encoding='utf-8') as f:
                json.dump(all_issues, f, indent=2, ensure_ascii=False)
            
            print(f"\n💾 Detailed validation report saved to: cm_validation_report.json")
            
            if total_issues == 0:
                print("\n🎉 All questions pass validation! CM format is correctly implemented.")
            else:
                print(f"\n⚠️  {total_issues} questions need attention.")
            
            return all_issues
            
        except Exception as e:
            print(f"❌ Error validating questions: {e}")
            return []

if __name__ == "__main__":
    validator = CMQuestionValidator()
    validator.validate_all_questions()
