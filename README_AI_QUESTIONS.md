# AI Question Generation for PrepaENA

This script generates new quiz questions using OpenAI's GPT-4o-mini model based on existing questions in your database.

## Setup

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Environment Variables
Create a `.env` file or set these environment variables:

```bash
export OPENAI_API_KEY="your_openai_api_key_here"
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here"
```

### 3. Database Tables Required

#### `questions` table (source for examples)
- `exam_type`: CM, CMS, or CS
- `category`: ANG, CG, or LOG (this is actually the subject)
- `difficulty`: EASY, MED, or HARD
- `question_text`: The question text
- `answer1`, `answer2`, `answer3`, `answer4`: Answer options
- `correct`: Correct answer letter (A, B, C, or D)
- `explanation`: Optional explanation

#### `ai_question_suggestions` table (target for new questions)
- `category`: CM, CMS, or CS (exam level)
- `subject`: ANG, CG, or LOG (subject matter)
- `difficulty`: Easy, Medium, or Hard
- `question_text`: The question text
- `answer1`, `answer2`, `answer3`, `answer4`: Answer options
- `correct`: Correct answer letter (A, B, C, or D)
- `explanation`: Optional explanation
- `status`: draft, ready, rejected, approved
- `created_by`: UUID of admin user
- `model_name`: Name of the AI model used
- `unique_hash`: Hash for deduplication

### 4. Required RPC Function
Make sure this function exists in your database:

```sql
create or replace function public.check_duplicate_aiq(p_hash text)
returns table(exists boolean)
language sql
as $$
  with q as (
    select 1 as x from public.questions where md5(
      question_text || '|' || coalesce(answer1,'') || '|' || coalesce(answer2,'') || '|' ||
      coalesce(answer3,'') || '|' || coalesce(answer4,'') || '|' || correct
    ) = p_hash
    union all
    select 1 from public.ai_question_suggestions where unique_hash = p_hash
  )
  select exists(select 1 from q)
$$;
```

## Usage

### Test Database Connection
```bash
python test_db_connection.py
```

### Generate Questions
```bash
# Generate 10 easy CG questions for CM level
python gen_questions.py --exam CM --subject CG --difficulty Easy --count 10

# Generate 5 medium ANG questions for CS level
python gen_questions.py --exam CS --subject ANG --difficulty Medium --count 5

# Generate 15 hard LOG questions for CMS level with admin user
python gen_questions.py --exam CMS --subject LOG --difficulty Hard --count 15 --created_by your_admin_uuid
```

## How It Works

1. **Fetch Examples**: Retrieves existing questions from the `questions` table to use as style references
2. **AI Generation**: Sends examples to OpenAI GPT-4o-mini with specific instructions for ENA exam questions
3. **Validation**: Checks for duplicates using the RPC function and validates question format
4. **Insertion**: Stores new questions in `ai_question_suggestions` table with status "ready"

## Output Format

The AI generates questions in this JSON format:
```json
{
  "items": [
    {
      "exam_type": "CM",
      "subject": "CG",
      "difficulty": "Easy",
      "question_text": "Question text here?",
      "answers": ["Option A", "Option B", "Option C", "Option D"],
      "correct_choice": "A",
      "explanation": "Explanation of why this is correct"
    }
  ]
}
```

## Field Mapping

The script maps fields between the AI output and database as follows:

| AI Output | Database Field | Purpose |
|-----------|----------------|---------|
| `exam_type` | `category` | Exam level (CM/CMS/CS) |
| `subject` | `subject` | Subject matter (ANG/CG/LOG) |
| `difficulty` | `difficulty` | Question difficulty |
| `correct_choice` | `correct` | Correct answer letter |

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   - Ensure all required environment variables are set
   - Check that your OpenAI API key is valid
   - Verify Supabase credentials

2. **Database Connection Errors**
   - Run `python test_db_connection.py` to diagnose
   - Check that tables exist and have correct structure
   - Verify service role key has proper permissions

3. **No Examples Found**
   - Ensure `questions` table has data
   - Check that subject and difficulty values match exactly
   - Verify field names in the table

4. **Insertion Failures**
   - Check `ai_question_suggestions` table structure
   - Verify all required fields are present
   - Check for unique constraint violations

5. **RPC Function Errors**
   - Ensure `check_duplicate_aiq` function exists
   - Check function permissions and syntax

### Debug Mode
The script includes detailed logging to help diagnose issues. Look for:
- ✅ Success messages
- ❌ Error messages  
- ⚠️ Warning messages

## Next Steps

After generating questions:
1. Review generated questions in `ai_question_suggestions` table
2. Approve/reject questions as needed
3. Move approved questions to main `questions` table
4. Update question status to "approved" or "rejected" 