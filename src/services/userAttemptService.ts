import { supabase, UserAttempt } from '../lib/supabase';

export class UserAttemptService {
  static async saveUserAttempt(
    userId: string,
    testType: string,
    category: string,
    subCategory?: string,
    testNumber?: number,
    score?: number
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_attempts')
        .insert({
          user_id: userId,
          test_type: testType,
          category: category,
          sub_category: subCategory || null,
          test_number: testNumber || null,
          score: score || null,
        })
        .select();

      if (error) {
        console.error('Error saving user attempt:', error);
        return false;
      }

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
    category: string
  ): Promise<UserAttempt[]> {
    try {
      const { data, error } = await supabase
        .from('user_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('category', category)
        .order('created_at', { ascending: false });

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

  static async getUserAttemptsByTestType(
    userId: string,
    testType: string
  ): Promise<UserAttempt[]> {
    try {
      const { data, error } = await supabase
        .from('user_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('test_type', testType)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user attempts by test type:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user attempts by test type:', error);
      return [];
    }
  }

  static async getAverageScore(
    userId: string,
    category?: string,
    testType?: string
  ): Promise<number> {
    try {
      let query = supabase
        .from('user_attempts')
        .select('score')
        .eq('user_id', userId)
        .not('score', 'is', null);

      if (category) {
        query = query.eq('category', category);
      }

      if (testType) {
        query = query.eq('test_type', testType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching average score:', error);
        return 0;
      }

      if (!data || data.length === 0) {
        return 0;
      }

      const totalScore = data.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
      return Math.round(totalScore / data.length);
    } catch (error) {
      console.error('Error calculating average score:', error);
      return 0;
    }
  }

  static async getAttemptCount(
    userId: string,
    category?: string,
    testType?: string
  ): Promise<number> {
    try {
      let query = supabase
        .from('user_attempts')
        .select('id', { count: 'exact' })
        .eq('user_id', userId);

      if (category) {
        query = query.eq('category', category);
      }

      if (testType) {
        query = query.eq('test_type', testType);
      }

      const { count, error } = await query;

      if (error) {
        console.error('Error fetching attempt count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error fetching attempt count:', error);
      return 0;
    }
  }

  static async getBestScore(
    userId: string,
    category?: string,
    testType?: string
  ): Promise<number> {
    try {
      let query = supabase
        .from('user_attempts')
        .select('score')
        .eq('user_id', userId)
        .not('score', 'is', null)
        .order('score', { ascending: false })
        .limit(1);

      if (category) {
        query = query.eq('category', category);
      }

      if (testType) {
        query = query.eq('test_type', testType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching best score:', error);
        return 0;
      }

      return data?.[0]?.score || 0;
    } catch (error) {
      console.error('Error fetching best score:', error);
      return 0;
    }
  }

  static async getRecentAttempts(
    userId: string,
    limit: number = 5
  ): Promise<UserAttempt[]> {
    try {
      const { data, error } = await supabase
        .from('user_attempts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent attempts:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching recent attempts:', error);
      return [];
    }
  }
} 