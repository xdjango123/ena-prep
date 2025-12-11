/**
 * Exam Result Service V2 - Updated for questions_v2 schema
 * 
 * Schema changes:
 * - text (was question_text)
 * - options[] (was answer1-4)
 * - correct_index (was correct: 'A'|'B'|'C'|'D')
 * - subject (was category)
 * - test_type values: 'exam_blanc' (was 'examen_blanc')
 */

import { supabase } from '../lib/supabase';
import type { ExamType, Subject, Difficulty, TestType } from '../types/questions';

export interface ExamResult {
  id: string;
  user_id: string;
  test_type: TestType;
  category: Subject | 'OVERALL';
  test_number: number;
  score: number;
  exam_type: ExamType;
  created_at: string;
}

// V2 Question snapshot format for storing in user_attempts
export interface ExamQuestionSnapshot {
  id: string;
  order: number;
  text: string;  // V2: was question_text
  options: string[];  // V2: was answer1-4
  correct_index: number;  // V2: was correct ('A'|'B'|'C'|'D')
  explanation: string;
  subject: Subject;  // V2: was category
  difficulty: Difficulty;
  test_type?: TestType;
}

export interface ExamAttemptData {
  questions: ExamQuestionSnapshot[];
  userAnswers: Map<string, number>;  // V2: value is index (number) instead of letter
  created_at?: string;
}

const isExamQuestionSnapshot = (question: unknown): question is ExamQuestionSnapshot => {
  if (!question || typeof question !== 'object') {
    return false;
  }

  const q = question as any;
  // V2: Check for new schema fields
  return 'text' in q && 'options' in q && Array.isArray(q.options);
};

const normalizeQuestionSnapshot = (question: any, fallbackOrder: number): ExamQuestionSnapshot => {
  if (isExamQuestionSnapshot(question)) {
    return {
      id: typeof question.id === 'string' ? question.id : String(question.id ?? `question-${fallbackOrder}`),
      order: typeof question.order === 'number' ? question.order : fallbackOrder,
      text: question.text ?? '',
      options: question.options ?? [],
      correct_index: question.correct_index ?? 0,
      explanation: question.explanation ?? '',
      subject: question.subject ?? 'ANG',
      difficulty: question.difficulty ?? 'MEDIUM',
      test_type: question.test_type
    };
  }

  // Handle legacy V1 format for backward compatibility
  const questionText = question?.text ?? question?.question_text ?? question?.question ?? '';
  
  // Convert V1 answer1-4 to options[] if needed
  const optionsArray: string[] = Array.isArray(question?.options)
    ? question.options
    : [
        question?.answer1,
        question?.answer2,
        question?.answer3,
        question?.answer4
      ].filter((opt: unknown) => opt !== undefined && opt !== null && opt !== '');

  // Convert V1 correct letter to correct_index if needed
  let correctIndex = 0;
  if (typeof question?.correct_index === 'number') {
    correctIndex = question.correct_index;
  } else if (typeof question?.correct === 'string') {
    const letter = question.correct.toUpperCase();
    correctIndex = letter.charCodeAt(0) - 'A'.charCodeAt(0);
  } else if (typeof question?.correctAnswer === 'number') {
    correctIndex = question.correctAnswer;
  }

  // Map V1 category to V2 subject
  const subject = question?.subject ?? question?.category ?? 'ANG';

  const normalizedQuestion: ExamQuestionSnapshot = {
    id: question?.id ? String(question.id) : `legacy-${fallbackOrder}`,
    order: fallbackOrder,
    text: questionText,
    options: optionsArray,
    correct_index: correctIndex,
    explanation: question?.explanation ?? '',
    subject: subject as Subject,
    difficulty: (question?.difficulty?.toUpperCase() ?? 'MEDIUM') as Difficulty,
    test_type: question?.test_type
  };

  return normalizedQuestion;
};

export class ExamResultService {
  /**
   * Save exam result to database using test_results table
   */
  static async saveExamResult(
    userId: string,
    examType: ExamType,
    examNumber: number,
    overallScore: number,
    subjectScores: { ANG: number; CG: number; LOG: number },
    userAnswers?: Map<string, number>,  // V2: values are indices (numbers)
    questionSnapshot?: ExamQuestionSnapshot[]
  ): Promise<boolean> {
    try {
      console.log('Saving exam result (V2):', { userId, examType, examNumber, overallScore, subjectScores });

      // First, delete any existing results for this exam
      const { error: deleteError } = await supabase
        .from('test_results')
        .delete()
        .eq('user_id', userId)
        .eq('test_type', 'exam_blanc')  // V2: 'exam_blanc' instead of 'examen_blanc'
        .eq('test_number', examNumber)
        .eq('exam_type', examType);

      if (deleteError) {
        console.error('Error deleting existing exam results:', deleteError);
      }

      // Prepare results to insert
      const resultsToInsert = [
        // Overall score
        {
          user_id: userId,
          test_type: 'exam_blanc',
          category: 'OVERALL',
          test_number: examNumber,
          score: overallScore,
          exam_type: examType
        },
        // Subject scores
        {
          user_id: userId,
          test_type: 'exam_blanc',
          category: 'ANG',
          test_number: examNumber,
          score: subjectScores.ANG,
          exam_type: examType
        },
        {
          user_id: userId,
          test_type: 'exam_blanc',
          category: 'CG',
          test_number: examNumber,
          score: subjectScores.CG,
          exam_type: examType
        },
        {
          user_id: userId,
          test_type: 'exam_blanc',
          category: 'LOG',
          test_number: examNumber,
          score: subjectScores.LOG,
          exam_type: examType
        }
      ];

      // Save user answers to user_attempts table if provided
      if (userAnswers) {
        try {
          const { UserAttemptService } = await import('./userAttemptService');
          
          // Convert Map to array format - V2: values are indices
          const userAnswersArray: [string, number][] = [];
          userAnswers.forEach((answerIndex, questionId) => {
            userAnswersArray.push([questionId, answerIndex]);
          });
          
          console.log('💾 Saving user answers (V2):', userAnswersArray.length, 'answers');
          
          await UserAttemptService.saveUserAttempt(
            userId,
            'exam_blanc',
            'OVERALL',
            undefined,
            examNumber,
            overallScore,
            {
              exam_type: examType,
              test_type: 'exam_blanc',
              questions: questionSnapshot ?? [],
              userAnswers: userAnswersArray,
              correctAnswers: Math.round((overallScore / 100) * userAnswers.size),
              totalQuestions: questionSnapshot?.length ?? userAnswers.size,
              timeSpent: 0
            }
          );
          
          console.log('✅ User answers saved successfully (V2)');
        } catch (error) {
          console.error('❌ Error saving user answers:', error);
        }
      }

      // Insert all results
      console.log('📝 Inserting exam results:', resultsToInsert.length, 'records');
      
      const { data, error } = await supabase
        .from('test_results')
        .insert(resultsToInsert)
        .select();

      if (error) {
        console.error('❌ Error saving exam results:', error);
        return false;
      }

      console.log('✅ Successfully saved exam results:', data);
      return true;

    } catch (error) {
      console.error('Error in saveExamResult:', error);
      return false;
    }
  }

  /**
   * Get exam result for a specific exam (overall score)
   */
  static async getExamResult(
    userId: string,
    examType: ExamType,
    examNumber: number
  ): Promise<ExamResult | null> {
    try {
      const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', userId)
        .eq('test_type', 'exam_blanc')
        .eq('exam_type', examType)
        .eq('test_number', examNumber)
        .eq('category', 'OVERALL')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error fetching exam result:', error);
        return null;
      }

      return data as ExamResult;

    } catch (error) {
      console.error('Error in getExamResult:', error);
      return null;
    }
  }

  /**
   * Get all exam results for a user (overall scores only)
   */
  static async getUserExamResults(userId: string): Promise<ExamResult[]> {
    try {
      const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', userId)
        .eq('test_type', 'exam_blanc')
        .eq('category', 'OVERALL')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user exam results:', error);
        return [];
      }

      return data as ExamResult[];

    } catch (error) {
      console.error('Error in getUserExamResults:', error);
      return [];
    }
  }

  /**
   * Get exam results by exam type (overall scores only)
   */
  static async getExamResultsByType(
    userId: string,
    examType: ExamType
  ): Promise<ExamResult[]> {
    try {
      const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', userId)
        .eq('test_type', 'exam_blanc')
        .eq('exam_type', examType)
        .eq('category', 'OVERALL')
        .order('created_at', { ascending: false })
        .order('test_number', { ascending: true });

      if (error) {
        console.error('Error fetching exam results by type:', error);
        return [];
      }

      return data as ExamResult[];

    } catch (error) {
      console.error('Error in getExamResultsByType:', error);
      return [];
    }
  }

  /**
   * Delete exam result (for retaking)
   */
  static async deleteExamResult(
    userId: string,
    examType: ExamType,
    examNumber: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('test_results')
        .delete()
        .eq('user_id', userId)
        .eq('test_type', 'exam_blanc')
        .eq('exam_type', examType)
        .eq('test_number', examNumber);

      if (error) {
        console.error('Error deleting exam result:', error);
        return false;
      }

      return true;

    } catch (error) {
      console.error('Error in deleteExamResult:', error);
      return false;
    }
  }

  /**
   * Get user answers for an exam
   */
  static async getExamAttempt(
    userId: string,
    examType: ExamType,
    examNumber: number
  ): Promise<ExamAttemptData | null> {
    try {
      const { UserAttemptService } = await import('./userAttemptService');
      const attempts = await UserAttemptService.getUserAttempts(userId);
      
      console.log('🔍 All user attempts:', attempts.length);
      console.log('🔍 Looking for exam_blanc, test_number:', examNumber);
      
      const examAttempt = attempts.find(attempt => {
        if (attempt.test_type !== 'exam_blanc' || attempt.test_number !== examNumber) {
          return false;
        }
        const attemptData = attempt.test_data;
        if (!attemptData?.exam_type) {
          return true;
        }
        return attemptData.exam_type === examType;
      });
      
      console.log('🔍 Found exam attempt:', examAttempt ? 'YES' : 'NO');
      if (!examAttempt || !examAttempt.test_data) {
        console.log('❌ No exam attempt found or missing test_data');
        return null;
      }

      const { test_data } = examAttempt;
      const storedQuestions: ExamQuestionSnapshot[] = Array.isArray(test_data.questions)
        ? test_data.questions.map((item: unknown, index: number) => normalizeQuestionSnapshot(item, index))
        : [];

      // V2: User answers are stored as [questionId, index]
      const userAnswersMap = new Map<string, number>();
      const rawAnswers = test_data.userAnswers;
      const answersArray: [string | number, string | number][] = Array.isArray(rawAnswers)
        ? (rawAnswers as unknown as [string | number, string | number][])
        : [];

      answersArray.forEach(([questionId, answer], index) => {
        console.log(`  Answer ${index + 1}: questionId=${questionId}, answer=${answer}`);
        if (questionId === null || questionId === undefined || answer === null || answer === undefined) {
          console.log(`  Skipping invalid answer: questionId=${questionId}, answer=${answer}`);
          return;
        }

        // V2: Convert answer to index if needed
        let answerIndex: number;
        if (typeof answer === 'number') {
          answerIndex = answer;
        } else {
          const answerString = String(answer);
          if (/^[0-3]$/.test(answerString)) {
            answerIndex = parseInt(answerString, 10);
          } else if (/^[A-D]$/i.test(answerString)) {
            answerIndex = answerString.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
          } else {
            answerIndex = 0;  // Default fallback
          }
        }

        userAnswersMap.set(questionId.toString(), answerIndex);
      });

      console.log('📊 Final user answers map:', userAnswersMap.size, 'answers');

      return {
        questions: storedQuestions,
        userAnswers: userAnswersMap,
        created_at: examAttempt.created_at
      };
    } catch (error) {
      console.error('Error getting exam attempt data:', error);
      return null;
    }
  }

  /**
   * Get user answers as a Map
   */
  static async getUserAnswers(
    userId: string,
    examType: ExamType,
    examNumber: number
  ): Promise<Map<string, number>> {
    const attempt = await this.getExamAttempt(userId, examType, examNumber);
    return attempt?.userAnswers ?? new Map();
  }
}
