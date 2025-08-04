import { supabase, TestResult } from '../lib/supabase';

export class TestResultService {
  static async saveTestResult(
    userId: string,
    testType: 'Quick' | 'Practice' | 'Exam',
    category: 'ANG' | 'CG' | 'LOG',
    score: number,
    testNumber?: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('test_results')
        .insert({
          user_id: userId,
          test_type: testType,
          category: category,
          test_number: testNumber || null,
          score: score,
        });

      if (error) {
        console.error('Error saving test result:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error saving test result:', error);
      return false;
    }
  }

  static async getUserTestResults(userId: string): Promise<TestResult[]> {
    try {
      const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching test results:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching test results:', error);
      return [];
    }
  }

  static async getTestResultsByCategory(userId: string, category: 'ANG' | 'CG' | 'LOG'): Promise<TestResult[]> {
    try {
      const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', userId)
        .eq('category', category)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching test results by category:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching test results by category:', error);
      return [];
    }
  }

  static async getAverageScore(userId: string, category?: 'ANG' | 'CG' | 'LOG'): Promise<number> {
    try {
      let query = supabase
        .from('test_results')
        .select('score')
        .eq('user_id', userId);

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching average score:', error);
        return 0;
      }

      if (!data || data.length === 0) {
        return 0;
      }

      const totalScore = data.reduce((sum, result) => sum + result.score, 0);
      return Math.round(totalScore / data.length);
    } catch (error) {
      console.error('Error calculating average score:', error);
      return 0;
    }
  }

  static async getTestCount(userId: string, testType?: 'Quick' | 'Practice' | 'Exam'): Promise<number> {
    try {
      let query = supabase
        .from('test_results')
        .select('id', { count: 'exact' })
        .eq('user_id', userId);

      if (testType) {
        query = query.eq('test_type', testType);
      }

      const { count, error } = await query;

      if (error) {
        console.error('Error fetching test count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error fetching test count:', error);
      return 0;
    }
  }
} 