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
  test_type?: string;
  is3Option?: boolean; // Flag to indicate this is a 3-option question
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
    testNumber?: number,
    examType?: 'CM' | 'CMS' | 'CS'
  ): Promise<Question[]> {
    try {
      let query = supabase
        .from('questions')
        .select('*')
        .eq('category', category);

      if (subCategory) {
        query = query.eq('sub_category', subCategory);
      }

      // Add exam_type filter if provided
      if (examType) {
        query = query.eq('exam_type', examType);
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
        seed = testNumber * 1000 + category.charCodeAt(0) * 100 + (category.charCodeAt(1) || 0) * 10 + (category.charCodeAt(2) || 0);
        console.log(`🎯 Practice test mode: Using test number ${testNumber} as seed for ${category} (seed: ${seed})`);
      } else {
        // For daily quizzes: use date to ensure questions change daily
        const today = new Date();
        const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
        seed = dateSeed + category.charCodeAt(0) * 100 + (category.charCodeAt(1) || 0) * 10 + (category.charCodeAt(2) || 0);
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
    limit: number = 10
  ): Promise<Question[]> {
    try {
      let query = supabase
        .from('questions')
        .select('*')
        .eq('category', category)
        .eq('test_type', testType);

      const { data, error } = await query
        .limit(limit)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching questions by test type:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getQuestionsByTestType:', error);
      return [];
    }
  }

  static async getQuestionsByDifficulty(
    category: 'ANG' | 'CG' | 'LOG',
    difficulty: 'easy' | 'medium' | 'hard',
    limit: number = 10
  ): Promise<Question[]> {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('category', category)
        .eq('difficulty', difficulty)
        .limit(limit)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching questions by difficulty:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getQuestionsByDifficulty:', error);
      return [];
    }
  }

  static async getRandomQuestionsFromPool(
    category: 'ANG' | 'CG' | 'LOG',
    pool: string,
    limit: number = 10
  ): Promise<Question[]> {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('category', category)
        .eq('question_pool', pool)
        .limit(limit * 2) // Get more questions for randomization
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching questions from pool:', error);
        return [];
      }

      const questions = data || [];
      
      // Simple shuffle
      const shuffled = questions.sort(() => Math.random() - 0.5);
      
      return shuffled.slice(0, limit);
    } catch (error) {
      console.error('❌ Error in getRandomQuestionsFromPool:', error);
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
      console.error('Error in getQuestionById:', error);
      return null;
    }
  }

  static async getQuestionsWithPassages(
    category: 'ANG' | 'CG' | 'LOG',
    limit: number = 10
  ): Promise<QuestionWithPassage[]> {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          passages (
            id,
            title,
            content,
            category
          )
        `)
        .eq('category', category)
        .not('passage_id', 'is', null)
        .limit(limit)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching questions with passages:', error);
        return [];
      }

      return (data || []).map(item => ({
        question: {
          id: item.id,
          category: item.category,
          sub_category: item.sub_category,
          question_text: item.question_text,
          answer1: item.answer1,
          answer2: item.answer2,
          answer3: item.answer3,
          answer4: item.answer4,
          correct: item.correct,
          difficulty: item.difficulty,
          exam_type: item.exam_type,
          passage_id: item.passage_id,
          created_at: item.created_at
        },
        passage: item.passages
      }));
    } catch (error) {
      console.error('Error in getQuestionsWithPassages:', error);
      return [];
    }
  }

  static async searchQuestions(
    category: 'ANG' | 'CG' | 'LOG',
    searchTerm: string,
    limit: number = 10
  ): Promise<Question[]> {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('category', category)
        .textSearch('question_text', searchTerm)
        .limit(limit)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error searching questions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in searchQuestions:', error);
      return [];
    }
  }

  static async getQuestionStats(category: 'ANG' | 'CG' | 'LOG'): Promise<{
    total: number;
    byDifficulty: { easy: number; medium: number; hard: number };
    byTestType: { quiz_series: number; practice_test: number; examen_blanc: number };
  }> {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('difficulty, test_type')
        .eq('category', category);

      if (error) {
        console.error('Error fetching question stats:', error);
        return { total: 0, byDifficulty: { easy: 0, medium: 0, hard: 0 }, byTestType: { quiz_series: 0, practice_test: 0, examen_blanc: 0 } };
      }

      const questions = data || [];
      const total = questions.length;
      
      const byDifficulty = questions.reduce((acc, q) => {
        acc[q.difficulty as keyof typeof acc]++;
        return acc;
      }, { easy: 0, medium: 0, hard: 0 });
      
      const byTestType = questions.reduce((acc, q) => {
        if (q.test_type) {
          acc[q.test_type as keyof typeof acc]++;
        }
        return acc;
      }, { quiz_series: 0, practice_test: 0, examen_blanc: 0 });

      return { total, byDifficulty, byTestType };
    } catch (error) {
      console.error('Error in getQuestionStats:', error);
      return { total: 0, byDifficulty: { easy: 0, medium: 0, hard: 0 }, byTestType: { quiz_series: 0, practice_test: 0, examen_blanc: 0 } };
    }
  }

  static async createQuestion(question: Omit<Question, 'id' | 'created_at'>): Promise<Question | null> {
    try {
      const { data, error } = await supabase
        .from('questions')
        .insert([question])
        .select()
        .single();

      if (error) {
        console.error('Error creating question:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in createQuestion:', error);
      return null;
    }
  }

  static async updateQuestion(id: string, updates: Partial<Question>): Promise<Question | null> {
    try {
      const { data, error } = await supabase
        .from('questions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating question:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in updateQuestion:', error);
      return null;
    }
  }

  static async deleteQuestion(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting question:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteQuestion:', error);
      return false;
    }
  }

  /**
   * Get exam-specific questions with flexible distribution based on available data
   * Uses examId for deterministic randomization to ensure each exam has different questions
   */
  static async getExamQuestions(
    category: 'ANG' | 'CG' | 'LOG',
    examId: string,
    examType: 'CM' | 'CMS' | 'CS',
    limit: number = 20
  ): Promise<Question[]> {
    try {
      console.log(`🎯 Loading exam questions for ${category} - Exam ${examId} (${examType})`);

      // Get all available questions for this category and test_type
      const { data: allQuestions, error: allError } = await supabase
        .from('questions')
        .select('*')
        .eq('category', category)
        .eq('test_type', 'examen_blanc')
        .limit(limit * 3); // Get more for randomization

      if (allError) {
        console.error('Error fetching questions:', allError);
        throw allError;
      }

      if (!allQuestions || allQuestions.length === 0) {
        console.log(`   No questions found for ${category}`);
        return [];
      }

      // Separate by difficulty
      const hardQuestions = allQuestions.filter(q => q.difficulty === 'HARD');
      const medQuestions = allQuestions.filter(q => q.difficulty === 'MED');
      const easyQuestions = allQuestions.filter(q => q.difficulty === 'EASY');

      console.log(`   Available: ${hardQuestions.length} HARD, ${medQuestions.length} MED, ${easyQuestions.length} EASY`);

      // Flexible distribution: prioritize HARD, then MED, then EASY
      const selectedQuestions = [];
      
      // Try to get as many HARD as possible (up to 80% of limit)
      const maxHard = Math.min(hardQuestions.length, Math.floor(limit * 0.8));
      const maxMed = Math.min(medQuestions.length, limit - maxHard);
      const maxEasy = Math.min(easyQuestions.length, limit - maxHard - maxMed);

      console.log(`   Will select: ${maxHard} HARD, ${maxMed} MED, ${maxEasy} EASY`);

      // Create seeded random function using examId
      const seed = parseInt(examId) * 1000 + category.charCodeAt(0) * 100 + examType.charCodeAt(0);
      console.log(`   Using seed: ${seed} for deterministic randomization`);

      // Seeded shuffle function
      const seededShuffle = (array: any[], seed: number) => {
        const shuffled = [...array];
        let currentSeed = seed;
        
        for (let i = shuffled.length - 1; i > 0; i--) {
          // Linear congruential generator for seeded randomness
          currentSeed = (currentSeed * 1664525 + 1013904223) % Math.pow(2, 32);
          const randomValue = currentSeed / Math.pow(2, 32);
          const j = Math.floor(randomValue * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        return shuffled;
      };

      // Select questions
      if (maxHard > 0) {
        const selectedHard = seededShuffle(hardQuestions, seed).slice(0, maxHard);
        selectedQuestions.push(...selectedHard);
      }
      
      if (maxMed > 0) {
        const selectedMed = seededShuffle(medQuestions, seed + 1).slice(0, maxMed);
        selectedQuestions.push(...selectedMed);
      }
      
      if (maxEasy > 0) {
        const selectedEasy = seededShuffle(easyQuestions, seed + 2).slice(0, maxEasy);
        selectedQuestions.push(...selectedEasy);
      }

      // Final shuffle of combined questions
      const finalQuestions = seededShuffle(selectedQuestions, seed + 3);

      console.log(`✅ Successfully selected ${finalQuestions.length} questions for exam ${examId}`);
      console.log(`   Final distribution: ${maxHard} HARD, ${maxMed} MED, ${maxEasy} EASY`);

      return finalQuestions;

    } catch (error) {
      console.error(`❌ Error loading exam questions for ${category}:`, error);
      
      // Fallback to regular questions if exam-specific fails
      console.log(`   Falling back to regular question selection...`);
      return await this.getQuestionsByCategory(category, undefined, limit);
    }
  }

  /**
   * Fallback method for exams when getExamQuestions fails
   */
  static async getExamQuestionsFallback(
    category: 'ANG' | 'CG' | 'LOG',
    examType: 'CM' | 'CMS' | 'CS',
    limit: number = 20
  ): Promise<Question[]> {
    try {
      console.log(`🔄 Using fallback method for ${category} questions`);
      
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('category', category)
        .eq('test_type', 'examen_blanc')
        .limit(limit * 2)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error in fallback method:', error);
        return [];
      }

      // Simple randomization for fallback
      const shuffled = (data || []).sort(() => Math.random() - 0.5);
      return shuffled.slice(0, limit);

    } catch (error) {
      console.error('Error in getExamQuestionsFallback:', error);
      return [];
    }
  }


  /**
   * Converts a 4-option question to 3-option format for exam blanc only
   * Ensures the correct answer is always included
   */
  static convertTo3OptionsForExamBlanc(question: Question): Question {
    try {
      // Only convert if this is an exam blanc question
      if (question.test_type !== 'examen_blanc') {
        return question;
      }

      // Get all options
      const options = [
        question.answer1,
        question.answer2,
        question.answer3,
        question.answer4
      ].filter(opt => opt && opt.trim()); // Filter out empty options

      if (options.length < 3) {
        // If less than 3 valid options, return original question
        return question;
      }

      // Get correct answer
      const correctLetter = question.correct;
      const correctIndex = correctLetter.charCodeAt(0) - 'A'.charCodeAt(0); // A=0, B=1, C=2, D=3
      const correctAnswer = options[correctIndex] || options[0];

      // Create list of incorrect options
      const incorrectOptions = options.filter((_, i) => i !== correctIndex);

      // Select 2 additional options randomly
      const selectedIncorrect = this.shuffleArray([...incorrectOptions]).slice(0, 2);

      // Combine correct answer with selected incorrect options
      const finalOptions = [correctAnswer, ...selectedIncorrect];

      // Shuffle to randomize order
      const shuffledOptions = this.shuffleArray(finalOptions);

      // Find new correct answer position
      const newCorrectIndex = shuffledOptions.indexOf(correctAnswer);
      const newCorrectLetter = String.fromCharCode('A'.charCodeAt(0) + newCorrectIndex);

      // Return converted question
      return {
        ...question,
        answer1: shuffledOptions[0] || '',
        answer2: shuffledOptions[1] || '',
        answer3: shuffledOptions[2] || '',
        answer4: '', // Clear answer4 for 3-option questions
        correct: newCorrectLetter as 'A' | 'B' | 'C',
        is3Option: true // Flag to indicate this is a 3-option question
      };
    } catch (error) {
      console.error('Error converting question to 3 options:', error);
      return question;
    }
  }

  /**
   * Shuffles an array using Fisher-Yates algorithm
   */
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Get exam blanc questions with 3-option format
   * This replaces the existing getExamQuestions method for exam blanc
   */
  static async getExamBlancQuestions(
    category: 'ANG' | 'CG' | 'LOG',
    examId: string,
    examType: 'CM' | 'CMS' | 'CS',
    limit: number = 20
  ): Promise<Question[]> {
    try {
      console.log(`🎯 Loading exam blanc questions for ${category} - Exam ${examId} (${examType})`);

      // Get all available questions for this category and test_type
      const { data: allQuestions, error: allError } = await supabase
        .from('questions')
        .select('*')
        .eq('category', category)
        .eq('test_type', 'examen_blanc')
        .limit(limit * 3); // Get more for randomization

      if (allError) {
        console.error('Error fetching questions:', allError);
        throw allError;
      }

      if (!allQuestions || allQuestions.length === 0) {
        console.log(`   No questions found for ${category}`);
        return [];
      }

      // Convert all questions to 3-option format
      const convertedQuestions = allQuestions.map(q => this.convertTo3OptionsForExamBlanc(q));

      // Separate by difficulty
      const hardQuestions = convertedQuestions.filter(q => q.difficulty === 'HARD');
      const medQuestions = convertedQuestions.filter(q => q.difficulty === 'MED');
      const easyQuestions = convertedQuestions.filter(q => q.difficulty === 'EASY');

      console.log(`   Available: ${hardQuestions.length} HARD, ${medQuestions.length} MED, ${easyQuestions.length} EASY`);

      // Flexible distribution: prioritize HARD, then MED, then EASY
      const selectedQuestions = [];
      
      // Try to get as many HARD as possible (up to 80% of limit)
      const maxHard = Math.min(hardQuestions.length, Math.floor(limit * 0.8));
      const maxMed = Math.min(medQuestions.length, limit - maxHard);
      const maxEasy = Math.min(easyQuestions.length, limit - maxHard - maxMed);

      console.log(`   Will select: ${maxHard} HARD, ${maxMed} MED, ${maxEasy} EASY`);

      // Create seeded random function using examId
      const seed = parseInt(examId) * 1000 + category.charCodeAt(0) * 100;
      const seededRandom = (min: number, max: number) => {
        const x = Math.sin(seed) * 10000;
        return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
      };

      // Select questions with seeded randomization
      if (maxHard > 0) {
        const shuffledHard = this.shuffleArrayWithSeed([...hardQuestions], seed);
        selectedQuestions.push(...shuffledHard.slice(0, maxHard));
      }
      
      if (maxMed > 0) {
        const shuffledMed = this.shuffleArrayWithSeed([...medQuestions], seed + 1);
        selectedQuestions.push(...shuffledMed.slice(0, maxMed));
      }
      
      if (maxEasy > 0) {
        const shuffledEasy = this.shuffleArrayWithSeed([...easyQuestions], seed + 2);
        selectedQuestions.push(...shuffledEasy.slice(0, maxEasy));
      }

      console.log(`✅ Selected ${selectedQuestions.length} exam blanc questions for ${category} (3-option format)`);
      return selectedQuestions;
    } catch (error) {
      console.error('Error in getExamBlancQuestions:', error);
      return [];
    }
  }

  /**
   * Get exam blanc questions using pre-generated examens blancs
   * This is the new preferred method for exam blanc questions
   */
  static async getExamBlancQuestionsFromPreGenerated(
    category: 'ANG' | 'CG' | 'LOG',
    examId: string,
    examType: 'CM' | 'CMS' | 'CS',
    limit: number = 20
  ): Promise<Question[]> {
    try {
      console.log(`🎯 Loading pre-generated exam blanc questions for ${category} - Exam ${examId} (${examType})`);

      // Import the examen blanc service
      const { examenBlancService } = await import('./examenBlancService');
      const examNumber = parseInt(examId);
      
      if (isNaN(examNumber)) {
        throw new Error(`Invalid exam ID: ${examId}`);
      }

      console.log(`   Using pre-generated examen blanc #${examNumber}`);
      const questions = await examenBlancService.getRandomSubjectQuestions(
        examType, 
        examNumber, 
        category, 
        limit
      );
      
      // Convert to Question format
      const convertedQuestions = questions.map(q => ({
        id: q.id,
        question_text: q.question_text,
        answer1: q.answer1,
        answer2: q.answer2,
        answer3: q.answer3,
        answer4: null,
        correct: q.correct,
        explanation: q.explanation,
        category: q.category,
        difficulty: q.difficulty,
        test_type: 'examen_blanc' as const,
        exam_type: examType,
        sub_category: null, // No sub-category for examen_blanc questions
        passage_id: null,
        ai_generated: true,
        unique_hash: '',
        question_pool: `${examType}_${q.category}_examen`,
        usage_count: 0,
        last_used: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is3Option: true // Mark as 3-option question for exam blanc
      }));

      console.log(`✅ Loaded ${convertedQuestions.length} pre-generated questions for ${category}`);
      
      // Debug: Log first question to see format
      if (convertedQuestions.length > 0) {
        console.log(`🔍 Sample question format:`, {
          id: convertedQuestions[0].id,
          question_text: convertedQuestions[0].question_text,
          answer1: convertedQuestions[0].answer1,
          answer2: convertedQuestions[0].answer2,
          answer3: convertedQuestions[0].answer3,
          correct: convertedQuestions[0].correct,
          is3Option: convertedQuestions[0].is3Option
        });
      }
      
      return convertedQuestions;

    } catch (error) {
      console.error('Error in getExamBlancQuestionsFromPreGenerated:', error);
      // Fallback to the original method
      console.log('   Falling back to database method...');
      return this.getExamBlancQuestions(category, examId, examType, limit);
    }
  }

  /**
   * Shuffles an array with a seed for deterministic randomization
   */
  private static shuffleArrayWithSeed<T>(array: T[], seed: number): T[] {
    const shuffled = [...array];
    let currentSeed = seed;
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      // Generate a pseudo-random number based on the seed
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      const j = Math.floor((currentSeed / 233280) * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }
}
