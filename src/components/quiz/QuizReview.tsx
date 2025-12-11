import React from 'react';
import { Check, X, ArrowLeft } from 'lucide-react';

// Assuming Question interface is available from a shared types file
interface Question {
  id: string;  // V2: UUID string for exam_answers tracking
  type: 'multiple-choice' | 'true-false' | 'fill-blank' | 'matching';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation?: string;
}

interface QuizReviewProps {
  questions: Question[];
  userAnswers: Map<string, string | number>;
  onBack: () => void;
}

export const QuizReview: React.FC<QuizReviewProps> = ({ questions, userAnswers, onBack }) => {

  const getOptionText = (question: Question, answer: string | number) => {
    if (question.type === 'multiple-choice' && question.options) {
      return question.options[answer as number];
    }
    return answer.toString();
  };

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold ml-4">Révision du Test</h1>
      </div>
      <div className="space-y-4">
        {questions.map((q, index) => {
          const userAnswer = userAnswers.get(q.id);
          const isCorrect = userAnswer === q.correctAnswer;
          const correctAnswerText = getOptionText(q, q.correctAnswer);
          const userAnswerText = userAnswer !== undefined ? getOptionText(q, userAnswer) : "Pas de réponse";

          return (
            <div key={q.id} className="bg-white p-4 rounded-lg shadow-sm border">
              <p className="font-semibold">{index + 1}. {q.question}</p>
              <div className="mt-2 pl-4">
                <p className={`flex items-center ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                  {isCorrect ? <Check className="w-5 h-5 mr-2" /> : <X className="w-5 h-5 mr-2" />}
                  Votre réponse : <span className="font-bold ml-1">{userAnswerText}</span>
                </p>
                {!isCorrect && (
                  <p className="flex items-center text-green-600 mt-1">
                    <Check className="w-5 h-5 mr-2" />
                    Réponse correcte : <span className="font-bold ml-1">{correctAnswerText}</span>
                  </p>
                )}
                {q.explanation && (
                    <p className="text-sm text-gray-500 mt-2 pt-2 border-t">
                        <span className="font-semibold">Explication :</span> {q.explanation}
                    </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}; 