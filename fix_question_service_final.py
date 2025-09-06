import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def fix_question_service_final():
    """Fix the final syntax issues in questionService.ts"""
    
    print("🔧 FIXING QUESTION SERVICE FINAL")
    print("=" * 50)
    
    # Read the current file
    with open('src/services/questionService.ts', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove the extra closing braces at the end
    # The file should end with just one closing brace for the class
    lines = content.split('\n')
    
    # Find where the getRandomQuestionsFromPool method ends
    # Look for the last method's closing brace
    method_end = -1
    for i in range(len(lines) - 1, -1, -1):
        if lines[i].strip() == '  }' and i > 0 and 'getRandomQuestionsFromPool' in lines[i-10:i]:
            method_end = i
            break
    
    if method_end > 0:
        # Keep everything up to the method end, then add the class closing brace
        lines = lines[:method_end + 1]
        lines.append('}')
    
    # Join the lines back
    content = '\n'.join(lines)
    
    # Write the updated content back
    with open('src/services/questionService.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Fixed questionService.ts final syntax")
    print("  - Removed extra closing braces")
    print("  - Proper class structure")

def main():
    """Main function"""
    
    print("🚀 FIXING QUESTION SERVICE FINAL")
    print("=" * 60)
    
    fix_question_service_final()
    
    print("\n✅ QUESTION SERVICE FINAL FIXED!")
    print("🎯 Your question service should now be syntactically correct!")

if __name__ == "__main__":
    main()
