# Code Review: Question Fix Scripts

## Critical Issues 🔴

### 1. Incorrect OpenAI API Usage

**Files Affected:**
- `scripts/refresh_easy_questions.py` (line 206)
- `scripts/translate_cg_options.py` (line 121)

**Problem:**
Both scripts use `client.responses.create()` which doesn't exist in the OpenAI Python SDK. The correct method is `client.chat.completions.create()`.

**Current Code:**
```python
response = client.responses.create(
    model=model,
    input=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ],
)
content = response.output_text.strip()  # ❌ output_text doesn't exist
```

**Correct Implementation (from generate_explanations.py):**
```python
response = client.chat.completions.create(
    model=model,
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ],
)
content = (response.choices[0].message.content or "").strip()
```

**Impact:** These scripts will crash immediately when trying to call OpenAI API.

---

### 2. Transaction Safety Issue in refresh_easy_questions.py

**Location:** Lines 494-517

**Problem:**
The script inserts a new question and then deletes the old one, but there's no transaction wrapping these operations. If the deletion fails (e.g., due to a foreign key constraint or network issue), you'll have:
- A new HARD question inserted
- The original EASY question still in the database
- Duplicate questions in the system

**Current Flow:**
```python
if args.apply:
    inserted, result = insert_new_question(supabase, insert_payload)
    if not inserted:
        # handle failure
        continue
    
    success, delete_reason = delete_question(supabase, qid)
    if not success:
        # handle failure, but new question is already inserted!
        failed.append(...)
        continue
```

**Recommendation:**
Either:
1. Use database transactions (if Supabase supports them via the Python client)
2. Delete first, then insert (but this risks data loss if insert fails)
3. Implement a rollback mechanism to delete the inserted question if deletion of original fails
4. Add a cleanup script to handle orphaned questions

**Alternative Approach:**
```python
if args.apply:
    # Option: Update in place instead of delete+insert
    # Or: Use a transaction if available
    inserted, result = insert_new_question(supabase, insert_payload)
    if not inserted:
        continue
    
    # Try to delete, but if it fails, mark for cleanup
    success, delete_reason = delete_question(supabase, qid)
    if not success:
        # Log the new question ID so it can be cleaned up
        warn(f"Failed to delete {qid}, new question {result} inserted. Manual cleanup required.")
        # Optionally: delete the newly inserted question
        # supabase.table("questions").delete().eq("id", result).execute()
```

---

## High Priority Issues 🟠

### 3. Suspicious Loop Control Logic in recategorize_ang_cg.py

**Location:** Lines 292-294

**Problem:**
The `break`/`continue` pattern is confusing and potentially buggy:

```python
else:
    continue  # only executed if inner loop wasn't broken
break  # break outer loop when dry-run limit triggered
```

This breaks the outer loop after every inner loop iteration when the dry-run limit is reached, but the logic is hard to follow. The `for-else` construct means `continue` executes only if the loop completes normally (no break), but then `break` always executes.

**Recommendation:**
Simplify the control flow:

```python
for batch in chunked(pending_ids, args.batch_size):
    # ... process batch ...
    
    for row in rows:
        # ... process row ...
        
        if args.dry_run_limit and len(processed_updates) >= args.dry_run_limit:
            warn("Dry-run limit reached; stopping early.")
            break
    else:
        continue  # Inner loop completed normally, continue outer loop
    
    break  # Inner loop was broken, exit outer loop
```

Or use a flag:

```python
should_stop = False
for batch in chunked(pending_ids, args.batch_size):
    if should_stop:
        break
    for row in rows:
        # ... process ...
        if args.dry_run_limit and len(processed_updates) >= args.dry_run_limit:
            warn("Dry-run limit reached; stopping early.")
            should_stop = True
            break
```

---

### 4. Missing Rate Limiting

**Problem:**
All scripts make sequential API calls to OpenAI and Gemini without any rate limiting or backoff. This can:
- Hit API rate limits
- Get rate-limited responses
- Cost more than necessary due to lack of batching

**Recommendation:**
Add delays between API calls, especially in loops:

```python
import time

# In translate_cg_options.py, refresh_easy_questions.py
for entry in flags:
    # ... make API call ...
    time.sleep(0.5)  # Basic rate limiting
```

Consider using exponential backoff for retries:

```python
import time
import random

def exponential_backoff(attempt: int, base_delay: float = 1.0, max_delay: float = 60.0):
    delay = min(base_delay * (2 ** attempt) + random.uniform(0, 1), max_delay)
    time.sleep(delay)
```

---

### 5. Incomplete Error Handling in translate_cg_options.py

**Location:** Lines 236-251

**Problem:**
If GPT translation fails, the script continues but doesn't provide enough context in the rejection log. The error could be:
- Rate limiting
- Invalid API key
- Network timeout
- Malformed response

**Current:**
```python
translation = translate_with_gpt(...)
if translation is None:
    rejected.append({
        "question_id": qid,
        "option": option,
        "reason": "gpt_failed",  # Too generic
        "original_text": option_text,
    })
    continue
```

**Recommendation:**
Capture and log the specific exception:

```python
try:
    translation = translate_with_gpt(...)
except Exception as exc:
    warn(f"Translation failed for {qid} option {option}: {exc}")
    rejected.append({
        "question_id": qid,
        "option": option,
        "reason": f"gpt_failed: {type(exc).__name__}",
        "error_details": str(exc),
        "original_text": option_text,
    })
    continue

if translation is None:
    # Still log even if no exception raised
    rejected.append({
        "question_id": qid,
        "option": option,
        "reason": "gpt_failed: no translation returned",
        "original_text": option_text,
    })
    continue
```

---

### 6. Potential Data Loss in refresh_easy_questions.py

**Location:** Lines 494-517

**Problem:**
If the script crashes between inserting the new question and deleting the old one, or if `--apply` is used but the script is interrupted, you could end up with duplicate questions or orphaned data.

**Recommendation:**
1. Add idempotency checks (check if replacement already exists before generating)
2. Store mapping of old_id -> new_id before deletion
3. Implement a recovery mechanism to clean up partial runs
4. Consider using a staging status before final deletion

---

## Medium Priority Issues 🟡

### 7. Missing Input Validation

**recategorize_ang_cg.py:**
- No validation that threshold values are in valid range (0.0-1.0)
- No check that input JSON has required fields

**translate_cg_options.py:**
- No validation that skip file format is correct (expects `question_id|option`)
- No verification that question_id exists in database before processing

**Recommendation:**
```python
def validate_args(args):
    if not (0.0 <= args.english_threshold <= 1.0):
        raise ValueError(f"english_threshold must be between 0.0 and 1.0, got {args.english_threshold}")
    # ... other validations
```

---

### 8. Hard-coded Language Thresholds May Be Too Permissive

**refresh_easy_questions.py:**
- Default `english_threshold=0.6` might be too low for ANG questions
- Default `french_threshold=0.7` might allow some English in CG questions

**Recommendation:**
Document why these thresholds were chosen, or make them stricter by default with an option to relax.

---

### 9. Inconsistent Error Messages

Different scripts handle Supabase connection errors differently:
- `recategorize_ang_cg.py`: Warns and returns
- `translate_cg_options.py`: Warns and returns
- `refresh_easy_questions.py`: Warns and returns

But `validate_categories.py` doesn't handle it explicitly - it would crash with `get_supabase_client()` exception.

**Recommendation:**
Standardize error handling across all scripts.

---

### 10. JSON Parsing Fragility

**Location:** Multiple files (translate_cg_options.py:129-133, refresh_easy_questions.py:214-218)

**Problem:**
The JSON extraction using `find("{")` and `rfind("}")` is fragile:
- Won't work if JSON is nested inside code blocks
- Doesn't handle escaped braces in strings
- May fail on multi-line JSON with formatting

**Current:**
```python
start = content.find("{")
end = content.rfind("}") + 1
if start == -1 or end <= start:
    raise ValueError("JSON introuvable")
payload = json.loads(content[start:end])
```

**Better Approach:**
```python
# Try to find JSON block, handle markdown code fences
content = content.strip()
if content.startswith("```"):
    lines = content.split("\n")
    # Remove first and last lines if they're code fence markers
    if lines[0].strip().startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].strip() == "```":
        lines = lines[:-1]
    content = "\n".join(lines)

# Find first { and last }, but validate it's valid JSON
start = content.find("{")
end = content.rfind("}") + 1

if start == -1 or end <= start:
    raise ValueError("JSON introuvable")

# Try parsing, may still fail but gives better error
try:
    payload = json.loads(content[start:end])
except json.JSONDecodeError as exc:
    raise ValueError(f"JSON invalide: {exc}") from exc
```

---

### 11. Missing Progress Indicators

**refresh_easy_questions.py** has progress (`[{idx}/{len(rows)}]`), but:
- `translate_cg_options.py` doesn't show progress for large batches
- `recategorize_ang_cg.py` processes in batches but doesn't show batch progress

**Recommendation:**
Add progress logging for long-running operations:

```python
total = len(flags)
for idx, entry in enumerate(flags, start=1):
    if idx % 10 == 0:
        info(f"Processing {idx}/{total} ({100*idx/total:.1f}%)")
    # ... process entry
```

---

### 12. Potential Race Condition in insert_new_question

**refresh_easy_questions.py: Lines 349-357**

**Problem:**
The duplicate hash check and insert are not atomic:

```python
exists = client.table("questions").select("id").eq("unique_hash", payload["unique_hash"]).limit(1).execute()
if exists.data:
    return False, "duplicate_hash"
response = client.table("questions").insert(payload).execute()
```

Between the check and insert, another process could insert the same hash, leading to duplicates.

**Recommendation:**
Rely on database unique constraints if `unique_hash` has a unique index, or use upsert semantics.

---

## Low Priority / Best Practices 🟢

### 13. Code Duplication

- Skip file loading logic is duplicated across multiple scripts
- Language score detection has slight variations
- JSON file loading pattern is repeated

**Recommendation:**
Move common utilities to `question_audit/text_utils.py` or `question_audit/db.py`.

---

### 14. Type Hints Could Be More Specific

Some return types use `Dict[str, object]` when they could be more specific, e.g., `Dict[str, Any]` or custom TypedDict classes.

---

### 15. Documentation

- Script docstrings are good
- But inline comments could explain complex logic (e.g., the min_gap calculation)
- Some functions lack docstrings (e.g., `language_scores`, `combined_text`)

---

### 16. Test Coverage

No tests visible for these scripts. Consider adding:
- Unit tests for validation functions
- Integration tests with mock Supabase client
- Test fixtures for sample question data

---

## Summary

### Must Fix Before Production:
1. ✅ Fix OpenAI API calls in `refresh_easy_questions.py` and `translate_cg_options.py`
2. ✅ Add transaction safety or rollback mechanism in `refresh_easy_questions.py`
3. ✅ Fix loop control logic in `recategorize_ang_cg.py`

### Should Fix Soon:
4. Add rate limiting for API calls
5. Improve error handling and logging
6. Add input validation
7. Fix JSON parsing to be more robust

### Nice to Have:
8. Add progress indicators
9. Refactor duplicate code
10. Add tests
11. Improve documentation




