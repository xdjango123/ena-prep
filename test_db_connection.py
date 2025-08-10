import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables from .env file
load_dotenv()

# Load environment variables
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Missing environment variables:")
    print(f"   SUPABASE_URL: {'✅' if SUPABASE_URL else '❌'}")
    print(f"   SUPABASE_SERVICE_ROLE_KEY: {'✅' if SUPABASE_SERVICE_KEY else '❌'}")
    print("\nPlease set these environment variables before running the script.")
    exit(1)

print("🔗 Testing Supabase connection...")
sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def test_connection():
    """Test basic database connection"""
    try:
        # Test a simple query
        result = sb.table("questions").select("count", count="exact").limit(1).execute()
        print("✅ Database connection successful!")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def check_table_structure():
    """Check the structure of key tables"""
    print("\n📋 Checking table structures...")
    
    # Check questions table
    try:
        result = sb.table("questions").select("*").limit(1).execute()
        if result.data:
            sample = result.data[0]
            print("✅ Questions table structure:")
            for key in sample.keys():
                print(f"   - {key}: {type(sample[key]).__name__}")
        else:
            print("⚠️  Questions table exists but is empty")
    except Exception as e:
        print(f"❌ Error accessing questions table: {e}")
    
    # Check ai_question_suggestions table
    try:
        result = sb.table("ai_question_suggestions").select("*").limit(1).execute()
        if result.data:
            sample = result.data[0]
            print("\n✅ AI Question Suggestions table structure:")
            for key in sample.keys():
                print(f"   - {key}: {type(sample[key]).__name__}")
        else:
            print("\n⚠️  AI Question Suggestions table exists but is empty")
    except Exception as e:
        print(f"\n❌ Error accessing ai_question_suggestions table: {e}")
        print("   This table might not exist yet - you may need to create it.")

def check_sample_data():
    """Check for sample data in questions table"""
    print("\n🔍 Checking for sample questions...")
    
    try:
        # Check for questions in each subject
        subjects = ['ANG', 'CG', 'LOG']
        exam_types = ['CM', 'CMS', 'CS']
        
        for subject in subjects:
            print(f"\n📚 {subject} questions:")
            for exam_type in exam_types:
                result = sb.table("questions").select("id,question_text,category,exam_type,difficulty").eq("category", subject).eq("exam_type", exam_type).limit(2).execute()
                if result.data:
                    print(f"   ✅ {exam_type}: {len(result.data)} questions")
                    for q in result.data:
                        print(f"      - {q['question_text'][:50]}... ({q['difficulty']})")
                else:
                    print(f"   ⚠️  {exam_type}: No questions found")
    except Exception as e:
        print(f"❌ Error checking sample data: {e}")

def test_rpc_function():
    """Test the check_duplicate_aiq RPC function"""
    print("\n🧪 Testing RPC function...")
    
    try:
        # Test with a dummy hash
        test_hash = "test_hash_123"
        result = sb.rpc("check_duplicate_aiq", {"p_hash": test_hash}).execute()
        
        if result.data is not None:
            print("✅ RPC function check_duplicate_aiq works!")
            print(f"   Result: {result.data}")
            print(f"   Boolean value: {bool(result.data)}")
        else:
            print("⚠️  RPC function returned no data")
            
    except Exception as e:
        print(f"❌ RPC function test failed: {e}")
        print("   Make sure the function exists in your database")

if __name__ == "__main__":
    print("🧪 Database Connection Test")
    print("=" * 40)
    
    if test_connection():
        check_table_structure()
        check_sample_data()
        test_rpc_function()
    
    print("\n" + "=" * 40)
    print("Test complete!") 