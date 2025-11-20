export interface Question {
  id: number;
  type: 'multiple-choice' | 'true-false' | 'fill-blank' | 'matching';
  question: string;
  options?: string[];
  correctAnswer: number | string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

// Import the QuestionService
import { QuestionService } from '../services/questionService';
import { formatExponents } from '../utils/mathFormatting';

export const getQuestionsBySubject = async (subject: string, examType?: 'CM' | 'CMS' | 'CS', testNumber?: number): Promise<Question[]> => {
  try {
    let category: 'ANG' | 'CG' | 'LOG';
    
    switch (subject) {
      case 'culture-generale':
        category = 'CG';
        break;
      case 'english':
        category = 'ANG';
        break;
      case 'logique':
        category = 'LOG';
        break;
      default:
        return [];
    }
    
    // Log the mode we're in with clear indicators
    if (testNumber !== undefined) {
      console.log(`🎯 PRACTICE TEST MODE: Loading questions for ${category}, test #${testNumber}`);
      console.log(`   → This will ensure different questions from other practice tests`);
      console.log(`   → Exam type: ${examType || 'ALL'}`);
    } else {
      console.log(`📅 DAILY QUIZ MODE: Loading questions for ${category}`);
      console.log(`   → Questions will change daily, same questions throughout the day`);
      console.log(`   → Exam type: ${examType || 'ALL'}`);
    }
    
    const testTypesToFetch: ('quiz_series' | 'practice_test' | 'examen_blanc')[] =
      testNumber !== undefined ? ['practice_test'] : ['quiz_series'];
    
    // Get questions from database with proper seeding
    // - For practice tests: pass testNumber and examType to ensure different questions per test
    // - For daily quizzes: don't pass testNumber so it uses daily date seeding, but still filter by examType
    const limit = testNumber !== undefined ? 15 : 10;
    const dbQuestions = await QuestionService.getRandomQuestions(
      category,
      limit,
      undefined,
      testNumber,
      examType,
      testTypesToFetch
    );
    
    if (!dbQuestions || dbQuestions.length === 0) {
      console.warn(`⚠️ No questions returned for ${category}`);
      return [];
    }
    
    // Log the results with clear mode indication
    if (testNumber !== undefined) {
      console.log(`✅ PRACTICE TEST: Successfully fetched ${dbQuestions.length} questions for ${category} (test #${testNumber})`);
    } else {
      console.log(`✅ DAILY QUIZ: Successfully fetched ${dbQuestions.length} questions for ${category} (daily rotation)`);
    }
    
    // Convert database questions to the expected format
    return dbQuestions.map((dbQ, index) => {
      // Determine type
      let type: 'multiple-choice' | 'true-false' = 'multiple-choice';
      let options: string[] | undefined = undefined;
      let correctAnswer: number | string = 0;
      
      // Check if we have 4 valid answers (multiple choice)
      const allAnswers = [dbQ.answer1, dbQ.answer2, dbQ.answer3, dbQ.answer4];
      const validAnswers = allAnswers.filter(answer => answer && answer !== 'null' && answer !== null);
      
      if (validAnswers.length >= 4) {
        type = 'multiple-choice';
        options = validAnswers;
        
        // Convert letter to index
        correctAnswer = dbQ.correct === 'A' ? 0 :
                        dbQ.correct === 'B' ? 1 :
                        dbQ.correct === 'C' ? 2 :
                        dbQ.correct === 'D' ? 3 : 0;
      } else if (validAnswers.length === 2) {
        type = 'true-false';
        options = validAnswers;
        correctAnswer = dbQ.correct?.toLowerCase() === 'true' ? 'true' : 'false';
      } else {
        // Fallback: use available answers as multiple choice
        type = 'multiple-choice';
        options = validAnswers;
        
        // Find the correct answer by matching the original letter position
        let correctIndex = 0;
        if (dbQ.correct === 'A' && allAnswers[0] && allAnswers[0] !== 'null') {
          correctIndex = validAnswers.indexOf(allAnswers[0]);
        } else if (dbQ.correct === 'B' && allAnswers[1] && allAnswers[1] !== 'null') {
          correctIndex = validAnswers.indexOf(allAnswers[1]);
        } else if (dbQ.correct === 'C' && allAnswers[2] && allAnswers[2] !== 'null') {
          correctIndex = validAnswers.indexOf(allAnswers[2]);
        } else if (dbQ.correct === 'D' && allAnswers[3] && allAnswers[3] !== 'null') {
          correctIndex = validAnswers.indexOf(allAnswers[3]);
        }
        
        correctAnswer = correctIndex >= 0 ? correctIndex : 0;
      }
      
      const formattedQuestion = formatExponents(dbQ.question_text);
      const formattedOptions = options?.map(option => formatExponents(option));
      const fallbackExplanation = (dbQ as any).explanation || `La réponse correcte est ${formattedOptions?.[correctAnswer as number] || correctAnswer}.`;

      return {
        id: parseInt(dbQ.id.replace(/-/g, '').substring(0, 8), 16) || index + 1, // Convert UUID to number
        type,
        question: formattedQuestion,
        options: formattedOptions,
        correctAnswer,
        explanation: formatExponents(fallbackExplanation),
        difficulty: dbQ.difficulty || 'medium'
      };
    });
  } catch (error) {
    console.error('❌ Error in getQuestionsBySubject:', error);
    return [];
  }
};
