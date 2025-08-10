import { supabase, TestResult } from '../lib/supabase';

export class TestResultService {
  static async saveTestResult(
    userId: string,
    testType: 'quick' | 'practice' | 'exam',
    category: 'ANG' | 'CG' | 'LOG',
    score: number,
    testNumber?: number
  ): Promise<boolean> {
    try {
      console.log('Saving test result:', { userId, testType, category, testNumber, score });
      
      // Validate the test type and category against constraints
      const validTestTypes = ['quick', 'practice', 'exam'];
      const validCategories = ['ANG', 'CG', 'LOG'];
      
      if (!validTestTypes.includes(testType)) {
        console.error('Invalid test_type:', testType, 'Valid types:', validTestTypes);
        return false;
      }
      
      if (!validCategories.includes(category)) {
        console.error('Invalid category:', category, 'Valid categories:', validCategories);
        return false;
      }
      
      // Delete any existing record for this user, category, and test number
      if (testNumber) {
        const { error: deleteError } = await supabase
          .from('test_results')
          .delete()
          .eq('user_id', userId)
          .eq('category', category)
          .eq('test_number', testNumber)
          .eq('test_type', testType);

        if (deleteError) {
          console.error('Error deleting existing test result:', deleteError);
        }
      }

      // Insert new record
      const { data, error } = await supabase
        .from('test_results')
        .insert({
          user_id: userId,
          test_type: testType,
          category: category,
          test_number: testNumber || null,
          score: score,
        })
        .select();

      if (error) {
        console.error('Error saving test result:', error);
        return false;
      }

      console.log('Successfully saved test result:', data);
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

  static async getAverageScore(userId: string, category?: 'ANG' | 'CG' | 'LOG', testType?: 'quick' | 'practice' | 'exam'): Promise<number> {
    try {
      let query = supabase
        .from('test_results')
        .select('*')
        .eq('user_id', userId)
        .not('test_number', 'is', null)
        .order('created_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      if (testType) {
        query = query.eq('test_type', testType);
      }

      const { data, error } = await query;

      console.log('Average score debug (test_results):', {
        userId,
        category,
        testType,
        totalRows: data?.length || 0,
        rows: data
      });

      if (error) {
        console.error('Error fetching test results for average:', error);
        return 0;
      }

      if (!data || data.length === 0) {
        return 0;
      }

      // Get the latest score for each test number
      const latestScores = new Map<number, number>();
      
      data.forEach(result => {
        // Only consider rows that match both category and testType if provided
        if (category && result.category !== category) return;
        if (testType && result.test_type !== testType) return;
        const testNumber = result.test_number;
        const score = result.score;
        
        if (testNumber && score !== null && !latestScores.has(testNumber)) {
          latestScores.set(testNumber, score);
        }
      });

      // Calculate average of latest scores
      const scores = Array.from(latestScores.values());
      const totalScore = scores.reduce((sum, score) => sum + score, 0);
      const average = Math.round(totalScore / scores.length);
      
      return scores.length > 0 ? average : 0;
    } catch (error) {
      console.error('Error calculating average score:', error);
      return 0;
    }
  }

  static async getAverageScoreForTestNumbers(
    userId: string,
    category: 'ANG' | 'CG' | 'LOG',
    testType: 'quick' | 'practice' | 'exam',
    allowedTestNumbers: number[]
  ): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', userId)
        .eq('category', category)
        .eq('test_type', testType)
        .in('test_number', allowedTestNumbers)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching filtered results for average:', error);
        return 0;
      }

      const latestScores = new Map<number, number>();
      for (const row of data || []) {
        if (row.test_number && row.score !== null && !latestScores.has(row.test_number)) {
          latestScores.set(row.test_number, row.score);
        }
      }

      const scores = Array.from(latestScores.values());
      const totalScore = scores.reduce((sum, s) => sum + s, 0);
      return scores.length > 0 ? Math.round(totalScore / scores.length) : 0;
    } catch (error) {
      console.error('Error calculating filtered average score:', error);
      return 0;
    }
  }

  static async getTestCount(userId: string, testType?: 'quick' | 'practice' | 'exam'): Promise<number> {
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