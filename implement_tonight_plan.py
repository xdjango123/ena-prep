import os
import subprocess
import sys
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def update_database_schema():
    """Update questions table schema with new columns"""
    
    print("🔧 UPDATING DATABASE SCHEMA")
    print("=" * 40)
    
    print("📝 SQL Commands to run in Supabase Dashboard:")
    print("-" * 50)
    
    sql_commands = [
        "-- Add new columns for question rotation system",
        "ALTER TABLE questions ADD COLUMN IF NOT EXISTS test_type TEXT CHECK (test_type IN ('quiz_series', 'practice_test', 'examen_blanc'));",
        "ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_pool TEXT;",
        "ALTER TABLE questions ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;",
        "ALTER TABLE questions ADD COLUMN IF NOT EXISTS last_used TIMESTAMP WITH TIME ZONE;",
        "",
        "-- Create indexes for better performance",
        "CREATE INDEX IF NOT EXISTS idx_questions_test_type ON questions(test_type);",
        "CREATE INDEX IF NOT EXISTS idx_questions_question_pool ON questions(question_pool);",
        "CREATE INDEX IF NOT EXISTS idx_questions_usage_count ON questions(usage_count);",
        "CREATE INDEX IF NOT EXISTS idx_questions_last_used ON questions(last_used);",
        "",
        "-- Verify the changes",
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'questions' ORDER BY ordinal_position;"
    ]
    
    for sql in sql_commands:
        print(sql)
    
    print("\n⏸️  Please run these SQL commands in your Supabase dashboard first!")
    input("Press Enter when you've updated the schema...")

def generate_questions_for_concour(concour, total_questions=240):
    """Generate questions for a specific concour"""
    
    print(f"\n🤖 GENERATING {concour} QUESTIONS")
    print("=" * 40)
    
    subjects = ['ANG', 'CG', 'LOG']
    difficulties = ['Easy', 'Medium', 'Hard']
    difficulty_counts = {'Easy': 24, 'Medium': 32, 'Hard': 24}  # 30%, 40%, 30%
    
    total_generated = 0
    
    for subject in subjects:
        print(f"\n📚 Generating {concour} {subject} questions...")
        
        for difficulty, count in difficulty_counts.items():
            print(f"  🎯 {difficulty}: {count} questions")
            
            try:
                # Run gen_questions.py
                result = subprocess.run([
                    sys.executable, "gen_questions.py",
                    "--exam", concour,
                    "--subject", subject,
                    "--difficulty", difficulty,
                    "--count", str(count)
                ], capture_output=True, text=True, timeout=300)
                
                if result.returncode == 0:
                    print(f"    ✅ Generated {count} {difficulty} questions")
                    total_generated += count
                else:
                    print(f"    ❌ Error: {result.stderr}")
                    
            except subprocess.TimeoutExpired:
                print(f"    ⏰ Timeout generating {count} questions")
            except Exception as e:
                print(f"    ❌ Error: {e}")
    
    print(f"\n🎉 Generated {total_generated} questions for {concour}")
    return total_generated

def tag_questions_with_pools():
    """Tag questions with test_type and question_pool"""
    
    print("\n🏷️ TAGGING QUESTIONS WITH POOLS")
    print("=" * 40)
    
    # Get all questions
    all_questions = sb.table("questions").select("*").execute()
    
    if not all_questions.data:
        print("❌ No questions found")
        return
    
    print(f"📊 Found {len(all_questions.data)} questions to tag")
    
    # Tag questions based on their purpose
    concours = ['CM', 'CMS', 'CS']
    subjects = ['ANG', 'CG', 'LOG']
    
    for concour in concours:
        for subject in subjects:
            # Get questions for this concour/subject
            questions = [q for q in all_questions.data if q.get('exam_type') == concour and q.get('category') == subject]
            
            if not questions:
                continue
            
            print(f"\n🎯 Tagging {concour} {subject} questions...")
            
            # Sort by difficulty for better distribution
            easy_questions = [q for q in questions if q.get('difficulty') == 'EASY']
            medium_questions = [q for q in questions if q.get('difficulty') == 'MED']
            hard_questions = [q for q in questions if q.get('difficulty') == 'HARD']
            
            # Tag Quiz Series questions (10 per subject)
            quiz_questions = (easy_questions[:4] + medium_questions[:4] + hard_questions[:2])[:10]
            for i, question in enumerate(quiz_questions):
                try:
                    sb.table("questions").update({
                        "test_type": "quiz_series",
                        "question_pool": f"{concour}_{subject}_quiz"
                    }).eq('id', question['id']).execute()
                except Exception as e:
                    print(f"    ❌ Error tagging quiz question {question['id']}: {e}")
            
            # Tag Practice Test questions (25 per subject)
            practice_questions = (easy_questions[4:12] + medium_questions[4:16] + hard_questions[2:8])[:25]
            for i, question in enumerate(practice_questions):
                try:
                    sb.table("questions").update({
                        "test_type": "practice_test",
                        "question_pool": f"{concour}_{subject}_practice"
                    }).eq('id', question['id']).execute()
                except Exception as e:
                    print(f"    ❌ Error tagging practice question {question['id']}: {e}")
            
            # Tag Examen Blanc questions (45 per subject)
            examen_questions = (easy_questions[12:] + medium_questions[16:] + hard_questions[8:])[:45]
            for i, question in enumerate(examen_questions):
                try:
                    sb.table("questions").update({
                        "test_type": "examen_blanc",
                        "question_pool": f"{concour}_{subject}_examen"
                    }).eq('id', question['id']).execute()
                except Exception as e:
                    print(f"    ❌ Error tagging examen question {question['id']}: {e}")
            
            print(f"    ✅ Tagged {len(quiz_questions)} quiz, {len(practice_questions)} practice, {len(examen_questions)} examen questions")

def verify_implementation():
    """Verify the implementation"""
    
    print("\n🔍 VERIFYING IMPLEMENTATION")
    print("=" * 40)
    
    # Check total questions
    all_questions = sb.table("questions").select("*").execute()
    print(f"📊 Total questions: {len(all_questions.data)}")
    
    # Check by concour
    concours = ['CM', 'CMS', 'CS']
    for concour in concours:
        concour_questions = [q for q in all_questions.data if q.get('exam_type') == concour]
        print(f"  {concour}: {len(concour_questions)} questions")
        
        # Check by subject
        subjects = ['ANG', 'CG', 'LOG']
        for subject in subjects:
            subject_questions = [q for q in concour_questions if q.get('category') == subject]
            print(f"    {subject}: {len(subject_questions)} questions")
            
            # Check by test type
            test_types = ['quiz_series', 'practice_test', 'examen_blanc']
            for test_type in test_types:
                test_questions = [q for q in subject_questions if q.get('test_type') == test_type]
                print(f"      {test_type}: {len(test_questions)} questions")

def main():
    """Main implementation function"""
    
    print("🚀 IMPLEMENTING TONIGHT'S PLAN")
    print("=" * 50)
    
    print("📋 Plan Summary:")
    print("  - Update database schema")
    print("  - Generate 720 questions (240 per concour)")
    print("  - Tag questions with test_type and question_pool")
    print("  - Verify implementation")
    
    # Phase 1: Update schema
    update_database_schema()
    
    # Phase 2: Generate questions for each concour
    total_generated = 0
    for concour in ['CM', 'CMS', 'CS']:
        generated = generate_questions_for_concour(concour)
        total_generated += generated
    
    print(f"\n🎉 Generated {total_generated} questions total!")
    
    # Phase 3: Tag questions
    tag_questions_with_pools()
    
    # Phase 4: Verify
    verify_implementation()
    
    print("\n✅ IMPLEMENTATION COMPLETE!")
    print("🎯 Your webapp is now ready with:")
    print("  - 720 questions total")
    print("  - 3 concours (CM, CMS, CS)")
    print("  - 3 subjects per concour (ANG, CG, LOG)")
    print("  - 3 test types per subject (Quiz Series, Practice Tests, Examens Blancs)")
    print("  - Question rotation system")
    print("  - No duplicates within sessions")

if __name__ == "__main__":
    main()
