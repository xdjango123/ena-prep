#!/usr/bin/env python3
"""
Test the fixed question generation script
"""

import os
import sys
import hashlib
import json
import uuid
import re
from datetime import datetime, timezone
from supabase import create_client, Client
from typing import List, Dict, Any
from openai import OpenAI

# Supabase configuration
SUPABASE_URL = "https://ohngxnhnbwnystzkqzwy.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE"

class TestFixedGenerator:
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
    
    def clean_json_response(self, content: str) -> str:
        """Clean JSON response by removing markdown code blocks"""
        # Remove markdown code blocks
        content = re.sub(r'```json\s*', '', content)
        content = re.sub(r'```\s*$', '', content)
        content = content.strip()
        return content
    
    def generate_test_questions(self, category: str, difficulty: str, count: int = 2) -> List[Dict[str, Any]]:
        """Generate a small test batch of questions"""
        
        # Create prompt based on category
        if category == 'ANG':
            subject_name = "English Language"
            sub_category = "English Language Skills"
            topics = ["grammar", "vocabulary", "reading comprehension"]
            language = "English"
        elif category == 'CG':
            subject_name = "General Knowledge (Culture Générale)"
            sub_category = "Culture Générale"
            topics = ["history", "geography", "science", "literature"]
            language = "French"
        else:  # LOG
            subject_name = "Logic (Logique)"
            sub_category = "Aptitude Numérique et Organisation"
            topics = ["mathematical reasoning", "logical sequences", "problem solving"]
            language = "French"
        
        prompt = f"""Generate {count} {difficulty} difficulty questions for {subject_name} (ENA exam preparation).

Subject: {subject_name}
Sub-category: {sub_category}
Difficulty: {difficulty}
Language: {language}
Topics to cover: {', '.join(topics)}

Requirements:
- Questions should be in {language}
- Each question must have exactly 4 answer options (A, B, C, D)
- Only one correct answer per question
- Questions should test {difficulty.lower()} level knowledge
- Make questions challenging but fair for ENA exam preparation
- Include a detailed explanation for each correct answer

IMPORTANT: Return ONLY a valid JSON array, no markdown formatting, no code blocks, no additional text.

Format each question as JSON:
{{
  "question_text": "The question text here",
  "answer1": "First option",
  "answer2": "Second option", 
  "answer3": "Third option",
  "answer4": "Fourth option",
  "correct": "A",
  "explanation": "Detailed explanation of why this answer is correct"
}}"""

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an expert ENA exam question generator. Generate high-quality, challenging questions in the exact JSON format requested. Return ONLY valid JSON array, no markdown, no code blocks, no additional text."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=2000
            )
            
            content = response.choices[0].message.content.strip()
            
            # Clean the response
            content = self.clean_json_response(content)
            
            # Try to parse JSON
            try:
                questions = json.loads(content)
                if isinstance(questions, list):
                    return questions
                else:
                    print(f"❌ Expected list, got {type(questions)}")
                    return []
            except json.JSONDecodeError as e:
                print(f"❌ JSON parse error: {e}")
                print(f"Raw content: {content[:200]}...")
                return []
                
        except Exception as e:
            print(f"❌ Error generating questions: {e}")
            return []
    
    def test_generation(self):
        """Test question generation for each category"""
        print("🧪 Testing fixed question generation...")
        
        categories = ['ANG', 'CG', 'LOG']
        difficulties = ['HARD', 'MED']
        
        for category in categories:
            print(f"\n--- Testing {category} ---")
            for difficulty in difficulties:
                print(f"Generating 2 {difficulty} questions for {category}...")
                questions = self.generate_test_questions(category, difficulty, 2)
                if questions:
                    print(f"✅ Generated {len(questions)} questions")
                    for i, q in enumerate(questions, 1):
                        print(f"  Question {i}: {q['question_text'][:50]}...")
                else:
                    print(f"❌ No questions generated")

if __name__ == "__main__":
    generator = TestFixedGenerator()
    generator.test_generation()
