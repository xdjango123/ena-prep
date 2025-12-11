#!/usr/bin/env python3
"""
Assign Test Numbers Script

Assigns unique test_numbers to questions for practice tests and exam blancs.
Each question can only belong to ONE test (no duplicates across tests).

Requirements:
- Practice: 10 tests per exam_type, 15 questions per subject per test
- Exam Blanc: 20 exams per exam_type, 20 questions per subject per exam
- Questions CANNOT appear in both practice AND exam_blanc (already separated by test_type)
- Prioritize HARD difficulty questions first
- Questions not assigned keep test_number = NULL

Usage:
    python assign_test_numbers.py           # Execute assignment
    python assign_test_numbers.py --dry-run # Preview without changes
    python assign_test_numbers.py --report  # Show current state only
"""

import os
import sys
import json
import random
from datetime import datetime
from typing import Dict, List, Set, Tuple
from collections import defaultdict
from dotenv import load_dotenv

load_dotenv()

from supabase import create_client

# Initialize Supabase - prefer service_role key for admin operations
SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('VITE_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Configuration
EXAM_TYPES = ['CM', 'CMS', 'CS']
SUBJECTS = ['ANG', 'CG', 'LOG']

# Practice test configuration
PRACTICE_TESTS_PER_EXAM_TYPE = 10
PRACTICE_QUESTIONS_PER_SUBJECT = 15  # per test

# Exam blanc configuration
EXAM_BLANC_PER_EXAM_TYPE = 20
EXAM_BLANC_QUESTIONS_PER_SUBJECT = 20  # per exam

# Difficulty priority (HARD first)
DIFFICULTY_PRIORITY = ['HARD', 'MED', 'EASY']


class TestNumberAssigner:
    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.report = {
            'timestamp': datetime.now().isoformat(),
            'dry_run': dry_run,
            'practice': defaultdict(lambda: defaultdict(dict)),
            'exam_blanc': defaultdict(lambda: defaultdict(dict)),
            'gaps': [],
            'summary': {}
        }
        
    def fetch_questions(self, exam_type: str, test_type: str, subject: str) -> List[Dict]:
        """Fetch all questions matching criteria, ordered by difficulty priority"""
        all_questions = []
        
        # Fetch in batches (Supabase limit)
        page_size = 500
        offset = 0
        
        while True:
            response = supabase.table('questions_v2') \
                .select('id, text, difficulty, test_number') \
                .eq('exam_type', exam_type) \
                .eq('test_type', test_type) \
                .eq('subject', subject) \
                .order('id') \
                .range(offset, offset + page_size - 1) \
                .execute()
            
            if not response.data:
                break
                
            all_questions.extend(response.data)
            
            if len(response.data) < page_size:
                break
                
            offset += page_size
        
        # Sort by difficulty priority (HARD first, then MED, then EASY)
        def difficulty_sort_key(q):
            diff = q.get('difficulty', 'EASY')
            try:
                return DIFFICULTY_PRIORITY.index(diff)
            except ValueError:
                return len(DIFFICULTY_PRIORITY)  # Unknown difficulty last
        
        # Shuffle first for randomness within same difficulty
        random.shuffle(all_questions)
        # Then stable sort by difficulty
        all_questions.sort(key=difficulty_sort_key)
        
        return all_questions
    
    def clear_all_test_numbers(self):
        """Clear all existing test_numbers"""
        print("\n🗑️  Clearing all existing test_numbers...")
        
        if self.dry_run:
            print("   [DRY RUN] Would clear all test_numbers")
            return
        
        # Get count of questions with test_numbers
        count_response = supabase.table('questions_v2') \
            .select('id', count='exact') \
            .not_.is_('test_number', 'null') \
            .execute()
        
        count = count_response.count or 0
        print(f"   Found {count} questions with existing test_numbers")
        
        if count > 0:
            # Clear in batches to avoid timeout
            # Supabase doesn't support bulk update easily, so we'll use a different approach
            # Update all rows where test_number is not null
            response = supabase.table('questions_v2') \
                .update({'test_number': None}) \
                .not_.is_('test_number', 'null') \
                .execute()
            
            print(f"   ✅ Cleared test_numbers")
    
    def batch_update_test_numbers(self, question_ids: List[str], test_number: int):
        """Batch update test_numbers for a list of question IDs"""
        if not question_ids or self.dry_run:
            return
        
        # Supabase has limits on IN clause, batch in chunks of 100
        chunk_size = 100
        for i in range(0, len(question_ids), chunk_size):
            chunk = question_ids[i:i + chunk_size]
            supabase.table('questions_v2') \
                .update({'test_number': test_number}) \
                .in_('id', chunk) \
                .execute()
    
    def assign_practice_tests(self, exam_type: str) -> Dict:
        """Assign test_numbers for practice tests of a specific exam_type"""
        print(f"\n📝 Assigning PRACTICE tests for {exam_type}...")
        
        results = {}
        
        for subject in SUBJECTS:
            questions = self.fetch_questions(exam_type, 'practice', subject)
            total_needed = PRACTICE_TESTS_PER_EXAM_TYPE * PRACTICE_QUESTIONS_PER_SUBJECT
            
            available = len(questions)
            to_assign = min(available, total_needed)
            
            print(f"   {subject}: {available} available, need {total_needed}, assigning {to_assign}")
            
            if available < total_needed:
                gap = total_needed - available
                self.report['gaps'].append({
                    'exam_type': exam_type,
                    'test_type': 'practice',
                    'subject': subject,
                    'needed': total_needed,
                    'available': available,
                    'gap': gap
                })
            
            # Assign test_numbers 1-10
            assigned_count = 0
            for test_num in range(1, PRACTICE_TESTS_PER_EXAM_TYPE + 1):
                start_idx = (test_num - 1) * PRACTICE_QUESTIONS_PER_SUBJECT
                end_idx = start_idx + PRACTICE_QUESTIONS_PER_SUBJECT
                
                batch = questions[start_idx:end_idx]
                
                if not batch:
                    break
                
                # Batch update for efficiency
                batch_ids = [q['id'] for q in batch]
                self.batch_update_test_numbers(batch_ids, test_num)
                
                assigned_count += len(batch)
            
            results[subject] = {
                'available': available,
                'needed': total_needed,
                'assigned': assigned_count
            }
            
            self.report['practice'][exam_type][subject] = results[subject]
        
        return results
    
    def assign_exam_blanc(self, exam_type: str) -> Dict:
        """Assign test_numbers for exam blancs of a specific exam_type"""
        print(f"\n📋 Assigning EXAM BLANC for {exam_type}...")
        
        results = {}
        
        for subject in SUBJECTS:
            questions = self.fetch_questions(exam_type, 'exam_blanc', subject)
            total_needed = EXAM_BLANC_PER_EXAM_TYPE * EXAM_BLANC_QUESTIONS_PER_SUBJECT
            
            available = len(questions)
            to_assign = min(available, total_needed)
            
            print(f"   {subject}: {available} available, need {total_needed}, assigning {to_assign}")
            
            if available < total_needed:
                gap = total_needed - available
                self.report['gaps'].append({
                    'exam_type': exam_type,
                    'test_type': 'exam_blanc',
                    'subject': subject,
                    'needed': total_needed,
                    'available': available,
                    'gap': gap
                })
            
            # Assign test_numbers 1-20
            assigned_count = 0
            for test_num in range(1, EXAM_BLANC_PER_EXAM_TYPE + 1):
                start_idx = (test_num - 1) * EXAM_BLANC_QUESTIONS_PER_SUBJECT
                end_idx = start_idx + EXAM_BLANC_QUESTIONS_PER_SUBJECT
                
                batch = questions[start_idx:end_idx]
                
                if not batch:
                    break
                
                # Batch update for efficiency
                batch_ids = [q['id'] for q in batch]
                self.batch_update_test_numbers(batch_ids, test_num)
                
                assigned_count += len(batch)
            
            results[subject] = {
                'available': available,
                'needed': total_needed,
                'assigned': assigned_count
            }
            
            self.report['exam_blanc'][exam_type][subject] = results[subject]
        
        return results
    
    def generate_report(self):
        """Generate final report"""
        print("\n" + "=" * 70)
        print("📊 TEST NUMBER ASSIGNMENT REPORT")
        print("=" * 70)
        
        if self.dry_run:
            print("⚠️  DRY RUN - No changes were made to the database")
        
        # Practice summary
        print("\n📝 PRACTICE TESTS (10 tests × 15 questions per subject):")
        total_practice_assigned = 0
        total_practice_needed = 0
        
        for exam_type in EXAM_TYPES:
            print(f"\n   {exam_type}:")
            for subject in SUBJECTS:
                data = self.report['practice'][exam_type].get(subject, {})
                assigned = data.get('assigned', 0)
                needed = data.get('needed', 0)
                total_practice_assigned += assigned
                total_practice_needed += needed
                status = '✅' if assigned >= needed else f'⚠️ ({needed - assigned} short)'
                print(f"      {subject}: {assigned}/{needed} {status}")
        
        # Exam blanc summary
        print("\n📋 EXAM BLANC (20 exams × 20 questions per subject):")
        total_exam_assigned = 0
        total_exam_needed = 0
        
        for exam_type in EXAM_TYPES:
            print(f"\n   {exam_type}:")
            for subject in SUBJECTS:
                data = self.report['exam_blanc'][exam_type].get(subject, {})
                assigned = data.get('assigned', 0)
                needed = data.get('needed', 0)
                total_exam_assigned += assigned
                total_exam_needed += needed
                status = '✅' if assigned >= needed else f'⚠️ ({needed - assigned} short)'
                print(f"      {subject}: {assigned}/{needed} {status}")
        
        # Overall summary
        print("\n" + "-" * 70)
        print("SUMMARY:")
        print(f"   Practice: {total_practice_assigned}/{total_practice_needed} assigned")
        print(f"   Exam Blanc: {total_exam_assigned}/{total_exam_needed} assigned")
        print(f"   Total: {total_practice_assigned + total_exam_assigned}/{total_practice_needed + total_exam_needed}")
        
        # Gaps
        if self.report['gaps']:
            print("\n⚠️  GAPS (need more questions):")
            for gap in self.report['gaps']:
                print(f"   - {gap['exam_type']} {gap['test_type']} {gap['subject']}: " +
                      f"need {gap['gap']} more questions")
        else:
            print("\n✅ No gaps - all test slots filled!")
        
        # Save report to file
        self.report['summary'] = {
            'practice_assigned': total_practice_assigned,
            'practice_needed': total_practice_needed,
            'exam_blanc_assigned': total_exam_assigned,
            'exam_blanc_needed': total_exam_needed,
            'total_assigned': total_practice_assigned + total_exam_assigned,
            'total_needed': total_practice_needed + total_exam_needed,
            'gaps_count': len(self.report['gaps'])
        }
        
        report_file = f"diagnostics_output/test_number_assignment_{'dryrun_' if self.dry_run else ''}{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        # Convert defaultdicts to regular dicts for JSON serialization
        report_dict = {
            'timestamp': self.report['timestamp'],
            'dry_run': self.report['dry_run'],
            'practice': {k: dict(v) for k, v in self.report['practice'].items()},
            'exam_blanc': {k: dict(v) for k, v in self.report['exam_blanc'].items()},
            'gaps': self.report['gaps'],
            'summary': self.report['summary']
        }
        
        with open(report_file, 'w') as f:
            json.dump(report_dict, f, indent=2)
        
        print(f"\n📁 Report saved to: {report_file}")
    
    def show_current_state(self):
        """Show current state without making changes"""
        print("\n📊 CURRENT DATABASE STATE")
        print("=" * 70)
        
        # Total
        total = supabase.table('questions_v2').select('id', count='exact').execute()
        print(f"\nTotal questions: {total.count}")
        
        # By test_type
        print("\nBy test_type:")
        for tt in ['practice', 'exam_blanc']:
            count = supabase.table('questions_v2').select('id', count='exact').eq('test_type', tt).execute()
            print(f"   {tt}: {count.count}")
        
        # Questions with test_numbers
        with_num = supabase.table('questions_v2').select('id', count='exact').not_.is_('test_number', 'null').execute()
        without_num = supabase.table('questions_v2').select('id', count='exact').is_('test_number', 'null').execute()
        print(f"\nWith test_number: {with_num.count}")
        print(f"Without test_number: {without_num.count}")
        
        # Detailed breakdown
        print("\n" + "-" * 70)
        print("DETAILED BREAKDOWN:")
        
        practice_needed = PRACTICE_TESTS_PER_EXAM_TYPE * PRACTICE_QUESTIONS_PER_SUBJECT
        exam_blanc_needed = EXAM_BLANC_PER_EXAM_TYPE * EXAM_BLANC_QUESTIONS_PER_SUBJECT
        
        for exam_type in EXAM_TYPES:
            print(f"\n{exam_type}:")
            for test_type in ['practice', 'exam_blanc']:
                needed = practice_needed if test_type == 'practice' else exam_blanc_needed
                print(f"   {test_type} (need {needed}/subject):")
                for subject in SUBJECTS:
                    count = supabase.table('questions_v2').select('id', count='exact') \
                        .eq('exam_type', exam_type) \
                        .eq('test_type', test_type) \
                        .eq('subject', subject) \
                        .execute()
                    have = count.count or 0
                    status = '✅' if have >= needed else f'⚠️ need {needed - have} more'
                    print(f"      {subject}: {have} {status}")
    
    def run(self):
        """Main execution"""
        print("🔢 Test Number Assignment Script")
        print("=" * 70)
        
        if self.dry_run:
            print("🔍 DRY RUN MODE - No changes will be made")
        
        # Step 1: Clear existing test_numbers
        self.clear_all_test_numbers()
        
        # Step 2: Assign practice tests for each exam_type
        for exam_type in EXAM_TYPES:
            self.assign_practice_tests(exam_type)
        
        # Step 3: Assign exam blancs for each exam_type
        for exam_type in EXAM_TYPES:
            self.assign_exam_blanc(exam_type)
        
        # Step 4: Generate report
        self.generate_report()
        
        print("\n✅ Assignment complete!")


def main():
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        
        if arg == '--dry-run':
            assigner = TestNumberAssigner(dry_run=True)
            assigner.run()
        elif arg == '--report':
            assigner = TestNumberAssigner(dry_run=True)
            assigner.show_current_state()
        elif arg == '--help':
            print(__doc__)
        else:
            print(f"Unknown argument: {arg}")
            print("Use --help for usage information")
    else:
        # Actual execution
        assigner = TestNumberAssigner(dry_run=False)
        assigner.run()


if __name__ == '__main__':
    main()

