import os
from dotenv import load_dotenv
from supabase import create_client
from typing import Dict

# Load environment variables
load_dotenv()

# Initialize Supabase client
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def map_difficulty_to_questions_format(difficulty: str) -> str:
    """
    Map difficulty from ai_question_suggestions format to questions table format
    
    Args:
        difficulty: Difficulty from ai_question_suggestions (Easy/Medium/Hard)
    
    Returns:
        Difficulty in questions table format (EASY/MED/HARD)
    """
    mapping = {
        'Easy': 'EASY',
        'Medium': 'MED',
        'Hard': 'HARD'
    }
    return mapping.get(difficulty, 'MED')  # Default to MED if not found

def check_existing_question(question_data: Dict) -> bool:
    """
    Check if a question already exists in the questions table
    
    Args:
        question_data: Question data from ai_question_suggestions
    
    Returns:
        True if question exists, False otherwise
    """
    try:
        # Check by question text and exam type
        result = sb.table("questions") \
            .select("id") \
            .eq("question_text", question_data.get("question_text", "")) \
            .eq("exam_type", question_data.get("category", "")) \
            .execute()
        
        return len(result.data) > 0 if result.data else False
        
    except Exception as e:
        print(f"Error checking existing question: {e}")
        return True  # Assume it exists to be safe

def migrate_questions(batch_size: int = 50, status_filter: str = "ready") -> Dict:
    """
    Migrate questions from ai_question_suggestions to questions table
    
    Args:
        batch_size: Number of questions to process in each batch
        status_filter: Only migrate questions with this status
    
    Returns:
        Dict with migration results
    """
    
    print(f"🚀 Starting migration of questions with status: {status_filter}")
    print(f"📊 Batch size: {batch_size}")
    print("=" * 60)
    
    total_processed = 0
    total_migrated = 0
    total_skipped = 0
    total_errors = 0
    
    # Get total count of questions to migrate
    try:
        count_result = sb.table("ai_question_suggestions") \
            .select("id", count="exact") \
            .eq("status", status_filter) \
            .execute()
        
        total_available = count_result.count or 0
        print(f"📈 Total questions available for migration: {total_available}")
        
        if total_available == 0:
            print("❌ No questions found with the specified status")
            return {
                "total_processed": 0,
                "total_migrated": 0,
                "total_skipped": 0,
                "total_errors": 0
            }
            
    except Exception as e:
        print(f"❌ Error getting count: {e}")

    
    # Process in batches
    offset = 0
    
    while True:
        try:
            # Fetch batch of questions
            result = sb.table("ai_question_suggestions") \
                .select("*") \
                .eq("status", status_filter) \
                .range(offset, offset + batch_size - 1) \
                .order("created_at") \
                .execute()
            
            if not result.data or len(result.data) == 0:
                break  # No more questions to process
            
            batch = result.data
            print(f"\n📦 Processing batch {offset//batch_size + 1}: {len(batch)} questions")
            
            for question in batch:
                total_processed += 1
                
                try:
                    # Check if question already exists
                    if check_existing_question(question):
                        print(f"⏭️  Skipping duplicate: {question.get('question_text', '')[:50]}...")
                        total_skipped += 1
                        continue
                    
                    # Prepare question data for questions table
                    question_payload = {
                        "category": question.get("subject"),  # subject in ai_question_suggestions maps to category in questions
                        "sub_category": "AI Generated",  # Default sub-category
                        "question_text": question.get("question_text"),
                        "answer1": question.get("answer1"),
                        "answer2": question.get("answer2"),
                        "answer3": question.get("answer3"),
                        "answer4": question.get("answer4"),
                        "correct": question.get("correct"),
                        "difficulty": map_difficulty_to_questions_format(question.get("difficulty", "Medium")),  # Convert to EASY/MED/HARD format
                        "exam_type": question.get("category"),  # category in ai_question_suggestions maps to exam_type in questions
                        "ai_generated": True,  # FIXED: Mark as AI generated
                        "explanation": question.get("explanation"),  # FIXED: Include explanation
                        "created_at": question.get("created_at")
                    }
                    
                    # Debug: Print the difficulty mapping
                    original_difficulty = question.get("difficulty", "Medium")
                    mapped_difficulty = question_payload["difficulty"]
                    print(f"🔍 Difficulty mapping: '{original_difficulty}' → '{mapped_difficulty}'")
                    
                    # Validate difficulty value before insertion
                    valid_difficulties = ['EASY', 'MED', 'HARD']
                    if mapped_difficulty not in valid_difficulties:
                        print(f"❌ Invalid difficulty value: '{mapped_difficulty}'. Skipping question.")
                        total_errors += 1
                        continue
                    
                    # Insert into questions table
                    insert_result = sb.table("questions").insert(question_payload).execute()
                    
                    if insert_result.data:
                        # Update status in ai_question_suggestions to 'migrated'
                        update_result = sb.table("ai_question_suggestions") \
                            .update({"status": "migrated"}) \
                            .eq("id", question.get("id")) \
                            .execute()
                        
                        if update_result.data:
                            print(f"✅ Migrated: {question.get('question_text', '')[:50]}...")
                            total_migrated += 1
                        else:
                            print(f"⚠️  Question migrated but status update failed: {question.get('question_text', '')[:50]}...")
                            total_migrated += 1
                    else:
                        print(f"❌ Failed to insert: {question.get('question_text', '')[:50]}...")
                        total_errors += 1
                        
                except Exception as e:
                    print(f"❌ Error processing question: {e}")
                    total_errors += 1
                    continue
            
            # Move to next batch
            offset += batch_size
            
        except Exception as e:
            print(f"❌ Error fetching batch: {e}")
            break
    
    # Print final results
    print("\n" + "=" * 60)
    print("📊 MIGRATION COMPLETE")
    print("=" * 60)
    print(f"📈 Total processed: {total_processed}")
    print(f"✅ Successfully migrated: {total_migrated}")
    print(f"⏭️  Skipped (duplicates): {total_skipped}")
    print(f"❌ Errors: {total_errors}")
    print("=" * 60)
    
    return {
        "total_processed": total_processed,
        "total_migrated": total_migrated,
        "total_skipped": total_skipped,
        "total_errors": total_errors
    }

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Migrate questions from ai_question_suggestions to questions table")
    parser.add_argument("--batch-size", type=int, default=50, help="Number of questions to process in each batch")
    parser.add_argument("--status", type=str, default="ready", help="Status filter for questions to migrate")
    
    args = parser.parse_args()
    
    # Run migration
    results = migrate_questions(
        batch_size=args.batch_size,
        status_filter=args.status
    )
    
    # Exit with appropriate code
    if results["total_errors"] > 0:
        print(f"\n⚠️  Migration completed with {results['total_errors']} errors")
        exit(1)
    else:
        print(f"\n🎉 Migration completed successfully!")
        exit(0)
