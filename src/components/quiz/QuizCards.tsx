import React, { useState, useMemo } from 'react';
import { getQuestionsBySubject, Question } from '../../data/quizQuestions';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface QuizCardsProps {
    subject: string;
    subjectColor: 'green' | 'blue' | 'yellow';
    onExit: () => void;
}

const QuestionCard: React.FC<{
    question: Question;
    isFlipped: boolean;
    userAnswer: string | number | null;
    onAnswer: (answer: string | number) => void;
    toggleFlip: () => void;
    color: 'green' | 'blue' | 'yellow';
}> = ({ question, isFlipped, userAnswer, onAnswer, toggleFlip, color }) => {
    
    const [selectedOption, setSelectedOption] = useState<string|number|null>(null);

    const colorClasses = {
        blue: {
            activeOption: 'bg-blue-100 border-blue-400 ring-2 ring-blue-300',
            button: 'bg-blue-500 hover:bg-blue-600',
        },
        green: {
            activeOption: 'bg-green-100 border-green-400 ring-2 ring-green-300',
            button: 'bg-green-500 hover:bg-green-600',
        },
        yellow: {
            activeOption: 'bg-yellow-100 border-yellow-400 ring-2 ring-yellow-300',
            button: 'bg-yellow-500 hover:bg-yellow-600',
        }
    };
    const colors = colorClasses[color];

    const handleOptionClick = (option: string | number) => {
        if (isFlipped) return;
        setSelectedOption(option);
    };

    const handleSubmit = () => {
        if (selectedOption !== null) {
            onAnswer(selectedOption);
        }
    };
    
    const correctAnswerValue = question.type === 'multiple-choice' && typeof question.correctAnswer === 'number'
        ? question.options?.[question.correctAnswer]
        : question.correctAnswer;
    
    const isCorrect = userAnswer === correctAnswerValue;
    
    const renderOptions = () => {
        if (question.type === 'multiple-choice' && question.options) {
            return question.options.map((option, index) => (
                <button
                    key={index}
                    onClick={(e) => { e.stopPropagation(); handleOptionClick(option); }}
                    className={`w-full text-left p-4 rounded-lg border transition-colors text-lg ${selectedOption === option ? colors.activeOption : 'bg-gray-50 hover:bg-gray-100 border-gray-200'}`}
                >
                    {option}
                </button>
            ));
        }
        if (question.type === 'true-false') {
            return ['True', 'False'].map((option) => (
                 <button
                    key={option}
                    onClick={(e) => { e.stopPropagation(); handleOptionClick(option.toLowerCase()); }}
                    className={`w-full text-left p-4 rounded-lg border transition-colors text-lg ${selectedOption === option.toLowerCase() ? colors.activeOption : 'bg-gray-50 hover:bg-gray-100 border-gray-200'}`}
                >
                    {option}
                </button>
            ));
        }
        return <p className="text-gray-500">This question type is not supported yet.</p>;
    };

    return (
        <div className="perspective-1000 w-full max-w-2xl mx-auto h-[28rem]" onClick={() => { if(isFlipped) toggleFlip() }}>
            <div className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                {/* Front of the card */}
                <div className="absolute w-full h-full backface-hidden bg-white rounded-xl shadow-lg border p-6 flex flex-col justify-between">
                    <h3 className="text-xl font-semibold text-gray-800">{question.question}</h3>
                    <div className="space-y-3 my-4">{renderOptions()}</div>
                    <button onClick={(e) => { e.stopPropagation(); handleSubmit(); }} disabled={selectedOption === null} className={`mt-auto w-full py-3 px-5 rounded-lg text-white font-semibold transition-all text-lg ${colors.button} disabled:bg-gray-300`}>
                        Submit
                    </button>
                </div>

                {/* Back of the card */}
                <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-white rounded-xl shadow-lg border p-6 flex flex-col justify-center items-center text-center">
                    <div className={`w-full p-4 rounded-lg ${isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
                        <h3 className={`text-2xl font-bold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                            {isCorrect ? "Correct!" : "Incorrect"}
                        </h3>
                        {!isCorrect && <p className="mt-2 text-gray-800 text-lg">The correct answer is: <strong>{String(correctAnswerValue)}</strong></p>}
                    </div>
                    {question.explanation && <p className="mt-6 text-gray-700 text-lg">{question.explanation}</p>}
                    <p className="mt-8 text-sm text-gray-500">Click anywhere on the card to flip back.</p>
                </div>
            </div>
        </div>
    );
};


export const QuizCards: React.FC<QuizCardsProps> = ({ subject, subjectColor, onExit }) => {
    const questions = useMemo(() => getQuestionsBySubject(subject.toLowerCase().replace(' ', '-')).slice(0, 20), [subject]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
    const [userAnswers, setUserAnswers] = useState<Map<number, string | number>>(new Map());

    const colorClasses = {
        blue: {
            activePagination: 'bg-blue-500 text-white scale-110',
        },
        green: {
            activePagination: 'bg-green-500 text-white scale-110',
        },
        yellow: {
            activePagination: 'bg-yellow-500 text-white scale-110',
        }
    };
    const colors = colorClasses[subjectColor];

    const handleAnswer = (questionId: number, answer: string | number) => {
        setUserAnswers(prev => new Map(prev.set(questionId, answer)));
        setFlippedCards(prev => new Set(prev.add(questionId)));
    };

    const toggleFlip = (questionId: number) => {
        setFlippedCards(prev => {
            const newFlipped = new Set(prev);
            if (newFlipped.has(questionId)) {
                newFlipped.delete(questionId);
            } else {
                newFlipped.add(questionId);
            }
            return newFlipped;
        });
    };

    const goToNext = () => {
        setCurrentQuestionIndex(prev => (prev + 1) % questions.length);
    };

    const goToPrevious = () => {
        setCurrentQuestionIndex(prev => (prev - 1 + questions.length) % questions.length);
    };
    
    const currentQuestion = questions[currentQuestionIndex];

    return (
        <div className="p-6 bg-gray-50 min-h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold text-gray-800">Quiz: {subject}</h1>
                <button onClick={onExit} className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors">
                    <X className="w-6 h-6 text-gray-700" />
                </button>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mb-8">
                {questions.map((q, index) => (
                    <button 
                        key={q.id}
                        onClick={() => setCurrentQuestionIndex(index)}
                        className={`w-10 h-10 rounded-full text-sm font-semibold transition-all flex items-center justify-center
                            ${index === currentQuestionIndex ? colors.activePagination : ''}
                            ${userAnswers.has(q.id) 
                                ? (userAnswers.get(q.id) === (q.type === 'multiple-choice' ? q.options?.[q.correctAnswer as number] : q.correctAnswer) ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800') 
                                : 'bg-white border border-gray-300 text-gray-600'}
                        `}
                    >
                        {index + 1}
                    </button>
                ))}
            </div>
            
            <div className="flex-grow flex items-center justify-center">
                {currentQuestion && (
                    <QuestionCard 
                        key={currentQuestion.id}
                        question={currentQuestion}
                        isFlipped={flippedCards.has(currentQuestion.id)}
                        userAnswer={userAnswers.get(currentQuestion.id) || null}
                        onAnswer={(answer) => handleAnswer(currentQuestion.id, answer)}
                        toggleFlip={() => toggleFlip(currentQuestion.id)}
                        color={subjectColor}
                    />
                )}
            </div>

            <div className="flex justify-between items-center mt-8 max-w-2xl w-full mx-auto">
                <button onClick={goToPrevious} className="flex items-center gap-2 px-6 py-3 rounded-lg bg-white border border-gray-300 hover:bg-gray-100 transition-colors">
                    <ChevronLeft className="w-5 h-5" /> Previous
                </button>
                <button onClick={goToNext} className="flex items-center gap-2 px-6 py-3 rounded-lg bg-white border border-gray-300 hover:bg-gray-100 transition-colors">
                    Next <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}; 