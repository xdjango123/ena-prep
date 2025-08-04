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

async function debugQuestion() {
  console.log('🔍 Debugging the "I need ... milk" question...\n');

  try {
    // Find the specific question
    const { data: questions, error } = await supabase
      .from('questions')
      .select('*')
      .ilike('question_text', '%I need%milk%');

    if (error) {
      console.error('❌ Error fetching question:', error);
      return;
    }

    if (questions.length === 0) {
      console.log('❌ No questions found matching the pattern');
      return;
    }

    const question = questions[0];
    console.log('📋 Question found:');
    console.log(`   Question: "${question.question_text}"`);
    console.log(`   Answer1: "${question.answer1}"`);
    console.log(`   Answer2: "${question.answer2}"`);
    console.log(`   Answer3: "${question.answer3}"`);
    console.log(`   Answer4: "${question.answer4}"`);
    console.log(`   Correct: "${question.correct}"`);
    console.log(`   Category: "${question.category}"`);

    // Simulate the frontend mapping logic
    console.log('\n🔧 Frontend mapping simulation:');
    const options = [question.answer1, question.answer2, question.answer3, question.answer4];
    console.log(`   Options array: [${options.map((opt, i) => `"${opt}"`).join(', ')}]`);
    
    // Check if correct is a letter
    if (['A', 'B', 'C', 'D'].includes(question.correct)) {
      const correctIndex = question.correct === 'A' ? 0 : 
                          question.correct === 'B' ? 1 : 
                          question.correct === 'C' ? 2 : 3;
      console.log(`   Correct letter: "${question.correct}" → index ${correctIndex}`);
      console.log(`   Correct answer text: "${options[correctIndex]}"`);
    } else {
      console.log(`   ⚠️  Correct field is not a letter: "${question.correct}"`);
    }

    // Test the comparison logic
    console.log('\n🧪 Testing comparison logic:');
    const userAnswer = 'some';
    console.log(`   User selected: "${userAnswer}"`);
    
    if (['A', 'B', 'C', 'D'].includes(question.correct)) {
      const correctIndex = question.correct === 'A' ? 0 : 
                          question.correct === 'B' ? 1 : 
                          question.correct === 'C' ? 2 : 3;
      const correctAnswerText = options[correctIndex];
      const isCorrect = userAnswer === correctAnswerText;
      console.log(`   Correct answer text: "${correctAnswerText}"`);
      console.log(`   Is user answer correct? ${isCorrect}`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the debug
debugQuestion(); 