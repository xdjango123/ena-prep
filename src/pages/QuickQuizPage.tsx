import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Container } from '../components/ui/Container';
import { Button } from '../components/ui/Button';
import { Clock, CheckCircle, XCircle, Lock, Award, Star, Crown, ArrowLeft, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { VisitorService } from '../services/visitorService';
import { getQuestionsBySubject, Question as BaseQuestion } from '../data/quizQuestions';
import MathText from '../components/common/MathText';

// Remove the hardcoded quizData array and replace with dynamic fetching

type QuizState = 'intro' | 'inProgress' | 'results';
type ExamType = 'CM' | 'CMS' | 'CS';

const examTypes: { value: ExamType; label: string }[] = [
  { value: 'CM', label: 'Cour Moyen (CM)' },
  { value: 'CMS', label: 'Cour Moyen Supérieur (CMS)' },
  { value: 'CS', label: 'Cour Supérieur (CS)' },
];

interface Question extends BaseQuestion {
  subject: string;
}

const QuickQuizPage: React.FC = () => {
  const { user, selectedExamType, profile } = useSupabaseAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const autoStart = searchParams.get('autoStart') === '1';
  const isDashboardQuiz = autoStart || location.pathname.startsWith('/dashboard/quiz');
  const navigate = useNavigate();
  const urlExamType = searchParams.get('type');
  const initialExamType = (selectedExamType || profile?.plan_name || urlExamType || 'CM') as ExamType;
  const [examType, setExamType] = useState<ExamType>(initialExamType);
  const [quizState, setQuizState] = useState<QuizState>('intro');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [quizStarted, setQuizStarted] = useState(false);
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const next = (selectedExamType || profile?.plan_name || urlExamType || 'CM') as ExamType;
    setExamType(next);
  }, [selectedExamType, profile?.plan_name, urlExamType]);

  useEffect(() => {
    // Track visitor when component mounts
    const trackVisitor = async () => {
      const id = await VisitorService.trackVisitor();
      setVisitorId(id);
    };
    trackVisitor();
  }, []);

  useEffect(() => {
    if (examType && quizState === 'intro') {
      loadQuestions();
    }
  }, [examType, quizState]);

  useEffect(() => {
    if (isDashboardQuiz && autoStart && quizState === 'intro' && !loading && questions.length > 0) {
      setQuizState('inProgress');
      setQuizStarted(true);
    }
  }, [autoStart, isDashboardQuiz, quizState, loading, questions.length]);

  useEffect(() => {
    if (quizStarted && timeLeft > 0 && quizState === 'inProgress') {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && quizState === 'inProgress') {
      handleFinishQuiz();
    }
  }, [timeLeft, quizStarted, quizState]);

  const loadQuestions = async (): Promise<Question[] | null> => {
    if (!examType) return null;
    
    setLoading(true);
    setError(null);
    try {
      const effectiveExamType = examType as ExamType;
      console.log('Loading questions for exam type:', effectiveExamType);
      
      // Fetch questions for each subject based on exam type
      const cgQuestions = await getQuestionsBySubject('culture-generale', effectiveExamType);
      const logicQuestions = await getQuestionsBySubject('logique', effectiveExamType);
      const englishQuestions = await getQuestionsBySubject('english', effectiveExamType);

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

      const takeSubjectQuestions = (subjectQuestions: BaseQuestion[], subjectLabel: string): Question[] =>
        subjectQuestions.slice(0, 5).map(q => ({ ...q, subject: subjectLabel }));

      const englishSet = takeSubjectQuestions(englishQuestions, 'Anglais');
      const cgSet = takeSubjectQuestions(cgQuestions, 'Culture Générale');
      const logicSet = takeSubjectQuestions(logicQuestions, 'Logique');

      if (englishSet.length < 5 || cgSet.length < 5 || logicSet.length < 5) {
        throw new Error("Pas assez de questions pour générer le quiz quotidien. Veuillez réessayer plus tard.");
      }

      const orderedQuestions = [...englishSet, ...cgSet, ...logicSet];

      console.log('Combined questions:', orderedQuestions.length);
      console.log('Sample questions:', orderedQuestions.slice(0, 3).map(q => q.question));
      
      setQuestions(orderedQuestions);
      setUserAnswers(new Array(orderedQuestions.length).fill(null));
      return orderedQuestions;
    } catch (error) {
      console.error('Error loading questions:', error);
      setError(error instanceof Error ? error.message : 'Erreur lors du chargement des questions');
      return null;
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

    let latestQuestions = questions;

    if (error || questions.length === 0) {
      const freshlyLoaded = await loadQuestions();
      latestQuestions = freshlyLoaded ?? questions;
    }

    if (latestQuestions.length > 0) {
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

    // For visitors coming from the public site, keep tracking via the visitor record
    if (!user && visitorId) {
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
    if (isDashboardQuiz) {
      return (
        <div className="min-h-screen bg-neutral-50">
          <div className="w-full bg-white border-b border-gray-200">
            <div className="max-w-6xl mx-auto px-4 xs:px-6 sm:px-8 py-6 space-y-2">
              <h1 className="text-2xl xs:text-3xl sm:text-4xl font-bold text-neutral-900">Quiz rapide</h1>
              <p className="text-neutral-600 text-base xs:text-lg">Préparation du quiz personnalisé...</p>
            </div>
          </div>
          <div className="max-w-4xl mx-auto px-4 xs:px-6 sm:px-8 py-12">
            <div className="bg-white border border-neutral-100 rounded-2xl shadow-sm p-6 sm:p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mb-6">
                <Clock className="w-8 h-8 text-primary-500 animate-spin" />
              </div>
              <p className="text-neutral-700 text-base sm:text-lg">
                Nous sélectionnons 15 questions pour {getExamLabel(examType)}. Préparez-vous !
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50 overflow-x-hidden">
        <div className="w-full bg-white border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 py-6">
            <p className="text-sm font-semibold text-primary-500 uppercase tracking-wide">Quiz rapide</p>
            <h1 className="text-2xl xs:text-3xl sm:text-4xl font-bold text-neutral-900 mb-2">Quiz rapide</h1>
            <p className="text-neutral-600 text-base xs:text-lg">
              Choisissez votre niveau puis lancez un quiz de 15 questions (5 CG, 5 LOG, 5 ANG).
            </p>
          </div>
        </div>
        <Container className="py-4 xs:py-6 sm:py-8">
          <div className="max-w-4xl mx-auto flex flex-col gap-6 xs:gap-8 sm:gap-12 items-start">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex-1 w-full bg-white rounded-xl border border-primary-100 p-4 xs:p-6 shadow-sm"
            >
              <div className="flex flex-col gap-3 mb-4">
                <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">
                  Niveau sélectionné
                </p>
                <div className="flex flex-wrap gap-2">
                  {examTypes.map(type => (
                    <button
                      key={type.value}
                      onClick={() => setExamType(type.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
                        examType === type.value
                          ? 'bg-primary-500 text-white border-primary-500'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:border-primary-300'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 xs:gap-4 mb-6">
                <div className="bg-neutral-50 rounded-lg p-3 xs:p-4">
                  <div className="text-xl xs:text-2xl mb-2">🏛️</div>
                  <div className="font-semibold text-sm xs:text-base">Culture Générale</div>
                  <div className="text-xs xs:text-sm text-neutral-600">5 questions</div>
                </div>
                <div className="bg-neutral-50 rounded-lg p-3 xs:p-4">
                  <div className="text-xl xs:text-2xl mb-2">🧠</div>
                  <div className="font-semibold text-sm xs:text-base">Logique</div>
                  <div className="text-xs xs:text-sm text-neutral-600">5 questions</div>
                </div>
                <div className="bg-neutral-50 rounded-lg p-3 xs:p-4 sm:col-span-2 md:col-span-1">
                  <div className="text-xl xs:text-2xl mb-2">🇬🇧</div>
                  <div className="font-semibold text-sm xs:text-base">Anglais</div>
                  <div className="text-xs xs:text-sm text-neutral-600">5 questions</div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 xs:p-4 mb-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <div className="flex flex-col items-center space-y-3">
                <Button
                  size="lg"
                  onClick={handleStartQuiz}
                  className="w-full sm:w-72"
                  disabled={loading}
                >
                  {loading ? 'Chargement...' : 'Commencer le quiz'}
                </Button>
                <p className="text-neutral-500 text-sm xs:text-base">
                  Niveau: {getExamLabel(examType)}
                </p>
              </div>
            </motion.div>
          </div>
        </Container>
      </div>
    );
  }

  // Quiz in Progress
  if (quizState === 'inProgress') {
    if (loading || questions.length === 0) {
      const loadingMarkup = (
        <Container>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 xs:h-12 xs:w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-sm xs:text-base">Chargement des questions...</p>
          </div>
        </Container>
      );
      if (isDashboardQuiz) {
        return (
          <div className="min-h-screen bg-neutral-50">
            <div className="w-full bg-white border-b border-gray-200">
              <div className="max-w-6xl mx-auto px-4 xs:px-6 sm:px-8 py-6 space-y-1">
                <h1 className="text-2xl xs:text-3xl font-bold text-neutral-900">Quiz rapide</h1>
                <p className="text-neutral-600 text-sm xs:text-base">Chargement du quiz...</p>
              </div>
            </div>
            {loadingMarkup}
          </div>
        );
      }
      return (
        <div className="min-h-screen bg-gradient-to-br from-neutral-100 to-white overflow-x-hidden flex items-center justify-center">
          {loadingMarkup}
        </div>
      );
    }

    const question = questions[currentQuestion];
    const progress = ((currentQuestion + 1) / questions.length) * 100;
    const questionBubbles = (
      <div className="flex flex-wrap gap-2">
        {questions.map((_, index) => {
          const answered = userAnswers[index] !== null;
          const isCurrent = index === currentQuestion;
          return (
            <button
              key={index}
              onClick={() => setCurrentQuestion(index)}
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full text-xs sm:text-sm font-semibold transition ${
                isCurrent
                  ? 'bg-orange-500 text-white shadow'
                  : answered
                  ? 'bg-primary-50 text-primary-600 border border-primary-100'
                  : 'bg-neutral-100 text-neutral-500'
              }`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    );

    const questionContent = (
      <>
        <div className="flex items-center gap-3 mb-4 xs:mb-6">
          <span className="text-xl xs:text-2xl">{getSubjectIcon(question.subject)}</span>
          <div>
            <h3 className="font-semibold text-primary-600 text-sm xs:text-base">{question.subject}</h3>
            <p className="text-xs xs:text-sm text-neutral-600">Niveau {examType}</p>
          </div>
        </div>
        <MathText
          text={question.question}
          block
          className="text-lg xs:text-xl font-semibold text-neutral-900 mb-6 xs:mb-8 leading-relaxed"
        />
        <div className="space-y-3 xs:space-y-4 mb-6 xs:mb-8">
          {question.options && question.type === 'multiple-choice' && question.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswerSelect(index)}
              className={`w-full text-left p-3 xs:p-4 rounded-lg border-2 transition-all duration-200 ${
                userAnswers[currentQuestion] === index
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-neutral-200 hover:border-primary-200 hover:bg-neutral-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 xs:w-6 xs:h-6 rounded-full border-2 flex items-center justify-center text-xs xs:text-sm font-medium ${
                  userAnswers[currentQuestion] === index
                    ? 'border-primary-500 bg-primary-500 text-white'
                    : 'border-neutral-300'
                }`}>
                  {String.fromCharCode(65 + index)}
                </div>
                <span className="text-sm xs:text-base">
                  <MathText text={option} />
                </span>
              </div>
            </button>
          ))}
          {question.type === 'true-false' && (
            <>
              {[{ label: 'Vrai', value: 0 }, { label: 'Faux', value: 1 }].map(choice => (
                <button
                  key={choice.label}
                  onClick={() => handleAnswerSelect(choice.value)}
                  className={`w-full text-left p-3 xs:p-4 rounded-lg border-2 transition-all duration-200 ${
                    userAnswers[currentQuestion] === choice.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-200 hover:border-primary-200 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 xs:w-6 xs:h-6 rounded-full border-2 flex items-center justify-center text-xs xs:text-sm font-medium ${
                      userAnswers[currentQuestion] === choice.value
                        ? 'border-primary-500 bg-primary-500 text-white'
                        : 'border-neutral-300'
                    }`}>
                      {choice.label === 'Vrai' ? 'A' : 'B'}
                    </div>
                    <span className="text-sm xs:text-base">{choice.label}</span>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </>
    );

    if (isDashboardQuiz) {
      return (
        <div className="min-h-screen bg-neutral-50">
          <div className="w-full bg-white border-b border-gray-200">
            <div className="max-w-6xl mx-auto px-4 xs:px-6 sm:px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl xs:text-3xl font-bold text-neutral-900">Quiz rapide</h1>
                <p className="text-sm xs:text-base text-neutral-600">
                  Question {currentQuestion + 1} sur {questions.length}
                </p>
              </div>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs xs:text-sm font-semibold ${
                timeLeft <= 60 ? 'bg-red-100 text-red-700' : 'bg-primary-50 text-primary-700'
              }`}>
                <Clock className="w-4 h-4" />
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>
          <div className="max-w-5xl mx-auto px-4 xs:px-6 sm:px-8 py-8">
            <div className="bg-white border border-neutral-100 rounded-3xl shadow-sm p-6 sm:p-8 space-y-6">
              <div>
                <p className="text-sm font-semibold text-neutral-500 mb-3">Progression</p>
                <div className="w-full bg-neutral-100 h-2 rounded-full mb-4">
                  <div
                    className="h-2 bg-orange-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {questionBubbles}
              </div>
              <motion.div key={currentQuestion} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {questionContent}
              </motion.div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handlePrevQuestion}
                  disabled={currentQuestion === 0}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-neutral-200 text-neutral-700 text-sm xs:text-base disabled:opacity-50 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Question précédente
                </button>
                <button
                  onClick={handleNextQuestion}
                  disabled={userAnswers[currentQuestion] === null}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-500 text-white text-sm xs:text-base hover:bg-orange-600 transition"
                >
                  {currentQuestion < questions.length - 1 ? 'Question suivante' : 'Terminer le quiz'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-100 to-white overflow-x-hidden">
        <Container className="py-4 xs:py-6 sm:py-8">
          <div className="max-w-3xl mx-auto mb-6 xs:mb-8">
            <div className="bg-white rounded-lg shadow-sm p-3 xs:p-4">
              <div className="flex flex-col xs:flex-row xs:items-center gap-3 xs:gap-4 mb-3 xs:mb-0">
                <div className={`flex items-center gap-2 px-2 xs:px-3 py-1 rounded-full text-xs xs:text-sm font-medium ${timeLeft <= 60 ? 'bg-red-100 text-red-700' : 'bg-primary-100 text-primary-700'}`}>
                  <Clock className="w-3 h-3 xs:w-4 xs:h-4" />
                  {formatTime(timeLeft)}
                </div>
                <span className="text-sm xs:text-base text-neutral-600">
                  Question {currentQuestion + 1} sur {questions.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 xs:w-32 bg-neutral-200 rounded-full h-2">
                  <div 
                    className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <span className="text-xs xs:text-sm text-neutral-600">{Math.round(progress)}%</span>
              </div>
            </div>
          </div>

          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-3xl mx-auto"
          >
            <div className="bg-white rounded-xl shadow-lg p-4 xs:p-6 sm:p-8">
              {questionContent}
              <div className="flex flex-col xs:flex-row justify-between gap-3 xs:gap-0">
                <Button
                  variant="outline"
                  onClick={handlePrevQuestion}
                  disabled={currentQuestion === 0}
                  className="w-full xs:w-auto"
                >
                  Précédent
                </Button>
                
                <Button
                  onClick={handleNextQuestion}
                  disabled={userAnswers[currentQuestion] === null}
                  className="w-full xs:w-auto"
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
      <div className="min-h-screen bg-gradient-to-br from-neutral-100 to-white overflow-x-hidden flex items-center justify-center">
        <Container>
          <div className="text-center">
            <p className="text-gray-600 text-sm xs:text-base">Aucune question disponible.</p>
            <Button onClick={() => navigate('/')} className="mt-4 w-full xs:w-auto">Retour à l'accueil</Button>
          </div>
        </Container>
      </div>
    );
  }
  
  const score = calculateScore();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-100 to-white overflow-x-hidden">
      <Container className="py-6 xs:py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Results Summary */}
          <div className="bg-white rounded-xl shadow-lg p-4 xs:p-6 sm:p-8 mb-6 xs:mb-8 text-center">
            <h1 className="text-2xl xs:text-3xl font-bold text-neutral-900 mb-4">Résultats du Quiz</h1>
            <p className="text-neutral-600 mb-6 text-sm xs:text-base">Niveau {getExamLabel(examType)} ({examType})</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 xs:gap-6 mb-6 xs:mb-8">
              <div className="bg-primary-50 rounded-lg p-4 xs:p-6">
                <div className="text-2xl xs:text-3xl font-bold text-primary-600 mb-2">{score.correct}/{score.total}</div>
                <div className="text-primary-800 text-sm xs:text-base">Bonnes réponses</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 xs:p-6">
                <div className="text-2xl xs:text-3xl font-bold text-green-600 mb-2">{score.percentage}%</div>
                <div className="text-green-800 text-sm xs:text-base">Score global</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 xs:p-6 sm:col-span-2 md:col-span-1">
                <div className="text-2xl xs:text-3xl font-bold text-blue-600 mb-2">{formatTime(600 - timeLeft)}</div>
                <div className="text-blue-800 text-sm xs:text-base">Temps utilisé</div>
              </div>
            </div>
            
            {/* Score Comment */}
            <div className="mb-6 xs:mb-8">
              <div className="inline-block px-4 xs:px-6 py-2 xs:py-3 rounded-full bg-primary-100 text-primary-700 font-semibold text-base xs:text-lg">
                {getScoreComment(score.percentage)}
              </div>
            </div>
            
            {!user && (
              <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mt-2">
                <Button size="sm" to="/signup" className="px-4 xs:px-6 w-full sm:w-auto">
                  Créer un compte
                </Button>
                <span className="text-neutral-400 text-sm xs:text-base">ou</span>
                <Button size="sm" to="/login" variant="outline" className="px-4 xs:px-6 w-full sm:w-auto">
                  Connectez-vous
                </Button>
              </div>
            )}
          </div>

          {/* Question Corrections */}
          <div className="relative mt-4">
            <div className="space-y-4">
              {questions.map((question, index) => {
                if (!question) return null;

                const userAnswer = userAnswers[index];

                const normalizedCorrectIndex = (() => {
                  if (typeof question.correctAnswer === 'number') {
                    return question.correctAnswer;
                  }
                  if (typeof question.correctAnswer === 'string') {
                    const normalized = question.correctAnswer.toLowerCase();
                    if (normalized === 'a' || normalized === 'vrai' || normalized === 'true') return 0;
                    if (normalized === 'b' || normalized === 'faux' || normalized === 'false') return 1;
                    if (normalized === 'c') return 2;
                    if (normalized === 'd') return 3;
                    const parsed = parseInt(question.correctAnswer, 10);
                    if (!Number.isNaN(parsed)) return parsed;
                  }
                  return null;
                })();

                const isUserCorrect = normalizedCorrectIndex !== null
                  ? userAnswer === normalizedCorrectIndex
                  : userAnswer !== null && userAnswer === question.correctAnswer;

                const options = question.options || [];

                return (
                  <div
                    key={question.id ?? index}
                    className="bg-white border border-neutral-200 rounded-lg p-4 xs:p-6 shadow"
                  >
                    <div className="flex items-start gap-3 xs:gap-4 mb-4">
                      <span className="text-base xs:text-lg">{getSubjectIcon(question.subject || 'N/A')}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-neutral-600">Question {index + 1}</span>
                          <span className="text-xs text-neutral-500">• {question.subject || 'N/A'}</span>
                          {userAnswer !== null && (
                            isUserCorrect ? (
                              <CheckCircle className="w-4 h-4 xs:w-5 xs:h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 xs:w-5 xs:h-5 text-red-500" />
                            )
                          )}
                        </div>
                        <MathText
                          text={question.question || 'N/A'}
                          block
                          className="font-semibold text-neutral-900 mb-4 text-sm xs:text-base"
                        />
                        <div className="space-y-2 mb-4">
                          {options.length > 0 ? (
                            options.map((option, optionIndex) => {
                              const isCorrectOption = normalizedCorrectIndex === optionIndex;
                              const isUserSelection = userAnswer === optionIndex;
                              return (
                                <div
                                  key={optionIndex}
                                  className={`flex items-center gap-3 p-3 rounded-lg ${
                                    isCorrectOption
                                      ? 'bg-green-50 border border-green-200'
                                      : isUserSelection && !isCorrectOption
                                      ? 'bg-red-50 border border-red-200'
                                      : 'bg-neutral-50'
                                  }`}
                                >
                                  <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                                      isCorrectOption
                                        ? 'bg-green-500 text-white'
                                        : isUserSelection && !isCorrectOption
                                        ? 'bg-red-500 text-white'
                                        : 'bg-neutral-300 text-neutral-700'
                                    }`}
                                  >
                                    {String.fromCharCode(65 + optionIndex)}
                                  </div>
                                  <span className={isCorrectOption ? 'font-medium' : ''}>
                                    <MathText text={option} />
                                  </span>
                                  {isCorrectOption && (
                                    <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                                  )}
                                  {isUserSelection && !isCorrectOption && (
                                    <XCircle className="w-4 h-4 text-red-500 ml-auto" />
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-3 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-600">
                              <div>
                                Réponse correcte : <MathText text={String(question.correctAnswer)} />
                              </div>
                              <div>
                                Votre réponse :{' '}
                                <MathText text={userAnswer !== null ? String(userAnswer) : 'Aucune réponse'} />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-blue-800 text-sm">
                            <strong>Explication :</strong>{' '}
                            <MathText text={question.explanation || 'Aucune explication fournie.'} />
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
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
