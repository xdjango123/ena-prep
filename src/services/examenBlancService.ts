/**
 * Examen Blanc Service V2 - Uses questions_v2 table
 * 
 * Schema changes:
 * - text (was question_text)
 * - options[] array (was answer1, answer2, answer3)
 * - correct_index (was correct: 'A'|'B'|'C')
 * - subject (was category)
 * - test_type = 'exam_blanc' (unchanged)
 */

import { supabase } from '../lib/supabase';
import { formatExponents } from '../utils/mathFormatting';
import type { Subject, ExamType, Difficulty, QuestionV2 } from '../types/questions';

// V2 Question type for Examen Blanc (simplified from QuestionV2)
export interface ExamenBlancQuestion {
  id: string;
  text: string;
  options: string[];
  correct_index: number;
  explanation: string;
  subject: Subject;
  difficulty: Difficulty;
  question_order: number;
  subject_order: number;
}

export interface ExamenBlanc {
  id: string;
  exam_number: number;
  exam_type: ExamType;
  total_questions: number;
  questions_per_subject: number;
  questions: ExamenBlancQuestion[];
}

export interface ExamenBlancData {
  generated_at: string;
  exam_types: {
    [key: string]: ExamenBlanc[];
  };
}

class ExamenBlancService {
  private examensData: ExamenBlancData | null = null;
  private loadPromise: Promise<ExamenBlancData> | null = null;

  /**
   * Load examens blancs data from database
   */
  private async loadExamensData(): Promise<ExamenBlancData> {
    if (this.examensData) {
      return this.examensData;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this.fetchExamensDataFromDB();
    this.examensData = await this.loadPromise;
    return this.examensData;
  }

  private async fetchExamensDataFromDB(): Promise<ExamenBlancData> {
    try {
      console.log('🔄 ExamenBlancService: Loading exam blanc data from database (V2)...');
      
      const pageSize = 1000;
      let start = 0;
      const questions: any[] = [];

      while (true) {
        const end = start + pageSize - 1;
        const { data, error } = await supabase
          .from('questions_v2')  // V2: Changed from 'questions'
          .select('*')
          .eq('test_type', 'exam_blanc')  // Same in V2
          .not('test_number', 'is', null)
          .order('exam_type', { ascending: true })
          .order('test_number', { ascending: true })
          .order('subject', { ascending: true })  // V2: 'subject' instead of 'category'
          .order('created_at', { ascending: true })
          .range(start, end);

        if (error) {
          console.error('Error loading exam blanc questions from database:', error);
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
        console.warn('⚠️ No exam blanc questions found in database');
        return {
          generated_at: new Date().toISOString(),
          exam_types: {}
        };
      }

      console.log(`✅ Loaded ${questions.length} exam blanc questions from database (V2)`);

      const examTypes: { [key: string]: ExamenBlanc[] } = {};
      const subjects: Subject[] = ['ANG', 'CG', 'LOG'];

      interface SubjectBuckets {
        [subject: string]: ExamenBlancQuestion[];
      }

      const groupedByType: Record<string, Map<number, SubjectBuckets>> = {};

      for (const row of questions) {
        const examType = row.exam_type as ExamType | undefined;
        const testNumber = row.test_number as number | null;
        const subject = row.subject as Subject;  // V2: 'subject' instead of 'category'

        if (!examType || !testNumber || !subjects.includes(subject)) {
          continue;
        }

        if (!groupedByType[examType]) {
          groupedByType[examType] = new Map();
        }

        if (!groupedByType[examType].has(testNumber)) {
          groupedByType[examType].set(testNumber, {
            ANG: [],
            CG: [],
            LOG: []
          });
        }

        const buckets = groupedByType[examType].get(testNumber)!;
        const questionOrder = buckets[subject].length + 1;

        // V2: Map to ExamenBlancQuestion format
        buckets[subject].push({
          id: row.id,
          text: row.text,  // V2: 'text' instead of 'question_text'
          options: row.options,  // V2: options[] array instead of answer1-3
          correct_index: row.correct_index,  // V2: correct_index instead of correct
          explanation: row.explanation || '',
          subject,
          difficulty: (row.difficulty as Difficulty) || 'MEDIUM',
          question_order: questionOrder,
          subject_order: subjects.indexOf(subject) + 1
        });
      }

      for (const [examType, examMap] of Object.entries(groupedByType)) {
        const exams: ExamenBlanc[] = [];
        const sortedExamNumbers = Array.from(examMap.keys()).sort((a, b) => a - b);

        for (const examNumber of sortedExamNumbers) {
          const buckets = examMap.get(examNumber)!;
          const examQuestions: ExamenBlancQuestion[] = [];

          for (const subject of subjects) {
            const subjectQuestions = buckets[subject];
            subjectQuestions.sort((a, b) => a.question_order - b.question_order);
            examQuestions.push(...subjectQuestions);
          }

          exams.push({
            id: `${examType}-${examNumber}`,
            exam_number: examNumber,
            exam_type: examType as ExamType,
            total_questions: examQuestions.length,
            questions_per_subject: 20,
            questions: examQuestions
          });
        }

        examTypes[examType] = exams;
        console.log(`✅ Loaded ${exams.length} exams for ${examType}`);
      }

      const result = {
        generated_at: new Date().toISOString(),
        exam_types: examTypes
      };

      console.log('✅ ExamenBlancService: Successfully loaded exam blanc data (V2)');
      return result;
      
    } catch (error) {
      console.error('Error loading examens blancs data from database:', error);
      throw error;
    }
  }

  /**
   * Get all available examens blancs for a specific exam type
   */
  async getExamensBlancs(examType: ExamType): Promise<ExamenBlanc[]> {
    const data = await this.loadExamensData();
    return data.exam_types[examType] || [];
  }

  /**
   * Get a specific examen blanc by number and exam type
   */
  async getExamenBlanc(examType: ExamType, examNumber: number): Promise<ExamenBlanc | null> {
    const examens = await this.getExamensBlancs(examType);
    return examens.find(examen => examen.exam_number === examNumber) || null;
  }

  /**
   * Get questions for a specific examen blanc, organized by subject
   */
  async getExamenBlancQuestions(
    examType: ExamType, 
    examNumber: number
  ): Promise<{
    ANG: ExamenBlancQuestion[];
    CG: ExamenBlancQuestion[];
    LOG: ExamenBlancQuestion[];
  }> {
    const examen = await this.getExamenBlanc(examType, examNumber);
    if (!examen) {
      throw new Error(`Examen Blanc #${examNumber} not found for ${examType}`);
    }

    const questions = {
      ANG: [] as ExamenBlancQuestion[],
      CG: [] as ExamenBlancQuestion[],
      LOG: [] as ExamenBlancQuestion[]
    };

    examen.questions.forEach(question => {
      questions[question.subject].push(question);
    });

    // Sort by question_order within each subject
    Object.keys(questions).forEach(subject => {
      questions[subject as Subject].sort((a, b) => a.question_order - b.question_order);
    });

    return questions;
  }

  /**
   * Get a random set of questions for a specific subject from an examen blanc
   */
  async getRandomSubjectQuestions(
    examType: ExamType,
    examNumber: number,
    subject: Subject,
    count: number = 20
  ): Promise<ExamenBlancQuestion[]> {
    const examen = await this.getExamenBlanc(examType, examNumber);
    if (!examen) {
      throw new Error(`Examen Blanc #${examNumber} not found for ${examType}`);
    }

    const subjectQuestions = examen.questions.filter(q => q.subject === subject);
    
    if (subjectQuestions.length <= count) {
      return subjectQuestions;
    }

    // Shuffle and take the first 'count' questions
    const shuffled = [...subjectQuestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Format question text for display (handles exponents in LOG questions)
   */
  formatQuestionText(question: ExamenBlancQuestion): string {
    return question.subject === 'LOG'
      ? formatExponents(question.text)
      : question.text;
  }

  /**
   * Format answer text for display (handles exponents in LOG questions)
   */
  formatAnswerText(answer: string, subject: Subject): string {
    return subject === 'LOG' ? formatExponents(answer) : answer;
  }

  /**
   * Get statistics about available examens blancs
   */
  async getStatistics(): Promise<{
    [examType: string]: {
      total_examens: number;
      total_questions: number;
      questions_by_subject: { [subject: string]: number };
    };
  }> {
    const data = await this.loadExamensData();
    const stats: any = {};

    Object.keys(data.exam_types).forEach(examType => {
      const examens = data.exam_types[examType];
      const questionsBySubject: { [key: string]: number } = {};

      examens.forEach(examen => {
        examen.questions.forEach(question => {
          questionsBySubject[question.subject] = (questionsBySubject[question.subject] || 0) + 1;
        });
      });

      stats[examType] = {
        total_examens: examens.length,
        total_questions: examens.reduce((sum, examen) => sum + examen.total_questions, 0),
        questions_by_subject: questionsBySubject
      };
    });

    return stats;
  }

  /**
   * Clear cache to force reload from database
   */
  clearCache(): void {
    this.examensData = null;
    this.loadPromise = null;
  }
}

export const examenBlancService = new ExamenBlancService();
