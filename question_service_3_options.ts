// Add this function to the QuestionService class

/**
 * Converts a 4-option question to 3-option format for exams
 * Ensures the correct answer is always included
 */
static convertTo3Options(question: Question): Question {
  try {
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
 * Gets questions for exams with 3-option format
 */
static async getExamQuestions(
  categories: ('ANG' | 'CG' | 'LOG')[],
  limitPerCategory: number = 20,
  examType?: 'CM' | 'CMS' | 'CS'
): Promise<Question[]> {
  try {
    const allQuestions: Question[] = [];

    for (const category of categories) {
      let query = supabase
        .from('questions')
        .select('*')
        .eq('category', category);

      if (examType) {
        query = query.eq('exam_type', examType);
      }

      const { data, error } = await query
        .limit(limitPerCategory * 2) // Get more to ensure we have enough
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`Error fetching questions for ${category}:`, error);
        continue;
      }

      const questions = data || [];
      
      // Convert to 3-option format
      const convertedQuestions = questions.map(q => this.convertTo3Options(q));
      
      // Shuffle and take the required number
      const shuffled = this.shuffleArray(convertedQuestions);
      const selected = shuffled.slice(0, limitPerCategory);
      
      allQuestions.push(...selected);
    }

    return allQuestions;
  } catch (error) {
    console.error('Error in getExamQuestions:', error);
    return [];
  }
}
