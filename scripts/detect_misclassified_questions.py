#!/usr/bin/env python3
"""
Detect Misclassified Questions

Scans questions in the database to identify those that are incorrectly categorized.
For example: CG questions that are actually LOG (logic puzzles).

Outputs a JSON report of misclassified questions that need to be replaced.

Usage:
    python scripts/detect_misclassified_questions.py [--subject CG] [--limit 100]
"""

import json
import os
import sys
import asyncio
import re
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from collections import defaultdict
from dotenv import load_dotenv

sys.stdout.reconfigure(line_buffering=True)

load_dotenv()

import google.generativeai as genai
from supabase import create_client

# Initialize clients
SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('VITE_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

# Model for classification
CLASSIFIER_MODEL = 'gemini-2.0-flash'

# Output file
OUTPUT_FILE = "diagnostics_output/misclassified_questions.json"
PROGRESS_FILE = "diagnostics_output/misclassified_progress.json"


class MisclassificationDetector:
    def __init__(self, target_subject: str = 'CG', limit: Optional[int] = None):
        self.target_subject = target_subject
        self.limit = limit
        self.questions: List[Dict] = []
        self.misclassified: List[Dict] = []
        self.checked_ids: set = set()
        
        self.load_progress()
    
    def load_progress(self):
        """Load progress from previous run"""
        if os.path.exists(PROGRESS_FILE):
            try:
                with open(PROGRESS_FILE, 'r') as f:
                    data = json.load(f)
                    self.checked_ids = set(data.get('checked_ids', []))
                    self.misclassified = data.get('misclassified', [])
                    print(f"🔄 Resumed: {len(self.checked_ids)} already checked, {len(self.misclassified)} misclassified found")
            except Exception as e:
                print(f"⚠️ Could not load progress: {e}")
    
    def save_progress(self):
        """Save progress"""
        with open(PROGRESS_FILE, 'w') as f:
            json.dump({
                'checked_ids': list(self.checked_ids),
                'misclassified': self.misclassified,
                'last_updated': datetime.now().isoformat()
            }, f, indent=2, ensure_ascii=False)
    
    def fetch_questions(self):
        """Fetch questions for the target subject"""
        print(f"\n📥 Fetching {self.target_subject} questions...")
        
        all_questions = []
        page_size = 500
        offset = 0
        
        while True:
            query = supabase.table('questions_v2') \
                .select('id, text, options, correct_index, subject, exam_type, test_type, test_number') \
                .eq('subject', self.target_subject) \
                .order('id') \
                .range(offset, offset + page_size - 1)
            
            response = query.execute()
            
            if not response.data:
                break
            
            all_questions.extend(response.data)
            
            if len(response.data) < page_size:
                break
            
            offset += page_size
        
        # Filter out already checked
        self.questions = [q for q in all_questions if q['id'] not in self.checked_ids]
        
        # Apply limit if specified
        if self.limit:
            self.questions = self.questions[:self.limit]
        
        print(f"   Total {self.target_subject} questions: {len(all_questions)}")
        print(f"   Already checked: {len(self.checked_ids)}")
        print(f"   Pending to check: {len(self.questions)}")
    
    async def classify_question(self, question: Dict) -> Tuple[str, str, float]:
        """
        Use LLM to classify what subject a question actually belongs to.
        Returns (actual_subject, reason, confidence)
        """
        text = question.get('text', '')
        options = question.get('options', [])
        claimed_subject = question.get('subject', 'CG')
        
        prompt = f"""Analyze this exam question and determine its TRUE subject category.

QUESTION:
{text}

OPTIONS:
{json.dumps(options, ensure_ascii=False)}

SUBJECT DEFINITIONS:
- CG (Culture Générale): Questions about history, geography, current events, politics, 
  culture, arts, famous people, dates, facts, Africa/Côte d'Ivoire knowledge, general knowledge.
  
- LOG (Logique): Questions involving logical reasoning, deduction, puzzles, sequences, 
  patterns, mathematical logic, "if-then" reasoning, constraint satisfaction, 
  syllogisms, analytical reasoning, matrix completion.
  
- ANG (Anglais): Questions testing English language skills - grammar, vocabulary, 
  translation, comprehension, sentence completion.

INDICATORS OF LOG (not CG):
- "On sait que..." followed by numbered conditions
- "Si... alors..." deductive patterns
- Village/person assignment puzzles
- Sequence/pattern questions
- "Quel doit être...", "Que peut-on conclure..."
- Abstract logical deduction required
- No actual factual knowledge needed

INDICATORS OF CG:
- Requires factual knowledge (dates, events, people)
- About history, geography, politics, culture
- Testing recall of information
- Africa/Ivory Coast related facts

This question is labeled as: {claimed_subject}

Analyze carefully and respond with ONLY valid JSON:
{{
  "actual_subject": "CG" or "LOG" or "ANG",
  "confidence": 0.0 to 1.0,
  "reason": "Brief explanation of why"
}}
"""
        
        try:
            model = genai.GenerativeModel(CLASSIFIER_MODEL)
            response = await model.generate_content_async(
                prompt,
                generation_config={'temperature': 0.1}
            )
            
            text_response = response.text
            match = re.search(r'\{[^{}]*\}', text_response, re.DOTALL)
            
            if match:
                result = json.loads(match.group())
                return (
                    result.get('actual_subject', claimed_subject),
                    result.get('reason', 'Unknown'),
                    result.get('confidence', 0.5)
                )
        except Exception as e:
            print(f"    ⚠️ Classification error: {str(e)[:50]}")
        
        return claimed_subject, "Classification failed", 0.0
    
    async def run(self):
        """Main execution"""
        print("🔍 Misclassified Question Detector")
        print("=" * 60)
        print(f"   Target subject: {self.target_subject}")
        print(f"   Looking for questions that should be in a DIFFERENT subject")
        print("=" * 60)
        
        self.fetch_questions()
        
        if not self.questions:
            print("\n✅ No pending questions to check!")
            self.generate_report()
            return
        
        print(f"\n🔧 Analyzing {len(self.questions)} questions...")
        
        newly_found = 0
        
        for i, question in enumerate(self.questions):
            qid = question['id']
            text_preview = question.get('text', '')[:60]
            
            print(f"\n[{i+1}/{len(self.questions)}] {qid[:8]}...")
            print(f"   Q: {text_preview}...")
            
            actual_subject, reason, confidence = await self.classify_question(question)
            
            self.checked_ids.add(qid)
            
            if actual_subject != self.target_subject and confidence >= 0.7:
                print(f"   ⚠️ MISCLASSIFIED: Should be {actual_subject} (conf: {confidence:.0%})")
                print(f"   Reason: {reason}")
                
                self.misclassified.append({
                    'id': qid,
                    'text': question.get('text', ''),
                    'options': question.get('options', []),
                    'claimed_subject': self.target_subject,
                    'actual_subject': actual_subject,
                    'confidence': confidence,
                    'reason': reason,
                    'exam_type': question.get('exam_type'),
                    'test_type': question.get('test_type'),
                    'test_number': question.get('test_number')
                })
                newly_found += 1
            else:
                print(f"   ✅ Correctly classified as {self.target_subject}")
            
            # Save progress every 20 questions
            if (i + 1) % 20 == 0:
                self.save_progress()
                print(f"\n   💾 Progress: {len(self.checked_ids)} checked, {len(self.misclassified)} misclassified")
        
        # Final save
        self.save_progress()
        self.generate_report()
        
        print(f"\n🆕 Newly found in this run: {newly_found}")
    
    def generate_report(self):
        """Generate final report"""
        print("\n📝 Generating report...")
        
        # Group by actual subject
        by_actual_subject = defaultdict(list)
        for q in self.misclassified:
            by_actual_subject[q['actual_subject']].append(q)
        
        report = {
            'generated_at': datetime.now().isoformat(),
            'summary': {
                'target_subject': self.target_subject,
                'total_checked': len(self.checked_ids),
                'total_misclassified': len(self.misclassified),
                'by_actual_subject': {k: len(v) for k, v in by_actual_subject.items()}
            },
            'misclassified_questions': self.misclassified
        }
        
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"\n{'='*60}")
        print("📊 DETECTION COMPLETE")
        print(f"{'='*60}")
        print(f"   Checked: {len(self.checked_ids)}")
        print(f"   Misclassified: {len(self.misclassified)}")
        for subj, questions in by_actual_subject.items():
            print(f"      → Should be {subj}: {len(questions)}")
        print(f"\n📁 Report saved to: {OUTPUT_FILE}")
        
        if self.misclassified:
            print("\n" + "-" * 60)
            print("📝 SAMPLE MISCLASSIFIED (first 3):")
            print("-" * 60)
            for q in self.misclassified[:3]:
                print(f"\n   ID: {q['id'][:8]}...")
                print(f"   Q: {q['text'][:80]}...")
                print(f"   Labeled: {q['claimed_subject']} → Should be: {q['actual_subject']}")
                print(f"   Reason: {q['reason']}")
        
        print("\n" + "=" * 60)
        print("🔧 NEXT STEPS:")
        print("=" * 60)
        print(f"   1. Review {OUTPUT_FILE}")
        print(f"   2. Option A: Move questions to correct subject:")
        print(f"      python scripts/move_misclassified.py")
        print(f"   3. Option B: Replace with new questions (keeps them in {self.target_subject}):")
        print(f"      - Add IDs to flagged_questions_final.json")
        print(f"      - Run generate_replacements.py")


async def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Detect misclassified questions')
    parser.add_argument('--subject', type=str, default='CG', help='Subject to scan (default: CG)')
    parser.add_argument('--limit', type=int, default=None, help='Limit number of questions to check')
    parser.add_argument('--reset', action='store_true', help='Reset progress and start fresh')
    
    args = parser.parse_args()
    
    if args.reset and os.path.exists(PROGRESS_FILE):
        os.remove(PROGRESS_FILE)
        print("🗑️ Progress reset")
    
    detector = MisclassificationDetector(
        target_subject=args.subject.upper(),
        limit=args.limit
    )
    await detector.run()


if __name__ == '__main__':
    asyncio.run(main())







