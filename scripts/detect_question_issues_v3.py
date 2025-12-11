#!/usr/bin/env python3
"""
Detect Question Issues (V3) - Optimized for Precision
Goal: Catch all questions with problems by subject (CG, ANG, LOG)

Updates in V3:
1. Fuzzy Duplicates: Checks Text + Options (similarity >= 75%)
2. Same Answer Duplicates: Fuzzy checks on answers (similarity >= 80%) + Context Model Check
3. Quality Check: Uses Gemini 1.5 Pro + GPT-4o (or Best Available) for:
   - Typos, incomplete text
   - Too easy/trivial
   - Wrong Category
4. Category Check: Strict Model-based subject assignment

Updates in V3.1:
5. Answer Position Bias Detection
6. Option Length Imbalance Detection
7. Special Character/Encoding Detection
8. Improved error handling with retries
9. Deduplicated quality issues

"""

import os
import re
import json
import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Any, Tuple, Set, Optional
from collections import defaultdict, Counter
from dotenv import load_dotenv
from supabase import create_client, Client
import google.generativeai as genai
import google.api_core.exceptions
from rapidfuzz import fuzz
import numpy as np

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Suppress verbose HTTP request logs from OpenAI/httpx
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("openai").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

# Attempt to import OpenAI and Anthropic
try:
    from openai import AsyncOpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

try:
    import anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

if not all([SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY]):
    logger.error("❌ Error: Missing essential environment variables (Supabase or Gemini).")

# Initialize clients
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
genai.configure(api_key=GEMINI_API_KEY)

openai_client = None
if HAS_OPENAI and OPENAI_API_KEY:
    openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)

anthropic_client = None
if HAS_ANTHROPIC and ANTHROPIC_API_KEY:
    anthropic_client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

# =============================================================================
# MODEL SELECTION
# =============================================================================
# Gemini 2.5 Pro for high accuracy, Flash for faster processing
GEMINI_MODEL = 'gemini-2.5-pro'
GEMINI_FLASH = 'gemini-2.0-flash'

# Determine secondary model ("Best Open" -> OpenAI if available, else Claude)
SECONDARY_MODEL_PROVIDER = "openai" if openai_client else ("anthropic" if anthropic_client else "none")
GPT_MODEL = "gpt-4o"
CLAUDE_MODEL = "claude-3-5-sonnet-20241022"

# Output Directory
OUTPUT_DIR = "diagnostics_output"
os.makedirs(OUTPUT_DIR, exist_ok=True)
OUTPUT_FILE = os.path.join(OUTPUT_DIR, 'flagged_questions_report_v3.json')
PROGRESS_FILE = os.path.join(OUTPUT_DIR, 'progress_state_v3.json')

# =============================================================================
# THRESHOLDS
# =============================================================================
TEXT_OPTIONS_SIMILARITY_THRESHOLD = 75  # Text + Options fuzzy match
ANSWER_SIMILARITY_THRESHOLD = 80        # Answer fuzzy match
SEMANTIC_SIMILARITY_THRESHOLD = 0.85    # Embedding similarity (upper bound for context check)
CONTEXT_SIMILARITY_THRESHOLD = 0.72     # Context check (lower bound) - raised from 0.50 to reduce candidates
CATEGORY_CONFIDENCE_THRESHOLD = 0.70    # Confidence for category mismatch
SAME_ANSWER_MIN_COUNT = 3               # Flag if answer appears in >2 questions

# Context duplicate limits
MAX_CONTEXT_CANDIDATES_PER_SUBJECT = 500  # Cap candidates to avoid API overload

# Position bias thresholds
POSITION_BIAS_THRESHOLD = 40            # Flag if any position has >40% of answers
OPTION_LENGTH_RATIO_HIGH = 2.0          # Correct answer >2x longer than avg
OPTION_LENGTH_RATIO_LOW = 0.5           # Correct answer <0.5x shorter than avg

# Question length thresholds
MIN_QUESTION_LENGTH = 15
MAX_QUESTION_LENGTH = 800

# Batch sizes
QUALITY_CHECK_BATCH_SIZE = 10 
EMBEDDING_BATCH_SIZE = 50
CATEGORY_CHECK_BATCH_SIZE = 20

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAY = 2.0  # seconds

# =============================================================================
# RETRY DECORATOR
# =============================================================================
async def retry_async(func, *args, max_retries: int = MAX_RETRIES, delay: float = RETRY_DELAY, **kwargs):
    """Retry an async function with exponential backoff."""
    last_exception = None
    for attempt in range(max_retries):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            last_exception = e
            if attempt < max_retries - 1:
                wait_time = delay * (2 ** attempt)  # Exponential backoff
                logger.warning(f"Attempt {attempt + 1} failed: {e}. Retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)
            else:
                logger.error(f"All {max_retries} attempts failed: {e}")
    raise last_exception


class QuestionIssueDetectorV3:
    def __init__(self, use_high_accuracy_models: bool = True, target_subject: Optional[str] = None):
        self.use_high_accuracy = use_high_accuracy_models
        self.target_subject = target_subject
        self.questions: List[Dict] = []
        self.passages: Dict[str, str] = {}
        
        # Issue containers
        self.structural_issues: List[Dict] = []
        self.prefix_issues: List[Dict] = []
        self.category_mismatch_issues: List[Dict] = []
        self.duplicate_clusters: List[Dict] = []
        self.same_answer_issues: List[Dict] = []
        self.context_duplicate_issues: List[Dict] = []
        self.quality_issues: List[Dict] = []
        
        # NEW: Additional issue containers
        self.position_bias_issues: List[Dict] = []
        self.option_length_issues: List[Dict] = []
        self.special_char_issues: List[Dict] = []
        
        self.embeddings_cache: Dict[str, List[float]] = {}
        self.processed_ids: Set[str] = set()
        
        self.load_state()

    @property
    def classification_model(self) -> str:
        return GEMINI_MODEL if self.use_high_accuracy else GEMINI_FLASH
    
    def load_state(self):
        if os.path.exists(PROGRESS_FILE):
            try:
                with open(PROGRESS_FILE, 'r') as f:
                    state = json.load(f)
                    self.structural_issues = state.get('structural_issues', [])
                    self.prefix_issues = state.get('prefix_issues', [])
                    self.category_mismatch_issues = state.get('category_mismatch_issues', [])
                    self.duplicate_clusters = state.get('duplicate_clusters', [])
                    self.same_answer_issues = state.get('same_answer_issues', [])
                    self.context_duplicate_issues = state.get('context_duplicate_issues', [])
                    self.quality_issues = state.get('quality_issues', [])
                    # NEW: Load additional issue containers
                    self.position_bias_issues = state.get('position_bias_issues', [])
                    self.option_length_issues = state.get('option_length_issues', [])
                    self.special_char_issues = state.get('special_char_issues', [])
                    self.processed_ids = set(state.get('processed_ids', []))
                    logger.info(f"🔄 Loaded previous state: {len(self.quality_issues)} quality issues checked")
            except json.JSONDecodeError as e:
                logger.error(f"⚠️ Invalid JSON in progress file: {e}")
            except IOError as e:
                logger.error(f"⚠️ Could not read progress file: {e}")

    def save_state(self):
        state = {
            'timestamp': datetime.now().isoformat(),
            'structural_issues': self.structural_issues,
            'prefix_issues': self.prefix_issues,
            'category_mismatch_issues': self.category_mismatch_issues,
            'duplicate_clusters': self.duplicate_clusters,
            'same_answer_issues': self.same_answer_issues,
            'context_duplicate_issues': self.context_duplicate_issues,
            'quality_issues': self.quality_issues,
            # NEW: Save additional issue containers
            'position_bias_issues': self.position_bias_issues,
            'option_length_issues': self.option_length_issues,
            'special_char_issues': self.special_char_issues,
            'processed_ids': list(self.processed_ids)
        }
        try:
            with open(PROGRESS_FILE, 'w') as f:
                json.dump(state, f, indent=2)
        except IOError as e:
            logger.error(f"⚠️ Could not save progress file: {e}")
        
    def fetch_data(self):
        logger.info("📥 Fetching questions and passages...")
        try:
            p_response = supabase.table('passages').select('id, content').execute()
            if p_response.data:
                self.passages = {p['id']: p['content'] for p in p_response.data}
                logger.info(f"  Fetched {len(self.passages)} passages.")
        except Exception as e:
            logger.error(f"⚠️ Error fetching passages: {e}")

        count_response = supabase.table('questions_v2').select('id', count='exact').execute()
        total_count = count_response.count or 0
        logger.info(f"  Total questions in database: {total_count}")

        all_questions = []
        page_size = 900
        offset = 0
        
        query = supabase.table('questions_v2').select('*')
        if self.target_subject:
            logger.info(f"  Filtering for subject: {self.target_subject}")
            query = query.eq('subject', self.target_subject)
            # Re-fetch count for subject
            count_res = supabase.table('questions_v2').select('id', count='exact').eq('subject', self.target_subject).execute()
            total_count = count_res.count or 0
            logger.info(f"  Total {self.target_subject} questions: {total_count}")

        while offset < total_count:
            # We must reconstruct the query chain for range pagination
            base_query = supabase.table('questions_v2').select('*')
            if self.target_subject:
                base_query = base_query.eq('subject', self.target_subject)
            
            response = base_query.range(offset, offset + page_size - 1).execute()
            batch = response.data
            if not batch: break
            all_questions.extend(batch)
            logger.info(f"  Fetched {len(all_questions)}/{total_count} questions...")
            offset += page_size
        
        logger.info(f"✅ Total questions fetched: {len(all_questions)}")
        self.questions = all_questions

    # =========================================================================
    # HELPER: EMBEDDINGS
    # =========================================================================
    async def get_embedding(self, text: str) -> List[float]:
        """Get embedding for text with caching and retry logic."""
        if text in self.embeddings_cache:
            return self.embeddings_cache[text]
        
        async def _fetch_embedding():
            result = genai.embed_content(model="text-embedding-004", content=text)
            # Handle both dict and object response formats
            if isinstance(result, dict):
                return result.get('embedding', [])
            return getattr(result, 'embedding', [])
        
        try:
            embedding = await retry_async(_fetch_embedding, max_retries=MAX_RETRIES, delay=RETRY_DELAY)
            if embedding:
                self.embeddings_cache[text] = embedding
            return embedding
        except google.api_core.exceptions.ResourceExhausted as e:
            logger.warning(f"Rate limit hit for embedding: {e}")
            await asyncio.sleep(5)
            return []
        except google.api_core.exceptions.InvalidArgument as e:
            logger.error(f"Invalid argument for embedding (text: '{text[:50]}...'): {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected embedding error for '{text[:50]}...': {type(e).__name__}: {e}")
            return []

    def cosine_similarity(self, v1, v2) -> float:
        """Calculate cosine similarity with safe division."""
        if not v1 or not v2:
            return 0.0
        norm1, norm2 = np.linalg.norm(v1), np.linalg.norm(v2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return float(np.dot(v1, v2) / (norm1 * norm2))

    # =========================================================================
    # STEP 1: STRUCTURAL INTEGRITY
    # =========================================================================
    def check_structural_integrity(self) -> List[Dict]:
        logger.info("\n🔍 Step 1: Checking structural integrity...")
        if self.structural_issues:
            logger.info("  Skipping (already done)")
            return self.structural_issues
            
        issues = []
        for q in self.questions:
            q_issues = []
            options = q.get('options')
            correct_index = q.get('correct_index')
            
            if not options or not isinstance(options, list):
                q_issues.append("Missing or invalid options array")
            elif len(options) < 2:
                q_issues.append(f"Too few options ({len(options)})")
            elif correct_index is None:
                q_issues.append("Missing correct_index")
            elif not isinstance(correct_index, int):
                q_issues.append(f"Invalid correct_index type: {type(correct_index)}")
            elif correct_index < 0 or correct_index >= len(options):
                q_issues.append(f"correct_index {correct_index} out of bounds (0-{len(options)-1})")
            
            if not q.get('text') or str(q.get('text')).strip() == "":
                q_issues.append("Empty question text")
            
            if options:
                if any(not str(opt).strip() for opt in options):
                    q_issues.append("Contains empty options")
                
                normalized_options = [str(o).lower().strip() for o in options]
                if len(set(normalized_options)) != len(options):
                    q_issues.append(f"Duplicate options found")

            if q_issues:
                issues.append({
                    'id': q['id'],
                    'text': q.get('text', ''),
                    'subject': q.get('subject'),
                    'issue_type': 'structural',
                    'issues': q_issues
                })
        
        logger.info(f"  Found {len(issues)} questions with structural issues")
        self.structural_issues = issues
        self.save_state()
        return issues

    # =========================================================================
    # STEP 2: NUMBER PREFIXES
    # =========================================================================
    def detect_number_prefixes(self) -> List[Dict]:
        logger.info("\n🔍 Step 2: Detecting number prefixes...")
        if self.prefix_issues:
            logger.info("  Skipping (already done)")
            return self.prefix_issues

        patterns = [
            (r'^[1-9]\d?[\.\-\−\:\)]\s*', 'numbered'),
            (r'^Q\s*\d+[\.\-\:\)]?\s*', 'Q-prefix'),
            (r'^Question\s*\d+[\.\-\:\)]?\s*', 'question-prefix'),
            (r'^\(\d+\)\s*', 'parentheses'),
            (r'^\[\d+\]\s*', 'brackets'),
        ]
        
        issues = []
        for q in self.questions:
            text = q.get('text', '')
            for pattern, prefix_type in patterns:
                match = re.match(pattern, text, re.IGNORECASE)
                if match:
                    issues.append({
                        'id': q['id'],
                        'text': text,
                        'subject': q.get('subject'),
                        'issue_type': 'prefix',
                        'prefix_type': prefix_type,
                        'detected_prefix': match.group(0),
                        'suggested_fix': text[len(match.group(0)):].strip()
                    })
                    break
        
        logger.info(f"  Found {len(issues)} questions with number prefixes")
        self.prefix_issues = issues
        self.save_state()
        return issues

    # =========================================================================
    # STEP 3: CATEGORY MISMATCH
    # =========================================================================
    async def detect_category_mismatch(self) -> List[Dict]:
        logger.info("\n🔍 Step 3: Detecting category mismatch (DUAL MODEL - Gemini & Secondary)...")
        if self.category_mismatch_issues:
            logger.info("  Skipping (already done)")
            return self.category_mismatch_issues
        
        cg_questions = [q for q in self.questions if q.get('subject') == 'CG']
        log_questions = [q for q in self.questions if q.get('subject') == 'LOG']
        ang_questions = [q for q in self.questions if q.get('subject') == 'ANG']
        
        logger.info(f"  Checking {len(cg_questions)} CG, {len(log_questions)} LOG, {len(ang_questions)} ANG questions...")
        
        issues = []
        all_qs = cg_questions + log_questions + ang_questions
        
        for i in range(0, len(all_qs), CATEGORY_CHECK_BATCH_SIZE):
            batch = all_qs[i:i + CATEGORY_CHECK_BATCH_SIZE]
            logger.info(f"  Processing batch {i//CATEGORY_CHECK_BATCH_SIZE + 1}...")
            
            # Use both models in parallel for each question
            tasks = []
            for q in batch:
                tasks.append(self._classify_question_category_dual(q, q.get('subject')))
            
            results = await asyncio.gather(*tasks)
            
            for q, (actual_subject, confidence, reason, should_flag) in zip(batch, results):
                if should_flag:
                    issues.append({
                        'id': q['id'],
                        'text': q.get('text', ''),
                        'claimed_subject': q.get('subject'),
                        'actual_subject': actual_subject,
                        'confidence': confidence,
                        'reason': reason,
                        'issue_type': 'category_mismatch'
                    })
            
            if i % 100 == 0: self.save_state()
            await asyncio.sleep(0.5)
        
        logger.info(f"  Found {len(issues)} misclassified questions")
        self.category_mismatch_issues = issues
        self.save_state()
        return issues

    async def _classify_question_category_dual(self, question: Dict, claimed_subject: str) -> Tuple[str, float, str, bool]:
        """
        Dual model check:
        1. Ask Gemini
        2. Ask Secondary (GPT/Claude)
        If EITHER says misclassified -> Flag it.
        """
        text = question.get('text', '')
        options = question.get('options', [])
        
        prompt = f"""Analyze this question's subject.
        QUESTION: {text}
        OPTIONS: {json.dumps(options, ensure_ascii=False)}
        CURRENT LABEL: {claimed_subject}
        
        DEFINITIONS:
        - CG: French, History, Geo, Politics, Facts, General Knowledge.
        - LOG: Logic puzzles, Math, Sequences, Reasoning. No facts.
        - ANG: English language.
        
        Respond JSON: {{ "actual_subject": "CG"|"LOG"|"ANG", "confidence": 0.0-1.0, "reason": "...", "should_flag": true/false }}
        """

        # 1. Gemini Check
        gemini_flag = False
        gemini_actual = claimed_subject
        gemini_reason = ""
        
        async def _gemini_classify():
            model = genai.GenerativeModel(self.classification_model)
            return await model.generate_content_async(prompt, generation_config={'temperature': 0.1})
        
        try:
            response = await retry_async(_gemini_classify, max_retries=MAX_RETRIES, delay=RETRY_DELAY)
            match = re.search(r'\{[^{}]*\}', response.text, re.DOTALL)
            if match:
                res = json.loads(match.group())
                gemini_actual = res.get('actual_subject', claimed_subject)
                gemini_reason = f"[Gemini] {res.get('reason', '')}"
                # Trust model's "should_flag" or implicit mismatch
                if res.get('should_flag') or (gemini_actual and gemini_actual != claimed_subject):
                    gemini_flag = True
        except google.api_core.exceptions.ResourceExhausted as e:
            logger.warning(f"Gemini rate limit: {e}")
            await asyncio.sleep(5)
        except json.JSONDecodeError as e:
            logger.error(f"Gemini JSON parse error: {e}")
        except Exception as e:
            logger.error(f"Gemini classification error: {type(e).__name__}: {e}")

        # 2. Secondary Check (if configured)
        sec_flag = False
        sec_actual = claimed_subject
        sec_reason = ""
        
        if HAS_OPENAI and openai_client:
            async def _openai_classify():
                return await openai_client.chat.completions.create(
                    model=GPT_MODEL,
                    messages=[{"role": "user", "content": prompt}],
                    response_format={"type": "json_object"}
                )
            
            try:
                response = await retry_async(_openai_classify, max_retries=MAX_RETRIES, delay=RETRY_DELAY)
                content = response.choices[0].message.content
                match = re.search(r'\{[^{}]*\}', content, re.DOTALL)
                if match:
                    res = json.loads(match.group())
                    sec_actual = res.get('actual_subject', claimed_subject)
                    sec_reason = f"[{SECONDARY_MODEL_PROVIDER}] {res.get('reason', '')}"
                    if res.get('should_flag') or (sec_actual and sec_actual != claimed_subject):
                        sec_flag = True
            except json.JSONDecodeError as e:
                logger.error(f"OpenAI JSON parse error: {e}")
            except Exception as e:
                logger.error(f"OpenAI classification error: {type(e).__name__}: {e}")
                
        elif HAS_ANTHROPIC and anthropic_client:
            async def _anthropic_classify():
                return await anthropic_client.messages.create(
                    model=CLAUDE_MODEL,
                    max_tokens=1000,
                    messages=[{"role": "user", "content": prompt}]
                )
            
            try:
                msg = await retry_async(_anthropic_classify, max_retries=MAX_RETRIES, delay=RETRY_DELAY)
                content = msg.content[0].text
                match = re.search(r'\{[^{}]*\}', content, re.DOTALL)
                if match:
                    res = json.loads(match.group())
                    sec_actual = res.get('actual_subject', claimed_subject)
                    sec_reason = f"[{SECONDARY_MODEL_PROVIDER}] {res.get('reason', '')}"
                    if res.get('should_flag') or (sec_actual and sec_actual != claimed_subject):
                        sec_flag = True
            except json.JSONDecodeError as e:
                logger.error(f"Anthropic JSON parse error: {e}")
            except Exception as e:
                logger.error(f"Anthropic classification error: {type(e).__name__}: {e}")
        
        # DECISION: Flag if EITHER flags it
        final_flag = gemini_flag or sec_flag
        final_actual = gemini_actual if gemini_flag else (sec_actual if sec_flag else claimed_subject)
        final_reason = f"{gemini_reason} | {sec_reason}".strip(' | ')
        
        return final_actual, 1.0 if final_flag else 0.0, final_reason, final_flag


    # =========================================================================
    # STEP 4: SAME ANSWER DETECTION (Fuzzy + Context)
    # =========================================================================
    async def detect_same_answer_issues(self) -> List[Dict]:
        logger.info("\n🔍 Step 4: Detecting same-answer issues (Fuzzy >= 80% + Context)...")
        if self.same_answer_issues:
            logger.info("  Skipping (already done)")
            return self.same_answer_issues
        
        by_subject = defaultdict(list)
        for q in self.questions:
            idx = q.get('correct_index')
            opts = q.get('options', [])
            if idx is not None and 0 <= idx < len(opts):
                ans = str(opts[idx]).strip()
                if len(ans) > 2:
                    by_subject[q.get('subject')].append({'id': q['id'], 'answer': ans, 'text': q.get('text')})

        issues = []
        
        for subject, items in by_subject.items():
            logger.info(f"  Analyzing {len(items)} answers in {subject}...")
            buckets = defaultdict(list)
            for item in items:
                norm = re.sub(r'\W+', '', item['answer'].lower())
                buckets[norm].append(item)
            
            potential_groups = [g for g in buckets.values() if len(g) >= 2]
            
            for group in potential_groups:
                if len(group) >= SAME_ANSWER_MIN_COUNT:
                     issues.append({
                         'subject': subject,
                         'answer': group[0]['answer'],
                         'count': len(group),
                         'question_ids': [x['id'] for x in group],
                         'issue_type': 'same_answer_repetition'
                     })

        logger.info(f"  Found {len(issues)} same-answer groups")
        self.same_answer_issues = issues
        self.save_state()
        return issues

    # =========================================================================
    # STEP 5: DUPLICATE DETECTION (Text + Options, Semantic, Context)
    # =========================================================================
    def detect_text_duplicates(self) -> List[Dict]:
        logger.info(f"\n🔍 Step 5a: Detecting duplicates (Text + Options, Fuzzy >= {TEXT_OPTIONS_SIMILARITY_THRESHOLD}%)...")
        
        duplicates = []
        by_subject = defaultdict(list)
        for q in self.questions:
            by_subject[q.get('subject')].append(q)
            
        processed = set()
        
        for subject, qs in by_subject.items():
            logger.info(f"    Subject {subject} ({len(qs)} questions)...")
            contents = []
            for q in qs:
                # Combine text and options
                content = f"{q.get('text', '')} {' '.join([str(o) for o in q.get('options', [])])}".lower()
                contents.append((q['id'], content))
            
            for i in range(len(contents)):
                for j in range(i + 1, len(contents)):
                    id1, c1 = contents[i]
                    id2, c2 = contents[j]
                    
                    pair = tuple(sorted([id1, id2]))
                    if pair in processed: continue
                    processed.add(pair)
                    
                    ratio = fuzz.ratio(c1, c2)
                    if ratio >= TEXT_OPTIONS_SIMILARITY_THRESHOLD:
                        duplicates.append({
                            'q1_id': id1,
                            'q2_id': id2,
                            'similarity': ratio,
                            'detection_method': 'text_options_fuzzy',
                            'subject': subject
                        })
        
        logger.info(f"  Found {len(duplicates)} text/option duplicate pairs")
        return duplicates

    async def detect_context_duplicates(self, existing_pairs: Set[Tuple]) -> List[Dict]:
        """
        Detect questions that share the same CONTEXT (topic, event, person)
        even if phrased differently. 
        """
        logger.info("\n🔍 Step 5b: Detecting context duplicates (Model-Based)...")
        
        # Group by subject
        groups = defaultdict(list)
        for q in self.questions:
            groups[q.get('subject')].append(q)
        
        all_context_dups = []
        
        for subject, group in groups.items():
            if subject in ['ANG']:  
                continue
                
            logger.info(f"    [Context] Subject {subject} ({len(group)} questions)...")
            
            candidates = []
            embeddings = {}
            
            # Use embeddings as pre-filter
            logger.info(f"      Computing embeddings for {len(group)} questions...")
            for i in range(0, len(group), EMBEDDING_BATCH_SIZE):
                batch = group[i:i+EMBEDDING_BATCH_SIZE]
                for q in batch:
                    if q['text'] not in self.embeddings_cache:
                        emb = await self.get_embedding(q['text'])
                        self.embeddings_cache[q['text']] = emb
                    embeddings[q['id']] = self.embeddings_cache.get(q['text'])
                await asyncio.sleep(0.1)
            
            logger.info(f"      Finding candidate pairs (threshold >= {CONTEXT_SIMILARITY_THRESHOLD})...")
            
            for i, q1 in enumerate(group):
                for j, q2 in enumerate(group[i+1:], i+1):
                    pair_key = tuple(sorted([q1['id'], q2['id']]))
                    if pair_key in existing_pairs:
                        continue
                    
                    sim = self.cosine_similarity(embeddings.get(q1['id']), embeddings.get(q2['id']))
                    # Use CONTEXT_SIMILARITY_THRESHOLD (0.72) instead of hardcoded 0.50
                    if sim >= CONTEXT_SIMILARITY_THRESHOLD and sim < SEMANTIC_SIMILARITY_THRESHOLD:
                        candidates.append((q1, q2, sim))
            
            # Sort by similarity (highest first) and cap to avoid API overload
            candidates.sort(key=lambda x: x[2], reverse=True)
            total_candidates = len(candidates)
            
            if total_candidates > MAX_CONTEXT_CANDIDATES_PER_SUBJECT:
                logger.info(f"      Found {total_candidates} candidates, capping to {MAX_CONTEXT_CANDIDATES_PER_SUBJECT} highest similarity pairs...")
                candidates = candidates[:MAX_CONTEXT_CANDIDATES_PER_SUBJECT]
            else:
                logger.info(f"      Found {total_candidates} context candidates for model validation...")
            
            # Process candidates in batches with progress
            total_batches = (len(candidates) + 9) // 10
            for batch_idx, i in enumerate(range(0, len(candidates), 10)):
                batch = candidates[i:i+10]
                logger.info(f"      Validating batch {batch_idx + 1}/{total_batches}...")
                
                tasks = [self._validate_context_duplicate(q1, q2) for q1, q2, _ in batch]
                results = await asyncio.gather(*tasks)
                
                for (q1, q2, sim), (is_dup, reason, confidence) in zip(batch, results):
                    if is_dup:
                        all_context_dups.append({
                            'q1_id': q1['id'],
                            'q2_id': q2['id'],
                            'q1_text': q1['text'],
                            'q2_text': q2['text'],
                            'embedding_similarity': round(sim, 3),
                            'model_confidence': confidence,
                            'detection_method': 'context_duplicate',
                            'reason': reason,
                            'subject': subject
                        })
                
                await asyncio.sleep(0.5)  # Increased delay to avoid rate limits
            
            self.save_state()
        
        logger.info(f"  Found {len(all_context_dups)} context duplicate pairs")
        self.context_duplicate_issues = all_context_dups
        return all_context_dups

    async def _validate_context_duplicate(self, q1: Dict, q2: Dict) -> Tuple[bool, str, float]:
        prompt = f"""Compare these two questions. Are they DUPLICATES (same context/topic/knowledge)?
        Q1: {q1['text']}
        Q2: {q2['text']}
        Respond JSON: {{ "is_duplicate": true/false, "reason": "...", "confidence": 0.0-1.0 }}
        """
        
        async def _validate():
            model = genai.GenerativeModel(self.classification_model)
            return await model.generate_content_async(prompt, generation_config={'temperature': 0.1})
        
        try:
            res = await retry_async(_validate, max_retries=MAX_RETRIES, delay=RETRY_DELAY)
            match = re.search(r'\{.*\}', res.text, re.DOTALL)
            if match:
                d = json.loads(match.group())
                return d.get('is_duplicate', False), d.get('reason', ''), d.get('confidence', 0.5)
        except google.api_core.exceptions.ResourceExhausted as e:
            logger.warning(f"Rate limit in context validation: {e}")
            await asyncio.sleep(5)
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error in context validation: {e}")
        except Exception as e:
            logger.error(f"Context validation error: {type(e).__name__}: {e}")
        return False, "", 0.0

    # =========================================================================
    # STEP 6: QUALITY ISSUES (Gemini + Secondary) - WITH DEDUPLICATION
    # =========================================================================
    async def check_quality_issues(self) -> List[Dict]:
        logger.info(f"\n🔍 Step 6: Checking quality issues (Gemini + {SECONDARY_MODEL_PROVIDER})...")
        
        checked_ids = {i['id'] for i in self.quality_issues}
        valid_qs = [q for q in self.questions if q['id'] not in checked_ids]
        
        logger.info(f"  Checking {len(valid_qs)} questions...")
        
        # Track flagged IDs to prevent duplicates
        flagged_ids = set(checked_ids)
        
        for i in range(0, len(valid_qs), QUALITY_CHECK_BATCH_SIZE):
            batch = valid_qs[i:i + QUALITY_CHECK_BATCH_SIZE]
            logger.info(f"  Batch {i//QUALITY_CHECK_BATCH_SIZE + 1}...")
            
            try:
                gemini_task = self.check_quality_gemini(batch)
                sec_task = self.check_quality_secondary(batch)
                
                results = await asyncio.gather(gemini_task, sec_task, return_exceptions=True)
                
                # Handle potential exceptions in results
                res_gemini = results[0] if not isinstance(results[0], Exception) else []
                res_sec = results[1] if not isinstance(results[1], Exception) else []
                
                if isinstance(results[0], Exception):
                    logger.error(f"Gemini quality check error: {results[0]}")
                if isinstance(results[1], Exception):
                    logger.error(f"Secondary quality check error: {results[1]}")
                
                # DEDUPLICATION: Only add if not already flagged
                for res in res_gemini:
                    res_id = res.get('id')
                    if res_id and res_id not in flagged_ids:
                        self.quality_issues.append(res)
                        flagged_ids.add(res_id)
                
                for res in res_sec:
                    res_id = res.get('id')
                    if res_id and res_id not in flagged_ids:
                        self.quality_issues.append(res)
                        flagged_ids.add(res_id)
                    elif res_id in flagged_ids:
                        # Merge explanation if same ID flagged by both
                        for existing in self.quality_issues:
                            if existing.get('id') == res_id:
                                existing_sources = existing.get('source', '')
                                if SECONDARY_MODEL_PROVIDER not in existing_sources:
                                    existing['source'] = f"{existing_sources}, {res.get('source', SECONDARY_MODEL_PROVIDER)}"
                                    existing['explanation'] = f"{existing.get('explanation', '')} | {res.get('explanation', '')}"
                                break
                    
            except Exception as e:
                logger.error(f"⚠️ Error in quality batch: {type(e).__name__}: {e}")
            
            self.save_state()
            await asyncio.sleep(1.0)
            
        return self.quality_issues

    async def check_quality_gemini(self, batch) -> List[Dict]:
        prompt = """Identify INVALID/POOR quality questions.
        Criteria:
        1. TRIVIAL/FUTILE: Too easy for exam level.
        2. TYPOS/GRAMMAR: Errors in text.
        3. INCOMPLETE: Missing text/options.
        4. AMBIGUOUS: Unclear.
        
        Respond JSON: [{"id": "...", "issue": "...", "explanation": "..."}]
        Only return questions with issues. Return empty array [] if no issues found.
        """
        q_text = "\n".join([f"ID:{q['id']} Q:{q['text']} Opts:{q['options']}" for q in batch])
        
        async def _quality_check():
            model = genai.GenerativeModel(self.classification_model)
            return await model.generate_content_async(f"{prompt}\nQUESTIONS:\n{q_text}")
        
        try:
            res = await retry_async(_quality_check, max_retries=MAX_RETRIES, delay=RETRY_DELAY)
            match = re.search(r'\[.*\]', res.text, re.DOTALL)
            if match:
                data = json.loads(match.group())
                return [{**item, 'source': 'Gemini'} for item in data if isinstance(item, dict) and item.get('id')]
        except google.api_core.exceptions.ResourceExhausted as e:
            logger.warning(f"Gemini rate limit in quality check: {e}")
            await asyncio.sleep(5)
        except json.JSONDecodeError as e:
            logger.error(f"Gemini quality check JSON error: {e}")
        except Exception as e:
            logger.error(f"Gemini quality check error: {type(e).__name__}: {e}")
        return []

    async def check_quality_secondary(self, batch) -> List[Dict]:
        if not openai_client and not anthropic_client:
            return []
            
        prompt = "Identify INVALID/POOR quality questions (Typos, Trivial, Incomplete). Return JSON list: [{'id': '...', 'issue': '...', 'explanation': '...'}]. Return empty array [] if no issues."
        q_text = "\n".join([f"ID:{q['id']} Q:{q['text']} Opts:{q['options']}" for q in batch])
        
        try:
            content = ""
            if openai_client:
                async def _openai_quality():
                    return await openai_client.chat.completions.create(
                        model=GPT_MODEL,
                        messages=[{"role": "user", "content": f"{prompt}\n{q_text}"}],
                        response_format={"type": "json_object"}
                    )
                
                response = await retry_async(_openai_quality, max_retries=MAX_RETRIES, delay=RETRY_DELAY)
                content = response.choices[0].message.content
                
            elif anthropic_client:
                async def _anthropic_quality():
                    return await anthropic_client.messages.create(
                        model=CLAUDE_MODEL,
                        max_tokens=2000,
                        messages=[{"role": "user", "content": f"{prompt}\n{q_text}"}]
                    )
                
                msg = await retry_async(_anthropic_quality, max_retries=MAX_RETRIES, delay=RETRY_DELAY)
                content = msg.content[0].text

            # Try to parse JSON array first, then object
            match = re.search(r'(\[.*\])', content, re.DOTALL)
            if not match:
                match = re.search(r'\{.*\}', content, re.DOTALL)
            
            if match:
                data = json.loads(match.group())
                if isinstance(data, dict):
                    data = data.get('issues', []) if 'issues' in data else [data]
                return [{**item, 'source': SECONDARY_MODEL_PROVIDER} for item in data if isinstance(item, dict) and item.get('id')]
                
        except json.JSONDecodeError as e:
            logger.error(f"Secondary quality check JSON error: {e}")
        except Exception as e:
            logger.error(f"Secondary quality check error: {type(e).__name__}: {e}")
        return []

    # =========================================================================
    # STEP 7: ANSWER POSITION BIAS DETECTION
    # =========================================================================
    def detect_answer_position_bias(self) -> List[Dict]:
        """Detect if correct answers are disproportionately in one position."""
        logger.info("\n🔍 Step 7: Checking answer position bias...")
        
        if self.position_bias_issues:
            logger.info("  Skipping (already done)")
            return self.position_bias_issues
        
        issues = []
        by_subject = defaultdict(list)
        
        for q in self.questions:
            idx = q.get('correct_index')
            if idx is not None:
                by_subject[q.get('subject')].append(idx)
        
        for subject, positions in by_subject.items():
            if len(positions) < 10:
                continue
            
            counter = Counter(positions)
            total = len(positions)
            
            for pos, count in counter.items():
                percentage = (count / total) * 100
                # Flag if any position has >40% of answers (for 4 options, expected is 25%)
                if percentage > POSITION_BIAS_THRESHOLD:
                    issues.append({
                        'subject': subject,
                        'issue_type': 'answer_position_bias',
                        'position': pos,
                        'percentage': round(percentage, 1),
                        'count': count,
                        'total': total,
                        'recommendation': f"Position {pos} has {percentage:.1f}% of correct answers. Consider rebalancing."
                    })
        
        logger.info(f"  Found {len(issues)} position bias issues")
        self.position_bias_issues = issues
        self.save_state()
        return issues

    # =========================================================================
    # STEP 8: OPTION LENGTH IMBALANCE DETECTION
    # =========================================================================
    def detect_option_length_imbalance(self) -> List[Dict]:
        """Detect when correct answer length is significantly different from distractors."""
        logger.info("\n🔍 Step 8: Checking option length imbalance...")
        
        if self.option_length_issues:
            logger.info("  Skipping (already done)")
            return self.option_length_issues
        
        issues = []
        
        for q in self.questions:
            options = q.get('options', [])
            correct_idx = q.get('correct_index')
            
            if not options or correct_idx is None or correct_idx >= len(options):
                continue
            
            lengths = [len(str(opt)) for opt in options]
            correct_len = lengths[correct_idx]
            other_lengths = [l for i, l in enumerate(lengths) if i != correct_idx]
            
            if not other_lengths:
                continue
            
            avg_other = sum(other_lengths) / len(other_lengths)
            
            # Flag if correct answer is >2x longer or <0.5x shorter than average
            if avg_other > 0:
                ratio = correct_len / avg_other
                if ratio > OPTION_LENGTH_RATIO_HIGH or ratio < OPTION_LENGTH_RATIO_LOW:
                    issues.append({
                        'id': q['id'],
                        'text': q.get('text', '')[:100],
                        'subject': q.get('subject'),
                        'issue_type': 'option_length_imbalance',
                        'correct_length': correct_len,
                        'avg_other_length': round(avg_other, 1),
                        'ratio': round(ratio, 2),
                        'recommendation': 'Correct answer length differs significantly from distractors (test-taking cue)'
                    })
        
        logger.info(f"  Found {len(issues)} option length imbalance issues")
        self.option_length_issues = issues
        self.save_state()
        return issues

    # =========================================================================
    # STEP 9: SPECIAL CHARACTER/ENCODING DETECTION
    # =========================================================================
    def detect_special_characters(self) -> List[Dict]:
        """Detect encoding issues and problematic characters."""
        logger.info("\n🔍 Step 9: Checking for special character issues...")
        
        if self.special_char_issues:
            logger.info("  Skipping (already done)")
            return self.special_char_issues
        
        issues = []
        
        problematic_patterns = [
            (r'[\x00-\x08\x0b\x0c\x0e-\x1f]', 'control_characters'),
            (r'&[a-z]+;', 'html_entities'),
            (r'\\u[0-9a-fA-F]{4}', 'unicode_escapes'),
            (r'[^\x00-\x7F]{5,}', 'non_ascii_sequence'),  # 5+ consecutive non-ASCII
            (r'\?{3,}', 'encoding_errors'),  # Often indicates failed encoding
            (r'�+', 'replacement_chars'),  # Unicode replacement character
        ]
        
        for q in self.questions:
            text = q.get('text', '')
            options_text = ' '.join([str(o) for o in q.get('options', [])])
            full_text = f"{text} {options_text}"
            
            found_issues = []
            for pattern, issue_type in problematic_patterns:
                matches = re.findall(pattern, full_text)
                if matches:
                    found_issues.append({
                        'type': issue_type,
                        'found': matches[:5]  # First 5 matches
                    })
            
            if found_issues:
                issues.append({
                    'id': q['id'],
                    'text': text[:100],
                    'subject': q.get('subject'),
                    'issue_type': 'special_characters',
                    'problems': found_issues
                })
        
        logger.info(f"  Found {len(issues)} special character issues")
        self.special_char_issues = issues
        self.save_state()
        return issues

    # =========================================================================
    # SUMMARY HELPER
    # =========================================================================
    def _print_summary(self, summary: Dict):
        """Print a formatted summary."""
        logger.info("\n" + "="*60)
        logger.info("📊 SUMMARY")
        logger.info("="*60)
        total_issues = sum(v for k, v in summary.items() if k != 'total')
        logger.info(f"Total Questions: {summary['total']}")
        logger.info(f"Total Issues Found: {total_issues}")
        logger.info("-"*40)
        for key, value in summary.items():
            if key != 'total' and value > 0:
                logger.info(f"  {key}: {value}")

    async def run(self):
        logger.info("="*60)
        logger.info("🔍 ADVANCED QUESTION DIAGNOSTICS V3.1")
        logger.info(f"   Secondary Model: {SECONDARY_MODEL_PROVIDER}")
        logger.info("="*60)
        
        self.fetch_data()
        
        # Core checks (Steps 1-5)
        self.check_structural_integrity()
        self.detect_number_prefixes()
        await self.detect_category_mismatch()
        await self.detect_same_answer_issues()
        
        text_dups = self.detect_text_duplicates()
        existing_pairs = {tuple(sorted([d['q1_id'], d['q2_id']])) for d in text_dups}
        
        # Context/Semantic Duplicates
        context_dups = await self.detect_context_duplicates(existing_pairs)
        self.duplicate_clusters = text_dups + context_dups
        
        # AI-based quality check (Step 6)
        await self.check_quality_issues()
        
        # NEW: Additional quality checks (Steps 7-9)
        self.detect_answer_position_bias()
        self.detect_option_length_imbalance()
        self.detect_special_characters()
        
        # Generate Report
        report = {
            'generated_at': datetime.now().isoformat(),
            'version': '3.1',
            'summary': {
                'total': len(self.questions),
                'structural': len(self.structural_issues),
                'prefix': len(self.prefix_issues),
                'category': len(self.category_mismatch_issues),
                'same_answer': len(self.same_answer_issues),
                'duplicates': len(self.duplicate_clusters),
                'quality': len(self.quality_issues),
                # NEW summary items
                'position_bias': len(self.position_bias_issues),
                'option_length_imbalance': len(self.option_length_issues),
                'special_characters': len(self.special_char_issues),
            },
            'issues': {
                'structural': self.structural_issues,
                'prefix': self.prefix_issues,
                'category': self.category_mismatch_issues,
                'same_answer': self.same_answer_issues,
                'duplicates': self.duplicate_clusters,
                'quality': self.quality_issues,
                # NEW issue types
                'position_bias': self.position_bias_issues,
                'option_length_imbalance': self.option_length_issues,
                'special_characters': self.special_char_issues,
            }
        }
        
        try:
            with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            logger.info(f"\n✅ Report saved to {OUTPUT_FILE}")
        except IOError as e:
            logger.error(f"Failed to save report: {e}")
        
        # Print formatted summary
        self._print_summary(report['summary'])

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Detect question issues (V3)')
    parser.add_argument('--subject', type=str, help='Specific subject to check (CG, LOG, ANG)')
    parser.add_argument('--fast', action='store_true', help='Use faster models')
    
    args = parser.parse_args()
    
    detector = QuestionIssueDetectorV3(
        use_high_accuracy_models=not args.fast,
        target_subject=args.subject.upper() if args.subject else None
    )
    asyncio.run(detector.run())
