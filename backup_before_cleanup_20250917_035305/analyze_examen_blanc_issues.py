#!/usr/bin/env python3
"""
Analyze examen blanc questions to identify all issues mentioned by the user
"""

import os
import sys
import json
from supabase import create_client, Client
from typing import List, Dict, Any
from openai import OpenAI

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

class ExamenBlancAnalyzer:
    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        
        # Set OpenAI API key
        os.environ["OPENAI_API_KEY"] = "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"
        
        # Initialize OpenAI
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("❌ OPENAI_API_KEY environment variable not set!")
            sys.exit(1)
        
        self.openai_client = OpenAI(api_key=api_key)
        print("✅ OpenAI client initialized successfully!")
    
    def get_all_examen_blanc_questions(self) -> List[Dict[str, Any]]:
        """Get all examen blanc questions from the database"""
        try:
            response = self.supabase.table('questions').select('*').eq('test_type', 'examen_blanc').execute()
            return response.data
        except Exception as e:
            print(f"Error fetching questions: {e}")
            return []
    
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
    
    def analyze_question_issues(self, question: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze a single question for all mentioned issues"""
        issues = {
            'id': question['id'],
            'category': question['category'],
            'question_text': question['question_text'],
            'explanation_mismatch': False,
            'explanation_language_issue': False,
            'options_language_issue': False,
            'options_inconsistency': False,
            'difficulty_issue': False,
            'issues_found': []
        }
        
        # 1. Check explanation mismatch
        explanation = question.get('explanation', '')
        if explanation:
            # Check if explanation mentions specific answer letters that don't match current options
            if 'Answer A' in explanation or 'Answer B' in explanation or 'Answer C' in explanation or 'Answer D' in explanation:
                issues['explanation_mismatch'] = True
                issues['issues_found'].append("Explanation references specific answer letters")
            
            # Check if explanation content matches question content
            question_lower = question['question_text'].lower()
            explanation_lower = explanation.lower()
            
            # Check for subject-verb agreement vs idiom explanations
            if 'subject-verb agreement' in question_lower or 'accord sujet-verbe' in question_lower:
                if any(phrase in explanation_lower for phrase in ['pros and cons', 'hit the nail', 'bite the bullet', 'let the cat out']):
                    issues['explanation_mismatch'] = True
                    issues['issues_found'].append("Explanation about idioms doesn't match subject-verb agreement question")
        
        # 2. Check explanation language for CG questions
        if question['category'] == 'CG' and explanation:
            explanation_lang = self.detect_language(explanation)
            if explanation_lang == 'english':
                issues['explanation_language_issue'] = True
                issues['issues_found'].append("CG explanation is in English instead of French")
        
        # 3. Check options language for CG questions
        if question['category'] == 'CG':
            options = [question.get('answer1', ''), question.get('answer2', ''), question.get('answer3', ''), question.get('answer4', '')]
            for i, option in enumerate(options, 1):
                if option:
                    option_lang = self.detect_language(option)
                    if option_lang == 'english':
                        issues['options_language_issue'] = True
                        issues['issues_found'].append(f"Option {i} is in English: '{option}'")
                        break
        
        # 4. Check options consistency
        options = [question.get('answer1', ''), question.get('answer2', ''), question.get('answer3', ''), question.get('answer4', '')]
        option_lengths = [len(opt) for opt in options if opt]
        if option_lengths:
            max_length = max(option_lengths)
            min_length = min(option_lengths)
            # If one option is significantly longer than others (more than 3x), it's inconsistent
            if max_length > min_length * 3:
                issues['options_inconsistency'] = True
                issues['issues_found'].append("Options have very different lengths/descriptions")
        
        # 5. Check difficulty for ANG questions
        if question['category'] == 'ANG':
            question_text = question['question_text'].lower()
            # Check for very advanced English concepts
            advanced_concepts = ['subjunctive', 'gerund', 'participle', 'conditional perfect', 'past perfect continuous', 'future perfect continuous']
            if any(concept in question_text for concept in advanced_concepts):
                issues['difficulty_issue'] = True
                issues['issues_found'].append("ANG question may be too advanced for French speakers")
        
        return issues
    
    def analyze_all_questions(self):
        """Analyze all examen blanc questions"""
        print("🔍 Analyzing all examen blanc questions...")
        
        questions = self.get_all_examen_blanc_questions()
        if not questions:
            print("❌ No questions found!")
            return
        
        print(f"📊 Found {len(questions)} examen blanc questions")
        
        # Analyze each question
        all_issues = []
        issues_by_category = {'ANG': [], 'CG': [], 'LOG': []}
        
        for question in questions:
            issues = self.analyze_question_issues(question)
            all_issues.append(issues)
            issues_by_category[question['category']].append(issues)
        
        # Print summary
        print("\n" + "="*80)
        print("📋 ANALYSIS SUMMARY")
        print("="*80)
        
        total_issues = sum(1 for q in all_issues if q['issues_found'])
        print(f"Total questions with issues: {total_issues}/{len(questions)}")
        
        for category in ['ANG', 'CG', 'LOG']:
            cat_issues = issues_by_category[category]
            cat_total = len(cat_issues)
            cat_problematic = sum(1 for q in cat_issues if q['issues_found'])
            
            print(f"\n{category} Questions: {cat_problematic}/{cat_total} have issues")
            
            # Count specific issue types
            explanation_mismatch = sum(1 for q in cat_issues if q['explanation_mismatch'])
            explanation_lang = sum(1 for q in cat_issues if q['explanation_language_issue'])
            options_lang = sum(1 for q in cat_issues if q['options_language_issue'])
            options_inconsistency = sum(1 for q in cat_issues if q['options_inconsistency'])
            difficulty = sum(1 for q in cat_issues if q['difficulty_issue'])
            
            print(f"  - Explanation mismatch: {explanation_mismatch}")
            print(f"  - Explanation language issue: {explanation_lang}")
            print(f"  - Options language issue: {options_lang}")
            print(f"  - Options inconsistency: {options_inconsistency}")
            print(f"  - Difficulty issue: {difficulty}")
        
        # Show some examples
        print("\n" + "="*80)
        print("🔍 EXAMPLE ISSUES")
        print("="*80)
        
        for category in ['ANG', 'CG', 'LOG']:
            cat_issues = [q for q in issues_by_category[category] if q['issues_found']]
            if cat_issues:
                print(f"\n{category} Examples:")
                for i, issue in enumerate(cat_issues[:3]):  # Show first 3 examples
                    print(f"\nExample {i+1}:")
                    print(f"Question: {issue['question_text'][:100]}...")
                    print(f"Issues: {', '.join(issue['issues_found'])}")
                    if issue['explanation_mismatch']:
                        print(f"Explanation: {question.get('explanation', '')[:100]}...")
        
        # Save detailed report
        with open('examen_blanc_issues_report.json', 'w', encoding='utf-8') as f:
            json.dump(all_issues, f, indent=2, ensure_ascii=False)
        
        print(f"\n💾 Detailed report saved to: examen_blanc_issues_report.json")
        
        return all_issues

if __name__ == "__main__":
    analyzer = ExamenBlancAnalyzer()
    analyzer.analyze_all_questions()
