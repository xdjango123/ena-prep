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
      <div className="min-h-screen bg-gray-50 flex flex-col p-4">
        <div className="max-w-4xl mx-auto w-full">
          {/* Results Header */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Test Aléatoire Terminé !</h1>
              <p className="text-gray-600 mb-8">Voici vos résultats pour ce test mixte</p>
              
              {/* Score and Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-3xl font-bold text-blue-600">{score}%</h3>
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

              {/* Subject Breakdown */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-semibold mb-3">Répartition par matière:</h3>
                <div className="flex justify-center gap-6">
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
              <div className="flex flex-col sm:flex-row justify-center gap-4">
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
                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors"
                >
                  <Repeat className="w-5 h-5" />
                  Nouveau test aléatoire
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
    <div className="min-h-screen bg-gray-50 flex flex-col p-4">
      {/* Header */}
      <header className="sticky top-0 bg-blue-600 shadow-sm z-10">
        <div className="max-w-4xl mx-auto p-4">
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
      <div className="my-4 px-4">
        <div className="h-2 bg-gray-200 rounded-full">
          <div 
            className="h-2 rounded-full bg-blue-500 transition-all duration-300"
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
      <div className="flex-grow flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-3xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{currentQuestion.question}</h2>
          
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