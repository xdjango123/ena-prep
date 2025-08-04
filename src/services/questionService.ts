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

  static async getRandomQuestions(category: string, limit: number = 10, examType?: string): Promise<Question[]> {
    try {
      let query = supabase
        .from('questions')
        .select('*')
        .eq('category', category)
        .limit(limit);
      
      if (examType && examType !== 'ALL') {
        query = query.eq('exam_type', examType);
      }
      
      // Add cache-busting parameter
      const timestamp = Date.now();
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching questions:', error);
        return [];
      }
      
      // Shuffle the questions to randomize them
      const shuffled = data.sort(() => Math.random() - 0.5);
      return shuffled.slice(0, limit);
    } catch (error) {
      console.error('Error in getRandomQuestions:', error);
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