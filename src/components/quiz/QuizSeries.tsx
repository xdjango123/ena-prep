import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, XCircle, SkipForward, Home, Trophy, Brain } from 'lucide-react';
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
  onExit: () => void;
}

export const QuizSeries: React.FC<QuizSeriesProps> = ({ 
  subject, 
  subjectColor, 
  questions, 
  onExit 
}) => {
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (answer: string | number) => {
    setSelectedAnswer(answer);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
    }

    setAnsweredQuestions(prev => new Set([...prev, currentQuestion.id]));
    setShowResult(true);

    // Auto advance after 2 seconds
    setTimeout(() => {
      handleNextQuestion();
    }, 2000);
  };

  const handleSkipQuestion = () => {
    setAnsweredQuestions(prev => new Set([...prev, currentQuestion.id]));
    handleNextQuestion();
  };

  const handleNextQuestion = () => {
    setShowResult(false);
    setSelectedAnswer(null);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handleExit = () => {
    if (window.confirm('Êtes-vous sûr de vouloir quitter la série ? Votre progression sera sauvegardée.')) {
      onExit();
    }
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

  if (isCompleted) {
    const score = Math.round((correctAnswers / questions.length) * 100);
    
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-10 h-10 text-green-600" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Série Terminée !
            </h1>
            
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">{score}%</div>
                <div className="text-sm text-gray-600">Score Final</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">{correctAnswers}/{questions.length}</div>
                <div className="text-sm text-gray-600">Bonnes Réponses</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">{formatTime(timeElapsed)}</div>
                <div className="text-sm text-gray-600">Temps Total</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">{answeredQuestions.size}</div>
                <div className="text-sm text-gray-600">Questions Traitées</div>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Home className="w-5 h-5" />
                Tableau de Bord
              </button>
              <button
                onClick={onExit}
                className={`flex items-center gap-2 bg-${subjectColor}-600 text-white px-6 py-3 rounded-lg hover:bg-${subjectColor}-700 transition-colors`}
              >
                <Brain className="w-5 h-5" />
                Nouvelle Série
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">{getQuestionTypeIcon(currentQuestion.type)}</span>
              <span className="text-sm font-medium text-gray-600">
                {getQuestionTypeLabel(currentQuestion.type)}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Question {currentQuestionIndex + 1} sur {questions.length}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              {formatTime(timeElapsed)}
            </div>
            <button
              onClick={handleExit}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="max-w-4xl mx-auto mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`bg-${subjectColor}-600 h-2 rounded-full transition-all duration-300`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {currentQuestion.question}
          </h2>

          {/* Answer Options */}
          <div className="space-y-3 mb-8">
            {currentQuestion.type === 'multiple-choice' && currentQuestion.options?.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={showResult}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  selectedAnswer === index
                    ? `border-${subjectColor}-500 bg-${subjectColor}-50`
                    : 'border-gray-200 hover:border-gray-300'
                } ${showResult ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedAnswer === index 
                      ? `border-${subjectColor}-500 bg-${subjectColor}-500` 
                      : 'border-gray-300'
                  }`}>
                    {selectedAnswer === index && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <span className="text-gray-900">{option}</span>
                </div>
              </button>
            ))}

            {currentQuestion.type === 'true-false' && (
              <div className="grid grid-cols-2 gap-4">
                {['Vrai', 'Faux'].map((option, index) => (
                  <button
                    key={option}
                    onClick={() => handleAnswerSelect(index === 0 ? 'true' : 'false')}
                    disabled={showResult}
                    className={`p-4 text-center rounded-lg border-2 transition-all ${
                      selectedAnswer === (index === 0 ? 'true' : 'false')
                        ? `border-${subjectColor}-500 bg-${subjectColor}-50`
                        : 'border-gray-200 hover:border-gray-300'
                    } ${showResult ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Result Display */}
          {showResult && (
            <div className={`p-4 rounded-lg mb-6 ${
              selectedAnswer === currentQuestion.correctAnswer
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {selectedAnswer === currentQuestion.correctAnswer ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-800">Correct !</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="font-semibold text-red-800">Incorrect</span>
                  </>
                )}
              </div>
              {currentQuestion.explanation && (
                <p className="text-sm text-gray-700">{currentQuestion.explanation}</p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {!showResult && (
            <div className="flex gap-4 justify-between">
              <button
                onClick={handleSkipQuestion}
                className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <SkipForward className="w-5 h-5" />
                Passer
              </button>
              
              <button
                onClick={handleSubmitAnswer}
                disabled={selectedAnswer === null}
                className={`px-8 py-3 bg-${subjectColor}-600 text-white rounded-lg hover:bg-${subjectColor}-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Valider
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 