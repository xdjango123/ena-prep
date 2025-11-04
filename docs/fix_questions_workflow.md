# Questions Diagnostics & Fix Workflow

## 1. Prerequisites
- Install Python 3.10+ and Node 18+.
- Copy your Supabase credentials into environment variables (or place them in a local `.env` file that you load before running the scripts):
  ```bash
  export SUPABASE_URL="https://<project>.supabase.co"
  export SUPABASE_SERVICE_KEY="service_role_key"
  ```
- If you plan to generate GPT suggestions, also set:
  ```bash
  export OPENAI_API_KEY="your-openai-api-key"
  ```
- The explanation audit now also calls Gemini; set:
  ```bash
  export GEMINI_API_KEY="your-gemini-api-key"
  ```
- Install Python dependencies:
  ```bash
  pip install -r requirements_fix.txt
  ```

## 2. Run Diagnostics Scripts
All scripts default to writing JSON files into `diagnostics_output/`.

1. **Flag explanations for review**
   ```bash
   python check_explanations.py
   ```
   Optional flags: `--limit`, `--output-dir`, `--threshold`, `--chunk-size`
   (Supabase pagination) and `--skip-file` to ignore already-reviewed IDs
   (`--skip-file diagnostics_output/suggested_explanations.json` is handy
   on subsequent passes). Use `--resume` to continue from an existing report
   instead of starting fresh. `--test-types` controls the processing order
   (default `examen_blanc practice_test quiz_series`) and `--categories`
   defaults to `ANG CG LOG` so only those pools are scanned unless overridden.

   The script now relies entirely on LLM validation (GPT-4 followed by a
   Gemini cross-check). Ensure both `OPENAI_API_KEY` and `GEMINI_API_KEY`
   are set, or run with `--no-model` to skip validation. Use `--model-cache`
   to reuse previous decisions. The tool auto-saves progress at regular
   intervals, so you can stop and restart without losing results. Reports
   focus on explanations that are not in French, drift off-topic, rely on
   boilerplate phrases ("La réponse correcte est …"), or fail to justify
   the correct answer; the per-model findings are embedded in
   `gpt_result` / `gemini_result`.

2. **Detect duplicate questions**
   ```bash
   python find_duplicates.py
   ```

3. **Validate CG vs ANG categories**
   ```bash
   python validate_categories.py
   ```
   Optional flags: `--source-category`, `--threshold`.

4. **Format matrix questions**
   ```bash
   python format_matrix_questions.py
   ```
   Optional flag: `--keywords` to customise detection.

## 3. Automated Fixes

### Re-categorise ANG/CG questions
1. Generate fresh diagnostics for both directions:
   ```bash
   python validate_categories.py --source-category CG --suggested-category ANG --output-prefix cg_to_ang
   python validate_categories.py --source-category ANG --suggested-category CG --output-prefix ang_to_cg --threshold 0.75
   ```
2. Inspect the generated JSON reports in `diagnostics_output/`.
3. Dry-run the updater to confirm the impact:
   ```bash
   python scripts/recategorize_ang_cg.py --input diagnostics_output/cg_to_ang_questions.json
   python scripts/recategorize_ang_cg.py --input diagnostics_output/ang_to_cg_questions.json
   ```
4. When satisfied, rerun with `--apply` (and optional skip/force lists) so the changes are written to Supabase. Review the logs created in `diagnostics_output/`.

### Translate CG answer options stuck in English
1. Audit the current catalogue:
   ```bash
   python scripts/audit_cg_option_language.py
   ```
2. Review `diagnostics_output/cg_option_language.json`; update the skip file if needed.
3. Run the translator. Start with a dry-run to confirm the generated text:
   ```bash
   python scripts/translate_cg_options.py  # add --apply once ready
   ```
   The script uses GPT to propose the translation, Gemini to validate it, and only then updates Supabase when `--apply` is present. Logs are stored alongside the audit report.

### Replace EASY questions with brand-new HARD ones
1. Launch the refresh script (dry-run first):
   ```bash
   python scripts/refresh_easy_questions.py --limit 25
   ```
   A complete backup of the selected EASY rows is stored in `backups/`.
2. Inspect the generated candidates in `diagnostics_output/refresh_easy_dry_run_*.json`.
3. When the output looks good, re-run with `--apply` to insert the HARD replacements and delete the originals.

### All-in-one CG language fixer
Combine recategorisation and option translation with a single pass:
```bash
python scripts/fix_category_language.py --limit 100  # add --apply when ready
```
The script routes each CG question to the appropriate action (recategorise to ANG, translate options, or flag for manual review) using both heuristics and an LLM cross-check. Logs are written to `diagnostics_output/`.

## 4. Generate AI Explanation Suggestions (Optional)
Review `diagnostics_output/flagged_explanations.json` first. When ready:
```bash
python generate_explanations_gpt4.py --skip-existing
```
Useful flags:
- `--dry-run` to preview without hitting the API.
- `--limit` to process a subset.
- `--model` to choose an alternative model.

Outputs save to `diagnostics_output/suggested_explanations.json`.

## 5. Aggregate Reports
Combine everything into an HTML dashboard:
```bash
python review_all_issues.py
```
This produces `diagnostics_output/master_review_report.html`.

## 6. Frontend Rendering (Matrix Tables)
- Place `MatrixDisplay` in any quiz component and pass either `matrix` (array of arrays) or `html` (string):
  ```tsx
  <MatrixDisplay matrix={question.matrixData} />
  ```
  or:
  ```tsx
  <MatrixDisplay html={question.formatted_html} />
  ```
- Style overrides can be added via the optional `className` prop.

## 7. Manual Review & Updates
1. Inspect all JSON outputs.
2. Approve explanations or adjust directly in Supabase.
3. For duplicates, keep the best entry and archive/remove the rest manually.
4. Update categories and matrix formatting in the database once validated.

## 8. Suggested Next Steps
- Add automated tests for `MatrixDisplay`.
- Schedule periodic execution of diagnostics scripts (e.g., cron + GitHub Action).
- Build admin tooling that consumes the JSON outputs for review workflows.
