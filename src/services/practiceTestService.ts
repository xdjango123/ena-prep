import { supabase } from '../lib/supabase';

export interface PracticeTestSummary {
  id: string;
  exam_type: 'CM' | 'CMS' | 'CS';
  category: 'ANG' | 'CG' | 'LOG';
  test_number: number;
  question_count: number;
}

interface PracticeTestData {
  generated_at: string;
  exam_types: {
    [key: string]: PracticeTestSummary[];
  };
}

const SUBJECT_ORDER: ('ANG' | 'CG' | 'LOG')[] = ['ANG', 'CG', 'LOG'];

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
      console.log('🔄 PracticeTestService: Loading practice tests from database...');
      const pageSize = 1000;
      const questions: any[] = [];
      let start = 0;

      while (true) {
        const end = start + pageSize - 1;
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .eq('test_type', 'practice_test')
          .not('test_number', 'is', null)
          .order('exam_type', { ascending: true })
          .order('category', { ascending: true })
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
          exam_type: 'CM' | 'CMS' | 'CS';
          category: 'ANG' | 'CG' | 'LOG';
          test_number: number;
          question_ids: string[];
        }
      > = {};

      for (const row of questions) {
        const examType = row.exam_type as 'CM' | 'CMS' | 'CS' | undefined;
        const category = row.category as 'ANG' | 'CG' | 'LOG';
        const testNumber = row.test_number as number | null;

        if (!examType || !testNumber || !SUBJECT_ORDER.includes(category)) {
          continue;
        }

        const key = `${examType}-${category}-${testNumber}`;
        if (!grouped[key]) {
          grouped[key] = {
            exam_type: examType,
            category,
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
          id: `${summary.exam_type}-${summary.category}-${summary.test_number}`,
          exam_type: summary.exam_type,
          category: summary.category,
          test_number: summary.test_number,
          question_count: Math.min(summary.question_ids.length, 15),
        });
      }

      Object.keys(examTypes).forEach(examType => {
        examTypes[examType].sort((a, b) => {
          if (a.category !== b.category) {
            return SUBJECT_ORDER.indexOf(a.category) - SUBJECT_ORDER.indexOf(b.category);
          }
          return a.test_number - b.test_number;
        });
      });

      const payload = {
        generated_at: new Date().toISOString(),
        exam_types: examTypes,
      };

      console.log('✅ PracticeTestService: Successfully loaded practice test data');
      return payload;
    } catch (error) {
      console.error('Error loading practice tests data from database:', error);
      throw error;
    }
  }

  async getPracticeTests(examType: 'CM' | 'CMS' | 'CS'): Promise<PracticeTestSummary[]> {
    const data = await this.loadData();
    return data.exam_types[examType] || [];
  }

  async getPracticeTestsByCategory(
    examType: 'CM' | 'CMS' | 'CS',
    category: 'ANG' | 'CG' | 'LOG'
  ): Promise<PracticeTestSummary[]> {
    const tests = await this.getPracticeTests(examType);
    return tests.filter(test => test.category === category);
  }
}

export const practiceTestService = new PracticeTestService();
