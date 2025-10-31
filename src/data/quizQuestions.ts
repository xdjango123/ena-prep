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
    explanation: "L'Union européenne compte actuellement 27 pays membres après le Brexit.",
    difficulty: 'easy'
  },
  {
    id: 6,
    type: 'multiple-choice',
    question: "Quel est le plus grand océan du monde ?",
    options: ['Atlantique', 'Pacifique', 'Indien', 'Arctique'],
    correctAnswer: 1,
    explanation: "L'océan Pacifique est le plus grand océan du monde.",
    difficulty: 'easy'
  },
  {
    id: 7,
    type: 'multiple-choice',
    question: "Qui a peint 'La Joconde' ?",
    options: ['Michel-Ange', 'Raphaël', 'Léonard de Vinci', 'Botticelli'],
    correctAnswer: 2,
    explanation: "Léonard de Vinci a peint 'La Joconde' entre 1503 et 1519.",
    difficulty: 'easy'
  },
  {
    id: 8,
    type: 'true-false',
    question: "Le Nil est le plus long fleuve du monde.",
    correctAnswer: 'false',
    explanation: "L'Amazone est le plus long fleuve du monde avec 6 400 km.",
    difficulty: 'medium'
  },
  {
    id: 9,
    type: 'multiple-choice',
    question: "Quel est le symbole chimique de l'or ?",
    options: ['Au', 'Ag', 'Or', 'Go'],
    correctAnswer: 0,
    explanation: "Le symbole chimique de l'or est Au (du latin 'aurum').",
    difficulty: 'medium'
  },
  {
    id: 10,
    type: 'multiple-choice',
    question: "Qui a écrit '1984' ?",
    options: ['Aldous Huxley', 'George Orwell', 'Ray Bradbury', 'H.G. Wells'],
    correctAnswer: 1,
    explanation: "George Orwell a publié '1984' en 1949.",
    difficulty: 'easy'
  }
];

export const englishQuestions: Question[] = [
  {
    id: 1,
    type: 'multiple-choice',
    question: "What is the past tense of 'go'?",
    options: ['goed', 'went', 'gone', 'going'],
    correctAnswer: 1,
    explanation: "The past tense of 'go' is 'went'.",
    difficulty: 'easy'
  },
  {
    id: 2,
    type: 'true-false',
    question: "The word 'beautiful' is an adjective.",
    correctAnswer: 'true',
    explanation: "'Beautiful' is an adjective that describes a noun.",
    difficulty: 'easy'
  },
  {
    id: 3,
    type: 'multiple-choice',
    question: "Which word is a synonym for 'happy'?",
    options: ['sad', 'angry', 'joyful', 'tired'],
    correctAnswer: 2,
    explanation: "'Joyful' is a synonym for 'happy'.",
    difficulty: 'easy'
  },
  {
    id: 4,
    type: 'multiple-choice',
    question: "What is the plural of 'child'?",
    options: ['childs', 'children', 'childes', 'child'],
    correctAnswer: 1,
    explanation: "The plural of 'child' is 'children'.",
    difficulty: 'easy'
  },
  {
    id: 5,
    type: 'true-false',
    question: "The word 'quickly' is an adverb.",
    correctAnswer: 'true',
    explanation: "'Quickly' is an adverb that modifies a verb.",
    difficulty: 'easy'
  }
];

export const logicQuestions: Question[] = [
  {
    id: 1,
    type: 'multiple-choice',
    question: "Si tous les chats sont des animaux et que Minou est un chat, alors Minou est un animal.",
    options: ['Vrai', 'Faux', 'Indéterminé', 'Impossible à dire'],
    correctAnswer: 0,
    explanation: "C'est un syllogisme valide : si A=B et B=C, alors A=C.",
    difficulty: 'easy'
  },
  {
    id: 2,
    type: 'multiple-choice',
    question: "Quel est le nombre manquant dans la série : 2, 4, 8, 16, ?",
    options: ['24', '32', '20', '28'],
    correctAnswer: 1,
    explanation: "La série suit le pattern : chaque nombre est le double du précédent (2×2=4, 4×2=8, 8×2=16, 16×2=32).",
    difficulty: 'medium'
  },
  {
    id: 3,
    type: 'true-false',
    question: "Si A > B et B > C, alors A > C.",
    correctAnswer: 'true',
    explanation: "C'est la propriété de transitivité : si A > B et B > C, alors A > C.",
    difficulty: 'easy'
  },
  {
    id: 4,
    type: 'multiple-choice',
    question: "Dans une classe de 30 élèves, 18 aiment les maths et 12 aiment l'histoire. Si 8 aiment les deux, combien n'aiment ni les maths ni l'histoire ?",
    options: ['2', '4', '6', '8'],
    correctAnswer: 3,
    explanation: "Avec le principe d'inclusion-exclusion : 30 - (18 + 12 - 8) = 30 - 22 = 8.",
    difficulty: 'hard'
  },
  {
    id: 5,
    type: 'multiple-choice',
    question: "Si P implique Q et que Q est faux, que peut-on dire de P ?",
    options: ['P est vrai', 'P est faux', 'P peut être vrai ou faux', 'On ne peut rien dire'],
    correctAnswer: 1,
    explanation: "Si Q est faux et que P implique Q, alors P doit être faux (modus tollens).",
    difficulty: 'hard'
  }
];

// Import the QuestionService
import { QuestionService } from '../services/questionService';

export const getQuestionsBySubject = async (subject: string, examType?: 'CM' | 'CMS' | 'CS', testNumber?: number): Promise<Question[]> => {
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
    
    // Log the mode we're in with clear indicators
    if (testNumber !== undefined) {
      console.log(`🎯 PRACTICE TEST MODE: Loading questions for ${category}, test #${testNumber}`);
      console.log(`   → This will ensure different questions from other practice tests`);
      console.log(`   → Exam type: ${examType || 'ALL'}`);
    } else {
      console.log(`📅 DAILY QUIZ MODE: Loading questions for ${category}`);
      console.log(`   → Questions will change daily, same questions throughout the day`);
      console.log(`   → Exam type: ${examType || 'ALL'}`);
    }
    
    // Get questions from database with proper seeding
    // - For practice tests: pass testNumber and examType to ensure different questions per test
    // - For daily quizzes: don't pass testNumber so it uses daily date seeding, but still filter by examType
    const dbQuestions = await QuestionService.getRandomQuestions(category, 10, undefined, testNumber, examType);
    
    if (!dbQuestions || dbQuestions.length === 0) {
      console.warn(`⚠️ No questions returned for ${category}`);
      return [];
    }
    
    // Log the results with clear mode indication
    if (testNumber !== undefined) {
      console.log(`✅ PRACTICE TEST: Successfully fetched ${dbQuestions.length} questions for ${category} (test #${testNumber})`);
    } else {
      console.log(`✅ DAILY QUIZ: Successfully fetched ${dbQuestions.length} questions for ${category} (daily rotation)`);
    }
    
    // Convert database questions to the expected format
    return dbQuestions.map((dbQ, index) => {
      // Determine type
      let type: 'multiple-choice' | 'true-false' = 'multiple-choice';
      let options: string[] | undefined = undefined;
      let correctAnswer: number | string = 0;
      
      // Check if we have 4 valid answers (multiple choice)
      const allAnswers = [dbQ.answer1, dbQ.answer2, dbQ.answer3, dbQ.answer4];
      const validAnswers = allAnswers.filter(answer => answer && answer !== 'null' && answer !== null);
      
      if (validAnswers.length >= 4) {
        type = 'multiple-choice';
        options = validAnswers;
        
        // Convert letter to index
        correctAnswer = dbQ.correct === 'A' ? 0 :
                        dbQ.correct === 'B' ? 1 :
                        dbQ.correct === 'C' ? 2 :
                        dbQ.correct === 'D' ? 3 : 0;
      } else if (validAnswers.length === 2) {
        type = 'true-false';
        options = validAnswers;
        correctAnswer = dbQ.correct?.toLowerCase() === 'true' ? 'true' : 'false';
      } else {
        // Fallback: use available answers as multiple choice
        type = 'multiple-choice';
        options = validAnswers;
        
        // Find the correct answer by matching the original letter position
        let correctIndex = 0;
        if (dbQ.correct === 'A' && allAnswers[0] && allAnswers[0] !== 'null') {
          correctIndex = validAnswers.indexOf(allAnswers[0]);
        } else if (dbQ.correct === 'B' && allAnswers[1] && allAnswers[1] !== 'null') {
          correctIndex = validAnswers.indexOf(allAnswers[1]);
        } else if (dbQ.correct === 'C' && allAnswers[2] && allAnswers[2] !== 'null') {
          correctIndex = validAnswers.indexOf(allAnswers[2]);
        } else if (dbQ.correct === 'D' && allAnswers[3] && allAnswers[3] !== 'null') {
          correctIndex = validAnswers.indexOf(allAnswers[3]);
        }
        
        correctAnswer = correctIndex >= 0 ? correctIndex : 0;
      }
      
      return {
        id: parseInt(dbQ.id.replace(/-/g, '').substring(0, 8), 16) || index + 1, // Convert UUID to number
        type,
        question: dbQ.question_text,
        options,
        correctAnswer,
        explanation: (dbQ as any).explanation || `La réponse correcte est ${options?.[correctAnswer as number] || correctAnswer}.`,
        difficulty: dbQ.difficulty || 'medium'
      };
    });
  } catch (error) {
    console.error('❌ Error in getQuestionsBySubject:', error);
    return [];
  }
};
