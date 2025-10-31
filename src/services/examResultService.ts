import { supabase } from '../lib/supabase';

export interface ExamResult {
  id: string;
  user_id: string;
  test_type: string;
  category: string | null; // null for overall score, 'ANG'/'CG'/'LOG' for subject scores
  test_number: number;
  score: number;
  exam_type: 'CM' | 'CMS' | 'CS';
  created_at: string;
}

export interface ExamQuestionSnapshot {
  id: string;
  order: number;
  question_text: string;
  answer1: string;
  answer2: string;
  answer3: string;
  answer4: string;
  correct: string;
  explanation: string;
  category: string;
  difficulty: string;
  type?: string;
  is3Option?: boolean;
}

export interface ExamAttemptData {
  questions: ExamQuestionSnapshot[];
  userAnswers: Map<string, string>;
  created_at?: string;
}

const isExamQuestionSnapshot = (question: unknown): question is ExamQuestionSnapshot => {
  if (!question || typeof question !== 'object') {
    return false;
  }

  return 'question_text' in question && 'answer1' in question && 'answer2' in question && 'answer3' in question && 'answer4' in question;
};

const normalizeQuestionSnapshot = (question: any, fallbackOrder: number): ExamQuestionSnapshot => {
  if (isExamQuestionSnapshot(question)) {
    return {
      id: typeof question.id === 'string' ? question.id : String(question.id ?? `question-${fallbackOrder}`),
      order: typeof question.order === 'number' ? question.order : fallbackOrder,
      question_text: question.question_text ?? '',
      answer1: question.answer1 ?? '',
      answer2: question.answer2 ?? '',
      answer3: question.answer3 ?? '',
      answer4: question.answer4 ?? '',
      correct: (question.correct ?? 'A').toString().toUpperCase(),
      explanation: question.explanation ?? '',
      category: question.category ?? 'ANG',
      difficulty: question.difficulty ?? 'medium',
      type: question.type,
      is3Option: question.is3Option
    };
  }

  const questionText = question?.question ?? question?.question_text ?? '';
  const optionsArray: string[] = Array.isArray(question?.options)
    ? question.options.map((opt: unknown) => (opt ?? '').toString())
    : [
        question?.answer1,
        question?.answer2,
        question?.answer3,
        question?.answer4
      ].filter((opt: unknown) => opt !== undefined && opt !== null).map((opt: unknown) => (opt ?? '').toString());

  while (optionsArray.length < 4) {
    optionsArray.push('');
  }

  const computedCorrect = (() => {
    if (typeof question?.correct === 'string') {
      return question.correct.toUpperCase();
    }
    if (typeof question?.correctAnswer === 'number') {
      return String.fromCharCode(65 + question.correctAnswer);
    }
    if (typeof question?.correctAnswer === 'string') {
      const normalized = question.correctAnswer.trim().toUpperCase();
      if (/^[0-3]$/.test(normalized)) {
        return String.fromCharCode(65 + parseInt(normalized, 10));
      }
      if (/^[A-D]$/.test(normalized)) {
        return normalized;
      }
    }
    return 'A';
  })();

  const normalizedQuestion: ExamQuestionSnapshot = {
    id: question?.id ? String(question.id) : `legacy-${fallbackOrder}`,
    order: fallbackOrder,
    question_text: questionText,
    answer1: optionsArray[0] ?? '',
    answer2: optionsArray[1] ?? '',
    answer3: optionsArray[2] ?? '',
    answer4: optionsArray[3] ?? '',
    correct: computedCorrect,
    explanation: question?.explanation ?? '',
    category: question?.category ?? 'ANG',
    difficulty: question?.difficulty ?? 'medium',
    type: question?.type,
    is3Option: question?.is3Option ?? optionsArray.filter(option => option).length === 3
  };

  return normalizedQuestion;
};

export class ExamResultService {
  /**
   * Save exam result to database using test_results table
   */
  static async saveExamResult(
    userId: string,
    examType: 'CM' | 'CMS' | 'CS',
    examNumber: number,
    overallScore: number,
    subjectScores: { ANG: number; CG: number; LOG: number },
    userAnswers?: Map<string, string>,
    questionSnapshot?: ExamQuestionSnapshot[]
  ): Promise<boolean> {
    try {
      console.log('Saving exam result:', { userId, examType, examNumber, overallScore, subjectScores });

      // First, delete any existing results for this exam
      const { error: deleteError } = await supabase
        .from('test_results')
        .delete()
        .eq('user_id', userId)
        .eq('test_type', 'examen_blanc')
        .eq('test_number', examNumber)
        .eq('exam_type', examType);

      if (deleteError) {
        console.error('Error deleting existing exam results:', deleteError);
      }

      // Prepare results to insert
      const resultsToInsert = [
        // Overall score (category = 'OVERALL')
        {
          user_id: userId,
          test_type: 'examen_blanc',
          category: 'OVERALL',
          test_number: examNumber,
          score: overallScore,
          exam_type: examType
        },
        // Subject scores
        {
          user_id: userId,
          test_type: 'examen_blanc',
          category: 'ANG',
          test_number: examNumber,
          score: subjectScores.ANG,
          exam_type: examType
        },
        {
          user_id: userId,
          test_type: 'examen_blanc',
          category: 'CG',
          test_number: examNumber,
          score: subjectScores.CG,
          exam_type: examType
        },
        {
          user_id: userId,
          test_type: 'examen_blanc',
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
          
          // Convert Map to array format expected by UserAttemptService
          // Keep questionId as string to match the question.id format in the review page
          const userAnswersArray: [string, string | number][] = [];
          userAnswers.forEach((answer, questionId) => {
            userAnswersArray.push([questionId, answer]);
          });
          
          console.log('💾 Saving user answers:', userAnswersArray.length, 'answers');
          
          await UserAttemptService.saveUserAttempt(
            userId,
            'examen_blanc',
            'OVERALL',
            undefined,
            examNumber,
            overallScore,
            {
              exam_type: examType,
              questions: questionSnapshot ?? [],
              userAnswers: userAnswersArray,
              correctAnswers: Math.round((overallScore / 100) * userAnswers.size),
              totalQuestions: questionSnapshot?.length ?? userAnswers.size,
              timeSpent: 0 // We don't track time spent in this context
            }
          );
          
          console.log('✅ User answers saved successfully');
        } catch (error) {
          console.error('❌ Error saving user answers:', error);
        }
      }

      // Insert all results
      console.log('📝 Inserting exam results:', resultsToInsert.length, 'records');
      console.log('📝 Data to insert:', JSON.stringify(resultsToInsert, null, 2));
      
      const { data, error } = await supabase
        .from('test_results')
        .insert(resultsToInsert)
        .select();

      if (error) {
        console.error('❌ Error saving exam results:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
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
    examType: 'CM' | 'CMS' | 'CS',
    examNumber: number
  ): Promise<ExamResult | null> {
    try {
      const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', userId)
        .eq('test_type', 'examen_blanc')
        .eq('exam_type', examType)
        .eq('test_number', examNumber)
        .eq('category', 'OVERALL') // Get overall score
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
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
        .eq('test_type', 'examen_blanc')
        .eq('category', 'OVERALL') // Only overall scores
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
    examType: 'CM' | 'CMS' | 'CS'
  ): Promise<ExamResult[]> {
    try {
      const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', userId)
        .eq('test_type', 'examen_blanc')
        .eq('exam_type', examType)
        .eq('category', 'OVERALL') // Only overall scores
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
    examType: 'CM' | 'CMS' | 'CS',
    examNumber: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('test_results')
        .delete()
        .eq('user_id', userId)
        .eq('test_type', 'examen_blanc')
        .eq('exam_type', examType)
        .eq('test_number', examNumber);

      if (error) {
        console.error('Error deleting exam result:', error);
        return false;
      }

      // Also delete user answers from user_attempts
      try {
        const { UserAttemptService } = await import('./userAttemptService');
        // UserAttemptService doesn't have a delete method, but it overwrites on save
        // So we don't need to explicitly delete here
      } catch (error) {
        console.error('Error cleaning up user answers:', error);
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
    examType: 'CM' | 'CMS' | 'CS',
    examNumber: number
  ): Promise<ExamAttemptData | null> {
    try {
      const { UserAttemptService } = await import('./userAttemptService');
      const attempts = await UserAttemptService.getUserAttempts(userId);
      
      console.log('🔍 All user attempts:', attempts.length);
      console.log('🔍 Looking for examen_blanc, test_number:', examNumber);
      
      const examAttempt = attempts.find(attempt => {
        if (attempt.test_type !== 'examen_blanc' || attempt.test_number !== examNumber) {
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

      const userAnswersMap = new Map<string, string>();
      const answersArray: [string | number, string | number][] = Array.isArray(test_data.userAnswers)
        ? test_data.userAnswers
        : [];

      answersArray.forEach(([questionId, answer], index) => {
        console.log(`  Answer ${index + 1}: questionId=${questionId}, answer=${answer}`);
        if (questionId === null || questionId === undefined || answer === null || answer === undefined) {
          console.log(`  Skipping invalid answer: questionId=${questionId}, answer=${answer}`);
          return;
        }

        let normalizedAnswer: string;
        if (typeof answer === 'number') {
          normalizedAnswer = String.fromCharCode(65 + answer);
        } else {
          const answerString = String(answer);
          if (/^[0-3]$/.test(answerString)) {
            normalizedAnswer = String.fromCharCode(65 + parseInt(answerString, 10));
          } else if (/^(true|false)$/i.test(answerString)) {
            normalizedAnswer = answerString.toLowerCase() === 'true' ? 'A' : 'B';
          } else if (answerString.length === 1) {
            normalizedAnswer = answerString.toUpperCase();
          } else {
            normalizedAnswer = answerString;
          }
        }

        userAnswersMap.set(questionId.toString(), normalizedAnswer);
      });

      console.log('📊 Final user answers map:', userAnswersMap.size, 'answers');
      console.log('📊 Sample answers:', Array.from(userAnswersMap.entries()).slice(0, 3));

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

  static async getUserAnswers(
    userId: string,
    examType: 'CM' | 'CMS' | 'CS',
    examNumber: number
  ): Promise<Map<string, string>> {
    const attempt = await this.getExamAttempt(userId, examType, examNumber);
    return attempt?.userAnswers ?? new Map();
  }
}
