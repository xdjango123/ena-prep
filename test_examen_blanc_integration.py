#!/usr/bin/env python3
"""
Test script to verify examen blanc integration
"""

import json
import os

def test_examen_blanc_data():
    """Test the generated examen blanc data"""
    
    # Check if the JSON file exists
    json_file = "examens_blancs_20250912_114453.json"
    if not os.path.exists(json_file):
        print(f"❌ JSON file {json_file} not found")
        return False
    
    # Load and validate the data
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print("✅ JSON file loaded successfully")
    print(f"Generated at: {data['generated_at']}")
    
    # Check exam types
    exam_types = data['exam_types']
    print(f"Available exam types: {list(exam_types.keys())}")
    
    for exam_type, examens in exam_types.items():
        print(f"\n📊 {exam_type} Examens:")
        print(f"  Total examens: {len(examens)}")
        
        for examen in examens:
            print(f"  Examen #{examen['exam_number']}: {examen['total_questions']} questions")
            
            # Check question distribution
            categories = {}
            for q in examen['questions']:
                cat = q['category']
                categories[cat] = categories.get(cat, 0) + 1
            
            print(f"    Distribution: {categories}")
            
            # Check for LOG questions with exponents
            log_questions = [q for q in examen['questions'] if q['category'] == 'LOG']
            exponent_questions = [q for q in log_questions if '^' in q['question_text'] or any('^' in str(q.get(f'answer{i}', '')) for i in range(1, 4))]
            
            if exponent_questions:
                print(f"    LOG questions with exponents: {len(exponent_questions)}")
                for q in exponent_questions[:2]:  # Show first 2
                    print(f"      - {q['question_text'][:60]}...")
                    for i in range(1, 4):
                        answer = q.get(f'answer{i}', '')
                        if '^' in str(answer):
                            print(f"        Answer {i}: {answer}")
    
    print("\n✅ Examen blanc data validation complete!")
    return True

def test_public_file():
    """Test if the file is accessible in the public directory"""
    public_file = "public/examens_blancs_20250912_114453.json"
    
    if os.path.exists(public_file):
        print("✅ File is available in public directory")
        return True
    else:
        print("❌ File not found in public directory")
        return False

if __name__ == "__main__":
    print("🧪 Testing Examen Blanc Integration")
    print("=" * 50)
    
    success = True
    
    # Test data validation
    if not test_examen_blanc_data():
        success = False
    
    print("\n" + "=" * 50)
    
    # Test public file
    if not test_public_file():
        success = False
    
    print("\n" + "=" * 50)
    
    if success:
        print("🎉 All tests passed! Examen blanc integration is ready.")
    else:
        print("❌ Some tests failed. Please check the issues above.")
