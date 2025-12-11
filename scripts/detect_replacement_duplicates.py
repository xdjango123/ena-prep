#!/usr/bin/env python3
"""
Phase 1: Detect Duplicates in Generated Replacements

SMARTER APPROACH:
1. Text+options fuzzy matching (>= 75%)
2. Group questions by key topics/entities first (faster pre-filter)
3. Then use LLM to validate only potential duplicates within topic groups

Uses Gemini + GPT for validation with robust error handling.
"""

import json
import os
import sys
import asyncio
import re
from datetime import datetime
from typing import Dict, List, Set
from collections import defaultdict
from dotenv import load_dotenv

# Unbuffered output
sys.stdout.reconfigure(line_buffering=True)

load_dotenv()

import google.generativeai as genai
from openai import AsyncOpenAI
from rapidfuzz import fuzz

# Initialize clients
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
openai_client = AsyncOpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Models
GEMINI_MODEL = 'gemini-2.0-flash'
GPT_MODEL = 'gpt-4o-mini'

# File paths
INPUT_FILE = "diagnostics_output/replacement_results.json"
OUTPUT_FILE = "diagnostics_output/replacement_duplicates_report.json"
PROGRESS_FILE = "diagnostics_output/replacement_dup_progress.json"

# Constants
TEXT_SIMILARITY_THRESHOLD = 75
TOPIC_SIMILARITY_THRESHOLD = 40  # Lower threshold for grouping potential duplicates
LLM_BATCH_SIZE = 10  # Smaller batches for LLM
MAX_RETRIES = 2


class DuplicateDetector:
    def __init__(self):
        self.replacements: List[Dict] = []
        self.by_subject: Dict[str, List[Dict]] = defaultdict(list)
        self.failed_ids: List[str] = []
        
        # Results
        self.text_duplicates: List[Dict] = []
        self.semantic_duplicates: List[Dict] = []
        
        # Progress tracking
        self.progress = {
            'phase1_done': False,
            'processed_groups': [],
            'current_subject': None,
            'completed_subjects': [],
            'text_duplicates': [],
            'semantic_duplicates': []
        }
        
        self.load_progress()
    
    def load_progress(self):
        """Load progress from previous run"""
        if os.path.exists(PROGRESS_FILE):
            try:
                with open(PROGRESS_FILE, 'r') as f:
                    self.progress = json.load(f)
                    print(f"🔄 Resumed: Phase1={self.progress.get('phase1_done')}, {len(self.progress.get('completed_subjects', []))} subjects done")
                    self.text_duplicates = self.progress.get('text_duplicates', [])
                    self.semantic_duplicates = self.progress.get('semantic_duplicates', [])
            except Exception as e:
                print(f"⚠️ Could not load progress: {e}")
    
    def save_progress(self):
        """Save progress"""
        self.progress['text_duplicates'] = self.text_duplicates
        self.progress['semantic_duplicates'] = self.semantic_duplicates
        with open(PROGRESS_FILE, 'w') as f:
            json.dump(self.progress, f, indent=2, ensure_ascii=False)
    
    def load_replacements(self):
        """Load replacements from result file"""
        print(f"\n📥 Loading replacements from {INPUT_FILE}...")
        
        with open(INPUT_FILE, 'r') as f:
            data = json.load(f)
        
        self.replacements = data.get('replacements', [])
        self.failed_ids = data.get('failed_ids', [])
        
        # Group by subject
        for i, q in enumerate(self.replacements):
            q['_index'] = i
            subject = q.get('subject', 'UNKNOWN')
            self.by_subject[subject].append(q)
        
        print(f"  Total replacements: {len(self.replacements)}")
        print(f"  Failed IDs: {len(self.failed_ids)}")
        for subj, questions in self.by_subject.items():
            print(f"    {subj}: {len(questions)}")
    
    def get_full_text(self, q: Dict) -> str:
        """Get combined text + options for comparison"""
        text = q.get('text', '').lower().strip()
        options = q.get('options', [])
        options_text = ' '.join([opt.lower().strip() for opt in options])
        return f"{text} {options_text}"
    
    def extract_key_terms(self, text: str) -> Set[str]:
        """Extract key terms for topic grouping"""
        # Remove common words and extract meaningful terms
        text = text.lower()
        # Keep proper nouns, numbers, and significant words
        words = re.findall(r'\b[a-zàâäéèêëïîôùûüç]{4,}\b', text)
        
        # Common stop words to remove
        stop_words = {'dans', 'pour', 'avec', 'cette', 'quel', 'quelle', 'quels', 'quelles',
                      'which', 'what', 'that', 'this', 'from', 'have', 'been', 'were', 'will',
                      'être', 'avoir', 'fait', 'sont', 'était', 'suivant', 'suivante', 'suivants',
                      'correct', 'choose', 'select', 'identify', 'following', 'statement'}
        
        return {w for w in words if w not in stop_words and len(w) > 3}
    
    def find_potential_duplicate_groups(self, questions: List[Dict]) -> List[List[Dict]]:
        """Group questions by potential topic similarity (pre-filter for LLM)"""
        print("    Grouping by topic similarity...")
        
        groups = []
        used = set()
        
        for i, q1 in enumerate(questions):
            if q1['original_id'] in used:
                continue
            
            group = [q1]
            terms1 = self.extract_key_terms(q1.get('text', ''))
            full1 = self.get_full_text(q1)
            
            for j, q2 in enumerate(questions):
                if i >= j or q2['original_id'] in used:
                    continue
                
                # Check term overlap
                terms2 = self.extract_key_terms(q2.get('text', ''))
                common_terms = terms1 & terms2
                
                # Check fuzzy similarity at lower threshold
                full2 = self.get_full_text(q2)
                similarity = fuzz.ratio(full1, full2)
                
                # Group if either: significant term overlap OR moderate text similarity
                if len(common_terms) >= 3 or similarity >= TOPIC_SIMILARITY_THRESHOLD:
                    group.append(q2)
            
            if len(group) > 1:
                groups.append(group)
                for q in group:
                    used.add(q['original_id'])
        
        print(f"    Found {len(groups)} potential duplicate groups")
        return groups
    
    def find_text_duplicates(self) -> List[Dict]:
        """Find duplicates using fuzzy text+options matching >= 75%"""
        if self.progress.get('phase1_done'):
            print(f"\n  ⏭️ Using cached text duplicates: {len(self.text_duplicates)}")
            return self.text_duplicates
        
        print(f"\n🔍 Phase 1a: Finding text duplicates (text+options >= {TEXT_SIMILARITY_THRESHOLD}%)...")
        
        duplicates = []
        seen_pairs = set()
        
        for subject, questions in self.by_subject.items():
            print(f"\n  Processing {subject} ({len(questions)} questions)...")
            subject_dups = 0
            
            for i, q1 in enumerate(questions):
                if i % 300 == 0:
                    print(f"    Progress: {i}/{len(questions)}")
                
                for j, q2 in enumerate(questions):
                    if i >= j:
                        continue
                    
                    pair_key = tuple(sorted([q1['original_id'], q2['original_id']]))
                    if pair_key in seen_pairs:
                        continue
                    seen_pairs.add(pair_key)
                    
                    full1 = self.get_full_text(q1)
                    full2 = self.get_full_text(q2)
                    similarity = fuzz.ratio(full1, full2)
                    
                    if similarity >= TEXT_SIMILARITY_THRESHOLD:
                        ans1 = q1['options'][q1['correct_index']].lower() if q1.get('options') else ''
                        ans2 = q2['options'][q2['correct_index']].lower() if q2.get('options') else ''
                        answer_sim = fuzz.ratio(ans1, ans2)
                        
                        duplicates.append({
                            'type': 'text_similarity',
                            'subject': subject,
                            'combined_similarity': similarity,
                            'answer_similarity': answer_sim,
                            'question1': {
                                'original_id': q1['original_id'],
                                'text': q1['text'],
                                'options': q1.get('options', []),
                                'correct_answer': q1['options'][q1['correct_index']] if q1.get('options') else 'N/A',
                                '_index': q1['_index']
                            },
                            'question2': {
                                'original_id': q2['original_id'],
                                'text': q2['text'],
                                'options': q2.get('options', []),
                                'correct_answer': q2['options'][q2['correct_index']] if q2.get('options') else 'N/A',
                                '_index': q2['_index']
                            }
                        })
                        subject_dups += 1
            
            print(f"    Found {subject_dups} text duplicates in {subject}")
        
        self.progress['phase1_done'] = True
        self.text_duplicates = duplicates
        self.save_progress()
        
        print(f"\n  Total text duplicates: {len(duplicates)}")
        return duplicates
    
    def parse_llm_json(self, text: str) -> dict:
        """Robustly parse JSON from LLM response"""
        if not text:
            return {'duplicates': [], 'reasons': []}
        
        # Clean up common issues
        text = text.strip()
        
        # Try to find JSON object
        patterns = [
            r'\{[^{}]*"duplicates"[^{}]*\}',  # Simple object with duplicates
            r'\{.*?\}',  # Any JSON object
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.DOTALL)
            for match in matches:
                try:
                    result = json.loads(match)
                    if 'duplicates' in result:
                        return result
                except:
                    continue
        
        # Try parsing array of numbers directly
        array_match = re.search(r'\[[\d,\s]*\]', text)
        if array_match:
            try:
                nums = json.loads(array_match.group())
                return {'duplicates': nums, 'reasons': []}
            except:
                pass
        
        return {'duplicates': [], 'reasons': []}
    
    async def validate_group_with_gemini(self, group: List[Dict], subject: str) -> List[Dict]:
        """Use Gemini to find duplicates within a pre-filtered group"""
        if len(group) < 2:
            return []
        
        # Format questions
        q_list = []
        for i, q in enumerate(group):
            opts = q.get('options', [])
            ans = opts[q['correct_index']] if opts and q.get('correct_index', 0) < len(opts) else 'N/A'
            q_list.append(f"{i+1}. {q['text'][:250]}\n   Options: {opts}\n   Answer: {ans}")
        
        prompt = f"""These {len(group)} questions may be duplicates. Identify pairs that ask about the SAME topic/concept.

EXAMPLE OF DUPLICATES:
A: "La politique de l'houphouétisme, caractérisée par le dialogue..." → foreign capital
B: "La politique de l'houphouétisme, prônée par Houphouët-Boigny..." → national unity
→ DUPLICATES: both about houphouétisme policy

QUESTIONS ({subject}):
{chr(10).join(q_list)}

Which pairs are duplicates (same topic/concept/answer)?
Return JSON: {{"duplicates": [[1,2], [3,5]], "reasons": ["both about X", "same concept Y"]}}
If none: {{"duplicates": [], "reasons": []}}"""

        for attempt in range(MAX_RETRIES):
            try:
                model = genai.GenerativeModel(GEMINI_MODEL)
                response = await model.generate_content_async(
                    prompt,
                    generation_config={'temperature': 0.1}
                )
                result = self.parse_llm_json(response.text)
                
                found = []
                dup_pairs = result.get('duplicates', [])
                reasons = result.get('reasons', [])
                
                for idx, pair in enumerate(dup_pairs):
                    if isinstance(pair, list) and len(pair) >= 2:
                        i1, i2 = pair[0] - 1, pair[1] - 1
                        if 0 <= i1 < len(group) and 0 <= i2 < len(group):
                            reason = reasons[idx] if idx < len(reasons) else "Same topic"
                            found.append({
                                'q1': group[i1],
                                'q2': group[i2],
                                'reason': f"[Gemini] {reason}"
                            })
                return found
                
            except Exception as e:
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(1)
                else:
                    print(f"      ⚠️ Gemini error: {str(e)[:60]}")
        
        return []
    
    async def validate_group_with_gpt(self, group: List[Dict], subject: str) -> List[Dict]:
        """Use GPT to find duplicates within a pre-filtered group"""
        if len(group) < 2:
            return []
        
        q_list = []
        for i, q in enumerate(group):
            opts = q.get('options', [])
            ans = opts[q['correct_index']] if opts and q.get('correct_index', 0) < len(opts) else 'N/A'
            q_list.append(f"{i+1}. {q['text'][:250]} → {ans}")
        
        prompt = f"""Find duplicate pairs (same topic/concept) in these {len(group)} questions.

EXAMPLE: "houphouétisme policy goals" and "houphouétisme economic contribution" = DUPLICATES

QUESTIONS ({subject}):
{chr(10).join(q_list)}

JSON: {{"duplicates": [[1,2], [3,5]], "reasons": ["reason1", "reason2"]}}
None found: {{"duplicates": [], "reasons": []}}"""

        for attempt in range(MAX_RETRIES):
            try:
                response = await openai_client.chat.completions.create(
                    model=GPT_MODEL,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=300,
                    temperature=0.1
                )
                result = self.parse_llm_json(response.choices[0].message.content)
                
                found = []
                dup_pairs = result.get('duplicates', [])
                reasons = result.get('reasons', [])
                
                for idx, pair in enumerate(dup_pairs):
                    if isinstance(pair, list) and len(pair) >= 2:
                        i1, i2 = pair[0] - 1, pair[1] - 1
                        if 0 <= i1 < len(group) and 0 <= i2 < len(group):
                            reason = reasons[idx] if idx < len(reasons) else "Same topic"
                            found.append({
                                'q1': group[i1],
                                'q2': group[i2],
                                'reason': f"[GPT] {reason}"
                            })
                return found
                
            except Exception as e:
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(1)
                else:
                    print(f"      ⚠️ GPT error: {str(e)[:60]}")
        
        return []
    
    async def find_semantic_duplicates(self) -> List[Dict]:
        """Find semantic duplicates using topic grouping + LLM validation"""
        print("\n🔍 Phase 1b: Finding semantic duplicates (topic groups + LLM)...")
        
        all_duplicates = []
        
        for subject, questions in self.by_subject.items():
            if subject in self.progress.get('completed_subjects', []):
                print(f"\n  ⏭️ Skipping {subject} (already completed)")
                continue
            
            print(f"\n  Processing {subject} ({len(questions)} questions)...")
            
            # Step 1: Find potential duplicate groups
            groups = self.find_potential_duplicate_groups(questions)
            
            if not groups:
                print(f"    No potential duplicate groups found")
                self.progress['completed_subjects'].append(subject)
                self.save_progress()
                continue
            
            print(f"    Validating {len(groups)} groups with LLMs...")
            
            subject_dups = []
            
            for gi, group in enumerate(groups):
                if gi % 20 == 0:
                    print(f"    Progress: {gi}/{len(groups)} groups ({len(subject_dups)} duplicates found)")
                
                # Run both LLMs in parallel
                gemini_task = self.validate_group_with_gemini(group, subject)
                gpt_task = self.validate_group_with_gpt(group, subject)
                
                gemini_found, gpt_found = await asyncio.gather(gemini_task, gpt_task)
                
                # Combine results
                all_found = {}
                for item in gemini_found + gpt_found:
                    q1_id = item['q1']['original_id']
                    q2_id = item['q2']['original_id']
                    pair_key = tuple(sorted([q1_id, q2_id]))
                    
                    if pair_key not in all_found:
                        all_found[pair_key] = {
                            'q1': item['q1'],
                            'q2': item['q2'],
                            'reasons': []
                        }
                    all_found[pair_key]['reasons'].append(item['reason'])
                
                # Create duplicate entries
                for pair_key, info in all_found.items():
                    subject_dups.append({
                        'type': 'semantic_duplicate',
                        'subject': subject,
                        'reasons': info['reasons'],
                        'question1': {
                            'original_id': info['q1']['original_id'],
                            'text': info['q1']['text'],
                            'options': info['q1'].get('options', []),
                            'correct_answer': info['q1']['options'][info['q1']['correct_index']] if info['q1'].get('options') else 'N/A',
                            '_index': info['q1'].get('_index')
                        },
                        'question2': {
                            'original_id': info['q2']['original_id'],
                            'text': info['q2']['text'],
                            'options': info['q2'].get('options', []),
                            'correct_answer': info['q2']['options'][info['q2']['correct_index']] if info['q2'].get('options') else 'N/A',
                            '_index': info['q2'].get('_index')
                        }
                    })
                
                await asyncio.sleep(0.2)  # Rate limiting
            
            all_duplicates.extend(subject_dups)
            self.semantic_duplicates.extend(subject_dups)
            
            self.progress['completed_subjects'].append(subject)
            self.save_progress()
            
            print(f"    ✅ {subject}: {len(subject_dups)} semantic duplicates")
        
        return all_duplicates
    
    def build_duplicate_clusters(self, duplicates: List[Dict]) -> List[Dict]:
        """Build clusters from duplicate pairs"""
        print("\n🔗 Building duplicate clusters...")
        
        parent = {}
        
        def find(x):
            if x not in parent:
                parent[x] = x
            if parent[x] != x:
                parent[x] = find(parent[x])
            return parent[x]
        
        def union(x, y):
            px, py = find(x), find(y)
            if px != py:
                parent[px] = py
        
        for dup in duplicates:
            id1 = dup['question1']['original_id']
            id2 = dup['question2']['original_id']
            union(id1, id2)
        
        clusters_map = defaultdict(set)
        id_to_data = {}
        
        for dup in duplicates:
            for q_key in ['question1', 'question2']:
                q = dup[q_key]
                qid = q['original_id']
                root = find(qid)
                clusters_map[root].add(qid)
                if qid not in id_to_data:
                    id_to_data[qid] = q
        
        clusters = []
        for root, question_ids in clusters_map.items():
            if len(question_ids) > 1:
                questions = [id_to_data[qid] for qid in question_ids if qid in id_to_data]
                
                reasons = []
                for dup in duplicates:
                    if dup['question1']['original_id'] in question_ids:
                        if dup['type'] == 'text_similarity':
                            reasons.append(f"Text+Options: {dup.get('combined_similarity')}%")
                        else:
                            reasons.extend(dup.get('reasons', []))
                
                subject = 'UNKNOWN'
                for qid in question_ids:
                    for q in self.replacements:
                        if q['original_id'] == qid:
                            subject = q.get('subject', 'UNKNOWN')
                            break
                    if subject != 'UNKNOWN':
                        break
                
                clusters.append({
                    'cluster_id': root,
                    'size': len(question_ids),
                    'subject': subject,
                    'question_ids': list(question_ids),
                    'questions': questions,
                    'reasons': list(set(reasons))[:10]
                })
        
        clusters.sort(key=lambda x: x['size'], reverse=True)
        print(f"  Found {len(clusters)} duplicate clusters")
        return clusters
    
    async def run(self):
        """Main execution"""
        print("🔍 Replacement Duplicates Detector")
        print("=" * 60)
        print(f"  Models: Gemini ({GEMINI_MODEL}) + GPT ({GPT_MODEL})")
        print(f"  Fuzzy threshold: {TEXT_SIMILARITY_THRESHOLD}%")
        print(f"  Topic grouping threshold: {TOPIC_SIMILARITY_THRESHOLD}%")
        
        self.load_replacements()
        
        # Phase 1a: Text duplicates
        self.find_text_duplicates()
        
        # Phase 1b: Semantic duplicates
        await self.find_semantic_duplicates()
        
        # Combine and build clusters
        all_duplicates = self.text_duplicates + self.semantic_duplicates
        clusters = self.build_duplicate_clusters(all_duplicates)
        
        self.generate_report(clusters, all_duplicates)
    
    def generate_report(self, clusters: List[Dict], all_duplicates: List[Dict]):
        """Generate final report"""
        print("\n📝 Generating report...")
        
        ids_to_remove = set()
        ids_to_keep = set()
        
        for cluster in clusters:
            question_ids = cluster['question_ids']
            if question_ids:
                ids_to_keep.add(question_ids[0])
                for qid in question_ids[1:]:
                    ids_to_remove.add(qid)
        
        report = {
            'generated_at': datetime.now().isoformat(),
            'config': {
                'text_similarity_threshold': TEXT_SIMILARITY_THRESHOLD,
                'topic_grouping_threshold': TOPIC_SIMILARITY_THRESHOLD,
                'models_used': [GEMINI_MODEL, GPT_MODEL]
            },
            'summary': {
                'total_replacements': len(self.replacements),
                'failed_ids_count': len(self.failed_ids),
                'text_duplicates_found': len(self.text_duplicates),
                'semantic_duplicates_found': len(self.semantic_duplicates),
                'total_duplicate_clusters': len(clusters),
                'questions_to_remove': len(ids_to_remove),
                'questions_to_keep': len(ids_to_keep),
                'total_to_regenerate': len(self.failed_ids) + len(ids_to_remove)
            },
            'by_subject': {},
            'duplicate_clusters': clusters,
            'ids_to_remove': list(ids_to_remove),
            'ids_to_keep': list(ids_to_keep),
            'failed_ids': self.failed_ids
        }
        
        for subject in self.by_subject:
            subject_clusters = [c for c in clusters if c.get('subject') == subject]
            subject_remove_count = sum(c['size'] - 1 for c in subject_clusters)
            report['by_subject'][subject] = {
                'total_questions': len(self.by_subject[subject]),
                'duplicate_clusters': len(subject_clusters),
                'to_remove': subject_remove_count
            }
        
        with open(OUTPUT_FILE, 'w') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"\n{'='*60}")
        print("✅ DUPLICATE DETECTION COMPLETE")
        print(f"{'='*60}")
        print(f"\n📊 Summary:")
        print(f"  Total replacements: {len(self.replacements)}")
        print(f"  Text+Options duplicates: {len(self.text_duplicates)}")
        print(f"  Semantic duplicates: {len(self.semantic_duplicates)}")
        print(f"  Duplicate clusters: {len(clusters)}")
        print(f"\n📋 For review:")
        print(f"  Keep: {len(ids_to_keep)}")
        print(f"  Remove: {len(ids_to_remove)}")
        print(f"  Failed to regenerate: {len(self.failed_ids)}")
        print(f"  TOTAL to regenerate: {len(self.failed_ids) + len(ids_to_remove)}")
        print(f"\n📁 Report: {OUTPUT_FILE}")


async def main():
    detector = DuplicateDetector()
    await detector.run()


if __name__ == '__main__':
    asyncio.run(main())
