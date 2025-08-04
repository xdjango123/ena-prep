import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://ohngxnhnbwnystzkqzwy.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTg1NzYzNywiZXhwIjoyMDY3NDMzNjM3fQ.4I2VHFZZodcHI_-twFBqWxh74zCBKh1rENoTOI_nVwE';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function standardizeCorrectAnswers() {
  console.log('🔧 Starting to standardize correct answers in the database...\n');

  try {
    // Get all questions from the database
    const { data: questions, error } = await supabase
      .from('questions')
      .select('*');

    if (error) {
      console.error('❌ Error fetching questions:', error);
      return;
    }

    console.log(`📊 Found ${questions.length} questions to process\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const question of questions) {
      console.log(`\n🔍 Processing question: "${question.question_text.substring(0, 50)}..."`);
      console.log(`   Current correct: "${question.correct}"`);
      console.log(`   Options: [${question.answer1}, ${question.answer2}, ${question.answer3}, ${question.answer4}]`);

      // Check if the correct answer is already in letter format
      if (['A', 'B', 'C', 'D'].includes(question.correct)) {
        console.log(`   ✅ Already in correct format (${question.correct}) - skipping`);
        skippedCount++;
        continue;
      }

      // Find which option matches the correct answer
      let correctLetter = null;
      if (question.correct === question.answer1) {
        correctLetter = 'A';
      } else if (question.correct === question.answer2) {
        correctLetter = 'B';
      } else if (question.correct === question.answer3) {
        correctLetter = 'C';
      } else if (question.correct === question.answer4) {
        correctLetter = 'D';
      }

      if (!correctLetter) {
        console.log(`   ⚠️  Could not find matching option for "${question.correct}" - skipping`);
        skippedCount++;
        continue;
      }

      console.log(`   🔄 Converting "${question.correct}" to "${correctLetter}"`);

      // Update the question in the database
      const { error: updateError } = await supabase
        .from('questions')
        .update({ correct: correctLetter })
        .eq('id', question.id);

      if (updateError) {
        console.log(`   ❌ Error updating question:`, updateError);
      } else {
        console.log(`   ✅ Successfully updated to "${correctLetter}"`);
        updatedCount++;
      }
    }

    console.log(`\n🎉 Standardization complete!`);
    console.log(`   ✅ Updated: ${updatedCount} questions`);
    console.log(`   ⏭️  Skipped: ${skippedCount} questions (already correct format)`);
    console.log(`   📊 Total processed: ${questions.length} questions`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the standardization
standardizeCorrectAnswers(); 