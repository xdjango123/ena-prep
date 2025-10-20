/**
 * Service for managing Examens Blancs
 * Now pulls data directly from Supabase database with test_type = 'examen_blanc'
 */

import { supabase } from '../lib/supabase';
import { formatExponents } from '../utils/mathFormatting';

export interface ExamenBlancQuestion {
  id: string;
  question_text: string;
  answer1: string;
  answer2: string;
  answer3: string;
  correct: string;
  explanation: string;
  category: 'ANG' | 'CG' | 'LOG';
  difficulty: 'EASY' | 'MED' | 'HARD';
  question_order: number;
  subject_order: number;
}

export interface ExamenBlanc {
  id: string;
  exam_number: number;
  exam_type: 'CM' | 'CMS' | 'CS';
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
      console.log('🔄 ExamenBlancService: Loading exam blanc data from database...');
      
      // Get all exam blanc questions from database
      const { data: questions, error } = await supabase
        .from('questions')
        .select('*')
        .eq('test_type', 'examen_blanc')
        .order('exam_type', { ascending: true })
        .order('category', { ascending: true });

      if (error) {
        console.error('Error loading exam blanc questions from database:', error);
        throw error;
      }

      if (!questions || questions.length === 0) {
        console.warn('⚠️ No exam blanc questions found in database');
        return {
          generated_at: new Date().toISOString(),
          exam_types: {}
        };
      }

      console.log(`✅ Loaded ${questions.length} exam blanc questions from database`);

      // Group questions by exam type and create exam structures
      const examTypes: { [key: string]: ExamenBlanc[] } = {};
      
      // Generate 10 exams for each exam type (CM, CMS, CS)
      const examTypesList: ('CM' | 'CMS' | 'CS')[] = ['CM', 'CMS', 'CS'];
      
      for (const examType of examTypesList) {
        const typeQuestions = questions.filter(q => q.exam_type === examType);
        
        if (typeQuestions.length === 0) {
          console.warn(`⚠️ No questions found for exam type: ${examType}`);
          examTypes[examType] = [];
          continue;
        }

        const exams: ExamenBlanc[] = [];
        
        // Create 10 exams for this exam type
        for (let examNumber = 1; examNumber <= 10; examNumber++) {
          const examQuestions: ExamenBlancQuestion[] = [];
          
          // Get 20 questions per subject (ANG, CG, LOG)
          const subjects: ('ANG' | 'CG' | 'LOG')[] = ['ANG', 'CG', 'LOG'];
          
          for (const subject of subjects) {
            const subjectQuestions = typeQuestions.filter(q => q.category === subject);
            
            if (subjectQuestions.length >= 20) {
              // Use seeded randomization to ensure each exam gets different questions
              const seed = examNumber * 1000 + subject.charCodeAt(0) * 100 + examType.charCodeAt(0);
              const shuffled = this.seededShuffle([...subjectQuestions], seed);
              const selectedQuestions = shuffled.slice(0, 20);
              
              // Convert to ExamenBlancQuestion format
              const convertedQuestions = selectedQuestions.map((q, index) => ({
                id: q.id,
                question_text: q.question_text,
                answer1: q.answer1,
                answer2: q.answer2,
                answer3: q.answer3,
                correct: q.correct,
                explanation: q.explanation || '',
                category: q.category as 'ANG' | 'CG' | 'LOG',
                difficulty: q.difficulty as 'EASY' | 'MED' | 'HARD',
                question_order: index + 1,
                subject_order: subjects.indexOf(subject) + 1
              }));
              
              examQuestions.push(...convertedQuestions);
            }
          }
          
          if (examQuestions.length > 0) {
            exams.push({
              id: `${examType}-${examNumber}`,
              exam_number: examNumber,
              exam_type: examType,
              total_questions: examQuestions.length,
              questions_per_subject: 20,
              questions: examQuestions
            });
          }
        }
        
        examTypes[examType] = exams;
        console.log(`✅ Generated ${exams.length} exams for ${examType}`);
      }

      const result = {
        generated_at: new Date().toISOString(),
        exam_types: examTypes
      };

      console.log('✅ ExamenBlancService: Successfully loaded exam blanc data from database');
      return result;
      
    } catch (error) {
      console.error('Error loading examens blancs data from database:', error);
      throw error;
    }
  }

  /**
   * Seeded shuffle function for deterministic randomization
   */
  private seededShuffle<T>(array: T[], seed: number): T[] {
    const shuffled = [...array];
    let currentSeed = seed;
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      const j = Math.floor((currentSeed / 233280) * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }

  /**
   * Get all available examens blancs for a specific exam type
   */
  async getExamensBlancs(examType: 'CM' | 'CMS' | 'CS'): Promise<ExamenBlanc[]> {
    const data = await this.loadExamensData();
    return data.exam_types[examType] || [];
  }

  /**
   * Get a specific examen blanc by number and exam type
   */
  async getExamenBlanc(examType: 'CM' | 'CMS' | 'CS', examNumber: number): Promise<ExamenBlanc | null> {
    const examens = await this.getExamensBlancs(examType);
    return examens.find(examen => examen.exam_number === examNumber) || null;
  }

  /**
   * Get questions for a specific examen blanc, organized by subject
   */
  async getExamenBlancQuestions(
    examType: 'CM' | 'CMS' | 'CS', 
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
      questions[question.category].push(question);
    });

    // Sort by question_order within each category
    Object.keys(questions).forEach(category => {
      questions[category as keyof typeof questions].sort((a, b) => a.question_order - b.question_order);
    });

    return questions;
  }

  /**
   * Get a random set of questions for a specific subject from an examen blanc
   */
  async getRandomSubjectQuestions(
    examType: 'CM' | 'CMS' | 'CS',
    examNumber: number,
    category: 'ANG' | 'CG' | 'LOG',
    count: number = 20
  ): Promise<ExamenBlancQuestion[]> {
    const examen = await this.getExamenBlanc(examType, examNumber);
    if (!examen) {
      throw new Error(`Examen Blanc #${examNumber} not found for ${examType}`);
    }

    const subjectQuestions = examen.questions.filter(q => q.category === category);
    
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
    return question.category === 'LOG'
      ? formatExponents(question.question_text)
      : question.question_text;
  }

  /**
   * Format answer text for display (handles exponents in LOG questions)
   */
  formatAnswerText(answer: string, category: 'ANG' | 'CG' | 'LOG'): string {
    return category === 'LOG' ? formatExponents(answer) : answer;
  }

  /**
   * Get statistics about available examens blancs
   */
  async getStatistics(): Promise<{
    [examType: string]: {
      total_examens: number;
      total_questions: number;
      questions_by_category: { [category: string]: number };
    };
  }> {
    const data = await this.loadExamensData();
    const stats: any = {};

    Object.keys(data.exam_types).forEach(examType => {
      const examens = data.exam_types[examType];
      const questionsByCategory: { [key: string]: number } = {};

      examens.forEach(examen => {
        examen.questions.forEach(question => {
          questionsByCategory[question.category] = (questionsByCategory[question.category] || 0) + 1;
        });
      });

      stats[examType] = {
        total_examens: examens.length,
        total_questions: examens.reduce((sum, examen) => sum + examen.total_questions, 0),
        questions_by_category: questionsByCategory
      };
    });

    return stats;
  }
}

export const examenBlancService = new ExamenBlancService();
