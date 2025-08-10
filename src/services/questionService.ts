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
      console.error('Error fetching questions:', error);
      return [];
    }
  }

  static async getQuestionsWithPassages(
    category: 'ANG' | 'CG' | 'LOG',
    limit: number = 10
  ): Promise<QuestionWithPassage[]> {
    try {
      // First, get questions that might have passages
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('category', category)
        .limit(limit)
        .order('created_at', { ascending: false });

      if (questionsError) {
        console.error('Error fetching questions:', questionsError);
        return [];
      }

      // Get unique passage IDs
      const passageIds = [...new Set(questions?.filter(q => q.passage_id).map(q => q.passage_id) || [])];

      // Fetch passages if any questions reference them
      let passages: Passage[] = [];
      if (passageIds.length > 0) {
        const { data: passagesData, error: passagesError } = await supabase
          .from('passages')
          .select('*')
          .in('id', passageIds);

        if (passagesError) {
          console.error('Error fetching passages:', passagesError);
        } else {
          passages = passagesData || [];
        }
      }

      // Combine questions with their passages
      const questionsWithPassages: QuestionWithPassage[] = (questions || []).map(question => {
        const passage = question.passage_id 
          ? passages.find(p => p.id === question.passage_id)
          : undefined;

        return {
          question,
          passage
        };
      });

      return questionsWithPassages;
    } catch (error) {
      console.error('Error fetching questions with passages:', error);
      return [];
    }
  }

  static async getRandomQuestions(category: string, limit: number = 10, examType?: string, testNumber?: number): Promise<Question[]> {
    try {
      let query = supabase
        .from('questions')
        .select('*')
        .eq('category', category);
      
      if (examType && examType !== 'ALL') {
        query = query.eq('exam_type', examType);
      }
      
      // Fetch significantly more questions than needed to ensure good randomization
      // For practice tests, we want different sets, so fetch more questions
      const fetchLimit = testNumber !== undefined ? limit * 5 : limit * 3;
      const { data, error } = await query.limit(fetchLimit);
      
      if (error) {
        console.error('❌ Error fetching questions:', error);
        return [];
      }
      
      if (!data || data.length === 0) {
        console.log(`⚠️ No questions found for category: ${category}, exam type: ${examType}`);
        return [];
      }
      
      // Create a proper seed for randomization
      let seed: number;
      
      if (testNumber !== undefined) {
        // For practice tests: use test number to ensure different questions per test
        // Use a more complex seed to ensure different sets, not just reordering
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
      const shuffled = [...data];
      for (let i = shuffled.length - 1; i > 0; i--) {
        // Generate a pseudo-random number based on the seed
        seed = (seed * 9301 + 49297) % 233280;
        const j = Math.floor((seed / 233280) * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      // For practice tests, take questions from different parts of the shuffled array
      // to ensure different sets, not just reordering
      let result: Question[];
      if (testNumber !== undefined) {
        // Use test number to select different starting positions
        const startIndex = (testNumber * 7) % Math.max(1, shuffled.length - limit);
        result = shuffled.slice(startIndex, startIndex + limit);
        console.log(`   📊 Practice test #${testNumber}: Selected questions ${startIndex + 1}-${startIndex + limit} from ${shuffled.length} available questions`);
      } else {
        // For daily quizzes, just take the first 'limit' questions
        result = shuffled.slice(0, limit);
        console.log(`   📊 Daily quiz: Selected first ${limit} questions from ${shuffled.length} available questions`);
      }
      
      // Log sample questions to verify randomization
      if (result.length > 0) {
        const sampleQuestions = result.slice(0, 2).map(q => q.question_text.substring(0, 50) + '...');
        console.log(`   🔍 Sample questions: ${sampleQuestions.join(' | ')}`);
      }
      
      console.log(`✅ Fetched ${result.length} questions for ${category} with seed ${seed} (${testNumber !== undefined ? 'practice test' : 'daily quiz'} mode)`);
      return result;
    } catch (error) {
      console.error('❌ Error in getRandomQuestions:', error);
      return [];
    }
  }

  static async getRandomQuestionsWithPassages(
    category: 'ANG' | 'CG' | 'LOG',
    count: number = 10
  ): Promise<QuestionWithPassage[]> {
    try {
      // Get random questions
      const questions = await this.getRandomQuestions(category, count);
      
      // Get unique passage IDs
      const passageIds = [...new Set(questions.filter(q => q.passage_id).map(q => q.passage_id))];

      // Fetch passages if any questions reference them
      let passages: Passage[] = [];
      if (passageIds.length > 0) {
        const { data: passagesData, error: passagesError } = await supabase
          .from('passages')
          .select('*')
          .in('id', passageIds);

        if (passagesError) {
          console.error('Error fetching passages:', passagesError);
        } else {
          passages = passagesData || [];
        }
      }

      // Combine questions with their passages
      const questionsWithPassages: QuestionWithPassage[] = questions.map(question => {
        const passage = question.passage_id 
          ? passages.find(p => p.id === question.passage_id)
          : undefined;

        return {
          question,
          passage
        };
      });

      return questionsWithPassages;
    } catch (error) {
      console.error('Error fetching random questions with passages:', error);
      return [];
    }
  }

  static async getQuestionsByDifficulty(
    category: 'ANG' | 'CG' | 'LOG',
    difficulty: 'easy' | 'medium' | 'hard',
    count: number = 10
  ): Promise<Question[]> {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('category', category)
        .eq('difficulty_level', difficulty)
        .limit(count);

      if (error) {
        console.error('Error fetching questions by difficulty:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching questions by difficulty:', error);
      return [];
    }
  }

  static async getQuestionById(id: string): Promise<Question | null> {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching question by ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching question by ID:', error);
      return null;
    }
  }

  static async getQuestionWithPassageById(id: string): Promise<QuestionWithPassage | null> {
    try {
      const question = await this.getQuestionById(id);
      if (!question) return null;

      if (!question.passage_id) {
        return { question };
      }

      const { data: passage, error: passageError } = await supabase
        .from('passages')
        .select('*')
        .eq('id', question.passage_id)
        .single();

      if (passageError) {
        console.error('Error fetching passage:', passageError);
        return { question };
      }

      return { question, passage };
    } catch (error) {
      console.error('Error fetching question with passage:', error);
      return null;
    }
  }

  static async getQuestionCount(category?: 'ANG' | 'CG' | 'LOG'): Promise<number> {
    try {
      let query = supabase
        .from('questions')
        .select('id', { count: 'exact' });

      if (category) {
        query = query.eq('category', category);
      }

      const { count, error } = await query;

      if (error) {
        console.error('Error fetching question count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error fetching question count:', error);
      return 0;
    }
  }

  static async getPassagesByCategory(
    category: 'ANG' | 'CG' | 'LOG',
    limit: number = 10
  ): Promise<Passage[]> {
    try {
      const { data, error } = await supabase
        .from('passages')
        .select('*')
        .eq('category', category)
        .limit(limit)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching passages:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching passages:', error);
      return [];
    }
  }

  static async getPassageById(id: string): Promise<Passage | null> {
    try {
      const { data, error } = await supabase
        .from('passages')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching passage by ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching passage by ID:', error);
      return null;
    }
  }
} 