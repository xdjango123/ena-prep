/**
 * Exam Session Service
 * 
 * Tracks user quiz/test sessions and individual answers for analytics.
 * Tables: exam_sessions, exam_answers
 */

import { supabase } from '../lib/supabase';
import type { ExamType, TestType } from '../types/questions';

// ============ Types ============

export interface StartSessionParams {
  userId: string | null;
  visitorId?: string | null;
  testType: TestType;
  examType?: ExamType;
  testNumber?: number;
  subject?: string;
}

export interface AnswerRecord {
  questionId: string;
  selectedOptionIndex: number | null;
  correctIndex: number;
  timeSpentMs?: number;
}

export interface RecordAnswersParams {
  sessionId: string;
  answers: AnswerRecord[];
}

export interface CompleteSessionParams {
  sessionId: string;
  correctAnswers: number;
  totalQuestions: number;
  timeSpentSeconds: number;
}

export interface ExamSession {
  id: string;
  user_id: string | null;
  visitor_id: string | null;
  test_type: TestType;
  exam_type: ExamType | null;
  test_number: number | null;
  subject: string | null;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  total_questions: number | null;
  time_spent_seconds: number | null;
}

// ============ Service ============

export class ExamSessionService {
  /**
   * Start a new exam/quiz session
   * Returns the session ID for tracking answers
   */
  static async startSession(params: StartSessionParams): Promise<string | null> {
    try {
      const { userId, visitorId, testType, examType, testNumber, subject } = params;

      // Must have either userId or visitorId
      if (!userId && !visitorId) {
        console.warn('⚠️ ExamSessionService.startSession: No userId or visitorId provided');
        return null;
      }

      const sessionData = {
        user_id: userId || null,
        visitor_id: !userId ? visitorId : null,
        test_type: testType,
        exam_type: examType || null,
        test_number: testNumber || null,
        subject: subject || null,
        started_at: new Date().toISOString(),
      };

      console.log('📝 Starting exam session:', sessionData);

      const { data, error } = await supabase
        .from('exam_sessions')
        .insert(sessionData)
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error starting session:', error);
        return null;
      }

      console.log('✅ Session started:', data.id);
      return data.id;
    } catch (error) {
      console.error('❌ Exception in startSession:', error);
      return null;
    }
  }

  /**
   * Record multiple answers for a session
   */
  static async recordAnswersBatch(params: RecordAnswersParams): Promise<boolean> {
    try {
      const { sessionId, answers } = params;

      if (!sessionId || !answers.length) {
        console.warn('⚠️ recordAnswersBatch: Missing sessionId or empty answers');
        return false;
      }

      const answerRecords = answers.map((answer) => ({
        session_id: sessionId,
        question_id: answer.questionId,
        selected_option_index: answer.selectedOptionIndex,
        correct_index: answer.correctIndex,
        is_correct: answer.selectedOptionIndex === answer.correctIndex,
        time_spent_ms: answer.timeSpentMs || null,
      }));

      console.log(`📝 Recording ${answerRecords.length} answers for session ${sessionId}`);

      const { error } = await supabase
        .from('exam_answers')
        .insert(answerRecords);

      if (error) {
        console.error('❌ Error recording answers:', error);
        return false;
      }

      console.log('✅ Answers recorded successfully');
      return true;
    } catch (error) {
      console.error('❌ Exception in recordAnswersBatch:', error);
      return false;
    }
  }

  /**
   * Complete a session with final score
   */
  static async completeSession(params: CompleteSessionParams): Promise<boolean> {
    try {
      const { sessionId, correctAnswers, totalQuestions, timeSpentSeconds } = params;

      if (!sessionId) {
        console.warn('⚠️ completeSession: Missing sessionId');
        return false;
      }

      const score = totalQuestions > 0 
        ? Math.round((correctAnswers / totalQuestions) * 100) 
        : 0;

      console.log(`📝 Completing session ${sessionId}: ${correctAnswers}/${totalQuestions} (${score}%)`);

      const { error } = await supabase
        .from('exam_sessions')
        .update({
          completed_at: new Date().toISOString(),
          score,
          total_questions: totalQuestions,
          time_spent_seconds: timeSpentSeconds,
        })
        .eq('id', sessionId);

      if (error) {
        console.error('❌ Error completing session:', error);
        return false;
      }

      console.log('✅ Session completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Exception in completeSession:', error);
      return false;
    }
  }

  /**
   * Get session by ID
   */
  static async getSession(sessionId: string): Promise<ExamSession | null> {
    try {
      const { data, error } = await supabase
        .from('exam_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        console.error('❌ Error fetching session:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Exception in getSession:', error);
      return null;
    }
  }

  /**
   * Get user's recent sessions
   */
  static async getUserSessions(
    userId: string,
    limit: number = 10
  ): Promise<ExamSession[]> {
    try {
      const { data, error } = await supabase
        .from('exam_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching user sessions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Exception in getUserSessions:', error);
      return [];
    }
  }

  /**
   * Get answers for a session
   */
  static async getSessionAnswers(sessionId: string): Promise<AnswerRecord[]> {
    try {
      const { data, error } = await supabase
        .from('exam_answers')
        .select('question_id, selected_option_index, correct_index, time_spent_ms')
        .eq('session_id', sessionId);

      if (error) {
        console.error('❌ Error fetching session answers:', error);
        return [];
      }

      return (data || []).map((row) => ({
        questionId: row.question_id,
        selectedOptionIndex: row.selected_option_index,
        correctIndex: row.correct_index,
        timeSpentMs: row.time_spent_ms,
      }));
    } catch (error) {
      console.error('❌ Exception in getSessionAnswers:', error);
      return [];
    }
  }

  /**
   * Get user's performance stats
   */
  static async getUserStats(userId: string): Promise<{
    totalSessions: number;
    avgScore: number;
    totalQuestions: number;
    totalCorrect: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('exam_sessions')
        .select('score, total_questions')
        .eq('user_id', userId)
        .not('completed_at', 'is', null);

      if (error || !data) {
        return { totalSessions: 0, avgScore: 0, totalQuestions: 0, totalCorrect: 0 };
      }

      const totalSessions = data.length;
      const totalQuestions = data.reduce((sum, s) => sum + (s.total_questions || 0), 0);
      const totalCorrect = data.reduce((sum, s) => {
        const correct = Math.round(((s.score || 0) / 100) * (s.total_questions || 0));
        return sum + correct;
      }, 0);
      const avgScore = totalSessions > 0
        ? Math.round(data.reduce((sum, s) => sum + (s.score || 0), 0) / totalSessions)
        : 0;

      return { totalSessions, avgScore, totalQuestions, totalCorrect };
    } catch (error) {
      console.error('❌ Exception in getUserStats:', error);
      return { totalSessions: 0, avgScore: 0, totalQuestions: 0, totalCorrect: 0 };
    }
  }
}







