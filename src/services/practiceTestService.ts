/**
 * Practice Test Service V2 - Uses questions_v2 table
 * 
 * Loads practice test data from the database with test_type = 'practice'
 */

import { supabase } from '../lib/supabase';
import type { Subject, ExamType } from '../types/questions';

export interface PracticeTestSummary {
  id: string;
  exam_type: ExamType;
  subject: Subject;
  test_number: number;
  question_count: number;
}

interface PracticeTestData {
  generated_at: string;
  exam_types: {
    [key: string]: PracticeTestSummary[];
  };
}

const SUBJECT_ORDER: Subject[] = ['ANG', 'CG', 'LOG'];

class PracticeTestService {
  private practiceData: PracticeTestData | null = null;
  private loadPromise: Promise<PracticeTestData> | null = null;

  private async loadData(): Promise<PracticeTestData> {
    if (this.practiceData) {
      return this.practiceData;
    }
    if (this.loadPromise) {
      return this.loadPromise;
    }
    this.loadPromise = this.fetchPracticeTestsFromDB();
    this.practiceData = await this.loadPromise;
    return this.practiceData;
  }

  private async fetchPracticeTestsFromDB(): Promise<PracticeTestData> {
    try {
      console.log('🔄 PracticeTestService: Loading practice tests from database (V2)...');
      const pageSize = 1000;
      const questions: any[] = [];
      let start = 0;

      while (true) {
        const end = start + pageSize - 1;
        const { data, error } = await supabase
          .from('questions_v2')  // V2: Changed from 'questions'
          .select('id, subject, exam_type, test_number')  // V2: 'subject' instead of 'category'
          .eq('test_type', 'practice')  // V2: 'practice' instead of 'practice_test'
          .not('test_number', 'is', null)
          .order('exam_type', { ascending: true })
          .order('subject', { ascending: true })  // V2: 'subject' instead of 'category'
          .order('test_number', { ascending: true })
          .order('created_at', { ascending: true })
          .range(start, end);

        if (error) {
          console.error('Error loading practice test questions from database:', error);
          throw error;
        }

        if (data && data.length > 0) {
          questions.push(...data);
        }

        if (!data || data.length < pageSize) {
          break;
        }

        start += pageSize;
      }

      if (questions.length === 0) {
        console.warn('⚠️ No practice test questions found in database');
        return {
          generated_at: new Date().toISOString(),
          exam_types: {},
        };
      }

      const examTypes: { [key: string]: PracticeTestSummary[] } = {};
      const grouped: Record<
        string,
        {
          exam_type: ExamType;
          subject: Subject;
          test_number: number;
          question_ids: string[];
        }
      > = {};

      for (const row of questions) {
        const examType = row.exam_type as ExamType | undefined;
        const subject = row.subject as Subject;  // V2: 'subject' instead of 'category'
        const testNumber = row.test_number as number | null;

        if (!examType || !testNumber || !SUBJECT_ORDER.includes(subject)) {
          continue;
        }

        const key = `${examType}-${subject}-${testNumber}`;
        if (!grouped[key]) {
          grouped[key] = {
            exam_type: examType,
            subject,
            test_number: testNumber,
            question_ids: [],
          };
        }
        grouped[key].question_ids.push(row.id);
      }

      for (const summary of Object.values(grouped)) {
        if (!examTypes[summary.exam_type]) {
          examTypes[summary.exam_type] = [];
        }
        examTypes[summary.exam_type].push({
          id: `${summary.exam_type}-${summary.subject}-${summary.test_number}`,
          exam_type: summary.exam_type,
          subject: summary.subject,
          test_number: summary.test_number,
          question_count: Math.min(summary.question_ids.length, 15),
        });
      }

      // Sort by subject order then test number
      Object.keys(examTypes).forEach(examType => {
        examTypes[examType].sort((a, b) => {
          if (a.subject !== b.subject) {
            return SUBJECT_ORDER.indexOf(a.subject) - SUBJECT_ORDER.indexOf(b.subject);
          }
          return a.test_number - b.test_number;
        });
      });

      const payload = {
        generated_at: new Date().toISOString(),
        exam_types: examTypes,
      };

      console.log('✅ PracticeTestService: Successfully loaded practice test data (V2)');
      return payload;
    } catch (error) {
      console.error('Error loading practice tests data from database:', error);
      throw error;
    }
  }

  /**
   * Get all practice tests for an exam type
   */
  async getPracticeTests(examType: ExamType): Promise<PracticeTestSummary[]> {
    const data = await this.loadData();
    return data.exam_types[examType] || [];
  }

  /**
   * Get practice tests filtered by subject
   */
  async getPracticeTestsBySubject(
    examType: ExamType,
    subject: Subject
  ): Promise<PracticeTestSummary[]> {
    const tests = await this.getPracticeTests(examType);
    return tests.filter(test => test.subject === subject);
  }

  /**
   * @deprecated Use getPracticeTestsBySubject instead
   */
  async getPracticeTestsByCategory(
    examType: ExamType,
    category: Subject
  ): Promise<PracticeTestSummary[]> {
    return this.getPracticeTestsBySubject(examType, category);
  }

  /**
   * Clear cache to force reload from database
   */
  clearCache(): void {
    this.practiceData = null;
    this.loadPromise = null;
  }
}

export const practiceTestService = new PracticeTestService();
