import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, XCircle, Home, Trophy, Brain, ChevronLeft, ChevronRight, Repeat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

interface RandomPracticeTestProps {
  onExit: () => void;
}

export const RandomPracticeTest: React.FC<RandomPracticeTestProps> = ({ onExit }) => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [userAnswers, setUserAnswers] = useState<Map<string, string | number>>(new Map());
  const [timeRemaining, setTimeRemaining] = useState(15 * 60); // 15 minutes
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Generate unique test number for this session
  const testNumber = Math.floor(Date.now() / 1000) % 10000;

  // Load random questions from all subjects
  useEffect(() => {
    const loadRandomQuestions = async () => {
      setIsLoading(true);
      try {
        const allQuestions: Question[] = [];
        
        // Get 5 questions from each subject
        const subjects: ('ANG' | 'CG' | 'LOG')[] = ['ANG', 'CG', 'LOG'];
        
        for (const subject of subjects) {
          try {
            const subjectQuestions = await QuestionService.getRandomQuestions(subject, 5, undefined, testNumber);
            
            // Convert database questions to the expected format
            const convertedQuestions = subjectQuestions.map((dbQ, index) => {
              let type: 'multiple-choice' | 'true-false' = 'multiple-choice';
              let options: string[] | undefined = undefined;
              let correctAnswer: number | string = 0;
              
              if (dbQ.answer1 && dbQ.answer2 && dbQ.answer3 && dbQ.answer4) {
                type = 'multiple-choice';
                options = [dbQ.answer1, dbQ.answer2, dbQ.answer3, dbQ.answer4];
                
                // Convert letter to index
                correctAnswer = dbQ.correct === 'A' ? 0 :
                                dbQ.correct === 'B' ? 1 :
                                dbQ.correct === 'C' ? 2 :
                                dbQ.correct === 'D' ? 3 : 0;
              } else if (dbQ.answer1 && dbQ.answer2 && !dbQ.answer3 && !dbQ.answer4) {
                type = 'true-false';
                options = [dbQ.answer1, dbQ.answer2];
                correctAnswer = dbQ.correct?.toLowerCase() === 'true' ? 'true' : 'false';
              } else {
                // Handle cases where some answers might be null
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
            // Continue with other subjects
          }
        }
        
        // Shuffle all questions to mix subjects
        const shuffledQuestions = allQuestions.sort(() => Math.random() - 0.5);
        
        if (shuffledQuestions.length === 0) {
          throw new Error('No questions could be loaded from any subject');
        }
        
        setQuestions(shuffledQuestions);
        console.log(`✅ Loaded ${shuffledQuestions.length} random questions from all subjects`);
        
      } catch (error) {
        console.error('Error loading random questions:', error);
        setError('Failed to load questions. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadRandomQuestions();
  }, []);

  // Timer
  useEffect(() => {
    if (isCompleted || isLoading) return;

    if (timeRemaining <= 0) {
      handleFinishQuiz();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, isCompleted, isLoading]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (answer: string | number) => {
    if (!questions[currentQuestionIndex]) return;
    setSelectedAnswer(answer);
    
    // Store the user's answer immediately
    setUserAnswers(prev => new Map(prev).set(questions[currentQuestionIndex].id, answer));
    
    // Check if answer is correct and update correct answers count
    const isCorrect = (() => {
      if (questions[currentQuestionIndex].type === 'multiple-choice' && typeof questions[currentQuestionIndex].correctAnswer === 'number') {
        return answer === questions[currentQuestionIndex].correctAnswer;
      } else if (questions[currentQuestionIndex].type === 'true-false') {
        return String(answer).toLowerCase() === String(questions[currentQuestionIndex].correctAnswer).toLowerCase();
      }
      return answer === questions[currentQuestionIndex].correctAnswer;
    })();

    // Update correct answers count if this question hasn't been answered before
    if (isCorrect && !answeredQuestions.has(questions[currentQuestionIndex].id)) {
      setCorrectAnswers(prev => prev + 1);
    }
    
    // Mark question as answered
    setAnsweredQuestions(prev => new Set([...prev, questions[currentQuestionIndex].id]));
  };

  // Load previously selected answer when changing questions
  useEffect(() => {
    if (!questions[currentQuestionIndex]) return;
    const previousAnswer = userAnswers.get(questions[currentQuestionIndex].id);
    if (previousAnswer !== undefined) {
      setSelectedAnswer(previousAnswer);
    } else {
      setSelectedAnswer(null);
    }
    setShowResult(false);
  }, [currentQuestionIndex, userAnswers, questions]);

  const handleSubmitAnswer = () => {
    if (!questions[currentQuestionIndex] || selectedAnswer === null) return;

    // Store the user's answer
    setUserAnswers(prev => new Map([...prev, [questions[currentQuestionIndex].id, selectedAnswer]]));

    // More robust comparison logic
    const isCorrect = (() => {
      if (questions[currentQuestionIndex].type === 'multiple-choice' && typeof questions[currentQuestionIndex].correctAnswer === 'number') {
        return selectedAnswer === questions[currentQuestionIndex].correctAnswer;
      } else if (questions[currentQuestionIndex].type === 'true-false') {
        return String(selectedAnswer).toLowerCase() === String(questions[currentQuestionIndex].correctAnswer).toLowerCase();
      }
      return selectedAnswer === questions[currentQuestionIndex].correctAnswer;
    })();

    if (isCorrect && !answeredQuestions.has(questions[currentQuestionIndex].id)) {
      setCorrectAnswers(prev => prev + 1);
    }

    setAnsweredQuestions(prev => new Set([...prev, questions[currentQuestionIndex].id]));
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

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setSelectedAnswer(null);
      setShowResult(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFinishQuiz = () => {
    setIsCompleted(true);
  };

  const handleExit = () => {
    onExit();
  };

  const getSubjectColor = (category: string) => {
    switch (category) {
      case 'ANG': return 'green';
      case 'CG': return 'blue';
      case 'LOG': return 'yellow';
      default: return 'blue';
    }
  };

  const getSubjectIcon = (category: string) => {
    switch (category) {
      case 'ANG': return '🇬🇧';
      case 'CG': return '🌍';
      case 'LOG': return '🧠';
      default: return '❓';
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des questions aléatoires...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Erreur: {error}</div>
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
    const timeSpent = 15 * 60 - timeRemaining;

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-2 sm:py-4">
          {/* Results Header */}
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6">
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">Test Aléatoire Terminé !</h1>
              <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base">{getSubtitle(score)}</p>
              
              {/* Score and Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <h3 className="text-2xl sm:text-3xl font-bold text-blue-600">{score}%</h3>
                  <p className="text-xs sm:text-sm text-gray-500">Score</p>
                </div>
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <h3 className="text-2xl sm:text-3xl font-bold">{correctAnswers}/{questions.length}</h3>
                  <p className="text-xs sm:text-sm text-gray-500">Correct</p>
                </div>
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <h3 className="text-2xl sm:text-3xl font-bold">{formatTime(timeSpent)}</h3>
                  <p className="text-xs sm:text-sm text-gray-500">Temps</p>
                </div>
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <h3 className="text-2xl sm:text-3xl font-bold">{questions.length}</h3>
                  <p className="text-xs sm:text-sm text-gray-500">Questions</p>
                </div>
              </div>

              {/* Subject Breakdown */}
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Répartition par matière:</h3>
                <div className="flex justify-center gap-3 sm:gap-6">
                  {['ANG', 'CG', 'LOG'].map(subject => {
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
                    
                    return (
                      <div key={subject} className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{subjectScore}%</div>
                        <div className="text-sm text-gray-500">{subject}</div>
                        <div className="text-xs text-gray-400">{subjectCorrect}/{subjectQuestions.length}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                <button 
                  onClick={() => {
                    setCurrentQuestionIndex(0);
                    setUserAnswers(new Map());
                    setTimeRemaining(15 * 60);
                    setIsCompleted(false);
                    setSelectedAnswer(null);
                    setAnsweredQuestions(new Set());
                    setCorrectAnswers(0);
                  }}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 sm:px-6 py-3 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors"
                >
                  <Repeat className="w-5 h-5" />
                  Nouveau test aléatoire
                </button>
                <button 
                  onClick={onExit}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 sm:px-6 py-3 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 transition-colors"
                >
                  Retour
                </button>
              </div>
            </div>
          </div>

          {/* Detailed Answers Review */}
          <div className="bg-white rounded-2xl shadow-lg p-3 sm:p-6 lg:p-8">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 text-center">Révision des Réponses</h2>
            <div className="space-y-4 sm:space-y-6">
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
                  <div key={question.id} className="border border-gray-200 rounded-lg p-3 sm:p-6">
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

                    {/* Options and Answers */}
                    <div className="space-y-2 sm:space-y-3">
                      {question.type === 'multiple-choice' && question.options?.map((option, optionIndex) => {
                        const isUserAnswer = userAnswer === optionIndex;
                        const isCorrectAnswer = question.correctAnswer === optionIndex;
                        
                        return (
                          <div key={optionIndex} className={`p-2 sm:p-3 rounded-lg border-2 ${
                            isCorrectAnswer 
                              ? 'bg-green-50 border-green-500 text-green-800' 
                              : isUserAnswer && !isCorrectAnswer
                              ? 'bg-red-50 border-red-500 text-red-800'
                              : 'bg-gray-50 border-gray-200 text-gray-700'
                          }`}>
                            <div className="flex items-center gap-2 sm:gap-3">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                                isCorrectAnswer 
                                  ? 'bg-green-500 text-white' 
                                  : isUserAnswer && !isCorrectAnswer
                                  ? 'bg-red-500 text-white'
                                  : 'bg-gray-300 text-gray-600'
                              }`}>
                                {String.fromCharCode(65 + optionIndex)}
                              </span>
                              <span className="flex-1">{option}</span>
                              {isCorrectAnswer && (
                                <span className="text-green-600 font-semibold">✓ Correct</span>
                              )}
                              {isUserAnswer && !isCorrectAnswer && (
                                <span className="text-red-600 font-semibold">✗ Incorrect</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      
                      {question.type === 'true-false' && ['Vrai', 'Faux'].map((option, optionIndex) => {
                        const answerValue = optionIndex === 0 ? 'true' : 'false';
                        const isUserAnswer = userAnswer === answerValue;
                        const isCorrectAnswer = question.correctAnswer === answerValue;
                        
                        return (
                          <div key={option} className={`p-2 sm:p-3 rounded-lg border-2 ${
                            isCorrectAnswer 
                              ? 'bg-green-50 border-green-500 text-green-800' 
                              : isUserAnswer && !isCorrectAnswer
                              ? 'bg-red-50 border-red-500 text-red-800'
                              : 'bg-gray-50 border-gray-200 text-gray-700'
                          }`}>
                            <div className="flex items-center gap-2 sm:gap-3">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                                isCorrectAnswer 
                                  ? 'bg-green-500 text-white' 
                                  : isUserAnswer && !isCorrectAnswer
                                  ? 'bg-red-500 text-white'
                                  : 'bg-gray-300 text-gray-600'
                              }`}>
                                {optionIndex === 0 ? 'V' : 'F'}
                              </span>
                              <span className="flex-1">{option}</span>
                              {isCorrectAnswer && (
                                <span className="text-green-600 font-semibold">✓ Correct</span>
                              )}
                              {isUserAnswer && !isCorrectAnswer && (
                                <span className="text-red-600 font-semibold">✗ Incorrect</span>
                              )}
                            </div>
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
           </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const isCurrentQuestionAnswered = currentQuestion ? answeredQuestions.has(currentQuestion.id) : false;
  const canGoNext = currentQuestionIndex < questions.length - 1 && isCurrentQuestionAnswered;
  const canGoPrevious = currentQuestionIndex > 0;

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-2 sm:p-4">
      {/* Header */}
      <header className="sticky top-0 bg-blue-600 shadow-sm z-10">
        <div className="w-full max-w-4xl mx-auto p-2 sm:p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                    <Brain className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white">Test Aléatoire</h1>
                    <div className="flex items-center gap-2 text-sm text-white">
                      <span>{getSubjectIcon(currentQuestion.category)}</span>
                      <span>{currentQuestion.category}</span>
                      <span>•</span>
                      <span>{currentQuestion.type === 'multiple-choice' ? 'Choix Multiple' : 'Vrai/Faux'}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 font-semibold text-lg text-white">
                    <Clock className="w-5 h-5" />
                    <span className="font-semibold">{formatTime(timeRemaining)}</span>
                </div>
                <button onClick={handleExit} className="text-white hover:text-blue-100">
                  <X className="w-6 h-6" />
                </button>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="my-2 sm:my-4 px-2 sm:px-4">
        <div className="h-2 bg-gray-200 rounded-full">
          <div 
            className="h-2 rounded-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Question Navigation */}
      <div className="px-2 sm:px-4 mb-2 sm:mb-4">
        <div className="flex flex-wrap gap-1 sm:gap-2 justify-center">
          {questions.map((q, index) => (
            <button
              key={q.id}
              onClick={() => setCurrentQuestionIndex(index)}
              className={`w-8 h-8 rounded-full text-sm font-semibold transition-colors relative
                ${index === currentQuestionIndex ? 'bg-blue-500 text-white' : ''}
                ${userAnswers.has(q.id) ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-700'}
                ${index !== currentQuestionIndex && 'hover:bg-blue-100'}
              `}
            >
              {index + 1}
              {/* Subject indicator */}
              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full text-xs flex items-center justify-center
                ${q.category === 'ANG' ? 'bg-green-500' : q.category === 'CG' ? 'bg-blue-500' : 'bg-yellow-500'}
                text-white font-bold
              `}>
                {q.category === 'ANG' ? 'A' : q.category === 'CG' ? 'C' : 'L'}
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Question Card */}
      <div className="flex-grow flex items-center justify-center px-2 sm:px-4">
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 w-full max-w-3xl">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">{currentQuestion.question}</h2>
          
          <div className="space-y-4">
            {currentQuestion.type === 'multiple-choice' && currentQuestion.options?.map((option, index) => {
              const isSelected = selectedAnswer === index;
              return (
                <div
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${isSelected ? 'bg-blue-100 border-blue-500 shadow-md' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                >
                  {option}
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
                  className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${isSelected ? 'bg-blue-100 border-blue-500 shadow-md' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                >
                  {option}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-between items-center gap-3 px-2 sm:px-4 pb-4">
        <button 
          onClick={handlePreviousQuestion}
          disabled={!canGoPrevious}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-lg bg-white text-gray-700 font-semibold shadow-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
          Précédent
        </button>
        <button 
          onClick={currentQuestionIndex === questions.length - 1 ? handleFinishQuiz : handleNextQuestion}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-lg bg-white text-gray-700 font-semibold shadow-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {currentQuestionIndex === questions.length - 1 ? 'Terminer' : 'Suivant'}
          <ChevronRight className="w-5 h-5" />
        </button>
      </footer>
    </div>
  );
}; 