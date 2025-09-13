#!/usr/bin/env python3
"""
Generate example questions for each exam type (CS, CMS, CM) to show quality before deletion
"""

import os
import sys
import json
from openai import OpenAI

# Set OpenAI API key
os.environ["OPENAI_API_KEY"] = "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"

class ExampleQuestionGenerator:
    def __init__(self):
        # Initialize OpenAI
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("❌ OPENAI_API_KEY environment variable not set!")
            sys.exit(1)
        
        self.openai_client = OpenAI(api_key=api_key)
        print("✅ OpenAI client initialized successfully!")
    
    def generate_examples(self, exam_type: str, category: str, count: int = 3) -> list:
        """Generate example questions for a specific exam type and category"""
        
        if exam_type == 'CM':
            return self.generate_cm_examples(category, count)
        elif exam_type == 'CMS':
            return self.generate_cms_examples(category, count)
        elif exam_type == 'CS':
            return self.generate_cs_examples(category, count)
        else:
            return []
    
    def generate_cm_examples(self, category: str, count: int) -> list:
        """Generate CM format examples (3 options)"""
        
        if category == 'ANG':
            prompt = f"""Generate {count} example English questions for CM exam format.

IMPORTANT: Follow the CM exam format exactly:
- Questions should be in English
- Each question must have exactly 3 answer options (A, B, C)
- Options should be short and consistent in length
- Explanations should be in French
- Focus on basic to intermediate English appropriate for French speakers
- Based on the CM exam examples: verb patterns, simple tenses, basic grammar

Question format examples from CM exams:
- "I suggest...........a cab." (a) taking, b) to take, c) to taking)
- "They agreed to............" (a) leave, b) leaving, c) leving)
- "Stop...............me!" (a) bothering, b) to bothering, c) to bother)

Format each question as JSON:
{{
  "question_text": "The question text here",
  "answer1": "First option",
  "answer2": "Second option", 
  "answer3": "Third option",
  "correct": "A",
  "explanation": "Explication détaillée en français de pourquoi cette réponse est correcte"
}}

Return only valid JSON array of questions, no other text."""

        elif category == 'CG':
            prompt = f"""Generate {count} example Culture Générale questions for CM exam format.

IMPORTANT: Follow the CM exam format exactly:
- Questions should be in French
- Each question must have exactly 3 answer options (A, B, C)
- Options should be short and consistent in length (single words or short phrases)
- Explanations should be in French
- Focus on basic general knowledge appropriate for French speakers

Question format examples from CM exams:
- "Une substance sans principe actif, mais qui peut avoir un effet psychologique bénéfique est un." (a) plasébo, b) placébo, c) placébeau)
- "...........est mère de sûreté." (a) L'honnêteté, b) L'amour, c) La prudence)
- "« Filer du mauvais coton » signifie ...." (a) travailler avec un outil inadapté, b) Ne pas aller aussi vite que l'on voudrait, c) Voir sa santé se dégrader)

Format each question as JSON:
{{
  "question_text": "La question en français",
  "answer1": "Première option",
  "answer2": "Deuxième option", 
  "answer3": "Troisième option",
  "correct": "A",
  "explanation": "Explication détaillée en français de pourquoi cette réponse est correcte"
}}

Return only valid JSON array of questions, no other text."""

        else:  # LOG
            prompt = f"""Generate {count} example Logic questions for CM exam format.

IMPORTANT: Follow the CM exam format exactly:
- Questions should be in French
- Each question must have exactly 3 answer options (A, B, C)
- Options should be short and consistent in length (numbers or brief answers)
- Explanations should be in French
- Focus on basic mathematical and logical reasoning

Question format examples from CM exams:
- "Je suis le tiers de la moitié du carré du quart de 24. Qui suis-je ?" (a) 12, b) 6, c) 4)
- "Complétez cette analogie : « Pardon est à 437125 ce que Pondra est à .... »" (a) 425173, b) 425178, c) 452178)
- "Quel nombre peut-on logiquement mettre sous la quatrième figure?" (a) 4, b) 8, c) 6)

Format each question as JSON:
{{
  "question_text": "La question en français",
  "answer1": "Première option",
  "answer2": "Deuxième option", 
  "answer3": "Troisième option",
  "correct": "A",
  "explanation": "Explication détaillée en français de pourquoi cette réponse est correcte"
}}

Return only valid JSON array of questions, no other text."""

        return self.call_openai(prompt)
    
    def generate_cms_examples(self, category: str, count: int) -> list:
        """Generate CMS format examples (3 options, more advanced)"""
        
        if category == 'ANG':
            prompt = f"""Generate {count} example English questions for CMS exam format.

IMPORTANT: Follow the CMS exam format:
- Questions should be in English
- Each question must have exactly 3 answer options (A, B, C)
- Options should be short and consistent in length
- Explanations should be in French
- Focus on intermediate to advanced English for French speakers
- Topics: grammar, vocabulary, reading comprehension, sentence structure

Format each question as JSON:
{{
  "question_text": "The question text here",
  "answer1": "First option",
  "answer2": "Second option", 
  "answer3": "Third option",
  "correct": "A",
  "explanation": "Explication détaillée en français de pourquoi cette réponse est correcte"
}}

Return only valid JSON array of questions, no other text."""

        elif category == 'CG':
            prompt = f"""Generate {count} example Culture Générale questions for CMS exam format.

IMPORTANT: Follow the CMS exam format:
- Questions should be in French
- Each question must have exactly 3 answer options (A, B, C)
- Options should be short and consistent in length
- Explanations should be in French
- Focus on intermediate to advanced general knowledge

Format each question as JSON:
{{
  "question_text": "La question en français",
  "answer1": "Première option",
  "answer2": "Deuxième option", 
  "answer3": "Troisième option",
  "correct": "A",
  "explanation": "Explication détaillée en français de pourquoi cette réponse est correcte"
}}

Return only valid JSON array of questions, no other text."""

        else:  # LOG
            prompt = f"""Generate {count} example Logic questions for CMS exam format.

IMPORTANT: Follow the CMS exam format:
- Questions should be in French
- Each question must have exactly 3 answer options (A, B, C)
- Options should be short and consistent in length
- Explanations should be in French
- Focus on intermediate to advanced mathematical and logical reasoning

Format each question as JSON:
{{
  "question_text": "La question en français",
  "answer1": "Première option",
  "answer2": "Deuxième option", 
  "answer3": "Troisième option",
  "correct": "A",
  "explanation": "Explication détaillée en français de pourquoi cette réponse est correcte"
}}

Return only valid JSON array of questions, no other text."""

        return self.call_openai(prompt)
    
    def generate_cs_examples(self, category: str, count: int) -> list:
        """Generate CS format examples (3 options, most advanced)"""
        
        if category == 'ANG':
            prompt = f"""Generate {count} example English questions for CS exam format.

IMPORTANT: Follow the CS exam format:
- Questions should be in English
- Each question must have exactly 3 answer options (A, B, C)
- Options should be short and consistent in length
- Explanations should be in French
- Focus on advanced English for French speakers
- Topics: complex grammar, advanced vocabulary, sophisticated sentence structures

Format each question as JSON:
{{
  "question_text": "The question text here",
  "answer1": "First option",
  "answer2": "Second option", 
  "answer3": "Third option",
  "correct": "A",
  "explanation": "Explication détaillée en français de pourquoi cette réponse est correcte"
}}

Return only valid JSON array of questions, no other text."""

        elif category == 'CG':
            prompt = f"""Generate {count} example Culture Générale questions for CS exam format.

IMPORTANT: Follow the CS exam format:
- Questions should be in French
- Each question must have exactly 3 answer options (A, B, C)
- Options should be short and consistent in length
- Explanations should be in French
- Focus on advanced general knowledge and critical thinking

Format each question as JSON:
{{
  "question_text": "La question en français",
  "answer1": "Première option",
  "answer2": "Deuxième option", 
  "answer3": "Troisième option",
  "correct": "A",
  "explanation": "Explication détaillée en français de pourquoi cette réponse est correcte"
}}

Return only valid JSON array of questions, no other text."""

        else:  # LOG
            prompt = f"""Generate {count} example Logic questions for CS exam format.

IMPORTANT: Follow the CS exam format:
- Questions should be in French
- Each question must have exactly 3 answer options (A, B, C)
- Options should be short and consistent in length
- Explanations should be in French
- Focus on advanced mathematical and logical reasoning

Format each question as JSON:
{{
  "question_text": "La question en français",
  "answer1": "Première option",
  "answer2": "Deuxième option", 
  "answer3": "Troisième option",
  "correct": "A",
  "explanation": "Explication détaillée en français de pourquoi cette réponse est correcte"
}}

Return only valid JSON array of questions, no other text."""

        return self.call_openai(prompt)
    
    def call_openai(self, prompt: str) -> list:
        """Call OpenAI API to generate questions"""
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an expert ENA exam question generator. Generate high-quality questions in the exact JSON format requested."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            content = response.choices[0].message.content.strip()
            
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
    
    def generate_all_examples(self):
        """Generate examples for all exam types and categories"""
        
        print("🎯 Generating example questions for all exam types...")
        print("=" * 80)
        
        exam_types = ['CM', 'CMS', 'CS']
        categories = ['ANG', 'CG', 'LOG']
        
        all_examples = {}
        
        for exam_type in exam_types:
            print(f"\n--- {exam_type} Examples ---")
            all_examples[exam_type] = {}
            
            for category in categories:
                print(f"\nGenerating {category} examples for {exam_type}...")
                examples = self.generate_examples(exam_type, category, 2)
                
                if examples:
                    all_examples[exam_type][category] = examples
                    print(f"✅ Generated {len(examples)} {category} examples for {exam_type}")
                    
                    # Show first example
                    if examples:
                        print(f"\nExample {category} {exam_type}:")
                        print(f"Question: {examples[0]['question_text']}")
                        print(f"A) {examples[0]['answer1']}")
                        print(f"B) {examples[0]['answer2']}")
                        print(f"C) {examples[0]['answer3']}")
                        if 'answer4' in examples[0]:
                            print(f"D) {examples[0]['answer4']}")
                        print(f"Correct: {examples[0]['correct']}")
                        print(f"Explanation: {examples[0]['explanation'][:100]}...")
                else:
                    print(f"❌ Failed to generate {category} examples for {exam_type}")
        
        # Save all examples
        with open('example_questions_all_formats.json', 'w', encoding='utf-8') as f:
            json.dump(all_examples, f, indent=2, ensure_ascii=False)
        
        print(f"\n💾 All examples saved to: example_questions_all_formats.json")
        
        return all_examples

if __name__ == "__main__":
    generator = ExampleQuestionGenerator()
    generator.generate_all_examples()
