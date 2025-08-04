export interface Question {
  id: number;
  type: 'multiple-choice' | 'true-false' | 'fill-blank' | 'matching';
  question: string;
  options?: string[];
  correctAnswer: number | string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const generalKnowledgeQuestions: Question[] = [
  {
    id: 1,
    type: 'multiple-choice',
    question: "Quelle est la capitale de l'Australie ?",
    options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'],
    correctAnswer: 2,
    explanation: "Canberra est la capitale de l'Australie depuis 1913.",
    difficulty: 'easy'
  },
  {
    id: 2,
    type: 'true-false',
    question: "La France a plus de fuseaux horaires que tout autre pays au monde.",
    correctAnswer: 'true',
    explanation: "La France a 12 fuseaux horaires grâce à ses territoires d'outre-mer.",
    difficulty: 'medium'
  },
  {
    id: 3,
    type: 'multiple-choice',
    question: "Qui a écrit 'Les Misérables' ?",
    options: ['Émile Zola', 'Victor Hugo', 'Gustave Flaubert', 'Alexandre Dumas'],
    correctAnswer: 1,
    explanation: "Victor Hugo a publié 'Les Misérables' en 1862.",
    difficulty: 'easy'
  },
  {
    id: 4,
    type: 'multiple-choice',
    question: "Quelle est la plus haute montagne d'Europe ?",
    options: ['Mont Blanc', 'Mont Elbrouz', 'Cervin', 'Mont Rose'],
    correctAnswer: 1,
    explanation: "Le mont Elbrouz dans le Caucase culmine à 5 642 mètres.",
    difficulty: 'medium'
  },
  {
    id: 5,
    type: 'true-false',
    question: "L'Union européenne compte actuellement 28 pays membres.",
    correctAnswer: 'false',
    explanation: "Depuis le Brexit, l'UE compte 27 pays membres.",
    difficulty: 'easy'
  },
  {
    id: 6,
    type: 'multiple-choice',
    question: "Quel fleuve traverse Paris ?",
    options: ['La Loire', 'Le Rhône', 'La Seine', 'La Garonne'],
    correctAnswer: 2,
    explanation: "La Seine traverse Paris d'est en ouest.",
    difficulty: 'easy'
  },
  {
    id: 7,
    type: 'multiple-choice',
    question: "En quelle année a eu lieu la chute du mur de Berlin ?",
    options: ['1987', '1989', '1991', '1993'],
    correctAnswer: 1,
    explanation: "Le mur de Berlin est tombé le 9 novembre 1989.",
    difficulty: 'medium'
  },
  {
    id: 8,
    type: 'true-false',
    question: "Le Japon est composé de plus de 6000 îles.",
    correctAnswer: 'true',
    explanation: "Le Japon compte environ 6 852 îles.",
    difficulty: 'hard'
  },
  {
    id: 9,
    type: 'multiple-choice',
    question: "Qui a peint 'La Joconde' ?",
    options: ['Michel-Ange', 'Léonard de Vinci', 'Raphaël', 'Donatello'],
    correctAnswer: 1,
    explanation: "Léonard de Vinci a peint La Joconde entre 1503 et 1519.",
    difficulty: 'easy'
  },
  {
    id: 10,
    type: 'multiple-choice',
    question: "Quelle est la devise de la République française ?",
    options: ['Liberté, Égalité, Fraternité', 'Honneur et Patrie', 'Dieu et mon Droit', 'Un pour tous, tous pour un'],
    correctAnswer: 0,
    explanation: "Cette devise date de la Révolution française.",
    difficulty: 'easy'
  }
];

export const englishQuestions: Question[] = [
  {
    id: 1,
    type: 'multiple-choice',
    question: "What is the capital of England?",
    options: ['Manchester', 'Liverpool', 'London', 'Birmingham'],
    correctAnswer: 2,
    explanation: "London is the capital and largest city of England.",
    difficulty: 'easy'
  },
  {
    id: 2,
    type: 'true-false',
    question: "The United States has 50 states.",
    correctAnswer: 'true',
    explanation: "The United States has 50 states, including Alaska and Hawaii.",
    difficulty: 'easy'
  },
  {
    id: 3,
    type: 'multiple-choice',
    question: "Which of these is a programming language?",
    options: ['HTML', 'CSS', 'JavaScript', 'All of the above'],
    correctAnswer: 2,
    explanation: "JavaScript is a programming language, while HTML and CSS are markup languages.",
    difficulty: 'medium'
  },
  {
    id: 4,
    type: 'multiple-choice',
    question: "What is the largest planet in our solar system?",
    options: ['Earth', 'Mars', 'Jupiter', 'Saturn'],
    correctAnswer: 2,
    explanation: "Jupiter is the largest planet in our solar system.",
    difficulty: 'easy'
  },
  {
    id: 5,
    type: 'true-false',
    question: "The Great Wall of China is visible from space with the naked eye.",
    correctAnswer: 'false',
    explanation: "This is a common myth. The Great Wall is not visible from space with the naked eye.",
    difficulty: 'medium'
  }
];

export const logicQuestions: Question[] = [
  {
    id: 1,
    type: 'multiple-choice',
    question: "If all roses are flowers and some flowers are red, can we conclude that some roses are red?",
    options: ['Yes, always', 'No, never', 'Sometimes', 'Not necessarily'],
    correctAnswer: 3,
    explanation: "We cannot make this conclusion based on the given premises.",
    difficulty: 'medium'
  },
  {
    id: 2,
    type: 'true-false',
    question: "A square is always a rectangle.",
    correctAnswer: 'true',
    explanation: "A square is a special type of rectangle where all sides are equal.",
    difficulty: 'easy'
  },
  {
    id: 3,
    type: 'multiple-choice',
    question: "What comes next in the sequence: 2, 4, 8, 16, ...?",
    options: ['20', '24', '32', '30'],
    correctAnswer: 2,
    explanation: "Each number is multiplied by 2 to get the next number.",
    difficulty: 'easy'
  },
  {
    id: 4,
    type: 'multiple-choice',
    question: "If it rains, the ground gets wet. The ground is wet. Therefore, it rained.",
    options: ['Valid argument', 'Invalid argument', 'Cannot determine'],
    correctAnswer: 1,
    explanation: "This is a logical fallacy. The ground could be wet for other reasons.",
    difficulty: 'medium'
  },
  {
    id: 5,
    type: 'true-false',
    question: "All triangles have three sides.",
    correctAnswer: 'true',
    explanation: "By definition, a triangle is a polygon with exactly three sides.",
    difficulty: 'easy'
  }
];

import { QuestionService } from '../services/questionService';

export const getQuestionsBySubject = async (subject: string, examType?: 'CM' | 'CMS' | 'CS'): Promise<Question[]> => {
  try {
    let category: 'ANG' | 'CG' | 'LOG';
    
    switch (subject) {
      case 'culture-generale':
        category = 'CG';
        break;
      case 'english':
        category = 'ANG';
        break;
      case 'logique':
        category = 'LOG';
        break;
      default:
        return [];
    }
    
    // Add cache-busting by including current timestamp
    console.log(`🔄 Fetching fresh questions for ${category} at ${new Date().toISOString()}`);
    
    // Get questions from database with exam type filtering - limit to 10 for practice
    const dbQuestions = await QuestionService.getRandomQuestions(category, 10, examType);
    
    // Convert database questions to the expected format
    return dbQuestions.map((dbQ, index) => {
      // Determine type
      let type: 'multiple-choice' | 'true-false' = 'multiple-choice';
      let options: string[] | undefined = undefined;
      let correctAnswer: number | string = 0;
      
      if (
        dbQ.answer1 && dbQ.answer2 && dbQ.answer3 && dbQ.answer4
      ) {
        type = 'multiple-choice';
        options = [dbQ.answer1, dbQ.answer2, dbQ.answer3, dbQ.answer4];
        
        // All correct answers should now be in letter format (A, B, C, D)
        correctAnswer = dbQ.correct === 'A' ? 0 :
                        dbQ.correct === 'B' ? 1 :
                        dbQ.correct === 'C' ? 2 :
                        dbQ.correct === 'D' ? 3 : 0;
      } else if (
        dbQ.answer1 && dbQ.answer2 && !dbQ.answer3 && !dbQ.answer4
      ) {
        type = 'true-false';
        options = [dbQ.answer1, dbQ.answer2];
        correctAnswer = dbQ.correct?.toLowerCase() === 'true' ? 'true' : 'false';
      } else {
        // Handle cases where some answers might be null or "null" string
        const allOptions = [dbQ.answer1, dbQ.answer2, dbQ.answer3, dbQ.answer4];
        const validOptions = allOptions.filter(option => option && option !== 'null' && option !== null);
        
        type = 'multiple-choice';
        options = validOptions;
        
        // Find the correct answer by matching the original letter position
        let correctIndex = 0;
        if (dbQ.correct === 'A' && allOptions[0] && allOptions[0] !== 'null') {
          correctIndex = validOptions.indexOf(allOptions[0]);
        } else if (dbQ.correct === 'B' && allOptions[1] && allOptions[1] !== 'null') {
          correctIndex = validOptions.indexOf(allOptions[1]);
        } else if (dbQ.correct === 'C' && allOptions[2] && allOptions[2] !== 'null') {
          correctIndex = validOptions.indexOf(allOptions[2]);
        } else if (dbQ.correct === 'D' && allOptions[3] && allOptions[3] !== 'null') {
          correctIndex = validOptions.indexOf(allOptions[3]);
        }
        
        correctAnswer = correctIndex >= 0 ? correctIndex : 0;
      }
      
      return {
        id: index + 1,
        type,
        question: dbQ.question_text,
        options,
        correctAnswer,
        explanation: (() => {
          // Get the correct answer text for the explanation
          let correctAnswerText = '';
          if (type === 'multiple-choice' && typeof correctAnswer === 'number') {
            correctAnswerText = options?.[correctAnswer] || '';
          } else if (type === 'true-false') {
            correctAnswerText = String(correctAnswer);
          } else {
            correctAnswerText = String(correctAnswer);
          }
          return `La réponse correcte est ${correctAnswerText}. Cette question teste votre compréhension du sujet.`;
        })(),
        difficulty: dbQ.difficulty || 'medium'
      };
    });
  } catch (error) {
    console.error('Error fetching questions from database:', error);
    // Fallback to hardcoded questions - limit to 10
    switch (subject) {
      case 'culture-generale':
        return generalKnowledgeQuestions.slice(0, 10);
      case 'english':
        return englishQuestions.slice(0, 10);
      case 'logique':
        return logicQuestions.slice(0, 10);
      default:
        return [];
    }
  }
}; 