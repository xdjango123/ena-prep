import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { X, Clock, CheckCircle, XCircle, Home, Trophy, Brain, ChevronLeft, ChevronRight, AlertTriangle, Shield, Menu, Flag, Save, CheckSquare, Eye } from 'lucide-react';
import { QuestionService } from '../../services/questionService';

interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false';
  question: string;
  options?: string[];
  correctAnswer: number | string;
  explanation?: string;
  difficulty: string;
  category: 'ANG' | 'CG' | 'LOG';
  exam_type?: string;
}

interface SecureExamInterfaceProps {
  onExit: () => void;
}

export const SecureExamInterface: React.FC<SecureExamInterfaceProps> = ({ onExit }) => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | number | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [userAnswers, setUserAnswers] = useState<Map<string, string | number>>(new Map());
  const [timeRemaining, setTimeRemaining] = useState(180 * 60); // 3 hours in seconds
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start closed on mobile
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);
  const [showReview, setShowReview] = useState(false);
  
  const examStartTime = useRef<Date>(new Date());
  const autoSaveInterval = useRef<NodeJS.Timeout | null>(null);
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  // Show toast notification
  const showToast = useCallback((message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    setToast({ message, type });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // Security: Detect tab switching and window focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => prev + 1);
        if (tabSwitchCount >= 2) {
          handleFinishExam();
        }
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Êtes-vous sûr de vouloir quitter l\'examen ? Votre examen sera terminé automatiquement.';
      return 'Êtes-vous sûr de vouloir quitter l\'examen ? Votre examen sera terminé automatiquement.';
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [tabSwitchCount]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCompleted || isLoading) return;

      // Prevent default for exam-specific keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'j', 'k'].includes(e.key)) {
        e.preventDefault();
      }

      // Answer selection with arrow keys or J/K
      if (['ArrowUp', 'ArrowDown', 'j', 'k'].includes(e.key)) {
        const currentQuestion = questions[currentQuestionIndex];
        if (!currentQuestion) return;

        const options = currentQuestion.type === 'multiple-choice' 
          ? currentQuestion.options || []
          : ['Vrai', 'Faux'];

        const currentIndex = selectedAnswer !== null 
          ? (typeof selectedAnswer === 'number' ? selectedAnswer : (selectedAnswer === 'true' ? 0 : 1))
          : -1;

        let newIndex = currentIndex;
        if (e.key === 'ArrowUp' || e.key === 'k') {
          newIndex = currentIndex <= 0 ? options.length - 1 : currentIndex - 1;
        } else if (e.key === 'ArrowDown' || e.key === 'j') {
          newIndex = currentIndex >= options.length - 1 ? 0 : currentIndex + 1;
        }

        const answerValue = currentQuestion.type === 'multiple-choice' ? newIndex : (newIndex === 0 ? 'true' : 'false');
        handleAnswerSelect(answerValue);
      }

      // Navigation with left/right arrows
      if (e.key === 'ArrowLeft') {
        handlePreviousQuestion();
      } else if (e.key === 'ArrowRight') {
        handleNextQuestion();
      }

      // Select answer with Enter
      if (e.key === 'Enter' && selectedAnswer !== null) {
        handleNextQuestion();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestionIndex, selectedAnswer, questions, isCompleted, isLoading]);

  // Load exam questions in specific order: 20 ANG, then 20 CG, then 20 LOG
  useEffect(() => {
    const loadExamQuestions = async () => {
      setIsLoading(true);
      try {
        const allQuestions: Question[] = [];
        const subjects: ('ANG' | 'CG' | 'LOG')[] = ['ANG', 'CG', 'LOG'];
        
        for (const subject of subjects) {
          try {
            const subjectQuestions = await QuestionService.getQuestionsByCategory(subject, undefined, 20);
            
            if (subjectQuestions.length === 0) {
              const fallbackQuestions = await QuestionService.getExamQuestionsFallback(subject, 'CS', 20);
              if (fallbackQuestions.length > 0) {
                subjectQuestions.push(...fallbackQuestions);
              }
            }
            
            const convertedQuestions = subjectQuestions.map((dbQ) => {
              let type: 'multiple-choice' | 'true-false' = 'multiple-choice';
              let options: string[] | undefined = undefined;
              let correctAnswer: number | string = 0;
              
              if (dbQ.answer1 && dbQ.answer2 && dbQ.answer3 && dbQ.answer4) {
                type = 'multiple-choice';
                options = [dbQ.answer1, dbQ.answer2, dbQ.answer3, dbQ.answer4];
                correctAnswer = dbQ.correct === 'A' ? 0 : dbQ.correct === 'B' ? 1 : dbQ.correct === 'C' ? 2 : dbQ.correct === 'D' ? 3 : 0;
              } else if (dbQ.answer1 && dbQ.answer2 && !dbQ.answer3 && !dbQ.answer4) {
                type = 'true-false';
                options = [dbQ.answer1, dbQ.answer2];
                correctAnswer = dbQ.correct?.toLowerCase() === 'true' ? 'true' : 'false';
              }
              
              return {
                id: dbQ.id,
                type,
                question: dbQ.question_text,
                options,
                correctAnswer,
                explanation: (dbQ as any).explanation || `La réponse correcte est ${options?.[correctAnswer as number] || correctAnswer}.`,
                difficulty: dbQ.difficulty || 'medium',
                category: dbQ.category,
                exam_type: dbQ.exam_type
              };
            });
            
            allQuestions.push(...convertedQuestions);
          } catch (error) {
            console.error(`Error loading questions for ${subject}:`, error);
          }
        }
        
        if (allQuestions.length === 0) {
          throw new Error('No questions could be loaded for the exam. Please check if questions exist in the database.');
        }
        
        setQuestions(allQuestions);
        
      } catch (error) {
        console.error('Error loading exam questions:', error);
        setError(`Failed to load exam questions: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadExamQuestions();
  }, [examId]);

  // Auto-save answers every 30 seconds
  useEffect(() => {
    if (isCompleted || isLoading) return;

    autoSaveInterval.current = setInterval(() => {
      console.log('Auto-saving answers...');
      showToast('Réponses sauvegardées automatiquement', 'info');
    }, 30000);

    return () => {
      if (autoSaveInterval.current) {
        clearInterval(autoSaveInterval.current);
      }
    };
  }, [isCompleted, isLoading, showToast]);

  // Timer
  useEffect(() => {
    if (isCompleted || isLoading) return;

    if (timeRemaining <= 0) {
      handleFinishExam();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, isCompleted, isLoading]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (answer: string | number) => {
    if (!questions[currentQuestionIndex]) return;
    setSelectedAnswer(answer);
    
    setUserAnswers(prev => new Map(prev).set(questions[currentQuestionIndex].id, answer));
    
    const isCorrect = (() => {
      if (questions[currentQuestionIndex].type === 'multiple-choice' && typeof questions[currentQuestionIndex].correctAnswer === 'number') {
        return answer === questions[currentQuestionIndex].correctAnswer;
      } else if (questions[currentQuestionIndex].type === 'true-false') {
        return String(answer).toLowerCase() === String(questions[currentQuestionIndex].correctAnswer).toLowerCase();
      }
      return answer === questions[currentQuestionIndex].correctAnswer;
    })();

    if (isCorrect && !answeredQuestions.has(questions[currentQuestionIndex].id)) {
      setCorrectAnswers(prev => prev + 1);
    }
    
    setAnsweredQuestions(prev => new Set([...prev, questions[currentQuestionIndex].id]));
    showToast('Réponse sélectionnée', 'success');
  };

  const handleFlagQuestion = () => {
    const questionId = questions[currentQuestionIndex].id;
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
        showToast('Question non marquée', 'info');
      } else {
        newSet.add(questionId);
        showToast('Question marquée pour révision', 'info');
      }
      return newSet;
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handleFinishExam();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setSelectedAnswer(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFinishExam = () => {
    setIsCompleted(true);
    if (autoSaveInterval.current) {
      clearInterval(autoSaveInterval.current);
    }
  };

  const handleExit = () => {
    setShowExitWarning(true);
  };

  const confirmExit = () => {
    onExit();
  };

  // Get current subject section info
  const getCurrentSubjectInfo = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return { section: '', range: '', color: 'blue' };
    
    const angCount = questions.filter(q => q.category === 'ANG').length;
    const cgCount = questions.filter(q => q.category === 'CG').length;
    
    if (currentQuestionIndex < angCount) {
      return { 
        section: 'Anglais', 
        range: `Questions 1-${angCount}`,
        color: 'green'
      };
    } else if (currentQuestionIndex < angCount + cgCount) {
      return { 
        section: 'Culture Générale', 
        range: `Questions ${angCount + 1}-${angCount + cgCount}`,
        color: 'blue'
      };
    } else {
      return { 
        section: 'Logique', 
        range: `Questions ${angCount + cgCount + 1}-${questions.length}`,
        color: 'yellow'
      };
    }
  };

  // Group questions by subject for sidebar
  const getQuestionsBySubject = () => {
    const angCount = questions.filter(q => q.category === 'ANG').length;
    const cgCount = questions.filter(q => q.category === 'CG').length;
    
    return {
      anglais: questions.slice(0, angCount),
      cultureGenerale: questions.slice(angCount, angCount + cgCount),
      logique: questions.slice(angCount + cgCount)
    };
  };

  // Get progress percentage
  const getProgressPercentage = () => {
    return Math.round((answeredQuestions.size / questions.length) * 100);
  };

  // Calculate subject scores
  const getSubjectScores = () => {
    const subjects = ['ANG', 'CG', 'LOG'];
    return subjects.map(subject => {
      const subjectQuestions = questions.filter(q => q.category === subject);
      const subjectCorrect = subjectQuestions.reduce((count, q) => {
        const userAnswer = userAnswers.get(q.id);
        if (q.type === 'multiple-choice' && typeof q.correctAnswer === 'number') {
          return userAnswer === q.correctAnswer ? count + 1 : count;
        } else if (q.type === 'true-false') {
          return String(userAnswer).toLowerCase() === String(q.correctAnswer).toLowerCase() ? count + 1 : count;
        }
        return userAnswer === q.correctAnswer ? count + 1 : count;
      }, 0);
      const subjectScore = subjectQuestions.length > 0 ? Math.round((subjectCorrect / subjectQuestions.length) * 100) : 0;
      
      return {
        subject,
        correct: subjectCorrect,
        total: subjectQuestions.length,
        score: subjectScore
      };
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-white">Chargement de l'examen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Erreur: {error}</div>
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

  if (isCompleted) {
    // Calculate results
    const correctAnswers = questions.reduce((count, q) => {
      const userAnswer = userAnswers.get(q.id);
      if (q.type === 'multiple-choice' && typeof q.correctAnswer === 'number') {
        return userAnswer === q.correctAnswer ? count + 1 : count;
      } else if (q.type === 'true-false') {
        return String(userAnswer).toLowerCase() === String(q.correctAnswer).toLowerCase() ? count + 1 : count;
      }
      return userAnswer === q.correctAnswer ? count + 1 : count;
    }, 0);
    
    const score = Math.round((correctAnswers / questions.length) * 100);
    const timeSpent = 180 * 60 - timeRemaining;
    const subjectScores = getSubjectScores();

    return (
      <div className="h-screen bg-gray-900 flex flex-col results-page">
        {/* Clean header without sidebar */}
        <header className="bg-blue-600 shadow-sm flex-shrink-0">
          <div className="px-4 sm:px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl font-bold text-white">Examen Blanc #{examId} - Terminé</h1>
                  <div className="flex items-center gap-3 text-sm text-white mt-1">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      Résultats disponibles
                    </span>
                    {/* Hide score and time on mobile */}
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline">Score: {score}%</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:gap-6 flex-shrink-0">
                {/* Hide timer on mobile */}
                <div className="hidden sm:flex items-center gap-2 font-semibold text-white">
                  <Clock className="w-5 h-5" />
                  <span className="text-lg">{formatTime(timeSpent)}</span>
                </div>
                <button 
                  onClick={confirmExit} 
                  className="text-white hover:text-blue-100 p-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - Full width results */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="h-full p-4 sm:p-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 h-full">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Examen Terminé !</h1>
              </div>
              
              {/* Overall Score */}
              <div className="text-center mb-8">
                <div className="text-6xl sm:text-7xl font-bold text-blue-600 mb-2">{score}%</div>
                <div className="text-lg text-gray-600">Score Global</div>
              </div>
              
              {/* Subject Scores - Fixed Layout */}
              <div className="subject-score-grid mb-8">
                {subjectScores.map(({ subject, correct, total, score: subjectScore }) => (
                  <div key={subject} className="subject-score-box">
                    <div className="score-percentage">{subjectScore}%</div>
                    <div className="subject-name">{subject}</div>
                    <div className="score-fraction">{correct}/{total}</div>
                  </div>
                ))}
              </div>

              {/* Time Spent */}
              <div className="text-center mb-8">
                <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-1">{formatTime(timeSpent)}</div>
                <div className="text-sm text-gray-600">Temps Utilisé</div>
              </div>

              {/* Review Button */}
              <div className="text-center mb-8">
                <button
                  onClick={() => setShowReview(!showReview)}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors mx-auto"
                >
                  <Eye className="w-5 h-5" />
                  {showReview ? 'Masquer les réponses' : 'Réviser les réponses'}
                </button>
              </div>

              {/* Review Section - Fixed Layout */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                {showReview && (
                <div className="answer-review-container animate-in slide-in-from-top-4 duration-300 mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 text-center mb-6">Révision des Réponses</h3>
                  {questions.map((question, index) => {
                    const userAnswer = userAnswers.get(question.id);
                    const isCorrect = (() => {
                      if (question.type === 'multiple-choice' && typeof question.correctAnswer === 'number') {
                        return userAnswer === question.correctAnswer;
                      } else if (question.type === 'true-false') {
                        return String(userAnswer).toLowerCase() === String(question.correctAnswer).toLowerCase();
                      }
                      return userAnswer === question.correctAnswer;
                    })();

                    return (
                      <div key={question.id} className="answer-review-question">
                        {/* Question Header */}
                        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                            isCorrect ? 'bg-green-500' : 'bg-red-500'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              question.category === 'ANG' ? 'bg-green-100 text-green-800' :
                              question.category === 'CG' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {question.category}
                            </span>
                            <span className="text-sm text-gray-500">
                              {question.type === 'multiple-choice' ? 'Choix Multiple' : 'Vrai/Faux'}
                            </span>
                          </div>
                        </div>

                        {/* Question Text */}
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{question.question}</h3>

                        {/* Options and Answers - Fixed Layout */}
                        <div className="answer-review-options">
                          {question.type === 'multiple-choice' && question.options?.map((option, optionIndex) => {
                            const isUserAnswer = userAnswer === optionIndex;
                            const isCorrectAnswer = question.correctAnswer === optionIndex;
                            
                            let optionClass = 'answer-review-option ';
                            if (isCorrectAnswer) {
                              optionClass += 'correct';
                            } else if (isUserAnswer && !isCorrectAnswer) {
                              optionClass += 'incorrect';
                            } else {
                              optionClass += 'neutral';
                            }
                            
                            return (
                              <div key={optionIndex} className={optionClass}>
                                <div className="answer-review-option-prefix">
                                  {String.fromCharCode(65 + optionIndex)}
                                </div>
                                <div className="answer-review-option-text">{option}</div>
                                {isCorrectAnswer && (
                                  <div className="answer-review-status text-green-600 font-semibold">✓ Correct</div>
                                )}
                                {isUserAnswer && !isCorrectAnswer && (
                                  <div className="answer-review-status text-red-600 font-semibold">✗ Incorrect</div>
                                )}
                              </div>
                            );
                          })}
                          
                          {question.type === 'true-false' && ['Vrai', 'Faux'].map((option, optionIndex) => {
                            const answerValue = optionIndex === 0 ? 'true' : 'false';
                            const isUserAnswer = userAnswer === answerValue;
                            const isCorrectAnswer = question.correctAnswer === answerValue;
                            
                            let optionClass = 'answer-review-option ';
                            if (isCorrectAnswer) {
                              optionClass += 'correct';
                            } else if (isUserAnswer && !isCorrectAnswer) {
                              optionClass += 'incorrect';
                            } else {
                              optionClass += 'neutral';
                            }
                            
                            return (
                              <div key={option} className={optionClass}>
                                <div className="answer-review-option-prefix">
                                  {optionIndex === 0 ? 'V' : 'F'}
                                </div>
                                <div className="answer-review-option-text">{option}</div>
                                {isCorrectAnswer && (
                                  <div className="answer-review-status text-green-600 font-semibold">✓ Correct</div>
                                )}
                                {isUserAnswer && !isCorrectAnswer && (
                                  <div className="answer-review-status text-red-600 font-semibold">✗ Incorrect</div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation if available */}
                        {question.explanation && (
                          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <h4 className="font-semibold text-blue-900 mb-2">Explication:</h4>
                            <p className="text-blue-800 text-sm">{question.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              </div>
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <button 
                  onClick={confirmExit}
                  className="px-8 py-4 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors text-lg"
                >
                  Retour au menu principal
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const isCurrentQuestionAnswered = currentQuestion ? answeredQuestions.has(currentQuestion.id) : false;
  const isCurrentQuestionFlagged = currentQuestion ? flaggedQuestions.has(currentQuestion.id) : false;
  const canGoNext = currentQuestionIndex < questions.length - 1;
  const canGoPrevious = currentQuestionIndex > 0;
  const subjectInfo = getCurrentSubjectInfo();
  const questionsBySubject = getQuestionsBySubject();
  const progressPercentage = getProgressPercentage();

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Erreur: Question non trouvée</div>
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

  return (
    <div className="h-screen bg-gray-50">
      {/* Security Warning */}
      {tabSwitchCount > 0 && (
        <div className="absolute top-0 left-0 right-0 bg-red-600 text-white p-3 text-center z-50">
          <AlertTriangle className="w-5 h-5 inline mr-2" />
          Attention: Changement d'onglet détecté ({tabSwitchCount}/2). L'examen se terminera automatiquement après 2 changements.
        </div>
      )}

      {/* Single Blue Header - No White Bar */}
      <div className="bg-blue-600 shadow-sm">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              {/* Hamburger Menu for Sidebar */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-white hover:text-blue-100 p-2 rounded-lg hover:bg-blue-700 transition-colors"
                title="Ouvrir/Fermer la liste des questions"
              >
                <Menu className="w-6 h-6" />
              </button>
              
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-bold text-white">Examen Blanc #{examId}</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3 sm:gap-6 flex-shrink-0">
              {/* Progress Bar - Hidden on mobile */}
              <div className="hidden sm:block exam-progress">
                <div 
                  className="exam-progress-fill"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              
              {/* Timer */}
              <div className="flex items-center gap-2 font-semibold text-white">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-lg">{formatTime(timeRemaining)}</span>
              </div>
              
              {/* Flag Button */}
              <button 
                onClick={handleFlagQuestion}
                className={`p-2 rounded-lg transition-colors ${
                  isCurrentQuestionFlagged 
                    ? 'bg-amber-500 text-white' 
                    : 'text-white hover:bg-blue-700'
                }`}
                title="Marquer pour révision"
              >
                <Flag className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              
              {/* Terminer Button - Replaces X */}
              <button 
                onClick={handleFinishExam}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors text-sm font-medium"
                title="Terminer l'examen"
              >
                <CheckSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Terminer</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout with Sidebar */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar - Questions List */}
        <div className={`bg-gray-800 w-80 transition-all duration-300 ease-in-out ${
          sidebarOpen 
            ? 'translate-x-0' 
            : '-translate-x-full lg:translate-x-0'
        } fixed lg:relative z-30 h-full`}>
          <div className="h-full flex flex-col">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Questions</h2>
                {/* Remove X button on mobile */}
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-2 text-sm text-gray-400">
                {answeredQuestions.size} / {questions.length} répondues
              </div>
            </div>

            {/* Question Lists */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Anglais Section */}
              <div className="exam-sidebar-section">
                <div className="exam-sidebar-section-header">
                  <span className="exam-sidebar-section-title text-green-400">Anglais</span>
                  <span className="exam-sidebar-section-count">1-20</span>
                </div>
                <div className="exam-sidebar-section-content">
                  {questionsBySubject.anglais.map((q, index) => {
                    const globalIndex = index;
                    const isAnswered = userAnswers.has(q.id);
                    const isCurrent = globalIndex === currentQuestionIndex;
                    const isFlagged = flaggedQuestions.has(q.id);
                    
                    return (
                      <button
                        key={q.id}
                        onClick={() => {
                          setCurrentQuestionIndex(globalIndex);
                          setSidebarOpen(false); // Close sidebar on mobile after selection
                        }}
                        className={`qbtn ${isCurrent ? 'qbtn--current' : ''} ${isAnswered ? 'qbtn--answered' : ''} ${isFlagged ? 'qbtn--flagged' : ''}`}
                      >
                        {globalIndex + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Culture Générale Section */}
              <div className="exam-sidebar-section">
                <div className="exam-sidebar-section-header">
                  <span className="exam-sidebar-section-title text-blue-400">Culture Générale</span>
                  <span className="exam-sidebar-section-count">21-40</span>
                </div>
                <div className="exam-sidebar-section-content">
                  {questionsBySubject.cultureGenerale.map((q, index) => {
                    const globalIndex = questionsBySubject.anglais.length + index;
                    const isAnswered = userAnswers.has(q.id);
                    const isCurrent = globalIndex === currentQuestionIndex;
                    const isFlagged = flaggedQuestions.has(q.id);
                    
                    return (
                      <button
                        key={q.id}
                        onClick={() => {
                          setCurrentQuestionIndex(globalIndex);
                          setSidebarOpen(false); // Close sidebar on mobile after selection
                        }}
                        className={`qbtn ${isCurrent ? 'qbtn--current' : ''} ${isAnswered ? 'qbtn--answered' : ''} ${isFlagged ? 'qbtn--flagged' : ''}`}
                      >
                        {globalIndex + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Logique Section */}
              <div className="exam-sidebar-section">
                <div className="exam-sidebar-section-header">
                  <span className="exam-sidebar-section-title text-yellow-400">Logique</span>
                  <span className="exam-sidebar-section-count">41-60</span>
                </div>
                <div className="exam-sidebar-section-content">
                  {questionsBySubject.logique.map((q, index) => {
                    const globalIndex = questionsBySubject.anglais.length + questionsBySubject.cultureGenerale.length + index;
                    const isAnswered = userAnswers.has(q.id);
                    const isCurrent = globalIndex === currentQuestionIndex;
                    const isFlagged = flaggedQuestions.has(q.id);
                    
                    return (
                      <button
                        key={q.id}
                        onClick={() => {
                          setCurrentQuestionIndex(globalIndex);
                          setSidebarOpen(false); // Close sidebar on mobile after selection
                        }}
                        className={`qbtn ${isCurrent ? 'qbtn--current' : ''} ${isAnswered ? 'qbtn--answered' : ''} ${isFlagged ? 'qbtn--flagged' : ''}`}
                      >
                        {globalIndex + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-4xl mx-auto p-4 sm:p-6">
            {/* Subject Header - Removed "Questions 1-20" */}
            <div className="mb-4 sm:mb-6">
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold bg-${subjectInfo.color}-100 text-${subjectInfo.color}-800`}>
                  {subjectInfo.section}
                </span>
                <span className="text-gray-600 font-medium text-sm sm:text-base">
                  Question {currentQuestionIndex + 1} sur {questions.length}
                </span>
              </div>
            </div>

            {/* Question Card */}
            <div className="question-card">
              <h2 className="question-title text-lg sm:text-xl lg:text-2xl">{currentQuestion.question}</h2>
              
              <div className="space-y-3">
                {currentQuestion.type === 'multiple-choice' && currentQuestion.options?.map((option, index) => {
                  const isSelected = selectedAnswer === index;
                  return (
                    <div
                      key={index}
                      onClick={() => handleAnswerSelect(index)}
                      className={`answer ${isSelected ? 'answer--selected' : ''}`}
                      tabIndex={0}
                    >
                      <div className="answer-prefix">
                        {String.fromCharCode(65 + index)}
                      </div>
                      <div className="answer-text text-sm sm:text-base">{option}</div>
                    </div>
                  );
                })}
                {currentQuestion.type === 'true-false' && ['Vrai', 'Faux'].map((option, index) => {
                  const answerValue = index === 0 ? 'true' : 'false';
                  const isSelected = selectedAnswer === answerValue;
                  return (
                    <div
                      key={option}
                      onClick={() => handleAnswerSelect(answerValue)}
                      className={`answer ${isSelected ? 'answer--selected' : ''}`}
                      tabIndex={0}
                    >
                      <div className="answer-prefix">
                        {index === 0 ? 'V' : 'F'}
                      </div>
                      <div className="answer-text text-sm sm:text-base">{option}</div>
                    </div>
                  );
                })}
              </div>

              {/* Navigation Buttons - Updated */}
              <div className="exam-navigation">
                <button 
                  onClick={handlePreviousQuestion}
                  disabled={!canGoPrevious}
                  className="nav-button nav-button--secondary"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Précédent</span>
                  <span className="sm:hidden">Préc</span>
                </button>
                
                <div className="flex gap-2 sm:gap-3">
                  <button 
                    onClick={handleFlagQuestion}
                    className={`nav-button nav-button--secondary ${
                      isCurrentQuestionFlagged ? 'bg-amber-100 text-amber-700 border-amber-300' : ''
                    }`}
                  >
                    <Flag className="w-4 h-4" />
                    <span className="hidden sm:inline">{isCurrentQuestionFlagged ? 'Marqué' : 'Marquer'}</span>
                  </button>
                  <button 
                    onClick={handleNextQuestion}
                    disabled={!canGoNext}
                    className="nav-button nav-button--primary"
                  >
                    <span className="hidden sm:inline">Suivant</span>
                    <span className="sm:hidden">Suiv</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Overlay - Only show when sidebar is open on mobile */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'bg-green-600' : toast.type === 'warning' ? 'bg-amber-600' : 'bg-blue-600'} show`}>
          {toast.message}
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-4">Quitter l'examen ?</h3>
              <p className="text-gray-600 mb-6">
                Êtes-vous sûr de vouloir quitter l'examen ? Votre examen sera terminé automatiquement et vous ne pourrez pas le reprendre.
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setShowExitWarning(false)}
                  className="px-6 py-3 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmExit}
                  className="px-6 py-3 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
                >
                  Quitter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
