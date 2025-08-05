import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, XCircle, SkipForward, Home, Trophy, Brain, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Question {
  id: number;
  type: 'multiple-choice' | 'true-false' | 'fill-blank' | 'matching';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
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
    setUserAnswers(prev => new Map(prev).set(currentQuestion.id, answer));
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
        // For multiple choice, compare the selected option with the correct option text
        const correctOptionText = currentQuestion.options?.[currentQuestion.correctAnswer];
        return selectedAnswer === correctOptionText;
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
    if (canGoNext) {
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
    return null;
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
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-3xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{currentQuestion.question}</h2>
          
          <div className="space-y-4">
            {currentQuestion.type === 'multiple-choice' && currentQuestion.options?.map((option, index) => {
              const isSelected = selectedAnswer === index;
              return (
                <div
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${isSelected ? `${getColorClasses(subjectColor, '100', 'bg')} ${getColorClasses(subjectColor, '500', 'border')} shadow-md` : 'bg-white border-gray-200 hover:border-gray-300'}`}
                >
                  {option}
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
          onClick={handleNextQuestion}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-gray-700 font-semibold shadow-sm hover:bg-gray-100"
        >
          {currentQuestionIndex === questions.length - 1 ? 'Terminer' : 'Suivant'}
          <ChevronRight className="w-5 h-5" />
        </button>
      </footer>
    </div>
  );
}; 