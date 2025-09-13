// Add these functions to the QuestionService class in questionService.ts

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
