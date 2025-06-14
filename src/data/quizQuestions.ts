interface Question {
  id: number;
  type: 'multiple-choice' | 'true-false' | 'fill-blank' | 'matching';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation?: string;
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
  },
  {
    id: 11,
    type: 'true-false',
    question: "L'Antarctique est le continent le plus sec de la planète.",
    correctAnswer: 'true',
    explanation: "L'Antarctique est techniquement un désert avec très peu de précipitations.",
    difficulty: 'medium'
  },
  {
    id: 12,
    type: 'multiple-choice',
    question: "Combien de régions compte la France métropolitaine ?",
    options: ['12', '13', '14', '15'],
    correctAnswer: 1,
    explanation: "La France métropolitaine compte 13 régions depuis la réforme de 2016.",
    difficulty: 'medium'
  },
  {
    id: 13,
    type: 'multiple-choice',
    question: "Quel est le plus long fleuve du monde ?",
    options: ['Amazone', 'Nil', 'Yangtsé', 'Mississippi'],
    correctAnswer: 1,
    explanation: "Le Nil mesure environ 6 650 km de long.",
    difficulty: 'easy'
  },
  {
    id: 14,
    type: 'true-false',
    question: "La Grande Muraille de Chine est visible depuis l'espace.",
    correctAnswer: 'false',
    explanation: "C'est un mythe populaire, mais elle n'est pas visible à l'œil nu depuis l'espace.",
    difficulty: 'medium'
  },
  {
    id: 15,
    type: 'multiple-choice',
    question: "Qui était le premier président de la Ve République française ?",
    options: ['François Mitterrand', 'Charles de Gaulle', 'Georges Pompidou', 'Valéry Giscard d\'Estaing'],
    correctAnswer: 1,
    explanation: "Charles de Gaulle a été président de 1959 à 1969.",
    difficulty: 'easy'
  },
  {
    id: 16,
    type: 'multiple-choice',
    question: "Quelle est la plus petite planète du système solaire ?",
    options: ['Vénus', 'Mars', 'Mercure', 'Pluton'],
    correctAnswer: 2,
    explanation: "Mercure est la plus petite planète avec un diamètre de 4 879 km.",
    difficulty: 'medium'
  },
  {
    id: 17,
    type: 'true-false',
    question: "L'Everest grandit chaque année.",
    correctAnswer: 'true',
    explanation: "L'Everest grandit d'environ 4 mm par an à cause de la tectonique des plaques.",
    difficulty: 'hard'
  },
  {
    id: 18,
    type: 'multiple-choice',
    question: "Dans quel pays se trouve Machu Picchu ?",
    options: ['Bolivie', 'Pérou', 'Équateur', 'Colombie'],
    correctAnswer: 1,
    explanation: "Machu Picchu se trouve au Pérou, dans la région de Cusco.",
    difficulty: 'easy'
  },
  {
    id: 19,
    type: 'multiple-choice',
    question: "Combien de pays bordent la France ?",
    options: ['6', '7', '8', '9'],
    correctAnswer: 2,
    explanation: "La France partage ses frontières avec 8 pays.",
    difficulty: 'medium'
  },
  {
    id: 20,
    type: 'true-false',
    question: "Le français est la langue officielle de plus de 25 pays.",
    correctAnswer: 'true',
    explanation: "Le français est langue officielle dans 29 pays.",
    difficulty: 'medium'
  },
  {
    id: 21,
    type: 'multiple-choice',
    question: "Quelle révolution a eu lieu en 1789 ?",
    options: ['Révolution industrielle', 'Révolution française', 'Révolution américaine', 'Révolution russe'],
    correctAnswer: 1,
    explanation: "La Révolution française a commencé en 1789.",
    difficulty: 'easy'
  },
  {
    id: 22,
    type: 'multiple-choice',
    question: "Quel océan borde la côte ouest de l'Afrique ?",
    options: ['Océan Indien', 'Océan Atlantique', 'Océan Pacifique', 'Océan Arctique'],
    correctAnswer: 1,
    explanation: "L'océan Atlantique borde la côte ouest de l'Afrique.",
    difficulty: 'easy'
  },
  {
    id: 23,
    type: 'true-false',
    question: "La Suisse fait partie de l'Union européenne.",
    correctAnswer: 'false',
    explanation: "La Suisse n'est pas membre de l'UE mais entretient des relations étroites.",
    difficulty: 'easy'
  },
  {
    id: 24,
    type: 'multiple-choice',
    question: "Combien de continents y a-t-il ?",
    options: ['5', '6', '7', '8'],
    correctAnswer: 2,
    explanation: "Il y a 7 continents : Afrique, Antarctique, Asie, Europe, Amérique du Nord, Océanie, Amérique du Sud.",
    difficulty: 'easy'
  },
  {
    id: 25,
    type: 'multiple-choice',
    question: "Quelle est la monnaie du Royaume-Uni ?",
    options: ['Euro', 'Livre sterling', 'Dollar', 'Couronne'],
    correctAnswer: 1,
    explanation: "La livre sterling est la monnaie officielle du Royaume-Uni.",
    difficulty: 'easy'
  }
];

export const mathQuestions: Question[] = [
  {
    id: 1,
    type: 'multiple-choice',
    question: "Combien font 15% de 200 ?",
    options: ['25', '30', '35', '40'],
    correctAnswer: 1,
    explanation: "15% de 200 = 0,15 × 200 = 30",
    difficulty: 'easy'
  },
  {
    id: 2,
    type: 'multiple-choice',
    question: "Quelle est la racine carrée de 144 ?",
    options: ['11', '12', '13', '14'],
    correctAnswer: 1,
    explanation: "√144 = 12 car 12² = 144",
    difficulty: 'easy'
  },
  {
    id: 3,
    type: 'true-false',
    question: "Un triangle équilatéral a tous ses angles égaux à 60°.",
    correctAnswer: 'true',
    explanation: "Dans un triangle équilatéral, chaque angle mesure 180°/3 = 60°.",
    difficulty: 'easy'
  },
  {
    id: 4,
    type: 'multiple-choice',
    question: "Si x + 5 = 12, que vaut x ?",
    options: ['5', '6', '7', '8'],
    correctAnswer: 2,
    explanation: "x + 5 = 12, donc x = 12 - 5 = 7",
    difficulty: 'easy'
  },
  {
    id: 5,
    type: 'multiple-choice',
    question: "Combien y a-t-il de secondes dans une heure ?",
    options: ['3000', '3600', '4200', '4800'],
    correctAnswer: 1,
    explanation: "1 heure = 60 minutes × 60 secondes = 3600 secondes",
    difficulty: 'easy'
  },
  {
    id: 6,
    type: 'true-false',
    question: "Le nombre π (pi) est égal à 3,14159...",
    correctAnswer: 'true',
    explanation: "π ≈ 3,14159265359... est un nombre irrationnel.",
    difficulty: 'easy'
  },
  {
    id: 7,
    type: 'multiple-choice',
    question: "Quelle est l'aire d'un carré de côté 8 cm ?",
    options: ['32 cm²', '64 cm²', '16 cm²', '48 cm²'],
    correctAnswer: 1,
    explanation: "Aire = côté² = 8² = 64 cm²",
    difficulty: 'easy'
  },
  {
    id: 8,
    type: 'multiple-choice',
    question: "Combien font 2³ ?",
    options: ['6', '8', '9', '12'],
    correctAnswer: 1,
    explanation: "2³ = 2 × 2 × 2 = 8",
    difficulty: 'easy'
  },
  {
    id: 9,
    type: 'true-false',
    question: "0 est un nombre pair.",
    correctAnswer: 'true',
    explanation: "0 est divisible par 2, donc c'est un nombre pair.",
    difficulty: 'medium'
  },
  {
    id: 10,
    type: 'multiple-choice',
    question: "Quelle est la médiane de : 3, 7, 9, 12, 15 ?",
    options: ['7', '9', '10', '12'],
    correctAnswer: 1,
    explanation: "La médiane est la valeur centrale : 9",
    difficulty: 'medium'
  },
  {
    id: 11,
    type: 'multiple-choice',
    question: "Si un produit coûte 80€ avec une réduction de 25%, quel était son prix initial ?",
    options: ['100€', '105€', '106,67€', '120€'],
    correctAnswer: 2,
    explanation: "Prix initial × 0,75 = 80€, donc prix initial = 80/0,75 = 106,67€",
    difficulty: 'medium'
  },
  {
    id: 12,
    type: 'true-false',
    question: "La somme des angles d'un triangle est toujours 180°.",
    correctAnswer: 'true',
    explanation: "C'est une propriété fondamentale des triangles en géométrie euclidienne.",
    difficulty: 'easy'
  },
  {
    id: 13,
    type: 'multiple-choice',
    question: "Combien font (-3) × (-4) ?",
    options: ['-12', '12', '-7', '7'],
    correctAnswer: 1,
    explanation: "Le produit de deux nombres négatifs est positif : (-3) × (-4) = 12",
    difficulty: 'easy'
  },
  {
    id: 14,
    type: 'multiple-choice',
    question: "Quelle est la circonférence d'un cercle de rayon 5 cm ? (π ≈ 3,14)",
    options: ['31,4 cm', '15,7 cm', '78,5 cm', '25 cm'],
    correctAnswer: 0,
    explanation: "Circonférence = 2πr = 2 × 3,14 × 5 = 31,4 cm",
    difficulty: 'medium'
  },
  {
    id: 15,
    type: 'true-false',
    question: "Un nombre premier n'a que deux diviseurs : 1 et lui-même.",
    correctAnswer: 'true',
    explanation: "C'est la définition d'un nombre premier.",
    difficulty: 'easy'
  },
  {
    id: 16,
    type: 'multiple-choice',
    question: "Quelle est la solution de l'équation 2x - 6 = 10 ?",
    options: ['6', '7', '8', '9'],
    correctAnswer: 2,
    explanation: "2x - 6 = 10, donc 2x = 16, donc x = 8",
    difficulty: 'medium'
  },
  {
    id: 17,
    type: 'multiple-choice',
    question: "Combien de faces a un cube ?",
    options: ['4', '6', '8', '12'],
    correctAnswer: 1,
    explanation: "Un cube a 6 faces carrées.",
    difficulty: 'easy'
  },
  {
    id: 18,
    type: 'true-false',
    question: "La probabilité de tirer pile avec une pièce équilibrée est de 50%.",
    correctAnswer: 'true',
    explanation: "Il y a 2 résultats possibles équiprobables, donc P(pile) = 1/2 = 50%.",
    difficulty: 'easy'
  },
  {
    id: 19,
    type: 'multiple-choice',
    question: "Quelle est la moyenne de : 10, 15, 20, 25 ?",
    options: ['15', '17,5', '20', '22,5'],
    correctAnswer: 1,
    explanation: "Moyenne = (10+15+20+25)/4 = 70/4 = 17,5",
    difficulty: 'easy'
  },
  {
    id: 20,
    type: 'multiple-choice',
    question: "Si f(x) = 2x + 3, que vaut f(4) ?",
    options: ['8', '9', '10', '11'],
    correctAnswer: 3,
    explanation: "f(4) = 2(4) + 3 = 8 + 3 = 11",
    difficulty: 'medium'
  },
  {
    id: 21,
    type: 'true-false',
    question: "Le volume d'un cube de côté 3 cm est 27 cm³.",
    correctAnswer: 'true',
    explanation: "Volume = côté³ = 3³ = 27 cm³",
    difficulty: 'easy'
  },
  {
    id: 22,
    type: 'multiple-choice',
    question: "Combien font 7! (factorielle de 7) ?",
    options: ['49', '343', '5040', '40320'],
    correctAnswer: 2,
    explanation: "7! = 7×6×5×4×3×2×1 = 5040",
    difficulty: 'hard'
  },
  {
    id: 23,
    type: 'multiple-choice',
    question: "Quelle est la pente d'une droite passant par (0,2) et (4,10) ?",
    options: ['2', '2,5', '3', '4'],
    correctAnswer: 0,
    explanation: "Pente = (10-2)/(4-0) = 8/4 = 2",
    difficulty: 'medium'
  },
  {
    id: 24,
    type: 'true-false',
    question: "Un angle de 90° est appelé un angle droit.",
    correctAnswer: 'true',
    explanation: "Un angle de 90° est effectivement un angle droit.",
    difficulty: 'easy'
  },
  {
    id: 25,
    type: 'multiple-choice',
    question: "Combien de diagonales a un hexagone ?",
    options: ['6', '9', '12', '15'],
    correctAnswer: 1,
    explanation: "Un hexagone a n(n-3)/2 = 6(6-3)/2 = 9 diagonales",
    difficulty: 'hard'
  }
];

export const englishQuestions: Question[] = [
  {
    id: 1,
    type: 'multiple-choice',
    question: "Choose the correct form: 'I _____ to London last year.'",
    options: ['go', 'went', 'have gone', 'going'],
    correctAnswer: 1,
    explanation: "'Went' is the past tense of 'go' and is correct for a completed action in the past.",
    difficulty: 'easy'
  },
  {
    id: 2,
    type: 'true-false',
    question: "'Their', 'there', and 'they're' are homophones.",
    correctAnswer: 'true',
    explanation: "Homophones are words that sound the same but have different meanings and spellings.",
    difficulty: 'easy'
  },
  {
    id: 3,
    type: 'multiple-choice',
    question: "What is the plural of 'child'?",
    options: ['childs', 'children', 'childes', 'child'],
    correctAnswer: 1,
    explanation: "'Children' is the irregular plural form of 'child'.",
    difficulty: 'easy'
  },
  {
    id: 4,
    type: 'multiple-choice',
    question: "Choose the correct sentence:",
    options: [
      'She don\'t like coffee',
      'She doesn\'t likes coffee',
      'She doesn\'t like coffee',
      'She not like coffee'
    ],
    correctAnswer: 2,
    explanation: "With third person singular, we use 'doesn't' + base form of the verb.",
    difficulty: 'easy'
  },
  {
    id: 5,
    type: 'true-false',
    question: "The word 'unique' can be modified by 'very' (very unique).",
    correctAnswer: 'false',
    explanation: "'Unique' means one of a kind, so it cannot be modified by degree adverbs like 'very'.",
    difficulty: 'medium'
  },
  {
    id: 6,
    type: 'multiple-choice',
    question: "What does 'procrastinate' mean?",
    options: [
      'To work quickly',
      'To delay or postpone',
      'To organize efficiently',
      'To complete early'
    ],
    correctAnswer: 1,
    explanation: "'Procrastinate' means to delay or postpone action.",
    difficulty: 'medium'
  },
  {
    id: 7,
    type: 'multiple-choice',
    question: "Choose the correct comparative form: 'This book is _____ than that one.'",
    options: ['more interesting', 'most interesting', 'interestinger', 'more interested'],
    correctAnswer: 0,
    explanation: "For adjectives with 3+ syllables, we use 'more + adjective' for comparatives.",
    difficulty: 'easy'
  },
  {
    id: 8,
    type: 'true-false',
    question: "'I could care less' means you don't care at all.",
    correctAnswer: 'false',
    explanation: "The correct expression is 'I couldn't care less' - meaning you care so little that you couldn't care any less.",
    difficulty: 'medium'
  },
  {
    id: 9,
    type: 'multiple-choice',
    question: "What is the past participle of 'break'?",
    options: ['breaked', 'broke', 'broken', 'breaking'],
    correctAnswer: 2,
    explanation: "'Broken' is the past participle of the irregular verb 'break'.",
    difficulty: 'easy'
  },
  {
    id: 10,
    type: 'multiple-choice',
    question: "Choose the correct preposition: 'I'm interested _____ learning French.'",
    options: ['in', 'on', 'at', 'for'],
    correctAnswer: 0,
    explanation: "We use 'interested in' when talking about having an interest in something.",
    difficulty: 'easy'
  },
  {
    id: 11,
    type: 'true-false',
    question: "'Affect' is a noun and 'effect' is a verb.",
    correctAnswer: 'false',
    explanation: "'Affect' is typically a verb (to influence) and 'effect' is typically a noun (a result).",
    difficulty: 'medium'
  },
  {
    id: 12,
    type: 'multiple-choice',
    question: "What does 'ubiquitous' mean?",
    options: [
      'Very rare',
      'Present everywhere',
      'Extremely large',
      'Completely invisible'
    ],
    correctAnswer: 1,
    explanation: "'Ubiquitous' means present, appearing, or found everywhere.",
    difficulty: 'hard'
  },
  {
    id: 13,
    type: 'multiple-choice',
    question: "Choose the correct form: 'If I _____ rich, I would travel the world.'",
    options: ['am', 'was', 'were', 'will be'],
    correctAnswer: 2,
    explanation: "In hypothetical conditionals, we use 'were' for all persons with 'if'.",
    difficulty: 'medium'
  },
  {
    id: 14,
    type: 'true-false',
    question: "'Who' is used for the subject and 'whom' is used for the object.",
    correctAnswer: 'true',
    explanation: "'Who' is the subject pronoun and 'whom' is the object pronoun.",
    difficulty: 'medium'
  },
  {
    id: 15,
    type: 'multiple-choice',
    question: "What is a synonym for 'meticulous'?",
    options: ['Careless', 'Detailed', 'Quick', 'Lazy'],
    correctAnswer: 1,
    explanation: "'Meticulous' means showing great attention to detail; very careful and precise.",
    difficulty: 'medium'
  },
  {
    id: 16,
    type: 'multiple-choice',
    question: "Choose the correct sentence:",
    options: [
      'Between you and I',
      'Between you and me',
      'Between you and myself',
      'Between you and mine'
    ],
    correctAnswer: 1,
    explanation: "After prepositions like 'between', we use object pronouns like 'me'.",
    difficulty: 'medium'
  },
  {
    id: 17,
    type: 'true-false',
    question: "'Irregardless' is a proper English word.",
    correctAnswer: 'false',
    explanation: "'Irregardless' is considered non-standard. The correct word is 'regardless'.",
    difficulty: 'medium'
  },
  {
    id: 18,
    type: 'multiple-choice',
    question: "What does 'serendipity' mean?",
    options: [
      'Bad luck',
      'Hard work',
      'Pleasant surprise',
      'Careful planning'
    ],
    correctAnswer: 2,
    explanation: "'Serendipity' means a pleasant surprise or fortunate accident.",
    difficulty: 'hard'
  },
  {
    id: 19,
    type: 'multiple-choice',
    question: "Choose the correct form: 'She has _____ three books this month.'",
    options: ['read', 'readed', 'red', 'reading'],
    correctAnswer: 0,
    explanation: "'Read' (pronounced 'red') is both the past tense and past participle of 'read'.",
    difficulty: 'easy'
  },
  {
    id: 20,
    type: 'true-false',
    question: "A dangling modifier is a grammatical error.",
    correctAnswer: 'true',
    explanation: "A dangling modifier is indeed a grammatical error where the modifier doesn't clearly relate to the word it's supposed to modify.",
    difficulty: 'hard'
  },
  {
    id: 21,
    type: 'multiple-choice',
    question: "What is the superlative form of 'bad'?",
    options: ['baddest', 'worse', 'worst', 'most bad'],
    correctAnswer: 2,
    explanation: "'Worst' is the irregular superlative form of 'bad'.",
    difficulty: 'easy'
  },
  {
    id: 22,
    type: 'multiple-choice',
    question: "Choose the correct article: '_____ university student'",
    options: ['A', 'An', 'The', 'No article needed'],
    correctAnswer: 0,
    explanation: "We use 'a' before words that begin with a consonant sound. 'University' starts with a 'y' sound.",
    difficulty: 'medium'
  },
  {
    id: 23,
    type: 'true-false',
    question: "'Literally' should only be used when something actually happened.",
    correctAnswer: 'true',
    explanation: "'Literally' means 'in a literal sense' and shouldn't be used for emphasis when speaking figuratively.",
    difficulty: 'medium'
  },
  {
    id: 24,
    type: 'multiple-choice',
    question: "What does 'ephemeral' mean?",
    options: [
      'Lasting forever',
      'Very short-lived',
      'Extremely beautiful',
      'Highly valuable'
    ],
    correctAnswer: 1,
    explanation: "'Ephemeral' means lasting for a very short time.",
    difficulty: 'hard'
  },
  {
    id: 25,
    type: 'multiple-choice',
    question: "Choose the correct form: 'Neither John nor Mary _____ coming.'",
    options: ['are', 'is', 'were', 'have'],
    correctAnswer: 1,
    explanation: "With 'neither...nor', the verb agrees with the subject closest to it. 'Mary' is singular, so we use 'is'.",
    difficulty: 'hard'
  }
];

export const frenchQuestions: Question[] = [
  {
    id: 1,
    type: 'multiple-choice',
    question: "Quel est le féminin de 'acteur' ?",
    options: ['acteure', 'actrice', 'acteuse', 'acteuresse'],
    correctAnswer: 1,
    explanation: "Le féminin d'acteur est actrice.",
    difficulty: 'easy'
  },
  {
    id: 2,
    type: 'true-false',
    question: "Le verbe 'aller' se conjugue avec l'auxiliaire 'être' au passé composé.",
    correctAnswer: 'true',
    explanation: "Le verbe 'aller' fait partie des verbes qui se conjuguent avec 'être'.",
    difficulty: 'easy'
  },
  {
    id: 3,
    type: 'multiple-choice',
    question: "Quelle est la bonne orthographe ?",
    options: ['Dévelopement', 'Développement', 'Développemant', 'Dévellopement'],
    correctAnswer: 1,
    explanation: "La bonne orthographe est 'développement' avec deux 'p'.",
    difficulty: 'medium'
  },
  {
    id: 4,
    type: 'multiple-choice',
    question: "Conjuguez 'finir' à la 3e personne du pluriel au présent :",
    options: ['ils finissent', 'ils finisent', 'ils finent', 'ils finissant'],
    correctAnswer: 0,
    explanation: "Les verbes du 2e groupe prennent '-issent' à la 3e personne du pluriel.",
    difficulty: 'easy'
  },
  {
    id: 5,
    type: 'true-false',
    question: "On écrit 'des chevaux' au pluriel de 'cheval'.",
    correctAnswer: 'true',
    explanation: "Les mots en '-al' font généralement leur pluriel en '-aux'.",
    difficulty: 'easy'
  },
  {
    id: 6,
    type: 'multiple-choice',
    question: "Quel est le participe passé de 'prendre' ?",
    options: ['prendé', 'prendu', 'pris', 'prenu'],
    correctAnswer: 2,
    explanation: "Le participe passé de 'prendre' est 'pris'.",
    difficulty: 'easy'
  },
  {
    id: 7,
    type: 'multiple-choice',
    question: "Choisissez la bonne phrase :",
    options: [
      'Je me rappelle de cette histoire',
      'Je me rappelle cette histoire',
      'Je me rappelle à cette histoire',
      'Je me rappelle sur cette histoire'
    ],
    correctAnswer: 1,
    explanation: "Le verbe 'se rappeler' est transitif direct : on se rappelle quelque chose.",
    difficulty: 'medium'
  },
  {
    id: 8,
    type: 'true-false',
    question: "L'accord du participe passé avec 'avoir' se fait toujours avec le sujet.",
    correctAnswer: 'false',
    explanation: "Avec 'avoir', l'accord se fait avec le COD s'il est placé avant le verbe.",
    difficulty: 'medium'
  },
  {
    id: 9,
    type: 'multiple-choice',
    question: "Quel est le subjonctif présent de 'être' à la 1re personne du singulier ?",
    options: ['que je sois', 'que je suisse', 'que je soie', 'que j\'aie'],
    correctAnswer: 0,
    explanation: "Le subjonctif présent d'être est 'que je sois'.",
    difficulty: 'medium'
  },
  {
    id: 10,
    type: 'multiple-choice',
    question: "Comment écrit-on le nombre 80 ?",
    options: ['quatre-vingt', 'quatre-vingts', 'quatres-vingts', 'quatre-vingt-s'],
    correctAnswer: 1,
    explanation: "'Quatre-vingts' prend un 's' quand il n'est pas suivi d'un autre nombre.",
    difficulty: 'medium'
  },
  {
    id: 11,
    type: 'true-false',
    question: "Le mot 'après-midi' peut être masculin ou féminin.",
    correctAnswer: 'true',
    explanation: "Le mot 'après-midi' accepte les deux genres selon l'usage.",
    difficulty: 'medium'
  },
  {
    id: 12,
    type: 'multiple-choice',
    question: "Quelle est la bonne orthographe ?",
    options: ['Rythme', 'Rhytme', 'Rytme', 'Rithme'],
    correctAnswer: 0,
    explanation: "La bonne orthographe est 'rythme' avec 'th'.",
    difficulty: 'medium'
  },
  {
    id: 13,
    type: 'multiple-choice',
    question: "Conjuguez 'venir' au passé simple, 3e personne du singulier :",
    options: ['il vena', 'il vint', 'il venu', 'il venait'],
    correctAnswer: 1,
    explanation: "Le passé simple de 'venir' à la 3e personne du singulier est 'il vint'.",
    difficulty: 'hard'
  },
  {
    id: 14,
    type: 'true-false',
    question: "On dit 'pallier à un problème'.",
    correctAnswer: 'false',
    explanation: "On dit 'pallier un problème' (sans préposition) ou 'remédier à un problème'.",
    difficulty: 'hard'
  },
  {
    id: 15,
    type: 'multiple-choice',
    question: "Quel est le pluriel de 'bail' ?",
    options: ['bails', 'baux', 'bailes', 'bailx'],
    correctAnswer: 1,
    explanation: "Le pluriel de 'bail' est 'baux'.",
    difficulty: 'hard'
  },
  {
    id: 16,
    type: 'multiple-choice',
    question: "Choisissez la bonne phrase :",
    options: [
      'Malgré que tu sois là',
      'Bien que tu sois là',
      'Malgré que tu es là',
      'Bien que tu es là'
    ],
    correctAnswer: 1,
    explanation: "'Bien que' est suivi du subjonctif. 'Malgré que' est incorrect.",
    difficulty: 'medium'
  },
  {
    id: 17,
    type: 'true-false',
    question: "Le mot 'gens' est toujours masculin.",
    correctAnswer: 'false',
    explanation: "'Gens' peut être masculin ou féminin selon le contexte et les mots qui l'accompagnent.",
    difficulty: 'hard'
  },
  {
    id: 18,
    type: 'multiple-choice',
    question: "Quelle est la bonne orthographe ?",
    options: ['Dilemne', 'Dilemme', 'Dilème', 'Dillemme'],
    correctAnswer: 1,
    explanation: "La bonne orthographe est 'dilemme' avec deux 'm'.",
    difficulty: 'medium'
  },
  {
    id: 19,
    type: 'multiple-choice',
    question: "Quel est l'impératif de 'aller' à la 2e personne du singulier ?",
    options: ['va', 'vas', 'alle', 'alles'],
    correctAnswer: 0,
    explanation: "L'impératif d'aller à la 2e personne du singulier est 'va' (sans 's').",
    difficulty: 'medium'
  },
  {
    id: 20,
    type: 'true-false',
    question: "On écrit 'je me suis permis' (au masculin) ou 'je me suis permise' (au féminin).",
    correctAnswer: 'true',
    explanation: "Avec les verbes pronominaux, l'accord se fait avec le sujet.",
    difficulty: 'medium'
  },
  {
    id: 21,
    type: 'multiple-choice',
    question: "Quelle préposition utilise-t-on avec 'différent' ?",
    options: ['différent à', 'différent de', 'différent avec', 'différent pour'],
    correctAnswer: 1,
    explanation: "On dit 'différent de' quelque chose.",
    difficulty: 'easy'
  },
  {
    id: 22,
    type: 'multiple-choice',
    question: "Comment accorde-t-on 'demi' dans 'une demi-heure' ?",
    options: ['demie-heure', 'demi-heure', 'demis-heure', 'demies-heure'],
    correctAnswer: 1,
    explanation: "'Demi' placé avant le nom reste invariable.",
    difficulty: 'medium'
  },
  {
    id: 23,
    type: 'true-false',
    question: "Le verbe 'envoyer' fait 'j'enverrai' au futur.",
    correctAnswer: 'true',
    explanation: "'Envoyer' fait exception et devient 'j'enverrai' au futur (comme 'voir').",
    difficulty: 'hard'
  },
  {
    id: 24,
    type: 'multiple-choice',
    question: "Quelle est la bonne orthographe ?",
    options: ['Acceuil', 'Accueil', 'Acceuille', 'Accueille'],
    correctAnswer: 1,
    explanation: "La bonne orthographe est 'accueil'.",
    difficulty: 'medium'
  },
  {
    id: 25,
    type: 'multiple-choice',
    question: "Conjuguez 'résoudre' au participe passé :",
    options: ['résolu', 'résout', 'résous', 'résolvé'],
    correctAnswer: 0,
    explanation: "Le participe passé de 'résoudre' est 'résolu'.",
    difficulty: 'hard'
  }
];

export const getQuestionsBySubject = (subject: string): Question[] => {
  switch (subject.toLowerCase()) {
    case 'culture-generale':
    case 'general-knowledge':
      return generalKnowledgeQuestions;
    case 'math':
    case 'aptitude-numerique':
      return mathQuestions;
    case 'english':
    case 'anglais':
      return englishQuestions;
    case 'french':
    case 'francais':
      return frenchQuestions;
    default:
      return generalKnowledgeQuestions;
  }
}; 