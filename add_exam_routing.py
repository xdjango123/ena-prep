import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def add_exam_routing():
    """Add exam interface routing to App.tsx"""
    
    print("🔧 ADDING EXAM ROUTING")
    print("=" * 50)
    
    # Read the current file
    with open('src/App.tsx', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add import for ExamInterface
    old_imports = """import { RandomPracticeTest } from './components/quiz/RandomPracticeTest';"""
    new_imports = """import { RandomPracticeTest } from './components/quiz/RandomPracticeTest';
import { ExamInterface } from './components/quiz/ExamInterface';"""
    
    content = content.replace(old_imports, new_imports)
    
    # Add exam interface route
    old_exam_route = """                {/* Exam Page */}
                <Route path="exams" element={<ExamPage />} />"""
    new_exam_route = """                {/* Exam Page */}
                <Route path="exams" element={<ExamPage />} />
                <Route path="exam/:examId" element={<ExamInterface onExit={() => window.history.back()} />} />"""
    
    content = content.replace(old_exam_route, new_exam_route)
    
    # Write the updated content back
    with open('src/App.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Added exam interface routing to App.tsx")

def update_exam_page_handler():
    """Update ExamPage to use the new routing"""
    
    print("\n🔧 UPDATING EXAM PAGE HANDLER")
    print("=" * 50)
    
    # Read the current file
    with open('src/pages/exams/ExamPage.tsx', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Update the handleStartExam function
    old_handler = """    const handleStartExam = (examId: number) => {
        console.log(`Starting exam ${examId} for category ${selectedCategory}`);
        // Navigate to exam interface (placeholder for now)
        navigate(`/dashboard/exam/${examId}`);
    };"""
    
    new_handler = """    const handleStartExam = (examId: number) => {
        console.log(`Starting exam ${examId} for category ${selectedCategory}`);
        // Navigate to exam interface
        navigate(`/dashboard/exam/${examId}`);
    };"""
    
    content = content.replace(old_handler, new_handler)
    
    # Write the updated content back
    with open('src/pages/exams/ExamPage.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Updated ExamPage handler")

def main():
    """Main function"""
    
    print("🚀 ADDING EXAM ROUTING")
    print("=" * 60)
    
    add_exam_routing()
    update_exam_page_handler()
    
    print("\n✅ EXAM ROUTING ADDED!")
    print("🎯 Your exam interface is now functional!")

if __name__ == "__main__":
    main()
