import { supabase, UserAttempt } from '../lib/supabase';

export class UserAttemptService {
  static async saveUserAttempt(
    userId: string,
    testType: string,
    category: string,
    subCategory?: string,
    testNumber?: number,
    score?: number,
  testData?: {
    questions: any[]
    userAnswers: [string | number, string | number][]
    correctAnswers: number
    totalQuestions: number
    timeSpent: number
    exam_type?: 'CM' | 'CMS' | 'CS'
  }
  ): Promise<boolean> {
    try {
      console.log('Saving user attempt with detailed data:', { userId, testType, category, testNumber, score });
      
      // Delete any existing record for this user, category, and test number
      if (testNumber) {
        const { error: deleteError } = await supabase
          .from('user_attempts')
          .delete()
          .eq('user_id', userId)
          .eq('category', category)
          .eq('test_number', testNumber)
          .eq('test_type', testType);

        if (deleteError) {
          console.error('Error deleting existing user attempt:', deleteError);
        }
      }

      // Insert new record with detailed test data
      const { data, error } = await supabase
        .from('user_attempts')
        .insert({
          user_id: userId,
          test_type: testType,
          category: category,
          sub_category: subCategory || null,
          test_number: testNumber || null,
          score: score || null,
          test_data: testData || null,
        })
        .select();

      if (error) {
        console.error('Error saving user attempt:', error);
        return false;
      }

      console.log('Successfully saved user attempt with detailed data:', data?.[0]);
      return true;
    } catch (error) {
      console.error('Error saving user attempt:', error);
      return false;
    }
  }

  static async getUserAttempts(userId: string): Promise<UserAttempt[]> {
    try {
      const { data, error } = await supabase
        .from('user_attempts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user attempts:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user attempts:', error);
      return [];
    }
  }

  static async getUserAttemptsByCategory(
    userId: string,
    category: string,
    examType?: 'CM' | 'CMS' | 'CS'
  ): Promise<UserAttempt[]> {
    try {
      let query = supabase
        .from('user_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('category', category)
        .order('created_at', { ascending: false });

      // Filter by exam_type in test_data if provided
      if (examType) {
        query = query.contains('test_data', { exam_type: examType });
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching user attempts by category:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user attempts by category:', error);
      return [];
    }
  }

  static async getLatestTestAttempt(
    userId: string,
    category: string,
    testNumber: number,
    testType: string = 'practice'
  ): Promise<UserAttempt | null> {
    try {
      const { data, error } = await supabase
        .from('user_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('category', category)
        .eq('test_number', testNumber)
        .eq('test_type', testType)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching latest test attempt:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Error fetching latest test attempt:', error);
      return null;
    }
  }

  static async getTestDataForReview(
    userId: string,
    category: string,
    testNumber: number
  ): Promise<{
    questions: any[]
    userAnswers: Map<string | number, string | number>
    score: number
    correctAnswers: number
    totalQuestions: number
    timeSpent: number
  } | null> {
    try {
      const { data, error } = await supabase
        .from('user_attempts')
        .select('test_data, score')
        .eq('user_id', userId)
        .eq('category', category)
        .eq('test_number', testNumber)
        .eq('test_type', 'practice')
        .not('test_data', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching attempt with test_data for review:', error);
        return null;
      }

      const attempt = data?.[0] as { test_data: any; score: number } | undefined;
      if (!attempt || !attempt.test_data) {
        console.log('No test data found for review');
        return null;
      }

      const { test_data } = attempt;
      const userAnswers = new Map<string | number, string | number>(test_data.userAnswers as [string | number, string | number][]);

      return {
        questions: test_data.questions,
        userAnswers,
        score: attempt.score || 0,
        correctAnswers: test_data.correctAnswers,
        totalQuestions: test_data.totalQuestions,
        timeSpent: test_data.timeSpent
      };
    } catch (error) {
      console.error('Error getting test data for review:', error);
      return null;
    }
  }

  static async getAverageScore(
    userId: string,
    category: string,
    testType: string = 'practice',
    examType?: 'CM' | 'CMS' | 'CS'
  ): Promise<number> {
    try {
      let query = supabase
        .from('user_attempts')
        .select('score')
        .eq('user_id', userId)
        .eq('category', category)
        .eq('test_type', testType);

      // Filter by exam_type in test_data if provided
      if (examType) {
        query = query.contains('test_data', { exam_type: examType });
      }

      const { data, error } = await query
        .not('score', 'is', null);

      if (error) {
        console.error('Error fetching scores for average calculation:', error);
        return 0;
      }

      if (!data || data.length === 0) {
        return 0;
      }

      const scores = data.map(row => row.score).filter(score => score !== null) as number[];
      const totalScore = scores.reduce((sum, score) => sum + score, 0);
      return Math.round(totalScore / scores.length);
    } catch (error) {
      console.error('Error calculating average score:', error);
      return 0;
    }
  }
} 
