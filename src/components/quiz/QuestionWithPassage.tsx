import React from 'react';
import MathText from '../common/MathText';
import { QuestionWithPassage } from '../../services/questionService';

interface QuestionWithPassageProps {
  questionWithPassage: QuestionWithPassage;
  userAnswer: number | null;
  onAnswerSelect: (answerIndex: number) => void;
  showCorrectAnswer?: boolean;
  isReviewMode?: boolean;
}

export const QuestionWithPassageComponent: React.FC<QuestionWithPassageProps> = ({
  questionWithPassage,
  userAnswer,
  onAnswerSelect,
  showCorrectAnswer = false,
  isReviewMode = false
}) => {
  const { question, passage } = questionWithPassage;

  // Convert string answer to index (A=0, B=1, C=2, D=3)
  const correctAnswerIndex = question.correct.charCodeAt(0) - 65; // 'A' = 65

  const getAnswerClass = (optionIndex: number) => {
    if (!showCorrectAnswer) {
      return userAnswer === optionIndex
        ? 'border-primary-500 bg-primary-50'
        : 'border-neutral-200 hover:border-primary-200 hover:bg-neutral-50';
    }

    const isCorrect = optionIndex === correctAnswerIndex;
    const isUserAnswer = userAnswer === optionIndex;

    if (isCorrect) {
      return 'border-green-500 bg-green-50';
    } else if (isUserAnswer && !isCorrect) {
      return 'border-red-500 bg-red-50';
    } else {
      return 'border-neutral-200 bg-neutral-50';
    }
  };

  const getOptionClass = (optionIndex: number) => {
    if (!showCorrectAnswer) {
      return userAnswer === optionIndex
        ? 'border-primary-500 bg-primary-500 text-white'
        : 'border-neutral-300';
    }

    const isCorrect = optionIndex === correctAnswerIndex;
    const isUserAnswer = userAnswer === optionIndex;

    if (isCorrect) {
      return 'bg-green-500 text-white';
    } else if (isUserAnswer && !isCorrect) {
      return 'bg-red-500 text-white';
    } else {
      return 'bg-neutral-300 text-neutral-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Passage Section */}
      {passage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              {passage.title || 'Texte de référence'}
            </h3>
            {passage.category && (
              <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                {passage.category}
              </span>
            )}
          </div>
          <div className="prose prose-sm max-w-none">
            <div className="text-blue-800 leading-relaxed whitespace-pre-wrap">
              {passage.content}
            </div>
          </div>
        </div>
      )}

      {/* Question Section */}
      <div className="bg-white rounded-lg p-6 border border-neutral-200">
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-neutral-900 mb-2">
            Question
          </h4>
          <MathText
            text={question.question_text}
            block
            className="text-neutral-700 text-base"
          />
        </div>

        {/* Answer Options */}
        <div className="space-y-3">
          {[
            { key: 'A', text: question.answer1 },
            { key: 'B', text: question.answer2 },
            { key: 'C', text: question.answer3 },
            { key: 'D', text: question.answer4 }
          ].map((option, index) => (
            <button
              key={index}
              onClick={() => !isReviewMode && onAnswerSelect(index)}
              disabled={isReviewMode}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                getAnswerClass(index)
              } ${isReviewMode ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                  getOptionClass(index)
                }`}>
                  {option.key}
                </div>
                <span className={showCorrectAnswer && index === correctAnswerIndex ? 'font-medium' : ''}>
                  <MathText text={option.text} />
                </span>
                {showCorrectAnswer && (
                  <>
                    {index === correctAnswerIndex && (
                      <span className="ml-auto text-green-600 text-sm font-medium">
                        ✓ Correct
                      </span>
                    )}
                    {userAnswer === index && userAnswer !== correctAnswerIndex && (
                      <span className="ml-auto text-red-600 text-sm font-medium">
                        ✗ Incorrect
                      </span>
                    )}
                  </>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Explanation (shown in review mode) */}
        {showCorrectAnswer && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h5 className="font-semibold text-blue-900 mb-2">Explication</h5>
            <p className="text-blue-800 text-sm">
              Réponse correcte: <MathText text={question.correct} />
            </p>
          </div>
        )}
      </div>
    </div>
  );
}; 
