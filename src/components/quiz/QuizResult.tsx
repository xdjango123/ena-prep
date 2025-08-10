import React, { useState } from 'react';
import { Award, Clock, Hash, CheckCircle, Repeat, Eye, XCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Question {
  id: number;
  type: 'multiple-choice' | 'true-false' | 'fill-blank' | 'matching';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface QuizResultProps {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number; // in seconds
  onRedo: () => void;
  onReview: () => void;
  onExit: () => void;
  subjectColor: string;
  questions?: Question[];
  userAnswers?: Map<number, string | number>;
}

export const QuizResult: React.FC<QuizResultProps> = ({
  score,
  totalQuestions,
  correctAnswers,
  timeSpent,
  onRedo,
  onReview,
  onExit,
  subjectColor,
  questions,
  userAnswers
}) => {
  const [showDetailedCorrections, setShowDetailedCorrections] = useState(false);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
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
        '700': { 'bg': 'bg-blue-700', 'text': 'text-blue-700', 'border': 'border-blue-700' },
        '800': { 'bg': 'bg-blue-800', 'text': 'text-blue-800', 'border': 'border-blue-800' }
      },
      'green': {
        '100': { 'bg': 'bg-green-100', 'text': 'text-green-100', 'border': 'border-green-100' },
        '200': { 'bg': 'bg-green-200', 'text': 'text-green-200', 'border': 'border-green-200' },
        '500': { 'bg': 'bg-green-500', 'text': 'text-green-500', 'border': 'border-green-500' },
        '600': { 'bg': 'bg-green-600', 'text': 'text-green-600', 'border': 'border-green-600' },
        '700': { 'bg': 'bg-green-700', 'text': 'text-green-700', 'border': 'border-green-700' },
        '800': { 'bg': 'bg-green-800', 'text': 'text-green-800', 'border': 'border-green-800' }
      },
      'yellow': {
        '100': { 'bg': 'bg-yellow-100', 'text': 'text-yellow-100', 'border': 'border-yellow-100' },
        '200': { 'bg': 'bg-yellow-200', 'text': 'text-yellow-200', 'border': 'border-yellow-200' },
        '500': { 'bg': 'bg-yellow-500', 'text': 'text-yellow-500', 'border': 'border-yellow-500' },
        '600': { 'bg': 'bg-yellow-600', 'text': 'text-yellow-600', 'border': 'border-yellow-600' },
        '700': { 'bg': 'bg-yellow-700', 'text': 'text-yellow-700', 'border': 'border-yellow-700' },
        '800': { 'bg': 'bg-yellow-800', 'text': 'text-yellow-800', 'border': 'border-yellow-800' }
      },
      'purple': {
        '100': { 'bg': 'bg-purple-100', 'text': 'text-purple-100', 'border': 'border-purple-100' },
        '200': { 'bg': 'bg-purple-200', 'text': 'text-purple-200', 'border': 'border-purple-200' },
        '500': { 'bg': 'bg-purple-500', 'text': 'text-purple-500', 'border': 'border-purple-500' },
        '600': { 'bg': 'bg-purple-600', 'text': 'text-purple-600', 'border': 'border-purple-600' },
        '700': { 'bg': 'bg-purple-700', 'text': 'text-purple-700', 'border': 'border-purple-700' },
        '800': { 'bg': 'bg-purple-800', 'text': 'text-purple-800', 'border': 'border-purple-800' }
      }
    };
    
    // Safely get the color class, fallback to blue if not found
    const color = colorMap[base] || colorMap['blue'];
    const variantData = color[variant] || color['500'];
    return variantData[type] || variantData['bg'];
  };

  const getOptionText = (question: Question, answer: string | number) => {
    if (question.type === 'multiple-choice' && question.options) {
      return question.options[answer as number];
    }
    return answer.toString();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Results Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="text-center">
            <Award className={`w-16 h-16 ${getColorClasses(subjectColor, '500', 'text')} mx-auto mb-4`} />
            <h2 className="text-3xl font-bold mb-2">Test Terminé !</h2>
            <p className="text-gray-600 mb-8">{getSubtitle(score)}</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className={`text-3xl font-bold ${getColorClasses(subjectColor, '600', 'text')}`}>{score}%</h3>
                <p className="text-sm text-gray-500">Score</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-3xl font-bold">{correctAnswers}/{totalQuestions}</h3>
                <p className="text-sm text-gray-500">Correct</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-3xl font-bold">{formatTime(timeSpent)}</h3>
                <p className="text-sm text-gray-500">Temps</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-3xl font-bold">{totalQuestions}</h3>
                <p className="text-sm text-gray-500">Questions</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button 
                onClick={onRedo}
                className={`flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-lg ${getColorClasses(subjectColor, '500', 'bg')} text-white font-semibold hover:${getColorClasses(subjectColor, '600', 'bg')} transition-colors`}
              >
                <Repeat className="w-5 h-5" />
                Refaire le test
              </button>
              {questions && userAnswers && (
                <button 
                  onClick={() => setShowDetailedCorrections(!showDetailedCorrections)}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 transition-colors"
                >
                  <Eye className="w-5 h-5" />
                  {showDetailedCorrections ? 'Masquer' : 'Voir'} les corrections
                </button>
              )}
            </div>
            <div className="mt-6">
                <button onClick={onExit} className="text-sm text-gray-500 hover:underline">
                    Retour à la page de la matière
                </button>
            </div>
          </div>
        </div>

        {/* Detailed Corrections */}
        {showDetailedCorrections && questions && userAnswers && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Corrections Détaillées</h2>
            <div className="space-y-6">
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

                const getCorrectAnswerText = () => {
                  if (question.type === 'multiple-choice' && typeof question.correctAnswer === 'number') {
                    return question.options?.[question.correctAnswer];
                  }
                  return question.correctAnswer;
                };

                return (
                  <div key={question.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-sm font-medium text-gray-600">Question {index + 1}</span>
                      {isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 mb-4">{question.question}</h3>
                    
                    {question.type === 'multiple-choice' && question.options && (
                      <div className="space-y-2 mb-4">
                        {question.options.map((option, optionIndex) => {
                          const isSelected = userAnswer === optionIndex;
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
        )}
      </div>
    </div>
  );
}; 