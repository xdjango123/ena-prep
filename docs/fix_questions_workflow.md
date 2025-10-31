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

## 3. Generate AI Explanation Suggestions (Optional)
Review `diagnostics_output/flagged_explanations.json` first. When ready:
```bash
python generate_explanations_gpt4.py --skip-existing
```
Useful flags:
- `--dry-run` to preview without hitting the API.
- `--limit` to process a subset.
- `--model` to choose an alternative model.

Outputs save to `diagnostics_output/suggested_explanations.json`.

## 4. Aggregate Reports
Combine everything into an HTML dashboard:
```bash
python review_all_issues.py
```
This produces `diagnostics_output/master_review_report.html`.

## 5. Frontend Rendering (Matrix Tables)
- Place `MatrixDisplay` in any quiz component and pass either `matrix` (array of arrays) or `html` (string):
  ```tsx
  <MatrixDisplay matrix={question.matrixData} />
  ```
  or:
  ```tsx
  <MatrixDisplay html={question.formatted_html} />
  ```
- Style overrides can be added via the optional `className` prop.

## 6. Manual Review & Updates
1. Inspect all JSON outputs.
2. Approve explanations or adjust directly in Supabase.
3. For duplicates, keep the best entry and archive/remove the rest manually.
4. Update categories and matrix formatting in the database once validated.

## 7. Suggested Next Steps
- Add automated tests for `MatrixDisplay`.
- Schedule periodic execution of diagnostics scripts (e.g., cron + GitHub Action).
- Build admin tooling that consumes the JSON outputs for review workflows.
