import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, Home, Trophy, Brain, ChevronLeft, ChevronRight } from 'lucide-react';
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

interface ExamInterfaceProps {
  onExit: () => void;
}

export const ExamInterface: React.FC<ExamInterfaceProps> = ({ onExit }) => {
  const navigate = useNavigate();
  const { examId } = useParams();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [userAnswers, setUserAnswers] = useState<Map<string, string | number>>(new Map());
  const [timeRemaining, setTimeRemaining] = useState(3 * 60 * 60); // 3 hours
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load exam questions
  useEffect(() => {
    const loadExamQuestions = async () => {
      setIsLoading(true);
      try {
        const allQuestions: Question[] = [];
        
        // Get 20 questions from each subject for the exam
        const subjects: ('ANG' | 'CG' | 'LOG')[] = ['ANG', 'CG', 'LOG'];
        
        for (const subject of subjects) {
          try {
            const subjectQuestions = await QuestionService.getRandomQuestionsFromPool(
              subject, 
              'examen_blanc', 
              'CS', // Default to CS for now
              parseInt(examId || '1'),
              20
            );
            
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
          throw new Error('No questions could be loaded for the exam');
        }
        
        setQuestions(allQuestions);
        console.log(`✅ Loaded ${allQuestions.length} exam questions`);
        
      } catch (error) {
        console.error('Error loading exam questions:', error);
        setError('Failed to load exam questions. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadExamQuestions();
  }, [examId]);

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
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

  const handleFinishExam = () => {
    setIsCompleted(true);
  };

  const handleExit = () => {
    onExit();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de l'examen...</p>
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
    const timeSpent = 3 * 60 * 60 - timeRemaining;

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-2 sm:py-4">
          {/* Results Header */}
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6">
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">Examen Terminé !</h1>
              <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base">Voici vos résultats</p>
              
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

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                <button 
                  onClick={onExit}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 sm:px-6 py-3 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 transition-colors"
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
  const canGoNext = currentQuestionIndex < questions.length - 1;
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
                    <h1 className="text-xl font-bold text-white">Examen Blanc #{examId}</h1>
                    <div className="flex items-center gap-2 text-sm text-white">
                      <span>{currentQuestion.category}</span>
                      <span>•</span>
                      <span>Question {currentQuestionIndex + 1} sur {questions.length}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 font-semibold text-lg text-white">
                    <Clock className="w-5 h-5" />
                    <span className="font-semibold">{formatTime(timeRemaining)}</span>
                </div>
                <button onClick={handleExit} className="text-white hover:text-blue-100">
                  <Home className="w-6 h-6" />
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
          onClick={currentQuestionIndex === questions.length - 1 ? handleFinishExam : handleNextQuestion}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-lg bg-white text-gray-700 font-semibold shadow-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {currentQuestionIndex === questions.length - 1 ? 'Terminer l\'examen' : 'Suivant'}
          <ChevronRight className="w-5 h-5" />
        </button>
      </footer>
    </div>
  );
};