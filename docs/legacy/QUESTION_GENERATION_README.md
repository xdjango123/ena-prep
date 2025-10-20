# Question Generation Pipeline

This pipeline regenerates all AI-generated questions in the database using GPT-5 for generation and Claude for validation.

## Prerequisites

1. **Environment Setup**: Make sure you're in the `yetech` conda environment
2. **API Keys**: Set up your API keys:
   ```bash
   export OPENAI_API_KEY="your-openai-api-key"
   export ANTHROPIC_API_KEY="your-anthropic-api-key"
   ```

## Scripts Overview

### 1. `backup_questions.py`
- **Purpose**: Backs up all existing questions to JSON files
- **Usage**: `python backup_questions.py`
- **Output**: Creates timestamped backup files in `backups/` directory

### 2. `delete_ai_questions.py`
- **Purpose**: Deletes all AI-generated questions (`ai_generated = true`)
- **Usage**: `python delete_ai_questions.py`
- **Safety**: Requires typing 'DELETE' to confirm

### 3. `generate_questions_gpt5.py`
- **Purpose**: Generates new questions using GPT-5
- **Usage**: `python generate_questions_gpt5.py`
- **Features**: 
  - Uses example questions from `question_examples/` directory
  - Generates ~4500 questions across all combinations
  - Supports 3-option questions (A, B, C)
  - Tailored for Côte d'Ivoire context

### 4. `validate_questions_claude.py`
- **Purpose**: Validates generated questions using Claude
- **Usage**: `python validate_questions_claude.py [limit]`
- **Features**:
  - Checks correctness, quality, difficulty
  - Generates detailed validation reports
  - Identifies questions needing manual review

### 5. `insert_questions_to_db.py`
- **Purpose**: Inserts validated questions into database
- **Usage**: 
  - `python insert_questions_to_db.py <file_path>` - Insert from file
  - `python insert_questions_to_db.py --stats` - Show database statistics
  - `python insert_questions_to_db.py --verify` - Verify current state

### 6. `question_pipeline.py`
- **Purpose**: Master script that runs the entire pipeline
- **Usage**: `python question_pipeline.py [options]`
- **Options**:
  - `--skip-backup` - Skip backup step
  - `--skip-delete` - Skip deletion step
  - `--skip-generation` - Skip generation step
  - `--skip-validation` - Skip validation step

## Complete Pipeline Usage

### Option 1: Run Complete Pipeline
```bash
cd /Users/joasyepidan/Documents/projects/ena/project
conda activate yetech
python question_pipeline.py
```

### Option 2: Run Individual Steps
```bash
# 1. Backup existing questions
python backup_questions.py

# 2. Delete AI-generated questions (requires confirmation)
python delete_ai_questions.py

# 3. Generate new questions with GPT-5
python generate_questions_gpt5.py

# 4. Validate questions with Claude
python validate_questions_claude.py 100

# 5. Check database statistics
python insert_questions_to_db.py --stats
```

## Question Examples Format

The pipeline uses example questions from the `question_examples/` directory. Each file should follow this format:

```json
{
  "exam_type": "CM",
  "subject": "ANG",
  "questions": [
    {
      "n": 1,
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C"],
      "answer": "Correct answer text"
    }
  ]
}
```

## Generation Targets

The pipeline generates questions for all combinations:

- **Exam Types**: CM, CMS, CS
- **Subjects**: ANG (English), CG (Culture Générale), LOG (Logic)
- **Test Types**: quick_quiz, practice_test, examen_blanc
- **Difficulties**: EASY, MED, HARD

**Total Target**: ~4500 questions

### Distribution by Test Type:
- **Quick Quiz**: 20% EASY, 20% MED, 60% HARD
- **Practice Test**: 20% EASY, 40% MED, 40% HARD  
- **Examen Blanc**: 0% EASY, 20% MED, 80% HARD

## Quality Standards

### ANG (English) Questions:
- Professional, exam-appropriate questions
- Even EASY questions require thought
- International English standards
- Grammar, vocabulary, comprehension focus

### CG (Culture Générale) Questions:
- Tailored to **Côte d'Ivoire** context
- History, geography, politics, economy of Côte d'Ivoire
- Regional and international knowledge relevant to Ivorian context
- Current events and cultural aspects

### LOG (Logic) Questions:
- Variety: numerical puzzles, matrices, sequences, patterns
- Arithmetic, algebra, geometry problems
- Analytical reasoning and deduction
- Visual and numerical logic puzzles

## Database Schema

Questions are inserted with the following fields:
- `question_text`, `answer1`, `answer2`, `answer3`, `answer4` (can be NULL for 3-option)
- `correct` (A, B, C, or D)
- `explanation`, `category`, `sub_category`, `difficulty`
- `exam_type`, `test_type`, `ai_generated`, `unique_hash`
- `question_pool`, `usage_count`, `last_used`, `is3Option`

## Monitoring and Verification

### Check Generation Progress:
```bash
python insert_questions_to_db.py --stats
```

### Validate Sample Questions:
```bash
python validate_questions_claude.py 50
```

### View Validation Reports:
Check the generated `validation_report_*.txt` files for detailed analysis.

## Troubleshooting

### Common Issues:

1. **API Key Errors**: Make sure your API keys are set correctly
2. **Database Connection**: Verify Supabase credentials
3. **File Not Found**: Ensure example files exist in `question_examples/`
4. **Memory Issues**: Reduce batch sizes in generation script
5. **Timeout Errors**: Increase timeout values for long-running operations

### Recovery:

If the pipeline fails partway through:
1. Check which steps completed successfully
2. Use `--skip-*` options to resume from where it left off
3. Check logs for specific error messages
4. Verify database state with `--stats` option

## Next Steps

After running the pipeline:
1. Update frontend components to use `test_type` filters
2. Test question uniqueness across different test types
3. Manually verify sample questions for quality
4. Monitor question usage and performance

## Support

For issues or questions:
1. Check the validation reports for quality issues
2. Review the pipeline execution summary
3. Verify database statistics
4. Check individual script outputs for specific errors

