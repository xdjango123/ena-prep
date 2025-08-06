import React, { useState, useEffect } from 'react';
import { getQuestionsBySubject, Question } from '../../data/quizQuestions';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext';

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
    
    // More robust comparison logic
    const isCorrect = (() => {
      if (question.type === 'multiple-choice' && typeof question.correctAnswer === 'number') {
        // For multiple choice, compare the selected option with the correct option text
        const correctOptionText = question.options?.[question.correctAnswer];
        return userAnswer === correctOptionText;
      } else if (question.type === 'true-false') {
        // For true/false, compare strings
        return String(userAnswer).toLowerCase() === String(question.correctAnswer).toLowerCase();
      }
      // Fallback comparison
      return userAnswer === correctAnswerValue;
    })();

    // Ensure correctAnswerValue is always the correct option text for display
    const displayCorrectAnswer = (() => {
        if (question.type === 'multiple-choice' && typeof question.correctAnswer === 'number') {
            return question.options?.[question.correctAnswer] || 'Unknown';
        } else if (question.type === 'true-false') {
            return String(question.correctAnswer);
        }
        return String(question.correctAnswer);
    })();
    
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
        <div 
            className="w-full max-w-2xl mx-auto cursor-pointer transition-all duration-500"
            onClick={toggleFlip}
        >
            <div className="relative w-full h-full">
                {/* Front of card */}
                <div className={`w-full bg-white rounded-2xl shadow-lg p-6 lg:p-8 border-2 transition-all ${
                    isFlipped ? 'opacity-0' : 'opacity-100'
                }`}>
                    <div className="text-center mb-6">
                        <h2 className="text-lg lg:text-xl font-bold text-gray-800 mb-4">{question.question}</h2>
                    </div>
                    
                    <div className="space-y-3">
                        {renderOptions()}
                    </div>
                    
                    {selectedOption !== null && (
                        <div className="mt-6 text-center">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleSubmit(); }}
                                className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${colors.button}`}
                            >
                                Valider ma réponse
                            </button>
                        </div>
                    )}
                </div>

                {/* Back of card */}
                <div className={`absolute inset-0 w-full bg-white rounded-2xl shadow-lg p-6 lg:p-8 border-2 transition-all ${
                    isFlipped ? 'opacity-100' : 'opacity-0'
                }`}>
                    <div className="text-center">
                        <div className={`mb-4 p-4 rounded-lg ${
                            isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                            <div className="font-bold text-lg mb-2">
                                {isCorrect ? 'Correct !' : 'Incorrect'}
                            </div>
                            <div className="text-sm mb-2">
                                Votre réponse : {userAnswer || 'Aucune réponse'}
                            </div>
                            <div className="text-sm">
                                La réponse correcte est : {displayCorrectAnswer}
                            </div>
                        </div>
                        
                        <div className="mb-6">
                            <h3 className="font-bold text-gray-800 mb-2">Explication :</h3>
                            <p className="text-gray-600 text-sm lg:text-base">{question.explanation}</p>
                        </div>
                        
                        <p className="text-sm text-gray-500">
                            Cliquez n'importe où sur la carte pour revenir
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};


export const QuizCards: React.FC<QuizCardsProps> = ({ subject, subjectColor, onExit }) => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
    const [userAnswers, setUserAnswers] = useState<Map<number, string | number>>(new Map());

    const { profile } = useSupabaseAuth();

    useEffect(() => {
        const fetchQuestions = async () => {
            setLoading(true);
            try {
                // Map the subject name to the correct database category
                let subjectLower;
                if (subject.toLowerCase().includes('culture')) {
                    subjectLower = 'culture-generale';
                } else if (subject.toLowerCase().includes('anglais') || subject.toLowerCase().includes('english')) {
                    subjectLower = 'english';
                } else if (subject.toLowerCase().includes('logique') || subject.toLowerCase().includes('logic')) {
                    subjectLower = 'logique';
                } else {
                    subjectLower = subject.toLowerCase().replace(' ', '-');
                }
                
                const examType = profile?.exam_type as 'CM' | 'CMS' | 'CS' | undefined;
                
                // Add cache-busting parameter to force fresh data
                const questions = await getQuestionsBySubject(subjectLower, examType);
                setQuestions(questions.slice(0, 10)); // Limit to 10 questions
                
                // Scroll to top when questions are loaded
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (err) {
                setError('Failed to fetch questions');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchQuestions();
    }, [subject, profile?.exam_type]);

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
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            // Scroll to top when navigating to next question
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const goToPrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
            // Scroll to top when navigating to previous question
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
    
    const currentQuestion = questions[currentQuestionIndex];

    if (loading) {
        return <div className="text-center py-8">Loading...</div>;
    }

    if (error) {
        return <div className="text-center py-8 text-red-500">{error}</div>;
    }

    if (!currentQuestion) {
        return <div className="text-center py-8">No questions available for this subject.</div>;
    }

    return (
        <div className="p-4 lg:p-6 bg-gray-50 min-h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Quiz: {subject}</h1>
                <button onClick={onExit} className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors">
                    <X className="w-5 h-5 lg:w-6 lg:h-6 text-gray-700" />
                </button>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mb-6 lg:mb-8">
                {questions.map((q, index) => (
                    <button 
                        key={q.id}
                        onClick={() => {
                            setCurrentQuestionIndex(index);
                            // Scroll to top when clicking pagination button
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full text-xs lg:text-sm font-semibold transition-all flex items-center justify-center
                            ${index === currentQuestionIndex 
                                ? colors.activePagination 
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                    >
                        {index + 1}
                    </button>
                ))}
            </div>

            <div className="flex-1 flex items-center justify-center">
                <QuestionCard
                    question={currentQuestion}
                    isFlipped={flippedCards.has(currentQuestion.id)}
                    userAnswer={userAnswers.get(currentQuestion.id) || null}
                    onAnswer={(answer) => handleAnswer(currentQuestion.id, answer)}
                    toggleFlip={() => toggleFlip(currentQuestion.id)}
                    color={subjectColor}
                />
            </div>

            <div className="flex justify-between items-center mt-6 lg:mt-8">
                <button
                    onClick={goToPrevious}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                    <span className="hidden sm:inline">Précédent</span>
                </button>
                
                <div className="text-sm text-gray-600">
                    {currentQuestionIndex + 1} / {questions.length}
                </div>
                
                <button
                    onClick={goToNext}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors"
                >
                    <span className="hidden sm:inline">Suivant</span>
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}; 