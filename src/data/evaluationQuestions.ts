import { EvaluationQuestion } from '../types';

export const evaluationQuestions: EvaluationQuestion[] = [
  // Anglais (5 questions)
  {
    id: 'eng_1',
    subject: 'anglais',
    difficulty: 'CM',
    question: 'Choose the correct translation of "gouvernement"',
    options: ['Government', 'Governor', 'Governance', 'Governing'],
    correctAnswer: 0,
    explanation: 'Government is the correct translation of "gouvernement"'
  },
  {
    id: 'eng_2',
    subject: 'anglais',
    difficulty: 'CMS',
    question: 'Which sentence is grammatically correct?',
    options: [
      'The legislation were passed yesterday',
      'The legislation was passed yesterday',
      'The legislations was passed yesterday',
      'The legislations were passed yesterday'
    ],
    correctAnswer: 1,
    explanation: '"Legislation" is uncountable, so it takes "was"'
  },
  {
    id: 'eng_3',
    subject: 'anglais',
    difficulty: 'CS',
    question: 'What does "to implement a policy" mean?',
    options: [
      'To create a policy',
      'To criticize a policy',
      'To put a policy into practice',
      'To cancel a policy'
    ],
    correctAnswer: 2,
    explanation: 'Implement means to put into practice or execute'
  },
  {
    id: 'eng_4',
    subject: 'anglais',
    difficulty: 'CM',
    question: 'Complete: "The president _____ elected every five years"',
    options: ['is', 'are', 'was', 'were'],
    correctAnswer: 0,
    explanation: 'Present tense, singular subject requires "is"'
  },
  {
    id: 'eng_5',
    subject: 'anglais',
    difficulty: 'CMS',
    question: 'Choose the best synonym for "to enhance"',
    options: ['to reduce', 'to improve', 'to maintain', 'to eliminate'],
    correctAnswer: 1,
    explanation: 'Enhance means to improve or make better'
  },

  // Culture Générale (5 questions)
  {
    id: 'cg_1',
    subject: 'cultureGenerale',
    difficulty: 'CM',
    question: 'Qui est le président de la République française actuel ?',
    options: ['Emmanuel Macron', 'François Hollande', 'Nicolas Sarkozy', 'Jacques Chirac'],
    correctAnswer: 0,
    explanation: 'Emmanuel Macron est président depuis 2017'
  },
  {
    id: 'cg_2',
    subject: 'cultureGenerale',
    difficulty: 'CMS',
    question: 'Quelle institution européenne siège à Strasbourg ?',
    options: ['Commission européenne', 'Conseil européen', 'Parlement européen', 'Cour de justice'],
    correctAnswer: 2,
    explanation: 'Le Parlement européen tient ses sessions plénières à Strasbourg'
  },
  {
    id: 'cg_3',
    subject: 'cultureGenerale',
    difficulty: 'CS',
    question: 'Quel principe régit la séparation des pouvoirs selon Montesquieu ?',
    options: [
      'Un seul pouvoir concentré',
      'Deux pouvoirs équilibrés',
      'Trois pouvoirs distincts et équilibrés',
      'Quatre pouvoirs indépendants'
    ],
    correctAnswer: 2,
    explanation: 'Montesquieu théorise la séparation en trois pouvoirs : exécutif, législatif, judiciaire'
  },
  {
    id: 'cg_4',
    subject: 'cultureGenerale',
    difficulty: 'CM',
    question: 'Dans quelle ville se trouve le siège de l\'UNESCO ?',
    options: ['New York', 'Genève', 'Paris', 'Londres'],
    correctAnswer: 2,
    explanation: 'Le siège de l\'UNESCO est à Paris'
  },
  {
    id: 'cg_5',
    subject: 'cultureGenerale',
    difficulty: 'CMS',
    question: 'Qu\'est-ce que le PIB ?',
    options: [
      'Produit Intérieur Brut',
      'Programme d\'Investissement Budgétaire',
      'Politique Internationale Bilatérale',
      'Plan d\'Intégration Bancaire'
    ],
    correctAnswer: 0,
    explanation: 'PIB signifie Produit Intérieur Brut, indicateur économique majeur'
  },

  // Logique (5 questions)
  {
    id: 'log_1',
    subject: 'logique',
    difficulty: 'CM',
    question: 'Si tous les A sont B, et tous les B sont C, alors :',
    options: [
      'Tous les C sont A',
      'Tous les A sont C',
      'Certains C sont A',
      'Aucune conclusion possible'
    ],
    correctAnswer: 1,
    explanation: 'Par transitivité logique : A→B et B→C donc A→C'
  },
  {
    id: 'log_2',
    subject: 'logique',
    difficulty: 'CMS',
    question: 'Quelle est la suite logique : 2, 6, 18, 54, ?',
    options: ['108', '162', '216', '270'],
    correctAnswer: 1,
    explanation: 'Chaque terme est multiplié par 3 : 54 × 3 = 162'
  },
  {
    id: 'log_3',
    subject: 'logique',
    difficulty: 'CS',
    question: 'Dans un groupe de 100 personnes, 60 parlent français, 50 parlent anglais, 30 parlent les deux. Combien ne parlent aucune de ces langues ?',
    options: ['10', '20', '30', '40'],
    correctAnswer: 1,
    explanation: 'Français seulement: 30, Anglais seulement: 20, Les deux: 30. Total: 80. Donc 20 ne parlent aucune langue.'
  },
  {
    id: 'log_4',
    subject: 'logique',
    difficulty: 'CM',
    question: 'Si Pierre est plus grand que Paul, et Paul est plus grand que Jean, qui est le plus petit ?',
    options: ['Pierre', 'Paul', 'Jean', 'Impossible à déterminer'],
    correctAnswer: 2,
    explanation: 'Jean est le plus petit selon l\'ordre établi'
  },
  {
    id: 'log_5',
    subject: 'logique',
    difficulty: 'CMS',
    question: 'Complétez la série : A1, C3, E5, G7, ?',
    options: ['H8', 'I9', 'J10', 'K11'],
    correctAnswer: 1,
    explanation: 'Lettres impaires de l\'alphabet avec leur position : I est la 9ème lettre'
  }
]; 