import { supabase, Passage, UserAttempt } from '../lib/supabase';

export interface Question {
  id: string;
  category: 'ANG' | 'CG' | 'LOG';
  sub_category: string;
  question_text: string;
  answer1: string;
  answer2: string;
  answer3: string;
  answer4: string;
  correct: 'A' | 'B' | 'C' | 'D';
  difficulty: 'easy' | 'medium' | 'hard';
  exam_type?: 'CM' | 'CMS' | 'CS';
  passage_id?: string; // Reference to passage if question is based on a text
  created_at: string;
}

export interface QuestionWithPassage {
  question: Question;
  passage?: Passage;
}

export class QuestionService {
  static async getQuestionsByCategory(
    category: 'ANG' | 'CG' | 'LOG',
    subCategory?: string,
    limit: number = 10
  ): Promise<Question[]> {
    try {
      let query = supabase
        .from('questions')
        .select('*')
        .eq('category', category);

      if (subCategory) {
        query = query.eq('sub_category', subCategory);
      }

      const { data, error } = await query
        .limit(limit)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching questions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getQuestionsByCategory:', error);
      return [];
    }
  }

  static async getRandomQuestions(
    category: 'ANG' | 'CG' | 'LOG',
    limit: number = 10,
    subCategory?: string,
    testNumber?: number
  ): Promise<Question[]> {
    try {
      let query = supabase
        .from('questions')
        .select('*')
        .eq('category', category);

      if (subCategory) {
        query = query.eq('sub_category', subCategory);
      }

      const { data, error } = await query
        .limit(limit * 3) // Get more questions to ensure we have enough for randomization
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching random questions:', error);
        return [];
      }

      const questions = data || [];
      
      // Create a proper seed for randomization
      let seed: number;
      
      if (testNumber !== undefined) {
        // For practice tests: use test number to ensure different questions per test
        seed = testNumber * 1000 + category.charCodeAt(0) * 100 + category.charCodeAt(1) * 10 + category.charCodeAt(2);
        console.log(`🎯 Practice test mode: Using test number ${testNumber} as seed for ${category} (seed: ${seed})`);
      } else {
        // For daily quizzes: use date to ensure questions change daily
        const today = new Date();
        const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
        seed = dateSeed + category.charCodeAt(0) * 100 + category.charCodeAt(1) * 10 + category.charCodeAt(2);
        console.log(`📅 Daily quiz mode: Using date ${today.toDateString()} (${dateSeed}) as seed for ${category} (seed: ${seed})`);
      }
      
      // Fisher-Yates shuffle with seeded randomization
      const shuffled = [...questions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        // Generate a pseudo-random number based on the seed
        seed = (seed * 9301 + 49297) % 233280;
        const j = Math.floor((seed / 233280) * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      // Take the first 'limit' questions
      const result = shuffled.slice(0, limit);
      
      console.log(`✅ Fetched ${result.length} questions for ${category} with seed ${seed}`);
      return result;
    } catch (error) {
      console.error('❌ Error in getRandomQuestions:', error);
      return [];
    }
  }

  static async getQuestionsByTestType(
    category: 'ANG' | 'CG' | 'LOG',
    testType: 'quiz_series' | 'practice_test' | 'examen_blanc',
    examType?: 'CM' | 'CMS' | 'CS',
    limit: number = 10
  ): Promise<Question[]> {
    try {
      console.log(`🔍 Looking for ${category} questions with test_type='${testType}' and exam_type='${examType}'`);
      
      let query = supabase
        .from('questions')
        .select('*')
        .eq('category', category)
        .eq('test_type', testType);

      if (examType) {
        query = query.eq('exam_type', examType);
      }

      const { data, error } = await query
        .limit(limit)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching questions by test type:', error);
        return [];
      }

      const questions = data || [];
      console.log(`📊 Found ${questions.length} questions with test_type='${testType}'`);
      
      // If no questions found with test_type, try fallback method for exam questions
      if (questions.length === 0 && testType === 'examen_blanc') {
        console.log(`⚠️ No questions found with test_type='examen_blanc', trying fallback for ${category}`);
        return await this.getExamQuestionsFallback(category, examType, limit);
      }

      return questions;
    } catch (error) {
      console.error('Error fetching questions by test type:', error);
      return [];
    }
  }

  // Fallback method for exam questions when test_type is not properly set
  static async getExamQuestionsFallback(
    category: 'ANG' | 'CG' | 'LOG',
    examType?: 'CM' | 'CMS' | 'CS',
    limit: number = 20
  ): Promise<Question[]> {
    try {
      console.log(`🔍 Fallback: Looking for ${category} questions for exam ${examType}`);
      
      let query = supabase
        .from('questions')
        .select('*')
        .eq('category', category);

      if (examType) {
        query = query.eq('exam_type', examType);
      }

      const { data, error } = await query
        .limit(limit * 2) // Get more questions to ensure we have enough
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching exam questions fallback:', error);
        return [];
      }

      const questions = data || [];
      console.log(`✅ Fallback: Found ${questions.length} questions for ${category}`);
      
      // Shuffle and return the requested limit
      const shuffled = questions.sort(() => Math.random() - 0.5);
      return shuffled.slice(0, limit);
    } catch (error) {
      console.error('Error in getExamQuestionsFallback:', error);
      return [];
    }
  }

  static async getQuestionsByPool(
    category: 'ANG' | 'CG' | 'LOG',
    testType: 'quiz_series' | 'practice_test' | 'examen_blanc',
    examType?: 'CM' | 'CMS' | 'CS',
    limit: number = 10
  ): Promise<Question[]> {
    try {
      // Get questions from the specific test type
      const questions = await this.getQuestionsByTestType(category, testType, examType, limit * 3);
      
      if (!questions || questions.length === 0) {
        console.log(`⚠️ No questions found for ${category} ${testType} ${examType}`);
        return [];
      }
      
      // Create a proper seed for randomization
      let seed: number;
      
      // For practice tests: use test number to ensure different questions per test
      const today = new Date();
      const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
      seed = dateSeed + category.charCodeAt(0) * 100 + category.charCodeAt(1) * 10 + category.charCodeAt(2);
      console.log(`📅 Pool mode: Using date ${today.toDateString()} (${dateSeed}) as seed for ${category} ${testType} (seed: ${seed})`);
      
      // Fisher-Yates shuffle with seeded randomization
      const shuffled = [...questions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        // Generate a pseudo-random number based on the seed
        seed = (seed * 9301 + 49297) % 233280;
        const j = Math.floor((seed / 233280) * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      // Take the first 'limit' questions
      const result = shuffled.slice(0, limit);
      
      console.log(`✅ Fetched ${result.length} questions for ${category} ${testType} with seed ${seed}`);
      return result;
    } catch (error) {
      console.error('❌ Error in getQuestionsByPool:', error);
      return [];
    }
  }

  static async getRandomQuestionsFromPool(
    category: 'ANG' | 'CG' | 'LOG',
    testType: 'quiz_series' | 'practice_test' | 'examen_blanc',
    examType?: 'CM' | 'CMS' | 'CS',
    testNumber?: number,
    limit: number = 10
  ): Promise<Question[]> {
    try {
      // Get questions from the specific test type
      const questions = await this.getQuestionsByTestType(category, testType, examType, limit * 3);
      
      if (!questions || questions.length === 0) {
        console.log(`⚠️ No questions found for ${category} ${testType} ${examType}`);
        return [];
      }
      
      // Create a proper seed for randomization
      let seed: number;
      
      if (testNumber !== undefined) {
        // For practice tests: use test number to ensure different questions per test
        seed = testNumber * 1000 + category.charCodeAt(0) * 100 + category.charCodeAt(1) * 10 + category.charCodeAt(2);
        console.log(`🎯 Practice test mode: Using test number ${testNumber} as seed for ${category} ${testType} (seed: ${seed})`);
      } else {
        // For daily quizzes: use date to ensure questions change daily
        const today = new Date();
        const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
        seed = dateSeed + category.charCodeAt(0) * 100 + category.charCodeAt(1) * 10 + category.charCodeAt(2);
        console.log(`📅 Daily quiz mode: Using date ${today.toDateString()} (${dateSeed}) as seed for ${category} ${testType} (seed: ${seed})`);
      }
      
      // Fisher-Yates shuffle with seeded randomization
      const shuffled = [...questions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        // Generate a pseudo-random number based on the seed
        seed = (seed * 9301 + 49297) % 233280;
        const j = Math.floor((seed / 233280) * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      // Take the first 'limit' questions
      const result = shuffled.slice(0, limit);
      
      console.log(`✅ Fetched ${result.length} questions for ${category} ${testType} with seed ${seed}`);
      return result;
    } catch (error) {
      console.error('❌ Error in getRandomQuestionsFromPool:', error);
      return [];
    }
  }

  static async getPassageById(passageId: string): Promise<Passage | null> {
    try {
      const { data, error } = await supabase
        .from('passages')
        .select('*')
        .eq('id', passageId)
        .single();

      if (error) {
        console.error('Error fetching passage:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getPassageById:', error);
      return null;
    }
  }

  static async getQuestionsWithPassages(
    category: 'ANG' | 'CG' | 'LOG',
    limit: number = 10
  ): Promise<QuestionWithPassage[]> {
    try {
      const questions = await this.getQuestionsByCategory(category, undefined, limit);
      const questionsWithPassages: QuestionWithPassage[] = [];

      for (const question of questions) {
        let passage: Passage | null = null;
        if (question.passage_id) {
          passage = await this.getPassageById(question.passage_id);
        }

        questionsWithPassages.push({
          question,
          passage: passage || undefined
        });
      }

      return questionsWithPassages;
    } catch (error) {
      console.error('Error in getQuestionsWithPassages:', error);
      return [];
    }
  }

  static async saveUserAttempt(
    userId: string,
    questionId: string,
    userAnswer: string,
    isCorrect: boolean,
    timeSpent: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_attempts')
        .insert({
          user_id: userId,
          question_id: questionId,
          user_answer: userAnswer,
          is_correct: isCorrect,
          time_spent: timeSpent
        });

      if (error) {
        console.error('Error saving user attempt:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in saveUserAttempt:', error);
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
      console.error('Error in getUserAttempts:', error);
      return [];
    }
  }
}
