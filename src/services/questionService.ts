/**
 * Question Service V2 - Uses questions_v2 table with new schema
 * 
 * Schema changes from V1:
 * - text (was question_text)
 * - options[] array (was answer1, answer2, answer3, answer4)
 * - correct_index number (was correct: 'A'|'B'|'C'|'D')
 * - subject (was category)
 * - difficulty: 'EASY'|'MEDIUM'|'HARD' (was lowercase)
 * - test_type: 'free_quiz'|'quick_quiz'|'practice'|'exam_blanc'
 */

import { supabase } from '../lib/supabase';
import type {
  QuestionV2,
  Subject,
  ExamType,
  Difficulty,
  TestType,
  Passage,
  QuestionWithPassage,
  QuestionStats
} from '../types/questions';

// Re-export types for convenience
export type { QuestionV2, Subject, ExamType, Difficulty, TestType };

export class QuestionService {
  /**
   * Get questions by subject with optional filters
   */
  static async getQuestionsBySubject(
    subject: Subject,
    limit: number = 10
  ): Promise<QuestionV2[]> {
    try {
      const { data, error } = await supabase
        .from('questions_v2')
        .select('*')
        .eq('subject', subject)
        .limit(limit)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching questions:', error);
        return [];
      }

      return (data || []) as QuestionV2[];
    } catch (error) {
      console.error('Error in getQuestionsBySubject:', error);
      return [];
    }
  }

  /**
   * Get random questions for quizzes with flexible filtering
   */
  static async getRandomQuestions(
    subject: Subject,
    limit: number = 10,
    examType?: ExamType,
    testTypes?: TestType[],
    testNumber?: number
  ): Promise<QuestionV2[]> {
    try {
      let query = supabase
        .from('questions_v2')
        .select('*')
        .eq('subject', subject);

      // Filter by test types
      if (testTypes && testTypes.length > 0) {
        if (testTypes.length === 1) {
          query = query.eq('test_type', testTypes[0]);
        } else {
          query = query.in('test_type', testTypes);
        }
      }

      // Filter by exam type
      if (examType) {
        query = query.eq('exam_type', examType);
      }

      // If test_number provided, get exact set
      if (typeof testNumber === 'number') {
        query = query.eq('test_number', testNumber);

        const { data, error } = await query.order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching assigned questions:', error);
          return [];
        }

        return ((data || []) as QuestionV2[]).slice(0, limit);
      }

      // Otherwise, fetch more and randomize
      const { data, error } = await query
        .limit(limit * 3)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching random questions:', error);
        return [];
      }

      const questions = (data || []) as QuestionV2[];

      // Create seed for daily randomization
      const today = new Date();
      const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
      let seed = dateSeed + subject.charCodeAt(0) * 100 + (subject.charCodeAt(1) || 0) * 10;

      console.log(`📅 Daily quiz: Using date ${today.toDateString()} as seed for ${subject}`);

      // Fisher-Yates shuffle with seeded randomization
      const shuffled = [...questions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        seed = (seed * 9301 + 49297) % 233280;
        const j = Math.floor((seed / 233280) * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      const result = shuffled.slice(0, limit);
      console.log(`✅ Fetched ${result.length} questions for ${subject}`);
      return result;
    } catch (error) {
      console.error('❌ Error in getRandomQuestions:', error);
      return [];
    }
  }

  /**
   * Get available test numbers for a subject and test type
   */
  static async getAvailableTestNumbers(
    subject: Subject,
    testType: 'practice' | 'exam_blanc',
    examType?: ExamType
  ): Promise<number[]> {
    try {
      let query = supabase
        .from('questions_v2')
        .select('test_number')
        .eq('subject', subject)
        .eq('test_type', testType)
        .not('test_number', 'is', null);

      if (examType) {
        query = query.eq('exam_type', examType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching available test numbers:', error);
        return [];
      }

      // Get unique test numbers
      const testNumbers = new Set<number>();
      (data || []).forEach(row => {
        if (typeof row.test_number === 'number') {
          testNumbers.add(row.test_number);
        }
      });

      return Array.from(testNumbers).sort((a, b) => a - b);
    } catch (error) {
      console.error('❌ Error in getAvailableTestNumbers:', error);
      return [];
    }
  }

  /**
   * Get questions by test type
   */
  static async getQuestionsByTestType(
    subject: Subject,
    testType: TestType,
    limit: number = 10
  ): Promise<QuestionV2[]> {
    try {
      const { data, error } = await supabase
        .from('questions_v2')
        .select('*')
        .eq('subject', subject)
        .eq('test_type', testType)
        .limit(limit)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching questions by test type:', error);
        return [];
      }

      return (data || []) as QuestionV2[];
    } catch (error) {
      console.error('Error in getQuestionsByTestType:', error);
      return [];
    }
  }

  /**
   * Get questions by difficulty
   */
  static async getQuestionsByDifficulty(
    subject: Subject,
    difficulty: Difficulty,
    limit: number = 10
  ): Promise<QuestionV2[]> {
    try {
      const { data, error } = await supabase
        .from('questions_v2')
        .select('*')
        .eq('subject', subject)
        .eq('difficulty', difficulty)
        .limit(limit)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching questions by difficulty:', error);
        return [];
      }

      return (data || []) as QuestionV2[];
    } catch (error) {
      console.error('Error in getQuestionsByDifficulty:', error);
      return [];
    }
  }

  /**
   * Get a single question by ID
   */
  static async getQuestionById(id: string): Promise<QuestionV2 | null> {
    try {
      const { data, error } = await supabase
        .from('questions_v2')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching question by ID:', error);
        return null;
      }

      return data as QuestionV2;
    } catch (error) {
      console.error('Error in getQuestionById:', error);
      return null;
    }
  }

  /**
   * Get questions with their associated passages (for reading comprehension)
   */
  static async getQuestionsWithPassages(
    subject: Subject,
    limit: number = 10
  ): Promise<QuestionWithPassage[]> {
    try {
      const { data, error } = await supabase
        .from('questions_v2')
        .select(`
          *,
          passages (
            id,
            title,
            content
          )
        `)
        .eq('subject', subject)
        .not('passage_id', 'is', null)
        .limit(limit)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching questions with passages:', error);
        return [];
      }

      return (data || []).map(item => ({
        question: {
          id: item.id,
          text: item.text,
          options: item.options,
          correct_index: item.correct_index,
          explanation: item.explanation,
          subject: item.subject,
          exam_type: item.exam_type,
          difficulty: item.difficulty,
          test_type: item.test_type,
          test_number: item.test_number,
          passage_id: item.passage_id,
          is_ai_generated: item.is_ai_generated,
          metadata: item.metadata,
          created_at: item.created_at
        } as QuestionV2,
        passage: item.passages as Passage | undefined
      }));
    } catch (error) {
      console.error('Error in getQuestionsWithPassages:', error);
      return [];
    }
  }

  /**
   * Search questions by text content
   */
  static async searchQuestions(
    subject: Subject,
    searchTerm: string,
    limit: number = 10
  ): Promise<QuestionV2[]> {
    try {
      const { data, error } = await supabase
        .from('questions_v2')
        .select('*')
        .eq('subject', subject)
        .textSearch('text', searchTerm)
        .limit(limit)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error searching questions:', error);
        return [];
      }

      return (data || []) as QuestionV2[];
    } catch (error) {
      console.error('Error in searchQuestions:', error);
      return [];
    }
  }

  /**
   * Get question statistics for a subject
   */
  static async getQuestionStats(subject: Subject): Promise<QuestionStats> {
    try {
      const { data, error } = await supabase
        .from('questions_v2')
        .select('difficulty, test_type, exam_type')
        .eq('subject', subject);

      if (error) {
        console.error('Error fetching question stats:', error);
        return {
          total: 0,
          bySubject: { ANG: 0, CG: 0, LOG: 0 },
          byExamType: { CM: 0, CMS: 0, CS: 0 },
          byTestType: { free_quiz: 0, quick_quiz: 0, practice: 0, exam_blanc: 0 },
          byDifficulty: { EASY: 0, MEDIUM: 0, HARD: 0 }
        };
      }

      const questions = data || [];
      const total = questions.length;

      const byDifficulty = questions.reduce(
        (acc, q) => {
          const diff = q.difficulty as Difficulty;
          if (diff in acc) acc[diff]++;
          return acc;
        },
        { EASY: 0, MEDIUM: 0, HARD: 0 } as Record<Difficulty, number>
      );

      const byTestType = questions.reduce(
        (acc, q) => {
          const tt = q.test_type as TestType;
          if (tt in acc) acc[tt]++;
          return acc;
        },
        { free_quiz: 0, quick_quiz: 0, practice: 0, exam_blanc: 0 } as Record<TestType, number>
      );

      const byExamType = questions.reduce(
        (acc, q) => {
          const et = q.exam_type as ExamType;
          if (et in acc) acc[et]++;
          return acc;
        },
        { CM: 0, CMS: 0, CS: 0 } as Record<ExamType, number>
      );

      return {
        total,
        bySubject: { ANG: subject === 'ANG' ? total : 0, CG: subject === 'CG' ? total : 0, LOG: subject === 'LOG' ? total : 0 },
        byExamType,
        byTestType,
        byDifficulty
      };
    } catch (error) {
      console.error('Error in getQuestionStats:', error);
      return {
        total: 0,
        bySubject: { ANG: 0, CG: 0, LOG: 0 },
        byExamType: { CM: 0, CMS: 0, CS: 0 },
        byTestType: { free_quiz: 0, quick_quiz: 0, practice: 0, exam_blanc: 0 },
        byDifficulty: { EASY: 0, MEDIUM: 0, HARD: 0 }
      };
    }
  }

  /**
   * Create a new question
   */
  static async createQuestion(
    question: Omit<QuestionV2, 'id' | 'created_at'>
  ): Promise<QuestionV2 | null> {
    try {
      const { data, error } = await supabase
        .from('questions_v2')
        .insert([question])
        .select()
        .single();

      if (error) {
        console.error('Error creating question:', error);
        return null;
      }

      return data as QuestionV2;
    } catch (error) {
      console.error('Error in createQuestion:', error);
      return null;
    }
  }

  /**
   * Update an existing question
   */
  static async updateQuestion(
    id: string,
    updates: Partial<QuestionV2>
  ): Promise<QuestionV2 | null> {
    try {
      const { data, error } = await supabase
        .from('questions_v2')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating question:', error);
        return null;
      }

      return data as QuestionV2;
    } catch (error) {
      console.error('Error in updateQuestion:', error);
      return null;
    }
  }

  /**
   * Delete a question
   */
  static async deleteQuestion(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('questions_v2')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting question:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteQuestion:', error);
      return false;
    }
  }

  /**
   * Get exam blanc questions for a specific test number
   * Questions already have 3 options in V2 schema
   */
  static async getExamBlancQuestions(
    subject: Subject,
    examId: string,
    examType: ExamType,
    limit: number = 20
  ): Promise<QuestionV2[]> {
    try {
      const examNumber = parseInt(examId, 10) || 1;
      console.log(`🎯 Loading exam blanc questions for ${subject} - Exam ${examNumber} (${examType})`);

      const { data, error } = await supabase
        .from('questions_v2')
        .select('*')
        .eq('subject', subject)
        .eq('test_type', 'exam_blanc')
        .eq('exam_type', examType)
        .eq('test_number', examNumber)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching exam blanc questions:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn(`⚠️ No exam blanc questions found for ${subject} (${examType})`);
        return [];
      }

      const questions = (data as QuestionV2[]).slice(0, limit);

      console.log(`✅ Selected ${questions.length} exam blanc questions for ${subject} (exam ${examNumber}, ${examType})`);
      return questions;
    } catch (error) {
      console.error('Error in getExamBlancQuestions:', error);
      return [];
    }
  }

  /**
   * Helper: Shuffle array (Fisher-Yates)
   */
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

}
