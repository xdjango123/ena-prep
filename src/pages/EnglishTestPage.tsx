import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { Clock, ChevronRight, ChevronLeft, Check, X, AlertCircle } from 'lucide-react';
import { QuestionService } from '../services/questionService';
import { formatExponents } from '../utils/mathFormatting';

interface EnglishQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
}

interface TestResult {
  questionId: string;
  selectedAnswer: number | null;
  isCorrect: boolean;
  score: number; // +1, 0, or -1
}

interface TestConfig {
  questionCount: number;
  timeLimit: number; // in minutes
  testType: 'practice' | 'exam';
}

export default function EnglishTestPage() {
  const { user, selectedExamType } = useSupabaseAuth();
  const navigate = useNavigate();
  
  const [testConfig, setTestConfig] = useState<TestConfig | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [testQuestions, setTestQuestions] = useState<EnglishQuestion[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Timer effect
  useEffect(() => {
    if (timeLeft > 0 && !isSubmitted && testConfig) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && testConfig) {
      handleSubmit();
    }
  }, [timeLeft, isSubmitted, testConfig]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const startTest = async (config: TestConfig) => {
    try {
      setLoadError(null);
      setIsSubmitted(false);
      setShowReview(false);
      setResults([]);
      setCurrentQuestion(0);
      setTestQuestions([]);
      setAnswers({});
      setTimeLeft(0);
      setTestConfig(config);
      setIsLoadingQuestions(true);

      const effectiveExamType = (selectedExamType ?? 'CM') as
        | 'CM'
        | 'CMS'
        | 'CS';

      const testTypes: ('practice_test' | 'examen_blanc')[] =
        config.testType === 'practice' ? ['practice_test'] : ['examen_blanc'];

      const seed = Math.floor(Date.now() / 1000);

      const dbQuestions = await QuestionService.getRandomQuestions(
        'ANG',
        config.questionCount,
        undefined,
        seed,
        effectiveExamType,
        testTypes
      );

      if (!dbQuestions || dbQuestions.length === 0) {
        throw new Error(
          'Aucune question disponible pour ce test pour le moment. Veuillez réessayer plus tard.'
        );
      }

      const formattedQuestions = dbQuestions
        .map<EnglishQuestion | null>((dbQ, index) => {
          const allAnswers = [
            dbQ.answer1,
            dbQ.answer2,
            dbQ.answer3,
            dbQ.answer4
          ];
          const validAnswers = allAnswers.filter(
            answer => answer && answer !== 'null'
          ) as string[];

          if (validAnswers.length < 2) {
            return null;
          }

          const correctLetter = (dbQ.correct || '').toUpperCase();

          let correctIndex = 0;
          if (correctLetter === 'A' && allAnswers[0] && allAnswers[0] !== 'null') {
            correctIndex = validAnswers.indexOf(allAnswers[0]!);
          } else if (
            correctLetter === 'B' &&
            allAnswers[1] &&
            allAnswers[1] !== 'null'
          ) {
            correctIndex = validAnswers.indexOf(allAnswers[1]!);
          } else if (
            correctLetter === 'C' &&
            allAnswers[2] &&
            allAnswers[2] !== 'null'
          ) {
            correctIndex = validAnswers.indexOf(allAnswers[2]!);
          } else if (
            correctLetter === 'D' &&
            allAnswers[3] &&
            allAnswers[3] !== 'null'
          ) {
            correctIndex = validAnswers.indexOf(allAnswers[3]!);
          }

          const formattedQuestionText = formatExponents(dbQ.question_text);
          const formattedOptions = validAnswers.map(option => formatExponents(option));
          const formattedExplanation = formatExponents(
            (dbQ as any).explanation ||
              `La réponse correcte est ${
                formattedOptions[correctIndex >= 0 ? correctIndex : 0]
              }.`
          );

          return {
            id: dbQ.id || `${index}`,
            question: formattedQuestionText,
            options: formattedOptions,
            correctAnswer: correctIndex >= 0 ? correctIndex : 0,
            explanation: formattedExplanation,
            difficulty:
              dbQ.difficulty?.toLowerCase?.() === 'easy' ||
              dbQ.difficulty?.toLowerCase?.() === 'medium' ||
              dbQ.difficulty?.toLowerCase?.() === 'hard'
                ? (dbQ.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard')
                : 'medium',
            category: 'Anglais'
          };
        })
        .filter((q): q is EnglishQuestion => q !== null);

      if (formattedQuestions.length === 0) {
        throw new Error(
          'Les questions chargées ne sont pas compatibles avec ce test. Veuillez réessayer.'
        );
      }

      const initialAnswers: Record<string, number | null> = {};
      formattedQuestions.forEach(q => {
        initialAnswers[q.id] = null;
      });

      setTestQuestions(formattedQuestions);
      setAnswers(initialAnswers);
      setTimeLeft(config.timeLimit * 60);
    } catch (error) {
      console.error('Error starting English test:', error);
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Erreur lors du chargement des questions. Veuillez réessayer.'
      );
      setTestConfig(null);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (testQuestions[currentQuestion]) {
      setAnswers(prev => ({
        ...prev,
        [testQuestions[currentQuestion].id]: answerIndex
      }));
    }
  };

  const handleNext = () => {
    if (currentQuestion < testQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const calculateResults = (): TestResult[] => {
    return testQuestions.map(question => {
      const selectedAnswer = answers[question.id];
      const isCorrect = selectedAnswer === question.correctAnswer;
      
      let score = 0;
      if (selectedAnswer === null) {
        score = 0; // No answer
      } else if (isCorrect) {
        score = 1; // Correct answer
      } else {
        score = -1; // Wrong answer
      }

      return {
        questionId: question.id,
        selectedAnswer,
        isCorrect,
        score
      };
    });
  };

  const handleSubmit = () => {
    const testResults = calculateResults();
    setResults(testResults);
    setIsSubmitted(true);
    
    // Store results in localStorage (in real app, send to backend)
    const testData = {
      subject: 'english',
      testType: testConfig?.testType,
      results: testResults,
      totalScore: testResults.reduce((sum, r) => sum + r.score, 0),
      maxPossibleScore: testQuestions.length,
      timeSpent: testConfig ? (testConfig.timeLimit * 60) - timeLeft : 0,
      completedAt: new Date().toISOString()
    };
    
    localStorage.setItem(`english_test_${user?.id}_${Date.now()}`, JSON.stringify(testData));
  };

  const getTotalScore = () => {
    return results.reduce((sum, result) => sum + result.score, 0);
  };

  const getScorePercentage = () => {
    const totalScore = getTotalScore();
    const maxScore = testQuestions.length;
    return Math.round((totalScore / maxScore) * 100);
  };

  const getCorrectAnswers = () => {
    return results.filter(r => r.isCorrect).length;
  };

  const getWrongAnswers = () => {
    return results.filter(r => r.selectedAnswer !== null && !r.isCorrect).length;
  };

  const getUnanswered = () => {
    return results.filter(r => r.selectedAnswer === null).length;
  };

  // Function to get conditional subtitle based on score
  const getSubtitle = (score: number) => {
    if (score < 30) {
      return 'Encore un effort, voici vos résultats.';
    } else if (score >= 30 && score < 50) {
      return 'Peut mieux faire, voici vos résultats.';
    } else if (score >= 50 && score < 70) {
      return 'En progrès, voici vos résultats.';
    } else if (score >= 70 && score < 85) {
      return 'Encourageant, voici vos résultats.';
    } else if (score >= 85 && score < 95) {
      return 'Très bien, voici vos résultats.';
    } else if (score >= 95 && score < 100) {
      return 'Excellent, voici vos résultats.';
    } else if (score === 100) {
      return 'Parfait, voici vos résultats.';
    } else {
      return 'Encore un effort, voici vos résultats.';
    }
  };

  // Test selection screen
  if (!testConfig) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">Test d'Anglais</h1>
            {loadError && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {loadError}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-2 border-blue-200 rounded-lg p-6 hover:border-blue-400 transition-colors">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Test de Pratique</h3>
                <p className="text-gray-600 mb-4">
                  Test rapide pour vous entraîner avec un retour immédiat.
                </p>
                <ul className="text-sm text-gray-500 mb-6 space-y-1">
                  <li>• 15 questions</li>
                  <li>• 20 minutes</li>
                  <li>• Correction détaillée</li>
                  <li>• Peut être refait</li>
                </ul>
                <button
                  onClick={() =>
                    void startTest({ questionCount: 15, timeLimit: 20, testType: 'practice' })
                  }
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Commencer le Test de Pratique
                </button>
              </div>

              <div className="border-2 border-red-200 rounded-lg p-6 hover:border-red-400 transition-colors">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Examen Blanc</h3>
                <p className="text-gray-600 mb-4">
                  Test complet dans les conditions réelles d'examen.
                </p>
                <ul className="text-sm text-gray-500 mb-6 space-y-1">
                  <li>• 30 questions</li>
                  <li>• 45 minutes</li>
                  <li>• Conditions d'examen</li>
                  <li>• Évaluation complète</li>
                </ul>
                <button
                  onClick={() =>
                    void startTest({ questionCount: 30, timeLimit: 45, testType: 'exam' })
                  }
                  className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                >
                  Commencer l'Examen Blanc
                </button>
              </div>
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                ← Retour au tableau de bord
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Results screen
  if (isSubmitted && results.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Test Terminé !</h1>
              <p className="text-gray-600">{getSubtitle(Math.round((getTotalScore() / testQuestions.length) * 100))}</p>
            </div>

            {/* Score Summary */}
                         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
               <div className="bg-blue-50 rounded-lg p-4 text-center">
                 <div className="text-2xl font-bold text-blue-600">{getTotalScore()}/{testQuestions.length}</div>
                 <div className="text-sm text-gray-600">Score Total</div>
               </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{getCorrectAnswers()}</div>
                <div className="text-sm text-gray-600">Bonnes Réponses</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{getWrongAnswers()}</div>
                <div className="text-sm text-gray-600">Mauvaises Réponses</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-600">{getUnanswered()}</div>
                <div className="text-sm text-gray-600">Non Répondues</div>
              </div>
            </div>

            {/* Detailed Results */}
            {showReview && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Correction Détaillée</h3>
                <div className="space-y-4">
                  {testQuestions.map((question, index) => {
                    const result = results.find(r => r.questionId === question.id);
                    const userAnswer = result?.selectedAnswer;
                    
                    return (
                      <div key={question.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-sm font-medium text-gray-500">Question {index + 1}</span>
                          <div className="flex items-center">
                            {result?.score === 1 && <Check className="w-5 h-5 text-green-600" />}
                            {result?.score === -1 && <X className="w-5 h-5 text-red-600" />}
                            {result?.score === 0 && <AlertCircle className="w-5 h-5 text-gray-400" />}
                            <span className={`ml-1 text-sm font-medium ${
                              result?.score === 1 ? 'text-green-600' : 
                              result?.score === -1 ? 'text-red-600' : 'text-gray-500'
                            }`}>
                              {result?.score === 1 ? '+1' : result?.score === -1 ? '-1' : '0'}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-gray-900 mb-3">{question.question}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {question.options.map((option, optionIndex) => (
                            <div
                              key={optionIndex}
                              className={`p-2 rounded text-sm ${
                                optionIndex === question.correctAnswer
                                  ? 'bg-green-100 text-green-800 border border-green-300'
                                  : userAnswer === optionIndex && optionIndex !== question.correctAnswer
                                  ? 'bg-red-100 text-red-800 border border-red-300'
                                  : 'bg-gray-50 text-gray-700'
                              }`}
                            >
                              {String.fromCharCode(97 + optionIndex)}. {option}
                              {optionIndex === question.correctAnswer && ' ✓'}
                              {userAnswer === optionIndex && optionIndex !== question.correctAnswer && ' ✗'}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="text-center">
              <button
                onClick={() => setShowReview(!showReview)}
                className="bg-gray-200 text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors mr-4"
              >
                {showReview ? 'Masquer' : 'Voir'} la Correction Détaillée
              </button>
              <button
                onClick={() => {
                  setTestConfig(null);
                  setIsSubmitted(false);
                  setResults([]);
                  setCurrentQuestion(0);
                  setAnswers({});
                  setShowReview(false);
                }}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors mr-4"
              >
                Nouveau Test
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-gray-200 text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Retour au Tableau de Bord
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (testConfig && isLoadingQuestions) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-8 flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Chargement des questions d'anglais...</p>
          </div>
        </div>
      </div>
    );
  }

  // Test interface
  const question = testQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / testQuestions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Test d'Anglais - {testConfig.testType === 'practice' ? 'Pratique' : 'Examen Blanc'}
            </h1>
            <div className="flex items-center text-blue-600 font-semibold">
              <Clock className="w-5 h-5 mr-2" />
              {formatTime(timeLeft)}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600">
            Question {currentQuestion + 1} sur {testQuestions.length}
          </p>
        </div>

        {/* Question */}
        {question && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="mb-6">
              <span className="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full mb-4">
                {question.category} - {question.difficulty}
              </span>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                {question.question}
              </h2>
            </div>

            <div className="space-y-4 mb-8">
              {question.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    answers[question.id] === index
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                      answers[question.id] === index
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {answers[question.id] === index && (
                        <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                      )}
                    </div>
                    <span className="text-gray-900">
                      {String.fromCharCode(97 + index)}. {option}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
                className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Précédent
              </button>

              <div className="flex space-x-4">
                {currentQuestion === testQuestions.length - 1 ? (
                  <button
                    onClick={handleSubmit}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    Terminer le Test
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="flex items-center bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Suivant
                    <ChevronRight className="w-5 h-5 ml-1" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
