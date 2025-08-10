import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Container } from '../components/ui/Container';
import { Button } from '../components/ui/Button';
import { Clock, CheckCircle, XCircle, Lock, Award, Star, Crown, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { VisitorService } from '../services/visitorService';
import { TestResultService } from '../services/testResultService';
import { QuestionService, QuestionWithPassage } from '../services/questionService';
import { getQuestionsBySubject } from '../data/quizQuestions';

// Remove the hardcoded quizData array and replace with dynamic fetching

const examTypes = [
  { value: '', label: 'Sélectionnez votre niveau' },
  { value: 'CM', label: 'Cour Moyen (CM)' },
  { value: 'CMS', label: 'Cour Moyen Supérieur (CMS)' },
  { value: 'CS', label: 'Cour Supérieur (CS)' },
];

type QuizState = 'intro' | 'inProgress' | 'results';

interface Question {
  id: number;
  type: 'multiple-choice' | 'true-false' | 'fill-blank' | 'matching';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  subject: string;
}

const QuickQuizPage: React.FC = () => {
  const { user, logUserAttempt } = useSupabaseAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [examType, setExamType] = useState(searchParams.get('type') || '');
  const [quizState, setQuizState] = useState<QuizState>('intro');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [quizStarted, setQuizStarted] = useState(false);
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { profile } = useSupabaseAuth();

  useEffect(() => {
    // Track visitor when component mounts
    const trackVisitor = async () => {
      const id = await VisitorService.trackVisitor();
      setVisitorId(id);
    };
    trackVisitor();
  }, []);

  useEffect(() => {
    // Load questions when exam type changes
    if (examType && quizState === 'intro') {
      loadQuestions();
    }
  }, [examType]);

  useEffect(() => {
    if (quizStarted && timeLeft > 0 && quizState === 'inProgress') {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && quizState === 'inProgress') {
      handleFinishQuiz();
    }
  }, [timeLeft, quizStarted, quizState]);

  const loadQuestions = async () => {
    if (!examType) return;
    
    setLoading(true);
    setError(null);
    try {
      console.log('Loading questions for exam type:', examType);
      
      // Fetch questions for each subject based on exam type
      const cgQuestions = await getQuestionsBySubject('culture-generale', examType as 'CM' | 'CMS' | 'CS');
      const logicQuestions = await getQuestionsBySubject('logique', examType as 'CM' | 'CMS' | 'CS');
      const englishQuestions = await getQuestionsBySubject('english', examType as 'CM' | 'CMS' | 'CS');

      console.log('Questions loaded:', {
        cg: cgQuestions.length,
        logic: logicQuestions.length,
        english: englishQuestions.length,
        cgSample: cgQuestions[0]?.question,
        logicSample: logicQuestions[0]?.question,
        englishSample: englishQuestions[0]?.question
      });

      // Check if we have enough questions
      if (cgQuestions.length === 0 && logicQuestions.length === 0 && englishQuestions.length === 0) {
        throw new Error('Aucune question disponible pour ce niveau d\'examen. Veuillez réessayer plus tard.');
      }

      // Take 5 questions from each subject and shuffle them
      const allQuestions = [
        ...cgQuestions.slice(0, 5).map(q => ({ ...q, subject: 'Culture Générale' })),
        ...logicQuestions.slice(0, 5).map(q => ({ ...q, subject: 'Logique' })),
        ...englishQuestions.slice(0, 5).map(q => ({ ...q, subject: 'Anglais' }))
      ];

      console.log('Combined questions:', allQuestions.length);
      console.log('Sample questions:', allQuestions.slice(0, 3).map(q => q.question));

      // Shuffle the questions
      const shuffledQuestions = allQuestions.sort(() => Math.random() - 0.5);
      
      setQuestions(shuffledQuestions);
      setUserAnswers(new Array(shuffledQuestions.length).fill(null));
    } catch (error) {
      console.error('Error loading questions:', error);
      setError(error instanceof Error ? error.message : 'Erreur lors du chargement des questions');
    } finally {
      setLoading(false);
    }
  };

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

  const handleStartQuiz = async () => {
    if (!examType) return;
    
    if (error) {
      // If there's an error, try to load questions again
      await loadQuestions();
      return;
    }
    
    if (questions.length === 0) {
      // If no questions loaded yet, load them first
      await loadQuestions();
    }
    
    if (questions.length > 0) {
      setQuizState('inProgress');
      setQuizStarted(true);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setUserAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
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

  const handleFinishQuiz = async () => {
    setQuizState('results');
    setQuizStarted(false);

    const score = calculateScore();

    // Save quiz result and log attempt
    if (user) {
      // Save to test_results table for authenticated users
      await TestResultService.saveTestResult(
        user.id,
        'quick',
        'CG', // Using CG as the main category for quick quiz
        score.percentage
      );

      // Log user attempt
      await logUserAttempt(
        'Quick',
        'CG',
        undefined,
        undefined,
        score.percentage
      );
    } else if (visitorId) {
      // Update visitor record for anonymous users
      await VisitorService.updateQuizResult(visitorId, score.percentage);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    userAnswers.forEach((answer, index) => {
      const question = questions[index];
      if (!question) return;
      
      let isCorrect = false;
      if (question.type === 'multiple-choice' && typeof question.correctAnswer === 'number') {
        const correctOptionText = question.options?.[question.correctAnswer];
        isCorrect = answer === question.correctAnswer;
      } else if (question.type === 'true-false') {
        // For true-false, answer is 0 for "Vrai" and 1 for "Faux"
        const correctAnswerIndex = String(question.correctAnswer).toLowerCase() === 'vrai' ? 0 : 1;
        isCorrect = answer === correctAnswerIndex;
      } else {
        isCorrect = answer === question.correctAnswer;
      }
      
      if (isCorrect) {
        correct++;
      }
    });
    return { correct, total: questions.length, percentage: Math.round((correct / questions.length) * 100) };
  };

  const getSubjectIcon = (subject: string) => {
    switch (subject.toLowerCase()) {
      case 'culture générale':
      case 'culture-generale':
      case 'cg':
        return '🌍';
      case 'anglais':
      case 'english':
      case 'ang':
        return '🇬🇧';
      case 'logique':
      case 'logic':
      case 'log':
        return '🧠';
      default:
        return '📚';
    }
  };

  // Function to get score comment
  const getScoreComment = (score: number) => {
    if (score < 30) return 'Encore un effort';
    if (score >= 30 && score <= 49) return 'Peut mieux faire';
    if (score >= 50 && score <= 69) return 'En progrès';
    if (score >= 70 && score <= 84) return 'Encourageant';
    if (score >= 85 && score <= 94) return 'Très bien';
    if (score >= 95 && score <= 99) return 'Excellent';
    if (score === 100) return 'Parfait';
    return 'Encore un effort';
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
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 text-sm">{error}</p>
                    <button 
                      onClick={loadQuestions}
                      className="mt-2 text-red-600 hover:text-red-800 underline text-sm"
                    >
                      Réessayer
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-col items-center space-y-4">
                <Button size="lg" onClick={handleStartQuiz} className="w-full md:w-72" disabled={!examType || loading}>
                  {loading ? 'Chargement...' : error ? 'Réessayer' : 'Commencer le quiz'}
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
    if (loading || questions.length === 0) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-neutral-100 to-white flex items-center justify-center">
          <Container>
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des questions...</p>
            </div>
          </Container>
        </div>
      );
    }

    const question = questions[currentQuestion];
    const progress = ((currentQuestion + 1) / questions.length) * 100;

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
                  Question {currentQuestion + 1} sur {questions.length}
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
                {question.options && question.type === 'multiple-choice' && question.options.map((option, index) => (
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
                {question.type === 'true-false' && (
                  <>
                    <button
                      onClick={() => handleAnswerSelect(0)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                        userAnswers[currentQuestion] === 0
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-neutral-200 hover:border-primary-200 hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                          userAnswers[currentQuestion] === 0
                            ? 'border-primary-500 bg-primary-500 text-white'
                            : 'border-neutral-300'
                        }`}>
                          A
                        </div>
                        <span>Vrai</span>
                      </div>
                    </button>
                    <button
                      onClick={() => handleAnswerSelect(1)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                        userAnswers[currentQuestion] === 1
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-neutral-200 hover:border-primary-200 hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                          userAnswers[currentQuestion] === 1
                            ? 'border-primary-500 bg-primary-500 text-white'
                            : 'border-neutral-300'
                        }`}>
                          B
                        </div>
                        <span>Faux</span>
                      </div>
                    </button>
                  </>
                )}
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
                  {currentQuestion === questions.length - 1 ? 'Terminer' : 'Suivant'}
                </Button>
              </div>
            </div>
          </motion.div>
        </Container>
      </div>
    );
  }

  // Quiz Results
  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-100 to-white flex items-center justify-center">
        <Container>
          <div className="text-center">
            <p className="text-gray-600">Aucune question disponible.</p>
            <Button onClick={() => navigate('/')} className="mt-4">
              Retour à l'accueil
            </Button>
          </div>
        </Container>
      </div>
    );
  }
  
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
            
            {/* Score Comment */}
            <div className="mb-8">
              <div className="inline-block px-6 py-3 rounded-full bg-primary-100 text-primary-700 font-semibold text-lg">
                {getScoreComment(score.percentage)}
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
          <div className="relative mt-4">
            {/* 1st full card */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6 mb-4 shadow">
              <div className="flex items-start gap-4 mb-4">
                <span className="text-lg">{getSubjectIcon(questions[0]?.subject || 'N/A')}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-neutral-600">Question 1</span>
                    <span className="text-xs text-neutral-500">• {questions[0]?.subject || 'N/A'}</span>
                    {userAnswers[0] === questions[0]?.correctAnswer ?
                      <CheckCircle className="w-5 h-5 text-green-500" /> :
                      <XCircle className="w-5 h-5 text-red-500" />
                    }
                  </div>
                  <h3 className="font-semibold text-neutral-900 mb-4">{questions[0]?.question || 'N/A'}</h3>
                  <div className="space-y-2 mb-4">
                    {questions[0]?.options && questions[0]?.type === 'multiple-choice' && questions[0]?.options.map((option, optionIndex) => (
                      <div
                        key={optionIndex}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          optionIndex === questions[0]?.correctAnswer
                            ? 'bg-green-50 border border-green-200'
                            : userAnswers[0] === optionIndex && userAnswers[0] !== questions[0]?.correctAnswer
                            ? 'bg-red-50 border border-red-200'
                            : 'bg-neutral-50'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                          optionIndex === questions[0]?.correctAnswer
                            ? 'bg-green-500 text-white'
                            : userAnswers[0] === optionIndex && userAnswers[0] !== questions[0]?.correctAnswer
                            ? 'bg-red-500 text-white'
                            : 'bg-neutral-300 text-neutral-700'
                        }`}>
                          {String.fromCharCode(65 + optionIndex)}
                        </div>
                        <span className={optionIndex === questions[0]?.correctAnswer ? 'font-medium' : ''}>
                          {option}
                        </span>
                        {optionIndex === questions[0]?.correctAnswer && (
                          <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                        )}
                        {userAnswers[0] === optionIndex && userAnswers[0] !== questions[0]?.correctAnswer && (
                          <XCircle className="w-4 h-4 text-red-500 ml-auto" />
                        )}
                      </div>
                    ))}
                    {questions[0]?.type === 'true-false' && (
                      <>
                        <div className={`flex items-center gap-3 p-3 rounded-lg ${
                          String(questions[0]?.correctAnswer).toLowerCase() === 'vrai'
                            ? 'bg-green-50 border border-green-200'
                            : userAnswers[0] === 0 && String(questions[0]?.correctAnswer).toLowerCase() !== 'vrai'
                            ? 'bg-red-50 border border-red-200'
                            : 'bg-neutral-50'
                        }`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                            String(questions[0]?.correctAnswer).toLowerCase() === 'vrai'
                              ? 'bg-green-500 text-white'
                              : userAnswers[0] === 0 && String(questions[0]?.correctAnswer).toLowerCase() !== 'vrai'
                              ? 'bg-red-500 text-white'
                              : 'bg-neutral-300 text-neutral-700'
                          }`}>
                            A
                          </div>
                          <span>Vrai</span>
                          {String(questions[0]?.correctAnswer).toLowerCase() === 'vrai' && (
                            <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                          )}
                          {userAnswers[0] === 0 && String(questions[0]?.correctAnswer).toLowerCase() !== 'vrai' && (
                            <XCircle className="w-4 h-4 text-red-500 ml-auto" />
                          )}
                        </div>
                        <div className={`flex items-center gap-3 p-3 rounded-lg ${
                          String(questions[0]?.correctAnswer).toLowerCase() === 'faux'
                            ? 'bg-green-50 border border-green-200'
                            : userAnswers[0] === 1 && String(questions[0]?.correctAnswer).toLowerCase() !== 'faux'
                            ? 'bg-red-50 border border-red-200'
                            : 'bg-neutral-50'
                        }`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                            String(questions[0]?.correctAnswer).toLowerCase() === 'faux'
                              ? 'bg-green-500 text-white'
                              : userAnswers[0] === 1 && String(questions[0]?.correctAnswer).toLowerCase() !== 'faux'
                              ? 'bg-red-500 text-white'
                              : 'bg-neutral-300 text-neutral-700'
                          }`}>
                            B
                          </div>
                          <span>Faux</span>
                          {String(questions[0]?.correctAnswer).toLowerCase() === 'faux' && (
                            <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                          )}
                          {userAnswers[0] === 1 && String(questions[0]?.correctAnswer).toLowerCase() !== 'faux' && (
                            <XCircle className="w-4 h-4 text-red-500 ml-auto" />
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-blue-800 text-sm">
                      <strong>Explication :</strong> {questions[0]?.explanation || 'Aucune explication fournie.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2nd full card */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6 mb-4 shadow">
              <div className="flex items-start gap-4 mb-4">
                <span className="text-lg">{getSubjectIcon(questions[1]?.subject || 'N/A')}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-neutral-600">Question 2</span>
                    <span className="text-xs text-neutral-500">• {questions[1]?.subject || 'N/A'}</span>
                    {userAnswers[1] === questions[1]?.correctAnswer ?
                      <CheckCircle className="w-5 h-5 text-green-500" /> :
                      <XCircle className="w-5 h-5 text-red-500" />
                    }
                  </div>
                  <h3 className="font-semibold text-neutral-900 mb-4">{questions[1]?.question || 'N/A'}</h3>
                  <div className="space-y-2 mb-4">
                    {questions[1]?.options && questions[1]?.type === 'multiple-choice' && questions[1]?.options.map((option, optionIndex) => (
                      <div
                        key={optionIndex}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          optionIndex === questions[1]?.correctAnswer
                            ? 'bg-green-50 border border-green-200'
                            : userAnswers[1] === optionIndex && userAnswers[1] !== questions[1]?.correctAnswer
                            ? 'bg-red-50 border border-red-200'
                            : 'bg-neutral-50'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                          optionIndex === questions[1]?.correctAnswer
                            ? 'bg-green-500 text-white'
                            : userAnswers[1] === optionIndex && userAnswers[1] !== questions[1]?.correctAnswer
                            ? 'bg-red-500 text-white'
                            : 'bg-neutral-300 text-neutral-700'
                        }`}>
                          {String.fromCharCode(65 + optionIndex)}
                        </div>
                        <span className={optionIndex === questions[1]?.correctAnswer ? 'font-medium' : ''}>
                          {option}
                        </span>
                        {optionIndex === questions[1]?.correctAnswer && (
                          <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                        )}
                        {userAnswers[1] === optionIndex && userAnswers[1] !== questions[1]?.correctAnswer && (
                          <XCircle className="w-4 h-4 text-red-500 ml-auto" />
                        )}
                      </div>
                    ))}
                    {questions[1]?.type === 'true-false' && (
                      <>
                        <div className={`flex items-center gap-3 p-3 rounded-lg ${
                          String(questions[1]?.correctAnswer).toLowerCase() === 'vrai'
                            ? 'bg-green-50 border border-green-200'
                            : userAnswers[1] === 0 && String(questions[1]?.correctAnswer).toLowerCase() !== 'vrai'
                            ? 'bg-red-50 border border-red-200'
                            : 'bg-neutral-50'
                        }`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                            String(questions[1]?.correctAnswer).toLowerCase() === 'vrai'
                              ? 'bg-green-500 text-white'
                              : userAnswers[1] === 0 && String(questions[1]?.correctAnswer).toLowerCase() !== 'vrai'
                              ? 'bg-red-500 text-white'
                              : 'bg-neutral-300 text-neutral-700'
                          }`}>
                            A
                          </div>
                          <span>Vrai</span>
                          {String(questions[1]?.correctAnswer).toLowerCase() === 'vrai' && (
                            <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                          )}
                          {userAnswers[1] === 0 && String(questions[1]?.correctAnswer).toLowerCase() !== 'vrai' && (
                            <XCircle className="w-4 h-4 text-red-500 ml-auto" />
                          )}
                        </div>
                        <div className={`flex items-center gap-3 p-3 rounded-lg ${
                          String(questions[1]?.correctAnswer).toLowerCase() === 'faux'
                            ? 'bg-green-50 border border-green-200'
                            : userAnswers[1] === 1 && String(questions[1]?.correctAnswer).toLowerCase() !== 'faux'
                            ? 'bg-red-50 border border-red-200'
                            : 'bg-neutral-50'
                        }`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                            String(questions[1]?.correctAnswer).toLowerCase() === 'faux'
                              ? 'bg-green-500 text-white'
                              : userAnswers[1] === 1 && String(questions[1]?.correctAnswer).toLowerCase() !== 'faux'
                              ? 'bg-red-500 text-white'
                              : 'bg-neutral-300 text-neutral-700'
                          }`}>
                            B
                          </div>
                          <span>Faux</span>
                          {String(questions[1]?.correctAnswer).toLowerCase() === 'faux' && (
                            <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                          )}
                          {userAnswers[1] === 1 && String(questions[1]?.correctAnswer).toLowerCase() !== 'faux' && (
                            <XCircle className="w-4 h-4 text-red-500 ml-auto" />
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-blue-800 text-sm">
                      <strong>Explication :</strong> {questions[1]?.explanation || 'Aucune explication fournie.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 3rd blurred card with shadow and overlay CTA */}
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
                  <span className="text-lg">{getSubjectIcon(questions[2]?.subject || 'N/A')}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-neutral-600">Question 3</span>
                      <span className="text-xs text-neutral-500">• {questions[2]?.subject || 'N/A'}</span>
                    </div>
                    <div className="h-4 bg-neutral-200 rounded w-2/3 mb-2"></div>
                    <div className="h-4 bg-neutral-200 rounded w-1/2 mb-2"></div>
                    <div className="h-4 bg-neutral-200 rounded w-1/4"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
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