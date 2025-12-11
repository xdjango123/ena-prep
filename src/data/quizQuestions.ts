/**
 * Quiz Questions Data V2 - Bridge between QuestionService and UI components
 * 
 * Converts V2 database schema to the component-expected format
 */

import { QuestionService } from '../services/questionService';
import type { QuestionV2, Subject, ExamType, TestType } from '../types/questions';
import { formatExponents } from '../utils/mathFormatting';

// Question format expected by UI components
export interface Question {
  id: string;  // V2: Keep as string (UUID) for exam_answers tracking
  type: 'multiple-choice' | 'true-false' | 'fill-blank' | 'matching';
  question: string;
  options?: string[];
  correctAnswer: number | string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  subject: string;  // V2: Include subject for category tracking
}

/**
 * Map subject string to V2 Subject type
 */
const mapSubject = (subject: string): Subject | null => {
  switch (subject) {
    case 'culture-generale':
      return 'CG';
    case 'english':
      return 'ANG';
    case 'logique':
      return 'LOG';
    default:
      return null;
  }
};

/**
 * Quiz type for free quiz vs quick quiz separation
 */
export type QuizType = 'free_quiz' | 'quick_quiz';

/**
 * Map V2 test types based on context
 */
const mapTestTypes = (testNumber?: number, quizType?: QuizType): TestType[] => {
  // For practice tests, use 'practice'
  if (testNumber !== undefined) {
    return ['practice'];
  }
  // For specific quiz type, use that type only
  if (quizType) {
    return [quizType];
  }
  // Fallback: both quiz types (legacy behavior)
  return ['free_quiz', 'quick_quiz'];
};

/**
 * Convert V2 QuestionV2 to UI Question format
 */
const convertToUIQuestion = (dbQ: QuestionV2, index: number): Question => {
  // V2: options is already an array
  const options = dbQ.options || [];
  const validOptions = options.filter(opt => opt && opt.trim() !== '');
  
  // Determine question type
  let type: 'multiple-choice' | 'true-false' = 'multiple-choice';
  let correctAnswer: number | string = dbQ.correct_index;
  
  if (validOptions.length === 2) {
    // Check if it's true/false
    const isTrueFalse = validOptions.some(opt => 
      opt.toLowerCase() === 'true' || opt.toLowerCase() === 'false' ||
      opt.toLowerCase() === 'vrai' || opt.toLowerCase() === 'faux'
    );
    if (isTrueFalse) {
      type = 'true-false';
      correctAnswer = validOptions[dbQ.correct_index]?.toLowerCase() === 'true' || 
                     validOptions[dbQ.correct_index]?.toLowerCase() === 'vrai' 
                     ? 'true' : 'false';
    }
  }
  
  // Format text for LOG questions (handle exponents)
  const formattedQuestion = dbQ.subject === 'LOG' 
    ? formatExponents(dbQ.text) 
    : dbQ.text;
  const formattedOptions = dbQ.subject === 'LOG'
    ? validOptions.map(opt => formatExponents(opt))
    : validOptions;
  
  // V2: difficulty is uppercase, convert to lowercase for UI
  const difficulty = (dbQ.difficulty?.toLowerCase() || 'medium') as 'easy' | 'medium' | 'hard';
  
  // Fallback explanation
  const explanation = dbQ.explanation || 
    `La réponse correcte est ${formattedOptions[dbQ.correct_index] || 'N/A'}.`;
  
  return {
    id: dbQ.id,  // V2: Keep UUID for exam_answers tracking
    type,
    question: formattedQuestion,
    options: formattedOptions,
    correctAnswer,
    explanation: dbQ.subject === 'LOG' ? formatExponents(explanation) : explanation,
    difficulty,
    subject: dbQ.subject  // V2: Include subject for category tracking
  };
};

/**
 * Get questions by subject, converting V2 format to UI format
 * @param quizType - 'free_quiz' for homepage, 'quick_quiz' for dashboard
 */
export const getQuestionsBySubject = async (
  subject: string, 
  examType?: ExamType, 
  testNumber?: number,
  quizType?: QuizType
): Promise<Question[]> => {
  try {
    const mappedSubject = mapSubject(subject);
    if (!mappedSubject) {
      console.warn(`Unknown subject: ${subject}`);
      return [];
    }
    
    // Log the mode
    if (testNumber !== undefined) {
      console.log(`🎯 PRACTICE TEST MODE: Loading V2 questions for ${mappedSubject}, test #${testNumber}`);
      console.log(`   → Exam type: ${examType || 'ALL'}`);
    } else {
      console.log(`📅 QUIZ MODE: Loading V2 questions for ${mappedSubject}`);
      console.log(`   → Exam type: ${examType || 'ALL'}, Quiz type: ${quizType || 'ALL'}`);
    }
    
    const testTypes = mapTestTypes(testNumber, quizType);
    const limit = testNumber !== undefined ? 15 : 10;
    
    // V2: Call the updated QuestionService
    const dbQuestions = await QuestionService.getRandomQuestions(
      mappedSubject,
      limit,
      examType,
      testTypes,
      testNumber
    );
    
    if (!dbQuestions || dbQuestions.length === 0) {
      console.warn(`⚠️ No V2 questions returned for ${mappedSubject}`);
      return [];
    }
    
    console.log(`✅ Successfully fetched ${dbQuestions.length} V2 questions for ${mappedSubject}`);
    
    // Convert to UI format
    return dbQuestions.map((q, index) => convertToUIQuestion(q, index));
  } catch (error) {
    console.error('❌ Error in getQuestionsBySubject:', error);
    return [];
  }
};

/**
 * Get questions for practice tests by test number
 */
export const getQuestionsForPracticeTest = async (
  subject: string,
  testNumber: number,
  examType?: ExamType
): Promise<Question[]> => {
  return getQuestionsBySubject(subject, examType, testNumber);
};

/**
 * Get questions for daily quiz (no test number)
 */
export const getQuestionsForDailyQuiz = async (
  subject: string,
  examType?: ExamType,
  limit: number = 10
): Promise<Question[]> => {
  try {
    const mappedSubject = mapSubject(subject);
    if (!mappedSubject) {
      return [];
    }
    
    const dbQuestions = await QuestionService.getRandomQuestions(
      mappedSubject,
      limit,
      examType,
      ['free_quiz', 'quick_quiz']
    );
    
    return dbQuestions.map((q, index) => convertToUIQuestion(q, index));
  } catch (error) {
    console.error('Error in getQuestionsForDailyQuiz:', error);
    return [];
  }
};
