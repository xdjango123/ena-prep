import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, XCircle, SkipForward, Home, Trophy, Brain, ChevronLeft, ChevronRight, Repeat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MathText from '../common/MathText';

interface Question {
  id: number;
  type: 'multiple-choice' | 'true-false' | 'fill-blank' | 'matching';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  passage?: {
    id: string;
    title?: string;
    content: string;
    category?: string;
  };
}

interface QuizSeriesProps {
  subject: string;
  subjectColor: string;
  questions: Question[];
  duration: number; // Duration in seconds
  onExit: () => void;
  onFinish: (answers: Map<number, string | number>, timeSpent: number) => void;
}

const getQuizState = (subject: string) => {
    const savedState = localStorage.getItem(`quizState_${subject}`);
    if (savedState) {
        const state = JSON.parse(savedState);
        return {
            ...state,
            userAnswers: new Map(state.userAnswers),
        };
    }
    return null;
}

const saveQuizState = (subject: string, state: any) => {
    const stateToSave = {
        ...state,
        userAnswers: Array.from(state.userAnswers.entries()),
    };
    localStorage.setItem(`quizState_${subject}`, JSON.stringify(stateToSave));
};

const clearQuizState = (subject: string) => {
    localStorage.removeItem(`quizState_${subject}`);
}

export const QuizSeries: React.FC<QuizSeriesProps> = ({ 
  subject, 
  subjectColor, 
  questions, 
  duration,
  onExit,
  onFinish,
}) => {
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [userAnswers, setUserAnswers] = useState<Map<number, string | number>>(new Map());
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const savedState = getQuizState(subject);
    if (savedState) {
        setCurrentQuestionIndex(savedState.currentQuestionIndex);
        setAnsweredQuestions(new Set(savedState.answeredQuestions));
        setUserAnswers(savedState.userAnswers);
        setTimeRemaining(savedState.timeRemaining);
    }
    
    // Scroll to top when component mounts
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [subject]);

  useEffect(() => {
    if (!isCompleted) {
        saveQuizState(subject, {
            currentQuestionIndex,
            answeredQuestions: Array.from(answeredQuestions),
            userAnswers,
            timeRemaining,
        });
    }
  }, [subject, currentQuestionIndex, answeredQuestions, userAnswers, timeRemaining, isCompleted]);

  // Scroll to top when question changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentQuestionIndex]);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const isCurrentQuestionAnswered = currentQuestion ? answeredQuestions.has(currentQuestion.id) : false;
  const canGoNext = currentQuestionIndex < questions.length - 1 && isCurrentQuestionAnswered;
  const canGoPrevious = currentQuestionIndex > 0;

  // Add early return if no questions
  if (!questions || questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Erreur: Aucune question disponible</div>
          <button 
            onClick={onExit} 
            className="px-6 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
          >
            Retour au menu principal
          </button>
        </div>
      </div>
    );
  }

  // Add null check for currentQuestion
  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Erreur: Question non trouvée</div>
          <button 
            onClick={onExit} 
            className="px-6 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
          >
            Retour au menu principal
          </button>
        </div>
      </div>
    );
  }

  // Timer
  useEffect(() => {
    if (isCompleted) return;

    if (timeRemaining <= 0) {
      handleFinishQuiz();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, isCompleted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (answer: string | number) => {
    if (!currentQuestion) return;
    setSelectedAnswer(answer);
    
    // Store the user's answer immediately
    setUserAnswers(prev => new Map(prev).set(currentQuestion.id, answer));
    
    // Check if answer is correct and update correct answers count
    const isCorrect = (() => {
      if (currentQuestion.type === 'multiple-choice' && typeof currentQuestion.correctAnswer === 'number') {
        // For multiple choice, compare the selected index with the correct index
        return answer === currentQuestion.correctAnswer;
      } else if (currentQuestion.type === 'true-false') {
        // For true/false, compare strings
        return String(answer).toLowerCase() === String(currentQuestion.correctAnswer).toLowerCase();
      }
      // Fallback comparison
      return answer === currentQuestion.correctAnswer;
    })();

    // Update correct answers count if this question hasn't been answered before
    if (isCorrect && !answeredQuestions.has(currentQuestion.id)) {
      setCorrectAnswers(prev => prev + 1);
    }
    
    // Mark question as answered
    setAnsweredQuestions(prev => new Set([...prev, currentQuestion.id]));
  };

  // Load previously selected answer when changing questions
  useEffect(() => {
    if (!currentQuestion) return;
    const previousAnswer = userAnswers.get(currentQuestion.id);
    if (previousAnswer !== undefined) {
      setSelectedAnswer(previousAnswer);
    } else {
      setSelectedAnswer(null);
    }
    setShowResult(false);
  }, [currentQuestionIndex, userAnswers, currentQuestion?.id]);

  const handleSubmitAnswer = () => {
    if (!currentQuestion || selectedAnswer === null) return;

    // Store the user's answer
    setUserAnswers(prev => new Map([...prev, [currentQuestion.id, selectedAnswer]]));

    // More robust comparison logic
    const isCorrect = (() => {
      if (currentQuestion.type === 'multiple-choice' && typeof currentQuestion.correctAnswer === 'number') {
        // For multiple choice, compare the selected index with the correct index
        return selectedAnswer === currentQuestion.correctAnswer;
      } else if (currentQuestion.type === 'true-false') {
        // For true/false, compare strings
        return String(selectedAnswer).toLowerCase() === String(currentQuestion.correctAnswer).toLowerCase();
      }
      // Fallback comparison
      return selectedAnswer === currentQuestion.correctAnswer;
    })();

    if (isCorrect && !answeredQuestions.has(currentQuestion.id)) {
      setCorrectAnswers(prev => prev + 1);
    }

    setAnsweredQuestions(prev => new Set([...prev, currentQuestion.id]));
    setShowResult(true);

    // Auto advance after 2 seconds only if not at the last question
    if (currentQuestionIndex < questions.length - 1) {
      setTimeout(() => {
        handleNextQuestion();
      }, 2000);
    } else {
      handleFinishQuiz();
    }
  };

  const handleSkipQuestion = () => {
    if (!currentQuestion) return;
    setAnsweredQuestions(prev => new Set([...prev, currentQuestion.id]));
    handleNextQuestion();
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      // Scroll to top when navigating to next question
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePreviousQuestion = () => {
    if (canGoPrevious) {
      setCurrentQuestionIndex(prev => prev - 1);
      setSelectedAnswer(null);
      setShowResult(false);
      // Scroll to top when navigating to previous question
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFinishQuiz = () => {
    setIsCompleted(true);
    clearQuizState(subject);
    onFinish(userAnswers, duration - timeRemaining);
    // Scroll to top when finishing quiz
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExit = () => {
    clearQuizState(subject);
    onExit();
    // Scroll to top when exiting quiz
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'multiple-choice': return '🔤';
      case 'true-false': return '✓✗';
      case 'fill-blank': return '📝';
      case 'matching': return '🔗';
      default: return '❓';
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'multiple-choice': return 'Choix Multiple';
      case 'true-false': return 'Vrai/Faux';
      case 'fill-blank': return 'Texte à Trou';
      case 'matching': return 'Association';
      default: return 'Question';
    }
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

  // Helper function to get color classes safely
  const getColorClasses = (base: string, variant: string = '500', type: 'bg' | 'text' | 'border' = 'bg') => {
    const colorMap: Record<string, Record<string, Record<string, string>>> = {
      'blue': {
        '100': { 'bg': 'bg-blue-100', 'text': 'text-blue-100', 'border': 'border-blue-100' },
        '200': { 'bg': 'bg-blue-200', 'text': 'text-blue-200', 'border': 'border-blue-200' },
        '500': { 'bg': 'bg-blue-500', 'text': 'text-blue-500', 'border': 'border-blue-500' },
        '600': { 'bg': 'bg-blue-600', 'text': 'text-blue-600', 'border': 'border-blue-600' },
        '800': { 'bg': 'bg-blue-800', 'text': 'text-blue-800', 'border': 'border-blue-800' }
      },
      'green': {
        '100': { 'bg': 'bg-green-100', 'text': 'text-green-100', 'border': 'border-green-100' },
        '200': { 'bg': 'bg-green-200', 'text': 'text-green-200', 'border': 'border-green-200' },
        '500': { 'bg': 'bg-green-500', 'text': 'text-green-500', 'border': 'border-green-500' },
        '600': { 'bg': 'bg-green-600', 'text': 'text-green-600', 'border': 'border-green-600' },
        '800': { 'bg': 'bg-green-800', 'text': 'text-green-800', 'border': 'border-green-800' }
      },
      'yellow': {
        '100': { 'bg': 'bg-yellow-100', 'text': 'text-yellow-100', 'border': 'border-yellow-100' },
        '200': { 'bg': 'bg-yellow-200', 'text': 'text-yellow-200', 'border': 'border-yellow-200' },
        '500': { 'bg': 'bg-yellow-500', 'text': 'text-yellow-500', 'border': 'border-yellow-500' },
        '600': { 'bg': 'bg-yellow-600', 'text': 'text-yellow-600', 'border': 'border-yellow-600' },
        '800': { 'bg': 'bg-yellow-800', 'text': 'text-yellow-800', 'border': 'border-yellow-800' }
      },
      'purple': {
        '100': { 'bg': 'bg-purple-100', 'text': 'text-purple-100', 'border': 'border-purple-100' },
        '200': { 'bg': 'bg-purple-200', 'text': 'text-purple-200', 'border': 'border-purple-200' },
        '500': { 'bg': 'bg-purple-500', 'text': 'text-purple-500', 'border': 'border-purple-500' },
        '600': { 'bg': 'bg-purple-600', 'text': 'text-purple-600', 'border': 'border-purple-600' },
        '800': { 'bg': 'bg-purple-800', 'text': 'text-purple-800', 'border': 'border-purple-800' }
      }
    };
    
    return colorMap[subjectColor]?.[variant]?.[type] || colorMap['blue'][variant][type];
  };

  if (isCompleted) {
    // Calculate results
    const correctAnswers = questions.reduce((count, q) => {
      const userAnswer = userAnswers.get(q.id);
      if (q.type === 'multiple-choice' && typeof q.correctAnswer === 'number') {
        // For multiple choice, compare the selected index with the correct index
        return userAnswer === q.correctAnswer ? count + 1 : count;
      } else if (q.type === 'true-false') {
        // For true/false, compare strings
        return String(userAnswer).toLowerCase() === String(q.correctAnswer).toLowerCase() ? count + 1 : count;
      }
      // Fallback comparison
      return userAnswer === q.correctAnswer ? count + 1 : count;
    }, 0);
    
    const score = Math.round((correctAnswers / questions.length) * 100);
    const timeSpent = duration - timeRemaining;

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col p-4">
        <div className="max-w-4xl mx-auto w-full">
          {/* Results Header */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Test Terminé !</h1>
              <p className="text-gray-600 mb-8">{getSubtitle(score)}</p>
              
              {/* Score and Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className={`text-3xl font-bold ${getColorClasses(subjectColor, '600', 'text')}`}>{score}%</h3>
                  <p className="text-sm text-gray-500">Score</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-3xl font-bold">{correctAnswers}/{questions.length}</h3>
                  <p className="text-sm text-gray-500">Correct</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-3xl font-bold">{formatTime(timeSpent)}</h3>
                  <p className="text-sm text-gray-500">Temps</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-3xl font-bold">{questions.length}</h3>
                  <p className="text-sm text-gray-500">Questions</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button 
                  onClick={() => {
                    setCurrentQuestionIndex(0);
                    setUserAnswers(new Map());
                    setTimeRemaining(duration);
                    setIsCompleted(false);
                    setSelectedAnswer(null);
                  }}
                  className={`flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-lg ${getColorClasses(subjectColor, '500', 'bg')} text-white font-semibold hover:${getColorClasses(subjectColor, '600', 'bg')} transition-colors`}
                >
                  <Repeat className="w-5 h-5" />
                  Refaire le test
                </button>
                <button 
                  onClick={onExit}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 transition-colors"
                >
                  Retour
                </button>
              </div>
            </div>
          </div>

          {/* Question Corrections */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Corrections</h2>
            <div className="space-y-6">
              {questions.map((question, index) => {
                const userAnswer = userAnswers.get(question.id);
                const isCorrect = (() => {
                  if (question.type === 'multiple-choice' && typeof question.correctAnswer === 'number') {
                    // For multiple choice, compare the selected index with the correct index
                    return userAnswer === question.correctAnswer;
                  } else if (question.type === 'true-false') {
                    return String(userAnswer).toLowerCase() === String(question.correctAnswer).toLowerCase();
                  }
                  return userAnswer === question.correctAnswer;
                })();

                const getCorrectAnswerText = () => {
                  if (question.type === 'multiple-choice' && typeof question.correctAnswer === 'number') {
                    return question.options?.[question.correctAnswer];
                  }
                  return question.correctAnswer;
                };

                return (
                  <div key={question.id} className="border border-gray-200 rounded-lg p-6">
                    {/* Passage Section - Show if question has a passage */}
                    {question.passage && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <div className="mb-3">
                          <h4 className="text-base font-semibold text-blue-900 mb-2">
                            {question.passage.title || 'Texte de référence'}
                          </h4>
                          {question.passage.category && (
                            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                              {question.passage.category}
                            </span>
                          )}
                        </div>
                        <div className="prose prose-sm max-w-none">
                          <div className="text-blue-800 leading-relaxed whitespace-pre-wrap text-sm">
                            {question.passage.content}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-sm font-medium text-gray-600">Question {index + 1}</span>
                      {isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    
                    <MathText
                      text={question.question}
                      block
                      className="font-semibold text-gray-900 mb-4"
                    />
                    
                    {question.type === 'multiple-choice' && question.options && (
                      <div className="space-y-2 mb-4">
                        {question.options.map((option, optionIndex) => {
                          const isSelected = userAnswer === optionIndex; // Compare with index, not text
                          const isCorrectOption = optionIndex === question.correctAnswer;
                          
                          return (
                            <div
                              key={optionIndex}
                              className={`flex items-center gap-3 p-3 rounded-lg ${
                                isCorrectOption
                                  ? 'bg-green-50 border border-green-200'
                                  : isSelected && !isCorrectOption
                                  ? 'bg-red-50 border border-red-200'
                                  : 'bg-gray-50'
                              }`}
                            >
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                                isCorrectOption
                                  ? 'bg-green-500 text-white'
                                  : isSelected && !isCorrectOption
                                  ? 'bg-red-500 text-white'
                                  : 'bg-gray-300 text-gray-700'
                              }`}>
                                {String.fromCharCode(65 + optionIndex)}
                              </div>
                              <span className={isCorrectOption ? 'font-medium' : ''}>
                                <MathText text={option} />
                              </span>
                              {isCorrectOption && (
                                <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                              )}
                              {isSelected && !isCorrectOption && (
                                <XCircle className="w-4 h-4 text-red-500 ml-auto" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {question.type === 'true-false' && (
                      <div className="space-y-2 mb-4">
                        {['Vrai', 'Faux'].map((option, optionIndex) => {
                          const answerValue = optionIndex === 0 ? 'Vrai' : 'Faux';
                          const isSelected = userAnswer === answerValue;
                          const isCorrectOption = String(question.correctAnswer).toLowerCase() === answerValue.toLowerCase();
                          
                          return (
                            <div
                              key={option}
                              className={`flex items-center gap-3 p-3 rounded-lg ${
                                isCorrectOption
                                  ? 'bg-green-50 border border-green-200'
                                  : isSelected && !isCorrectOption
                                  ? 'bg-red-50 border border-red-200'
                                  : 'bg-gray-50'
                              }`}
                            >
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                                isCorrectOption
                                  ? 'bg-green-500 text-white'
                                  : isSelected && !isCorrectOption
                                  ? 'bg-red-500 text-white'
                                  : 'bg-gray-300 text-gray-700'
                              }`}>
                                {String.fromCharCode(65 + optionIndex)}
                              </div>
                              <span className={isCorrectOption ? 'font-medium' : ''}>
                                {option}
                              </span>
                              {isCorrectOption && (
                                <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                              )}
                              {isSelected && !isCorrectOption && (
                                <XCircle className="w-4 h-4 text-red-500 ml-auto" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-blue-800 text-sm">
                        <strong>Réponse correcte :</strong> {getCorrectAnswerText()}
                      </p>
                      {question.explanation && (
                        <p className="text-blue-800 text-sm mt-2">
                          <strong>Explication :</strong> {question.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-4">
      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm z-10">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className={`p-2 ${getColorClasses(subjectColor, '100', 'bg')} rounded-lg`}>
                    <Brain className={`w-6 h-6 ${getColorClasses(subjectColor, '600', 'text')}`} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-800">{subject}</h1>
                    <p className="text-sm text-gray-500">{getQuestionTypeLabel(currentQuestion.type)}</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 font-semibold text-lg">
                    <Clock className="w-5 h-5" />
                    <span className="font-semibold">{formatTime(timeRemaining)}</span>
                </div>
                <button onClick={handleExit} className="text-gray-500 hover:text-gray-800">
                  <X className="w-6 h-6" />
                </button>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="my-4 px-4">
        <div className="h-2 bg-gray-200 rounded-full">
          <div 
            className={`h-2 rounded-full ${getColorClasses(subjectColor, '500', 'bg')} transition-all duration-300`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Question Navigation */}
      <div className="px-4 mb-4">
        <div className="flex flex-wrap gap-2 justify-center">
          {questions.map((q, index) => (
            <button
              key={q.id}
              onClick={() => setCurrentQuestionIndex(index)}
              className={`w-8 h-8 rounded-full text-sm font-semibold transition-colors
                ${index === currentQuestionIndex ? `${getColorClasses(subjectColor, '500', 'bg')} text-white` : ''}
                ${userAnswers.has(q.id) ? `${getColorClasses(subjectColor, '200', 'bg')} ${getColorClasses(subjectColor, '800', 'text')}` : 'bg-gray-200 text-gray-700'}
                ${index !== currentQuestionIndex && `hover:${getColorClasses(subjectColor, '100', 'bg')}`}
              `}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>
      
      {/* Question Card */}
      <div className="flex-grow flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-4xl">
          {/* Passage Section - Show if question has a passage */}
          {currentQuestion.passage && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  {currentQuestion.passage.title || 'Texte de référence'}
                </h3>
                {currentQuestion.passage.category && (
                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                    {currentQuestion.passage.category}
                  </span>
                )}
              </div>
              <div className="prose prose-sm max-w-none">
                <div className="text-blue-800 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                  {currentQuestion.passage.content}
                </div>
              </div>
            </div>
          )}
          
          {/* Question Section */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="mb-6">
              <h4 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                Question
              </h4>
              <MathText
                text={currentQuestion.question}
                block
                className="text-gray-700 text-base sm:text-lg"
              />
            </div>
            
            <div className="space-y-4">
              {currentQuestion.type === 'multiple-choice' && currentQuestion.options?.map((option, index) => {
                const isSelected = selectedAnswer === index;
                return (
                  <div
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${isSelected ? `${getColorClasses(subjectColor, '100', 'bg')} ${getColorClasses(subjectColor, '500', 'border')} shadow-md` : 'bg-white border-gray-200 hover:border-gray-300'}`}
                  >
                    <MathText text={option} />
                  </div>
                );
              })}
              {currentQuestion.type === 'true-false' && ['Vrai', 'Faux'].map((option, index) => {
                const answerValue = index === 0 ? 'Vrai' : 'Faux';
                const isSelected = selectedAnswer === answerValue;
                return (
                  <div
                    key={option}
                    onClick={() => handleAnswerSelect(answerValue)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${isSelected ? `${getColorClasses(subjectColor, '100', 'bg')} ${getColorClasses(subjectColor, '500', 'border')} shadow-md` : 'bg-white border-gray-200 hover:border-gray-300'}`}
                  >
                    {option}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="mt-6 flex justify-between items-center px-4">
        <button 
          onClick={handlePreviousQuestion}
          disabled={!canGoPrevious}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-gray-700 font-semibold shadow-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
          Précédent
        </button>
        <button 
          onClick={currentQuestionIndex === questions.length - 1 ? handleFinishQuiz : handleNextQuestion}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-gray-700 font-semibold shadow-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {currentQuestionIndex === questions.length - 1 ? 'Terminer' : 'Suivant'}
          <ChevronRight className="w-5 h-5" />
        </button>
      </footer>
    </div>
  );
}; 
