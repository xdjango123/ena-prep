import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

# Initialize Supabase client
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def run_sql_function():
    """Run the corrected approve_ai_question function"""
    
    sql_function = """
    -- Corrected function to approve AI questions and move them to questions table
    create or replace function public.approve_ai_question(p_id uuid, p_reviewer uuid)
    returns uuid
    language plpgsql
    as $$
    declare
      s record;
      new_id uuid;
      mapped_difficulty text;
    begin
      select *
      into s
      from public.ai_question_suggestions
      where id = p_id
        and status in ('draft','ready')
      for update;

      if not found then
        raise exception 'Suggestion %% not found or not approvable', p_id;
      end if;

      -- Map difficulty from ai_question_suggestions format to questions table format
      mapped_difficulty := case s.difficulty
        when 'Easy' then 'EASY'
        when 'Medium' then 'MED'
        when 'Hard' then 'HARD'
        else 'MED'  -- default fallback
      end;

      -- sanity: ensure correct choice points to a non-null option
      if (s.correct = 'A' and s.answer1 is null)
         or (s.correct = 'B' and s.answer2 is null)
         or (s.correct = 'C' and s.answer3 is null)
         or (s.correct = 'D' and s.answer4 is null) then
        raise exception 'correct choice %% points to NULL option', s.correct;
      end if;

      insert into public.questions (
        question_text,
        exam_type,        -- This comes from category in ai_question_suggestions
        difficulty,       -- Mapped to EASY/MED/HARD format
        category,         -- This comes from subject in ai_question_suggestions
        answer1, answer2, answer3, answer4,
        correct,          -- Letter (A, B, C, D)
        explanation,
        ai_generated,
        created_at, updated_at
      )
      values (
        s.question_text,
        s.category,       -- category in ai_question_suggestions = exam_type in questions
        mapped_difficulty, -- Converted difficulty
        s.subject,        -- subject in ai_question_suggestions = category in questions
        s.answer1, s.answer2, s.answer3, s.answer4,
        s.correct,        -- Copy the letter
        s.explanation,
        true,             -- mark as AI origin
        now(), now()
      )
      returning id into new_id;

      update public.ai_question_suggestions
         set status = 'approved',
             reviewed_by = p_reviewer,
             reviewed_at = now()
       where id = p_id;

      return new_id;
    end $$;
    """
    
    try:
        print("🔧 Creating/updating the approve_ai_question function...")
        result = sb.rpc("exec_sql", {"sql": sql_function}).execute()
        print("✅ Function created successfully!")
        return True
    except Exception as e:
        print(f"❌ Error creating function: {e}")
        print("\n📝 You may need to run this SQL manually in the Supabase Dashboard:")
        print("1. Go to Supabase Dashboard > SQL Editor")
        print("2. Copy the SQL function from fix_approve_function.sql")
        print("3. Click Run")
        return False

def test_function():
    """Test if the function exists and works"""
    try:
        # Check if function exists by looking at the function definition
        result = sb.rpc("exec_sql", {"sql": "SELECT routine_name FROM information_schema.routines WHERE routine_name = 'approve_ai_question'"}).execute()
        if result.data:
            print("✅ Function approve_ai_question exists!")
            return True
        else:
            print("❌ Function approve_ai_question not found")
            return False
    except Exception as e:
        print(f"⚠️  Could not check function: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Setting up the approve_ai_question function...")
    
    # Try to create the function
    success = run_sql_function()
    
    if success:
        # Test if it was created
        test_function()
    else:
        print("\n📋 Manual Steps:")
        print("1. Open fix_approve_function.sql")
        print("2. Copy the SQL content")
        print("3. Go to Supabase Dashboard > SQL Editor")
        print("4. Paste and run the SQL") 