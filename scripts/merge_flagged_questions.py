#!/usr/bin/env python3
"""
Merge fixed flagged questions into the main questions file.

Usage:
    python merge_flagged_questions.py --main cms_exam_questions_20251209_195854.json \
                                       --flagged cms_exam_flagged_20251209_195854.json \
                                       --output cms_exam_merged.json

Instructions:
1. Open the flagged file and fix the questions:
   - Update "correct_index" to the correct answer (0, 1, 2, or 3)
   - Update "correct_text" to match the correct option
   - Update "explanation" if needed
   - Change "validation_status" from "flagged" to "manually_verified"

2. Run this script to merge them into the main file
"""

import json
import argparse
from pathlib import Path
from datetime import datetime


def merge_files(main_path: str, flagged_path: str, output_path: str):
    """Merge flagged questions into main file."""
    
    # Load main file
    with open(main_path, 'r', encoding='utf-8') as f:
        main_data = json.load(f)
    
    # Load flagged file
    with open(flagged_path, 'r', encoding='utf-8') as f:
        flagged_data = json.load(f)
    
    main_questions = main_data['questions']
    flagged_questions = flagged_data['questions']
    
    # Count how many flagged questions have been fixed
    fixed_count = 0
    still_flagged = 0
    
    questions_to_add = []
    
    for q in flagged_questions:
        status = q.get('validation_status', 'flagged')
        
        if status == 'manually_verified' or status == 'validated':
            # This question has been fixed - add it
            q['validation_status'] = 'manually_verified'
            questions_to_add.append(q)
            fixed_count += 1
        else:
            still_flagged += 1
    
    print(f"Found {fixed_count} fixed questions to merge")
    print(f"Still flagged (not fixed): {still_flagged}")
    
    if fixed_count == 0:
        print("\nNo questions to merge. Make sure to change 'validation_status' to 'manually_verified' for fixed questions.")
        return
    
    # Merge questions
    merged_questions = main_questions + questions_to_add
    
    # Sort by test_number and question_number
    merged_questions.sort(key=lambda x: (x['test_number'], x['question_number']))
    
    # Update metadata
    main_data['metadata']['total_questions'] = len(merged_questions)
    main_data['metadata']['merged_at'] = datetime.now().isoformat()
    main_data['metadata']['manually_verified_added'] = fixed_count
    main_data['metadata']['excluded_flagged'] = still_flagged
    
    main_data['questions'] = merged_questions
    
    # Save merged file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(main_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ Merged file saved to: {output_path}")
    print(f"  Total questions: {len(merged_questions)}")


def main():
    parser = argparse.ArgumentParser(description="Merge fixed flagged questions into main file")
    parser.add_argument('--main', required=True, help='Path to main questions JSON file')
    parser.add_argument('--flagged', required=True, help='Path to flagged questions JSON file')
    parser.add_argument('--output', required=True, help='Path for merged output file')
    
    args = parser.parse_args()
    
    merge_files(args.main, args.flagged, args.output)


if __name__ == '__main__':
    main()

