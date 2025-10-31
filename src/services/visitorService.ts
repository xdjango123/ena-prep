import { supabase, Visitor } from '../lib/supabase';

export class VisitorService {
  private static sessionId: string | null = null;

  static generateSessionId(): string {
    if (!this.sessionId) {
      this.sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    return this.sessionId;
  }

  static getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
    };
  }

  static async trackVisitor(): Promise<string | null> {
    try {
      const sessionId = this.generateSessionId();
      const deviceInfo = this.getDeviceInfo();

      const { data, error } = await supabase
        .from('visitors')
        .insert({
          session_id: sessionId,
          device_info: deviceInfo,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error tracking visitor:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error tracking visitor:', error);
      return null;
    }
  }

  static async updateQuizResult(visitorId: string, score: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('visitors')
        .update({
          'quizQuiz Score': score,
          'quickQuiz submit time': new Date().toISOString(),
        })
        .eq('id', visitorId);

      if (error) {
        console.error('Error updating quiz result:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating quiz result:', error);
      return false;
    }
  }

  static async linkVisitorToUser(visitorId: string, userId: string): Promise<boolean> {
    try {
      // This would typically involve updating the visitor record or creating a link
      // For now, we'll just log the association
      console.log(`Linking visitor ${visitorId} to user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error linking visitor to user:', error);
      return false;
    }
  }
} 