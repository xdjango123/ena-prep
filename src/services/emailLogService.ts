import { supabase, EmailLog } from '../lib/supabase';

export class EmailLogService {
  static async logEmail(
    userId: string | null,
    type: string,
    status: 'sent' | 'failed' | 'pending' = 'sent'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('email_logs')
        .insert({
          user_id: userId,
          type: type,
          status: status,
        });

      if (error) {
        console.error('Error logging email:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error logging email:', error);
      return false;
    }
  }

  static async getEmailLogs(userId?: string): Promise<EmailLog[]> {
    try {
      let query = supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching email logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching email logs:', error);
      return [];
    }
  }

  static async getEmailLogsByType(type: string): Promise<EmailLog[]> {
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .eq('type', type)
        .order('sent_at', { ascending: false });

      if (error) {
        console.error('Error fetching email logs by type:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching email logs by type:', error);
      return [];
    }
  }

  static async getEmailLogsByStatus(status: string): Promise<EmailLog[]> {
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .eq('status', status)
        .order('sent_at', { ascending: false });

      if (error) {
        console.error('Error fetching email logs by status:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching email logs by status:', error);
      return [];
    }
  }

  static async getEmailCount(userId?: string, type?: string): Promise<number> {
    try {
      let query = supabase
        .from('email_logs')
        .select('id', { count: 'exact' });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (type) {
        query = query.eq('type', type);
      }

      const { count, error } = await query;

      if (error) {
        console.error('Error fetching email count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error fetching email count:', error);
      return 0;
    }
  }

  static async updateEmailStatus(
    emailLogId: string,
    status: 'sent' | 'failed' | 'pending'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('email_logs')
        .update({ status: status })
        .eq('id', emailLogId);

      if (error) {
        console.error('Error updating email status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating email status:', error);
      return false;
    }
  }

  // Helper method to log welcome email
  static async logWelcomeEmail(userId: string): Promise<boolean> {
    return this.logEmail(userId, 'welcome', 'sent');
  }

  // Helper method to log password reset email
  static async logPasswordResetEmail(userId: string): Promise<boolean> {
    return this.logEmail(userId, 'password_reset', 'sent');
  }

  // Helper method to log subscription confirmation email
  static async logSubscriptionEmail(userId: string): Promise<boolean> {
    return this.logEmail(userId, 'subscription_confirmation', 'sent');
  }

  // Helper method to log quiz results email
  static async logQuizResultsEmail(userId: string): Promise<boolean> {
    return this.logEmail(userId, 'quiz_results', 'sent');
  }
} 