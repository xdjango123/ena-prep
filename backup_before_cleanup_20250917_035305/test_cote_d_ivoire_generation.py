#!/usr/bin/env python3
"""
Test Côte d'Ivoire question generation
"""

import os
import json
from openai import OpenAI

def test_generation():
    """Test generating Côte d'Ivoire questions"""
    
    # Try the API key from the user's message
    api_key = "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"
    
    try:
        client = OpenAI(api_key=api_key)
        
        prompt = """Generate 3 Culture Générale questions about Côte d'Ivoire for ENA exam.

IMPORTANT: Follow the exam format exactly:
- Questions should be in French
- Each question must have exactly 3 answer options (A, B, C)
- Options should be short and consistent in length
- Explanations should be in French
- Focus on Côte d'Ivoire: geography, history, culture, politics

Format each question as JSON:
{
  "question_text": "La question en français",
  "answer1": "Première option",
  "answer2": "Deuxième option", 
  "answer3": "Troisième option",
  "correct": "A",
  "explanation": "Explication détaillée en français"
}

Return only valid JSON array of questions, no other text."""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=1000
        )
        
        content = response.choices[0].message.content.strip()
        print("✅ API call successful!")
        print("Generated content:")
        print(content)
        
        # Try to parse JSON
        if content.startswith('```json'):
            content = content[7:]
        if content.endswith('```'):
            content = content[:-3]
        
        questions = json.loads(content)
        print(f"\n✅ Successfully parsed {len(questions)} questions")
        
        for i, q in enumerate(questions):
            print(f"\n{i+1}. {q['question_text']}")
            print(f"   A) {q['answer1']}")
            print(f"   B) {q['answer2']}")
            print(f"   C) {q['answer3']}")
            print(f"   Correct: {q['correct']}")
            print(f"   Explanation: {q['explanation']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    test_generation()
