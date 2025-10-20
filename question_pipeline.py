#!/usr/bin/env python3
"""
Master Question Generation Pipeline
Orchestrates the complete question generation process:
1. Backup existing questions
2. Delete AI-generated questions
3. Generate new questions with GPT-5
4. Validate questions with Claude
5. Insert validated questions into database
"""

import os
import sys
import subprocess
from datetime import datetime

class QuestionGenerationPipeline:
    def __init__(self):
        self.start_time = datetime.now()
        self.steps_completed = []
        self.steps_failed = []
        
        print("🚀 Question Generation Pipeline")
        print("=" * 50)
        print(f"📅 Started at: {self.start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print()
    
    def run_step(self, step_name: str, script_path: str, args: list = None) -> bool:
        """Run a single step of the pipeline"""
        print(f"🔄 Step: {step_name}")
        print("-" * 30)
        
        try:
            cmd = [sys.executable, script_path]
            if args:
                cmd.extend(args)
            
            result = subprocess.run(cmd, cwd="/Users/joasyepidan/Documents/projects/ena/project", 
                                  capture_output=True, text=True, timeout=3600)  # 1 hour timeout
            
            if result.returncode == 0:
                print(f"✅ {step_name} completed successfully")
                print(result.stdout)
                self.steps_completed.append(step_name)
                return True
            else:
                print(f"❌ {step_name} failed")
                print(f"Error: {result.stderr}")
                self.steps_failed.append(step_name)
                return False
                
        except subprocess.TimeoutExpired:
            print(f"⏰ {step_name} timed out after 1 hour")
            self.steps_failed.append(step_name)
            return False
        except Exception as e:
            print(f"❌ {step_name} failed with exception: {e}")
            self.steps_failed.append(step_name)
            return False
    
    def run_pipeline(self, skip_backup: bool = False, skip_delete: bool = False, 
                    skip_generation: bool = False, skip_validation: bool = False):
        """Run the complete pipeline"""
        
        print("🎯 Starting Question Generation Pipeline")
        print("=" * 50)
        
        # Step 1: Backup existing questions
        if not skip_backup:
            if not self.run_step("Backup Questions", "backup_questions.py"):
                print("❌ Pipeline stopped due to backup failure")
                return False
            print()
        
        # Step 2: Delete AI-generated questions
        if not skip_delete:
            print("⚠️  WARNING: This will delete all AI-generated questions!")
            response = input("Type 'DELETE' to confirm deletion: ")
            if response != 'DELETE':
                print("❌ Pipeline stopped - deletion not confirmed")
                return False
            
            if not self.run_step("Delete AI Questions", "delete_ai_questions.py", ["1"]):
                print("❌ Pipeline stopped due to deletion failure")
                return False
            print()
        
        # Step 3: Generate new questions with GPT-5
        if not skip_generation:
            if not self.run_step("Generate Questions (GPT-5)", "generate_questions_gpt5.py"):
                print("❌ Pipeline stopped due to generation failure")
                return False
            print()
        
        # Step 4: Validate questions with Claude
        if not skip_validation:
            print("🔍 Validating questions with Claude...")
            if not self.run_step("Validate Questions (Claude)", "validate_questions_claude.py", ["50"]):
                print("⚠️  Validation failed, but continuing...")
            print()
        
        # Step 5: Show final statistics
        self.run_step("Database Statistics", "insert_questions_to_db.py", ["--stats"])
        
        # Pipeline summary
        self.print_pipeline_summary()
        
        return len(self.steps_failed) == 0
    
    def print_pipeline_summary(self):
        """Print pipeline execution summary"""
        end_time = datetime.now()
        duration = end_time - self.start_time
        
        print("\n" + "=" * 50)
        print("🎉 PIPELINE EXECUTION SUMMARY")
        print("=" * 50)
        print(f"📅 Started: {self.start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"📅 Finished: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"⏱️  Duration: {duration}")
        print()
        
        print(f"✅ Steps completed ({len(self.steps_completed)}):")
        for step in self.steps_completed:
            print(f"   - {step}")
        
        if self.steps_failed:
            print(f"\n❌ Steps failed ({len(self.steps_failed)}):")
            for step in self.steps_failed:
                print(f"   - {step}")
        
        print(f"\n📊 Overall result: {'SUCCESS' if not self.steps_failed else 'PARTIAL SUCCESS' if self.steps_completed else 'FAILURE'}")
        
        if not self.steps_failed:
            print("\n🎉 All steps completed successfully!")
            print("📚 Your question database has been regenerated with high-quality questions.")
        elif self.steps_completed:
            print("\n⚠️  Some steps completed successfully.")
            print("🔧 Check the failed steps and retry if needed.")
        else:
            print("\n❌ Pipeline failed completely.")
            print("🔧 Check the error messages and fix issues before retrying.")

def main():
    """Main function with command line options"""
    pipeline = QuestionGenerationPipeline()
    
    # Parse command line arguments
    skip_backup = "--skip-backup" in sys.argv
    skip_delete = "--skip-delete" in sys.argv
    skip_generation = "--skip-generation" in sys.argv
    skip_validation = "--skip-validation" in sys.argv
    
    if "--help" in sys.argv or "-h" in sys.argv:
        print("Question Generation Pipeline")
        print("=" * 50)
        print("Usage: python question_pipeline.py [options]")
        print()
        print("Options:")
        print("  --skip-backup      Skip backing up existing questions")
        print("  --skip-delete      Skip deleting AI-generated questions")
        print("  --skip-generation  Skip generating new questions")
        print("  --skip-validation  Skip validating questions")
        print("  --help, -h         Show this help message")
        print()
        print("Examples:")
        print("  python question_pipeline.py                    # Run complete pipeline")
        print("  python question_pipeline.py --skip-backup      # Skip backup step")
        print("  python question_pipeline.py --skip-validation # Skip validation step")
        return
    
    # Show what will be skipped
    if any([skip_backup, skip_delete, skip_generation, skip_validation]):
        print("⚠️  Skipping steps:")
        if skip_backup:
            print("   - Backup Questions")
        if skip_delete:
            print("   - Delete AI Questions")
        if skip_generation:
            print("   - Generate Questions")
        if skip_validation:
            print("   - Validate Questions")
        print()
    
    # Run the pipeline
    success = pipeline.run_pipeline(
        skip_backup=skip_backup,
        skip_delete=skip_delete,
        skip_generation=skip_generation,
        skip_validation=skip_validation
    )
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()


