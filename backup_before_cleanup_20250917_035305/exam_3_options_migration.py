#!/usr/bin/env python3
"""
Migration script to add 3-option exam support
Adds new fields to questions table and populates them with 3-option versions
"""

import os
import sys
import json
import random
from supabase import create_client, Client
from typing import List, Dict, Any, Tuple
from datetime import datetime

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

class Exam3OptionsMigration:
    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        self.questions_processed = 0
        self.questions_updated = 0
        self.questions_failed = 0
    
    def add_migration_columns(self):
        """Add new columns to questions table for 3-option support"""
        print("🔧 Adding migration columns to questions table...")
        
        # SQL commands to add new columns
        migration_sql = """
        ALTER TABLE questions 
        ADD COLUMN IF NOT EXISTS exam_options_3 JSONB,
        ADD COLUMN IF NOT EXISTS correct_3 TEXT CHECK (correct_3 IN ('A', 'B', 'C')),
        ADD COLUMN IF NOT EXISTS is_3_option_exam BOOLEAN DEFAULT FALSE;
        """
        
        try:
            # Execute the migration
            response = self.supabase.rpc('exec_sql', {'sql': migration_sql}).execute()
            print("✅ Migration columns added successfully!")
            return True
        except Exception as e:
            print(f"❌ Error adding migration columns: {e}")
            return False
    
    def select_3_options(self, question: Dict[str, Any]) -> Tuple[List[str], str]:
        """
        Select 3 options from 4, ensuring correct answer is included
        Uses smart selection to choose the best distractors
        """
        # Get all options
        options = [
            question.get('answer1', ''),
            question.get('answer2', ''),
            question.get('answer3', ''),
            question.get('answer4', '')
        ]
        
        # Filter out empty options
        valid_options = [opt for opt in options if opt and opt.strip()]
        
        if len(valid_options) < 3:
            # If less than 3 valid options, return what we have
            return valid_options, question.get('correct', 'A')
        
        # Get correct answer
        correct_letter = question.get('correct', 'A')
        correct_index = ord(correct_letter) - ord('A')  # A=0, B=1, C=2, D=3
        correct_answer = valid_options[correct_index] if correct_index < len(valid_options) else valid_options[0]
        
        # Create list of incorrect options
        incorrect_options = [opt for i, opt in enumerate(valid_options) if i != correct_index]
        
        # Smart selection of 2 additional options
        selected_incorrect = self.smart_select_distractors(incorrect_options, correct_answer, question)
        
        # Combine correct answer with selected incorrect options
        final_options = [correct_answer] + selected_incorrect
        
        # Shuffle to randomize order
        random.shuffle(final_options)
        
        # Find new correct answer position
        new_correct_index = final_options.index(correct_answer)
        new_correct_letter = chr(ord('A') + new_correct_index)
        
        return final_options, new_correct_letter
    
    def smart_select_distractors(self, incorrect_options: List[str], correct_answer: str, question: Dict[str, Any]) -> List[str]:
        """
        Smart selection of 2 distractors from incorrect options
        Prioritizes options that are plausible but clearly wrong
        """
        if len(incorrect_options) <= 2:
            return incorrect_options
        
        # Scoring system for distractor selection
        scored_options = []
        
        for option in incorrect_options:
            score = 0
            
            # Length similarity to correct answer (prefer similar length)
            length_diff = abs(len(option) - len(correct_answer))
            if length_diff <= 5:
                score += 2
            elif length_diff <= 10:
                score += 1
            
            # Content similarity (prefer options that share some words)
            correct_words = set(correct_answer.lower().split())
            option_words = set(option.lower().split())
            common_words = len(correct_words.intersection(option_words))
            if common_words > 0:
                score += 1
            
            # Avoid very short or very long options
            if 10 <= len(option) <= 100:
                score += 1
            
            # Prefer options that look like real answers (not obviously wrong)
            if not any(word in option.lower() for word in ['none', 'all', 'never', 'always']):
                score += 1
            
            scored_options.append((option, score))
        
        # Sort by score (descending) and take top 2
        scored_options.sort(key=lambda x: x[1], reverse=True)
        return [opt for opt, score in scored_options[:2]]
    
    def process_questions(self, limit: int = 1000):
        """Process questions to add 3-option versions"""
        print(f"🔄 Processing questions to add 3-option versions...")
        
        try:
            # Get questions that don't have 3-option versions yet
            response = self.supabase.table('questions').select('*').is_('exam_options_3', 'null').limit(limit).execute()
            questions = response.data
            
            print(f"📊 Found {len(questions)} questions to process")
            
            if not questions:
                print("❌ No questions found")
                return
            
            for i, question in enumerate(questions):
                try:
                    print(f"\n🔍 Processing question {i+1}/{len(questions)} (ID: {question.get('id', 'N/A')[:8]}...)")
                    
                    # Select 3 options
                    selected_options, new_correct = self.select_3_options(question)
                    
                    if len(selected_options) < 3:
                        print(f"   ⚠️  Skipping - only {len(selected_options)} valid options")
                        continue
                    
                    # Prepare update data
                    update_data = {
                        'exam_options_3': selected_options,
                        'correct_3': new_correct,
                        'is_3_option_exam': True
                    }
                    
                    # Update question
                    update_response = self.supabase.table('questions').update(update_data).eq('id', question['id']).execute()
                    
                    if update_response.data:
                        self.questions_updated += 1
                        print(f"   ✅ Updated successfully")
                        print(f"   📝 Options: {[opt[:30] + '...' if len(opt) > 30 else opt for opt in selected_options]}")
                        print(f"   �� Correct: {new_correct}")
                    else:
                        self.questions_failed += 1
                        print(f"   ❌ Failed to update")
                    
                    self.questions_processed += 1
                    
                except Exception as e:
                    print(f"   ❌ Error processing question: {e}")
                    self.questions_failed += 1
            
            # Print summary
            self.print_summary()
            
        except Exception as e:
            print(f"❌ Error processing questions: {e}")
    
    def print_summary(self):
        """Print processing summary"""
        print(f"\n📊 MIGRATION SUMMARY")
        print(f"{'='*50}")
        print(f"Questions processed: {self.questions_processed}")
        print(f"Questions updated: {self.questions_updated}")
        print(f"Questions failed: {self.questions_failed}")
        print(f"Success rate: {(self.questions_updated/max(self.questions_processed, 1)*100):.1f}%")
        print(f"{'='*50}")

def main():
    migration = Exam3OptionsMigration()
    
    print("🚀 Exam 3-Options Migration Tool")
    print("=" * 50)
    print("This tool adds 3-option support to existing questions.")
    print("=" * 50)
    
    while True:
        print("\nOptions:")
        print("1. Add migration columns to database")
        print("2. Process questions (add 3-option versions)")
        print("3. Test with sample questions")
        print("4. Exit")
        
        choice = input("\nEnter your choice (1-4): ").strip()
        
        if choice == '1':
            migration.add_migration_columns()
        
        elif choice == '2':
            limit = input("Enter limit (default 1000): ").strip()
            limit = int(limit) if limit.isdigit() else 1000
            migration.process_questions(limit)
        
        elif choice == '3':
            migration.process_questions(5)
        
        elif choice == '4':
            print("👋 Goodbye!")
            break
        
        else:
            print("❌ Invalid choice. Please enter 1-4.")

if __name__ == "__main__":
    main()
