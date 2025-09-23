#!/usr/bin/env python3
"""
Safe cleanup script for the ENA project
Removes unnecessary files while preserving essential ones
"""

import os
import shutil
from datetime import datetime

def create_backup():
    """Create a backup before cleanup"""
    backup_dir = f"backup_before_cleanup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    os.makedirs(backup_dir, exist_ok=True)
    
    print(f"📦 Creating backup in {backup_dir}/...")
    
    # Files to backup before deletion
    files_to_backup = [
        'migrate_to_user_plans.py',
        'regenerate_exam_data.py', 
        'insert_cote_d_ivoire_questions.py',
        'replace_france_questions.py',
        'test_cote_d_ivoire_generation.py',
        'generate_examens_blancs_simple.py',
        'generate_and_save_examens_blancs.py',
        'generate_examens_blancs.py',
        'generate_cm_format_questions.py',
        'generate_example_questions.py',
        'validate_cm_questions.py',
        'setup_database_tables.py',
        'create_tables_simple.py',
        'delete_examen_blanc_questions.py',
        'backup_examen_blanc_questions.py',
        'analyze_examen_blanc_issues.py',
        'fix_cg_english_answers.py',
        'fix_remaining_english_explanations.py',
        'exam_3_options_working.py',
        'exam_3_options_fixed.py',
        'exam_3_options_simple.py',
        'exam_3_options_migration.py'
    ]
    
    for file in files_to_backup:
        if os.path.exists(file):
            shutil.copy2(file, backup_dir)
    
    print(f"✅ Backup created: {backup_dir}/")
    return backup_dir

def cleanup_files():
    """Remove unnecessary files"""
    
    print("🧹 Starting cleanup...")
    
    # Files to delete (safe to remove)
    files_to_delete = [
        # Python scripts (one-time use)
        'migrate_to_user_plans.py',
        'regenerate_exam_data.py',
        'insert_cote_d_ivoire_questions.py', 
        'replace_france_questions.py',
        'test_cote_d_ivoire_generation.py',
        'generate_examens_blancs_simple.py',
        'generate_and_save_examens_blancs.py',
        'generate_examens_blancs.py',
        'generate_cm_format_questions.py',
        'generate_example_questions.py',
        'validate_cm_questions.py',
        'setup_database_tables.py',
        'create_tables_simple.py',
        'delete_examen_blanc_questions.py',
        'backup_examen_blanc_questions.py',
        'analyze_examen_blanc_issues.py',
        'fix_cg_english_answers.py',
        'fix_remaining_english_explanations.py',
        'exam_3_options_working.py',
        'exam_3_options_fixed.py',
        'exam_3_options_simple.py',
        'exam_3_options_migration.py',
        
        # Debug/Test scripts
        'debug_answer_collection.py',
        'test_completion_screen_fix.py',
        'test_answer_comparison_fix.py',
        'debug_data_format_issue.py',
        'test_answer_format_fix.py',
        'debug_latest_attempt.py',
        'debug_user_attempts_constraints.py',
        'test_user_answers_retrieval.py',
        'debug_406_error.py',
        'test_fixes_406_and_null.py',
        'test_user_answers_saving.py',
        'test_question_loading.py',
        'test_fixes.py',
        'debug_current_issue.py',
        'debug_retake_issue.py',
        'test_score_saving.py',
        'check_user_attempts_table.py',
        'test_retake_functionality.py',
        'test_results_modal.py',
        'test_constraints_removed.py',
        'test_final_examen_blanc.py',
        'check_table_constraints.py',
        'check_examen_blanc_test_type.py',
        'cleanup_test_data.py',
        'check_allowed_categories.py',
        'debug_exam_results.py',
        'test_examen_blanc_save.py',
        'test_final_exam_results.py',
        'test_fixed_exam_results.py',
        'test_updated_exam_results.py',
        'setup_exam_results_table.py',
        'test_exam_results.py',
        'verify_exam_results.py',
        'test_examen_blanc_integration.py',
        'test_small_batch.py',
        'test_exam_blanc_3_options.py',
        
        # Old JSON files
        'examens_blancs_20250912_163117.json',
        'examens_blancs_20250912_114453.json',
        'examen_blanc_backup_20250912_020358.json',
        'example_questions_all_formats.json',
        'examen_blanc_issues_report.json',
        
        # Markdown documentation (outdated)
        'COTE_D_IVOIRE_IMPLEMENTATION_COMPLETE.md',
        'COMPLETION_SCREEN_FIX.md',
        'ANSWER_COMPARISON_FIX.md',
        'COMPLETE_FIX_SUMMARY.md',
        'FINAL_DEBUG_SUMMARY.md',
        'FINAL_FIXES_SUMMARY.md',
        'COMPREHENSIVE_FIX_SUMMARY.md',
        'DEBUG_RETAKE_FIX.md',
        'DEBUG_RETAKE_ISSUE.md',
        'RETAKE_FUNCTIONALITY_FIX.md',
        'VOIR_RESULTATS_REVIEW_FIX.md',
        'VOIR_RESULTATS_FIX.md',
        'EXAM_RESULTS_FINAL_SOLUTION.md',
        'EXAM_RESULTS_FINAL_FIX.md',
        'EXAM_RESULTS_FIX.md',
        'EXAMEN_BLANC_FIX_PLAN.md',
        'EXAMEN_BLANC_UI_UPDATES.md',
        'EXAMEN_BLANC_IMPLEMENTATION_COMPLETE.md',
        'FINAL_EXAM_IMPROVEMENTS.md',
        'examens_blancs_summary_20250912_114453.md',
        'EXAMPLE_QUESTIONS_SUMMARY.md',
        'EXAM_3_OPTIONS_IMPLEMENTATION_PLAN.md',
        'COTE_D_IVOIRE_REPLACEMENT_SUMMARY.md',
        
        # SQL files (redundant)
        'remove_constraints.sql',
        
        # TypeScript files (backups)
        'question_service_exam_blanc_3_options.ts',
        'question_service_3_options.ts',
        
        # Assessment files (temporary)
        'assess_database_state.py',
        'database_assessment_results.json',
        'fix_auth_context.py',
        'cleanup_project.py'
    ]
    
    deleted_count = 0
    not_found_count = 0
    
    for file in files_to_delete:
        if os.path.exists(file):
            try:
                os.remove(file)
                print(f"✅ Deleted: {file}")
                deleted_count += 1
            except Exception as e:
                print(f"❌ Error deleting {file}: {e}")
        else:
            not_found_count += 1
    
    print(f"\n📊 Cleanup Summary:")
    print(f"   ✅ Deleted: {deleted_count} files")
    print(f"   ⚠️  Not found: {not_found_count} files")
    
    return deleted_count

def show_remaining_files():
    """Show what files remain after cleanup"""
    
    print("\n📁 REMAINING FILES:")
    print("=" * 20)
    
    # Essential files that should remain
    essential_files = [
        'src/',
        'public/',
        '.git/',
        'dist/',
        'package.json',
        'vite.config.ts',
        'tailwind.config.js',
        'tsconfig.json',
        'tsconfig.app.json',
        'tsconfig.node.json',
        'postcss.config.js',
        'index.html',
        'examens_blancs_20250912_163313.json',  # Current exam data
        'create_user_plans_table.sql',  # Keep for reference
        'create_examens_blancs_table.sql',  # Keep for reference  
        'create_exam_results_table.sql'  # Keep for reference
    ]
    
    remaining_files = [f for f in os.listdir('.') if os.path.isfile(f)]
    remaining_dirs = [d for d in os.listdir('.') if os.path.isdir(d)]
    
    print("📄 Files:")
    for file in sorted(remaining_files):
        if file in essential_files:
            print(f"   ✅ {file}")
        else:
            print(f"   ⚠️  {file} (check if needed)")
    
    print("\n📁 Directories:")
    for dir in sorted(remaining_dirs):
        if dir in essential_files:
            print(f"   ✅ {dir}/")
        else:
            print(f"   ⚠️  {dir}/ (check if needed)")
    
    print(f"\n📊 Total remaining: {len(remaining_files)} files, {len(remaining_dirs)} directories")

def main():
    print("🧹 ENA PROJECT CLEANUP")
    print("=" * 25)
    print("This will remove unnecessary files while preserving essential ones.")
    print()
    
    # Create backup
    backup_dir = create_backup()
    
    # Clean up files
    deleted_count = cleanup_files()
    
    # Show remaining files
    show_remaining_files()
    
    print(f"\n🎉 Cleanup complete!")
    print(f"📦 Backup created: {backup_dir}/")
    print(f"🗑️  Files deleted: {deleted_count}")
    print(f"📁 Project is now much cleaner!")

if __name__ == "__main__":
    main()

