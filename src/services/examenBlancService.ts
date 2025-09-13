/**
 * Service for managing Examens Blancs
 * Handles loading and serving pre-generated exam configurations
 */

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
   * Load examens blancs data from JSON file
   */
  private async loadExamensData(): Promise<ExamenBlancData> {
    if (this.examensData) {
      return this.examensData;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this.fetchExamensData();
    this.examensData = await this.loadPromise;
    return this.examensData;
  }

  private async fetchExamensData(): Promise<ExamenBlancData> {
    try {
      // In production, this would be served from your backend
      // For now, we'll use the generated JSON file
      const response = await fetch('/examens_blancs_20250912_163313.json');
      if (!response.ok) {
        throw new Error(`Failed to load examens data: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error loading examens blancs data:', error);
      throw error;
    }
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
    if (question.category !== 'LOG') {
      return question.question_text;
    }

    let formattedText = question.question_text;
    
    // Convert x^2 to x², x^3 to x³, etc.
    for (let i = 2; i <= 9; i++) {
      const superscript = this.getSuperscript(i);
      formattedText = formattedText.replace(new RegExp(`x\\^${i}`, 'g'), `x${superscript}`);
      formattedText = formattedText.replace(new RegExp(`\\^${i}`, 'g'), superscript);
    }

    return formattedText;
  }

  /**
   * Format answer text for display (handles exponents in LOG questions)
   */
  formatAnswerText(answer: string, category: 'ANG' | 'CG' | 'LOG'): string {
    if (category !== 'LOG') {
      return answer;
    }

    let formattedAnswer = answer;
    
    // Convert x^2 to x², x^3 to x³, etc.
    for (let i = 2; i <= 9; i++) {
      const superscript = this.getSuperscript(i);
      formattedAnswer = formattedAnswer.replace(new RegExp(`x\\^${i}`, 'g'), `x${superscript}`);
      formattedAnswer = formattedAnswer.replace(new RegExp(`\\^${i}`, 'g'), superscript);
    }

    return formattedAnswer;
  }

  private getSuperscript(num: number): string {
    const superscripts: { [key: number]: string } = {
      0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵',
      6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹'
    };
    
    return num.toString().split('').map(digit => superscripts[parseInt(digit)]).join('');
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
