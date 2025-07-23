import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Container } from '../components/ui/Container';
import { Button } from '../components/ui/Button';
import { Clock, CheckCircle, XCircle, Lock, Award, Star, Crown, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

// Sample quiz data - in a real app this would come from an API
const quizData = [
  // Culture Générale
  {
    id: 1,
    subject: 'Culture Générale',
    question: "Quel philosophe des Lumières a écrit 'L'Esprit des lois' ?",
    options: ['Voltaire', 'Montesquieu', 'Rousseau', 'Diderot'],
    correctAnswer: 1,
    explanation: "Montesquieu a publié 'L'Esprit des lois' en 1748, œuvre fondamentale sur la séparation des pouvoirs."
  },
  {
    id: 2,
    subject: 'Culture Générale',
    question: "En quelle année la France a-t-elle adhéré à la Communauté européenne ?",
    options: ['1951', '1957', '1973', '1986'],
    correctAnswer: 1,
    explanation: "La France fait partie des six pays fondateurs de la CEE en 1957 avec le traité de Rome."
  },
  {
    id: 3,
    subject: 'Culture Générale',
    question: "Qui a présidé la Commission européenne de 1985 à 1995 ?",
    options: ['Jacques Santer', 'Jacques Delors', 'Romano Prodi', 'José Manuel Barroso'],
    correctAnswer: 1,
    explanation: "Jacques Delors a marqué l'histoire européenne en présidant la Commission de 1985 à 1995."
  },
  {
    id: 4,
    subject: 'Culture Générale',
    question: "Quel est le principe fondamental de la laïcité française ?",
    options: ['Séparation Église-État', 'Liberté religieuse', 'Égalité des cultes', 'Toutes les réponses'],
    correctAnswer: 3,
    explanation: "La laïcité française repose sur ces trois principes complémentaires et indissociables."
  },
  {
    id: 5,
    subject: 'Culture Générale',
    question: "Quel traité a créé l'Union européenne ?",
    options: ['Traité de Rome', 'Traité de Maastricht', 'Traité de Lisbonne', 'Traité de Nice'],
    correctAnswer: 1,
    explanation: "Le traité de Maastricht, signé en 1992, a créé l'Union européenne."
  },
  
  // Logique
  {
    id: 6,
    subject: 'Logique',
    question: "Si tous les A sont B et tous les B sont C, alors :",
    options: ['Tous les C sont A', 'Tous les A sont C', 'Aucun A n\'est C', 'Impossible à déterminer'],
    correctAnswer: 1,
    explanation: "Par transitivité logique, si A⊆B et B⊆C, alors A⊆C."
  },
  {
    id: 7,
    subject: 'Logique',
    question: "Dans une suite : 2, 6, 18, 54, ... Quel est le nombre suivant ?",
    options: ['108', '162', '216', '270'],
    correctAnswer: 1,
    explanation: "Chaque terme est multiplié par 3 : 54 × 3 = 162."
  },
  {
    id: 8,
    subject: 'Logique',
    question: "Si Pierre est plus grand que Paul et Paul est plus grand que Jacques, alors :",
    options: ['Jacques est le plus petit', 'Pierre est le plus grand', 'Paul est de taille moyenne', 'Toutes les réponses'],
    correctAnswer: 3,
    explanation: "Toutes ces propositions découlent logiquement de la relation d'ordre donnée."
  },
  {
    id: 9,
    subject: 'Logique',
    question: "Quelle est la négation de 'Tous les chats sont noirs' ?",
    options: ['Aucun chat n\'est noir', 'Certains chats ne sont pas noirs', 'Tous les chats sont blancs', 'La plupart des chats ne sont pas noirs'],
    correctAnswer: 1,
    explanation: "La négation de 'tous' est 'au moins un... ne pas', soit 'certains ne sont pas'."
  },
  {
    id: 10,
    subject: 'Logique',
    question: "Dans une série : 1, 4, 9, 16, 25, ... Quel est le motif ?",
    options: ['Nombres premiers', 'Carrés parfaits', 'Multiples de 3', 'Suite de Fibonacci'],
    correctAnswer: 1,
    explanation: "Ce sont les carrés des nombres entiers : 1², 2², 3², 4², 5²..."
  },
  
  // Anglais
  {
    id: 11,
    subject: 'Anglais',
    question: "Which word best completes: 'The government's economic policy has had a significant _____ on unemployment.'",
    options: ['affect', 'effect', 'effort', 'efficient'],
    correctAnswer: 1,
    explanation: "'Effect' est un nom qui signifie 'résultat' ou 'conséquence'."
  },
  {
    id: 12,
    subject: 'Anglais',
    question: "Choose the correct form: 'If I _____ you, I would accept the offer.'",
    options: ['was', 'were', 'am', 'would be'],
    correctAnswer: 1,
    explanation: "'Were' est utilisé dans les conditionnels irréels avec tous les pronoms."
  },
  {
    id: 13,
    subject: 'Anglais',
    question: "What does 'unprecedented' mean?",
    options: ['Expected', 'Never done before', 'Very common', 'Slightly unusual'],
    correctAnswer: 1,
    explanation: "'Unprecedented' signifie 'sans précédent', jamais fait auparavant."
  },
  {
    id: 14,
    subject: 'Anglais',
    question: "Which sentence is grammatically correct?",
    options: [
      'Neither of the proposals are acceptable',
      'Neither of the proposals is acceptable', 
      'Neither proposals are acceptable',
      'Neither proposal are acceptable'
    ],
    correctAnswer: 1,
    explanation: "'Neither' est singulier et requiert 'is', pas 'are'."
  },
  {
    id: 15,
    subject: 'Anglais',
    question: "The word 'comprehensive' is closest in meaning to:",
    options: ['Complex', 'Complete', 'Complicated', 'Competitive'],
    correctAnswer: 1,
    explanation: "'Comprehensive' signifie 'complet' ou 'exhaustif'."
  }
];

const examTypes = [
  { value: '', label: 'Sélectionnez votre niveau' },
  { value: 'CM', label: 'Cour Moyen (CM)' },
  { value: 'CMS', label: 'Cour Moyen Supérieur (CMS)' },
  { value: 'CS', label: 'Cour Supérieur (CS)' },
];

type QuizState = 'intro' | 'inProgress' | 'results';

const QuickQuizPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // Use state for examType so user can change it before starting
  const [examType, setExamType] = useState(searchParams.get('type') || '');
  const [quizState, setQuizState] = useState<QuizState>('intro');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>(new Array(15).fill(null));
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [quizStarted, setQuizStarted] = useState(false);

  useEffect(() => {
    if (quizStarted && timeLeft > 0 && quizState === 'inProgress') {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && quizState === 'inProgress') {
      handleFinishQuiz();
    }
  }, [timeLeft, quizStarted, quizState]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getExamLabel = (type: string) => {
    switch (type) {
      case 'CM': return 'Cour Moyen';
      case 'CMS': return 'Cour Moyen Supérieur';
      case 'CS': return 'Cour Supérieur';
      default: return type;
    }
  };

  const handleStartQuiz = () => {
    if (!examType) return;
    setQuizState('inProgress');
    setQuizStarted(true);
  };

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setUserAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < quizData.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleFinishQuiz();
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleFinishQuiz = () => {
    setQuizState('results');
    setQuizStarted(false);
  };

  const calculateScore = () => {
    let correct = 0;
    userAnswers.forEach((answer, index) => {
      if (answer === quizData[index].correctAnswer) {
        correct++;
      }
    });
    return { correct, total: quizData.length, percentage: Math.round((correct / quizData.length) * 100) };
  };

  const getSubjectIcon = (subject: string) => {
    switch (subject) {
      case 'Culture Générale': return '🏛️';
      case 'Logique': return '🧠';
      case 'Anglais': return '🇬🇧';
      default: return '📚';
    }
  };

  if (!examType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-100 to-white flex items-center justify-center">
        <Container>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-neutral-900 mb-4">Type d'examen non spécifié</h1>
            <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
          </div>
        </Container>
      </div>
    );
  }

  // Quiz Introduction
  if (quizState === 'intro') {
    return (
      <div className="min-h-screen bg-white">
        <Container className="py-8">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-12 items-start">
            {/* LEFT: Title and intro */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex-1"
            >
              <h1 className="text-4xl font-bold text-neutral-900 mb-6">Quiz Gratuit</h1>
              <div className="bg-primary-50 rounded-lg p-6 mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                  <label className="text-xl font-semibold text-primary-900 flex items-center gap-2">
                    Niveau sélectionné :
                    <div className="relative w-64">
                      <select
                        id="examType"
                        value={examType}
                        onChange={e => setExamType(e.target.value)}
                        className="w-full appearance-none bg-white border border-primary-400 rounded-lg px-4 py-2 pr-8 text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-semibold"
                      >
                        {examTypes.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-400 pointer-events-none" />
                    </div>
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-2xl mb-2">🏛️</div>
                    <div className="font-semibold">Culture Générale</div>
                    <div className="text-sm text-neutral-600">5 questions</div>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-2xl mb-2">🧠</div>
                    <div className="font-semibold">Logique</div>
                    <div className="text-sm text-neutral-600">5 questions</div>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-2xl mb-2">🇬🇧</div>
                    <div className="font-semibold">Anglais</div>
                    <div className="text-sm text-neutral-600">5 questions</div>
                  </div>
                </div>
                <div className="flex items-center justify-start gap-4 text-neutral-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    <span>10 minutes</span>
                  </div>
                  <div className="w-1 h-1 bg-neutral-400 rounded-full"></div>
                  <span>15 questions</span>
                  <div className="w-1 h-1 bg-neutral-400 rounded-full"></div>
                  <span>QCM</span>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-neutral-700">
                  Testez votre niveau avec ce quiz express adapté au concours {examType ? getExamLabel(examType) : '...'}.
                  Vous aurez 10 minutes pour répondre à 15 questions réparties équitablement sur les trois matières principales.
                </p>
              </div>
              <div className="mt-4 flex flex-col items-center space-y-4">
                <Button size="lg" onClick={handleStartQuiz} className="w-full md:w-72" disabled={!examType}>
                  Commencer le quiz
                </Button>
              </div>
            </motion.div>
            {/* RIGHT: Optionally, could add an illustration or leave empty for now */}
          </div>
        </Container>
      </div>
    );
  }

  // Quiz in Progress
  if (quizState === 'inProgress') {
    const question = quizData[currentQuestion];
    const progress = ((currentQuestion + 1) / quizData.length) * 100;

    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-100 to-white">
        <Container className="py-8">
          {/* Timer and Progress */}
          <div className="max-w-3xl mx-auto mb-8">
            <div className="bg-white rounded-lg shadow-sm p-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${timeLeft <= 60 ? 'bg-red-100 text-red-700' : 'bg-primary-100 text-primary-700'}`}>
                  <Clock className="w-4 h-4" />
                  {formatTime(timeLeft)}
                </div>
                <span className="text-neutral-600">
                  Question {currentQuestion + 1} sur {quizData.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-neutral-200 rounded-full h-2">
                  <div 
                    className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <span className="text-sm text-neutral-600">{Math.round(progress)}%</span>
              </div>
            </div>
          </div>

          {/* Question */}
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-3xl mx-auto"
          >
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">{getSubjectIcon(question.subject)}</span>
                <div>
                  <h3 className="font-semibold text-primary-600">{question.subject}</h3>
                  <p className="text-sm text-neutral-600">Niveau {examType}</p>
                </div>
              </div>
              
              <h2 className="text-xl font-semibold text-neutral-900 mb-8">
                {question.question}
              </h2>
              
              <div className="space-y-4 mb-8">
                {question.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                      userAnswers[currentQuestion] === index
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-neutral-200 hover:border-primary-200 hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                        userAnswers[currentQuestion] === index
                          ? 'border-primary-500 bg-primary-500 text-white'
                          : 'border-neutral-300'
                      }`}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span>{option}</span>
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={handlePrevQuestion}
                  disabled={currentQuestion === 0}
                >
                  Précédent
                </Button>
                
                <Button
                  onClick={handleNextQuestion}
                  disabled={userAnswers[currentQuestion] === null}
                >
                  {currentQuestion === quizData.length - 1 ? 'Terminer' : 'Suivant'}
                </Button>
              </div>
            </div>
          </motion.div>
        </Container>
      </div>
    );
  }

  // Quiz Results
  const score = calculateScore();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-100 to-white">
      <Container className="py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Results Summary */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8 text-center">
            <h1 className="text-3xl font-bold text-neutral-900 mb-4">Résultats du Quiz</h1>
            <p className="text-neutral-600 mb-6">Niveau {getExamLabel(examType)} ({examType})</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-primary-50 rounded-lg p-6">
                <div className="text-3xl font-bold text-primary-600 mb-2">{score.correct}/{score.total}</div>
                <div className="text-primary-800">Bonnes réponses</div>
              </div>
              <div className="bg-green-50 rounded-lg p-6">
                <div className="text-3xl font-bold text-green-600 mb-2">{score.percentage}%</div>
                <div className="text-green-800">Score global</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-6">
                <div className="text-3xl font-bold text-blue-600 mb-2">{formatTime(600 - timeLeft)}</div>
                <div className="text-blue-800">Temps utilisé</div>
              </div>
            </div>
            
            {/* Clean CTA for signup/login */}
            <div className="flex flex-col md:flex-row justify-center items-center gap-3 mt-2">
              <Button size="sm" to="/signup" className="px-6">Créer un compte</Button>
              <span className="text-neutral-400">ou</span>
              <Button size="sm" to="/login" variant="outline" className="px-6">Connectez-vous</Button>
            </div>
          </div>

          {/* Question Corrections */}
          {!user && (
            <div className="relative mt-4">
              {/* 1 full card */}
              <div className="bg-white border border-neutral-200 rounded-lg p-6 mb-4 shadow">
                <div className="flex items-start gap-4 mb-4">
                  <span className="text-lg">{getSubjectIcon(quizData[0].subject)}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-neutral-600">Question 1</span>
                      <span className="text-xs text-neutral-500">• {quizData[0].subject}</span>
                      {userAnswers[0] === quizData[0].correctAnswer ?
                        <CheckCircle className="w-5 h-5 text-green-500" /> :
                        <XCircle className="w-5 h-5 text-red-500" />
                      }
                    </div>
                    <h3 className="font-semibold text-neutral-900 mb-4">{quizData[0].question}</h3>
                    <div className="space-y-2 mb-4">
                      {quizData[0].options.map((option, optionIndex) => (
                        <div
                          key={optionIndex}
                          className={`flex items-center gap-3 p-3 rounded-lg ${
                            optionIndex === quizData[0].correctAnswer
                              ? 'bg-green-50 border border-green-200'
                              : userAnswers[0] === optionIndex && userAnswers[0] !== quizData[0].correctAnswer
                              ? 'bg-red-50 border border-red-200'
                              : 'bg-neutral-50'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                            optionIndex === quizData[0].correctAnswer
                              ? 'bg-green-500 text-white'
                              : userAnswers[0] === optionIndex && userAnswers[0] !== quizData[0].correctAnswer
                              ? 'bg-red-500 text-white'
                              : 'bg-neutral-300 text-neutral-700'
                          }`}>
                            {String.fromCharCode(65 + optionIndex)}
                          </div>
                          <span className={optionIndex === quizData[0].correctAnswer ? 'font-medium' : ''}>
                            {option}
                          </span>
                          {optionIndex === quizData[0].correctAnswer && (
                            <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                          )}
                          {userAnswers[0] === optionIndex && userAnswers[0] !== quizData[0].correctAnswer && (
                            <XCircle className="w-4 h-4 text-red-500 ml-auto" />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-blue-800 text-sm">
                        <strong>Explication :</strong> {quizData[0].explanation}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {/* 1 blurred card with shadow and overlay CTA */}
              <div className="relative mb-8">
                {/* Overlay CTA centered on blurred card */}
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                  <div className="flex items-center gap-3 bg-white/80 rounded-lg px-6 py-3 shadow-lg pointer-events-auto">
                    <Lock className="w-6 h-6 text-primary-500" />
                    <Button size="md" to="/signup" variant="ghost" className="text-primary-700 font-bold text-lg px-2 py-1 pointer-events-auto">
                      Voir tous les résultats
                    </Button>
                  </div>
                </div>
                <div className="absolute left-0 right-0 bottom-0 h-8 bg-black/10 rounded-b-lg blur-md z-10"></div>
                <div className="bg-white border border-neutral-200 rounded-lg p-6 blur-sm opacity-70 shadow-lg relative z-0">
                  <div className="flex items-start gap-4 mb-4">
                    <span className="text-lg">{getSubjectIcon(quizData[1].subject)}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-neutral-600">Question 2</span>
                        <span className="text-xs text-neutral-500">• {quizData[1].subject}</span>
                      </div>
                      <div className="h-4 bg-neutral-200 rounded w-2/3 mb-2"></div>
                      <div className="h-4 bg-neutral-200 rounded w-1/2 mb-2"></div>
                      <div className="h-4 bg-neutral-200 rounded w-1/4"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-8 text-center">
            <Button onClick={() => navigate('/')} variant="outline" size="lg">
              Retour à l'accueil
            </Button>
          </div>
        </motion.div>
      </Container>
    </div>
  );
};

export default QuickQuizPage; 