import React, { useState, useEffect } from 'react';
import { getQuestionsBySubject } from '../../data/quizQuestions';
import { ChevronLeft, ChevronRight, X, Repeat, Trophy } from 'lucide-react';
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext';

// Updated Question interface to include passages
interface Question {
  id: number;
  type: 'multiple-choice' | 'true-false' | 'fill-blank' | 'matching';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  passage?: {
    id: string;
    title?: string;
    content: string;
    category?: string;
  };
}

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
    // Use userAnswer to determine if question has been answered
    const hasAnswered = userAnswer !== null;

    // Debug logging removed for cleaner code

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
        setSelectedOption(option);
        onAnswer(option);
    };

    const getDisplayCorrectAnswer = () => {
        if (question.type === 'multiple-choice' && typeof question.correctAnswer === 'number') {
            return question.options?.[question.correctAnswer] || 'N/A';
        } else if (question.type === 'true-false') {
            return question.correctAnswer === 'true' ? 'Vrai' : 'Faux';
        }
        return question.correctAnswer;
    };

    const getCorrectAnswerLetter = () => {
        if (question.type === 'multiple-choice' && typeof question.correctAnswer === 'number') {
            return String.fromCharCode(65 + question.correctAnswer);
        }
        return '';
    };

    if (isFlipped) {
        return (
            <div className="w-full h-full bg-white rounded-xl shadow-lg p-6 cursor-pointer" onClick={toggleFlip}>
                <div className="h-full flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                                question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                            }`}>
                                {question.difficulty === 'easy' ? 'Facile' : question.difficulty === 'medium' ? 'Moyen' : 'Difficile'}
                            </span>
                            <span className="text-sm text-gray-500">
                                {question.type === 'multiple-choice' ? 'Choix Multiple' : 
                                 question.type === 'true-false' ? 'Vrai/Faux' : 
                                 question.type === 'fill-blank' ? 'Texte à trous' : 'Correspondance'}
                            </span>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">{question.question}</h3>
                        
                        {question.passage && (
                            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                                <h4 className="font-medium text-gray-700 mb-2">{question.passage.title}</h4>
                                <p className="text-sm text-gray-600">{question.passage.content}</p>
                            </div>
                        )}
                        
                        <div className="space-y-3 mb-6">
                            {question.type === 'multiple-choice' && question.options?.map((option, index) => {
                                const isCorrect = index === question.correctAnswer;
                                const isUserAnswer = userAnswer === index;
                                
                                return (
                                    <div
                                        key={index}
                                        className={`p-3 rounded-lg border-2 transition-colors ${
                                            isCorrect 
                                                ? 'bg-green-50 border-green-500 text-green-800' 
                                                : isUserAnswer && !isCorrect
                                                ? 'bg-red-50 border-red-500 text-red-800'
                                                : 'bg-gray-50 border-gray-200 text-gray-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                                                isCorrect 
                                                    ? 'bg-green-500 text-white' 
                                                    : isUserAnswer && !isCorrect
                                                    ? 'bg-red-500 text-white'
                                                    : 'bg-gray-300 text-gray-600'
                                            }`}>
                                                {String.fromCharCode(65 + index)}
                                            </span>
                                            <span className="flex-1">{option}</span>
                                            {isCorrect && (
                                                <span className="text-green-600 font-semibold">✓ Correct</span>
                                            )}
                                            {isUserAnswer && !isCorrect && (
                                                <span className="text-red-600 font-semibold">✗ Incorrect</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {question.type === 'true-false' && ['Vrai', 'Faux'].map((option, index) => {
                                const answerValue = index === 0 ? 'true' : 'false';
                                const isCorrect = question.correctAnswer === answerValue;
                                const isUserAnswer = userAnswer === answerValue;
                                
                                return (
                                    <div
                                        key={option}
                                        className={`p-3 rounded-lg border-2 transition-colors ${
                                            isCorrect 
                                                ? 'bg-green-50 border-green-500 text-green-800' 
                                                : isUserAnswer && !isCorrect
                                                ? 'bg-red-50 border-red-500 text-red-800'
                                                : 'bg-gray-50 border-gray-200 text-gray-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                                                isCorrect 
                                                    ? 'bg-green-500 text-white' 
                                                    : isUserAnswer && !isCorrect
                                                    ? 'bg-red-500 text-white'
                                                    : 'bg-gray-300 text-gray-600'
                                            }`}>
                                                {index === 0 ? 'V' : 'F'}
                                            </span>
                                            <span className="flex-1">{option}</span>
                                            {isCorrect && (
                                                <span className="text-green-600 font-semibold">✓ Correct</span>
                                            )}
                                            {isUserAnswer && !isCorrect && (
                                                <span className="text-red-600 font-semibold">✗ Incorrect</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg font-bold text-blue-800">
                                    {getCorrectAnswerLetter()}
                                </span>
                                <div className="text-sm">
                                    La réponse correcte est : {getDisplayCorrectAnswer()}
                                </div>
                            </div>
                            
                            <div className="mb-6">
                                <h3 className="font-bold text-gray-800 mb-2">Explication :</h3>
                                <p className="text-gray-600 text-sm lg:text-base">{question.explanation}</p>
                            </div>
                            
                            {/* Click anywhere on the back of the card to flip back; CTA removed per UX */}
                            <p className="text-sm text-gray-500 mt-4">
                                Cliquez n'importe où sur la carte pour revenir
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-white rounded-xl shadow-lg p-6 cursor-pointer" onClick={toggleFlip}>
            <div className="h-full flex flex-col justify-between">
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                            question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                        }`}>
                            {question.difficulty === 'easy' ? 'Facile' : question.difficulty === 'medium' ? 'Moyen' : 'Difficile'}
                        </span>
                        <span className="text-sm text-gray-500">
                            {question.type === 'multiple-choice' ? 'Choix Multiple' : 
                             question.type === 'true-false' ? 'Vrai/Faux' : 
                             question.type === 'fill-blank' ? 'Texte à trous' : 'Correspondance'}
                        </span>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">{question.question}</h3>
                    
                    {question.passage && (
                        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-medium text-gray-700 mb-2">{question.passage.title}</h4>
                            <p className="text-sm text-gray-600">{question.passage.content}</p>
                        </div>
                    )}
                    
                    <div className="space-y-3">
                        {question.type === 'multiple-choice' && question.options?.map((option, index) => (
                            <div
                                key={index}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOptionClick(index);
                                }}
                                className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                                    selectedOption === index || userAnswer === index
                                        ? colors.activeOption
                                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-sm font-bold">
                                        {String.fromCharCode(65 + index)}
                                    </span>
                                    <span>{option}</span>
                                </div>
                            </div>
                        ))}
                        
                        {question.type === 'true-false' && ['Vrai', 'Faux'].map((option, index) => {
                            const answerValue = index === 0 ? 'true' : 'false';
                            return (
                                <div
                                    key={option}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleOptionClick(answerValue);
                                    }}
                                    className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                                        selectedOption === answerValue || userAnswer === answerValue
                                            ? colors.activeOption
                                            : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-sm font-bold">
                                            {index === 0 ? 'V' : 'F'}
                                        </span>
                                        <span>{option}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-500">
                        Cliquez sur une réponse puis sur la carte pour voir la correction
                    </p>
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
    const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
    const [isCompleted, setIsCompleted] = useState(false);

    const { profile } = useSupabaseAuth();

    useEffect(() => {
        const fetchQuestions = async () => {
            setLoading(true);
            setError(null);
            console.log('🔄 QuizCards: Starting to fetch questions...');
            console.log('📊 QuizCards: Profile:', profile);
            console.log('📊 QuizCards: Subject:', subject);
            
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
                console.log('🎯 QuizCards: Mapped subject:', subjectLower);
                console.log('🎯 QuizCards: Exam type:', examType);
                
                // For daily quizzes: don't pass testNumber to ensure daily question rotation
                // This will use the current date as seed for consistent daily questions
                const questions = await getQuestionsBySubject(subjectLower, examType);
                console.log('📚 QuizCards: Questions loaded:', questions.length);
                
                if (questions.length === 0) {
                    console.warn('⚠️ QuizCards: No questions returned from getQuestionsBySubject');
                    setError('Aucune question disponible pour cette matière. Veuillez réessayer plus tard.');
                } else {
                    setQuestions(questions.slice(0, 10)); // Limit to 10 questions
                    console.log('✅ QuizCards: Questions set successfully');
                }
                
                // Scroll to top when questions are loaded
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (err) {
                console.error('❌ QuizCards: Error fetching questions:', err);
                setError('Erreur lors du chargement des questions. Veuillez réessayer.');
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
        console.log('handleAnswer called with:', { questionId, answer, type: typeof answer });
        setUserAnswers(prev => {
            const newMap = new Map(prev.set(questionId, answer));
            console.log('Updated userAnswers:', Array.from(newMap.entries()));
            return newMap;
        });
        setAnsweredQuestions(prev => new Set([...prev, questionId]));
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

    const nextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const prevQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const resetQuiz = () => {
        setCurrentQuestionIndex(0);
        setFlippedCards(new Set());
        setUserAnswers(new Map());
        setAnsweredQuestions(new Set());
        setIsCompleted(false);
    };

    const currentQuestion = questions[currentQuestionIndex];

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Chargement des questions...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center max-w-md mx-auto p-6">
                    <div className="text-red-500 text-xl mb-4">⚠️ Erreur</div>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <div className="space-y-3">
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            Réessayer
                        </button>
                        <button
                            onClick={onExit}
                            className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                            Retour
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!currentQuestion) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 text-xl mb-4">Aucune question disponible</div>
                    <p className="text-gray-600 mb-6">Aucune question n'a été trouvée pour cette matière.</p>
                    <button
                        onClick={onExit}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        Retour au menu principal
                    </button>
                </div>
            </div>
        );
    }

    if (isCompleted) {
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

        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
                    <div className="text-center">
                        <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Terminé !</h2>
                        <p className="text-gray-600 mb-6">Voici vos résultats</p>
                        
                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                            <div className="text-3xl font-bold text-blue-600 mb-2">{score}%</div>
                            <div className="text-gray-600">
                                {correctAnswers} sur {questions.length} questions correctes
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            <button
                                onClick={resetQuiz}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                <Repeat className="w-4 h-4" />
                                Recommencer
                            </button>
                            <button
                                onClick={onExit}
                                className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                            >
                                Retour au menu
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
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                                subjectColor === 'blue' ? 'bg-blue-100' :
                                subjectColor === 'green' ? 'bg-green-100' :
                                'bg-yellow-100'
                            }`}>
                                <Trophy className={`w-6 h-6 ${
                                    subjectColor === 'blue' ? 'text-blue-600' :
                                    subjectColor === 'green' ? 'text-green-600' :
                                    'text-yellow-600'
                                }`} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">{subject}</h1>
                                <p className="text-sm text-gray-600">Quiz - Question {currentQuestionIndex + 1} sur {questions.length}</p>
                            </div>
                        </div>
                        <button
                            onClick={onExit}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <QuestionCard
                        question={currentQuestion}
                        isFlipped={flippedCards.has(currentQuestion.id)}
                        userAnswer={userAnswers.get(currentQuestion.id) || null}
                        onAnswer={(answer) => handleAnswer(currentQuestion.id, answer)}
                        toggleFlip={() => toggleFlip(currentQuestion.id)}
                        color={subjectColor}
                    />
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={prevQuestion}
                        disabled={currentQuestionIndex === 0}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Précédent
                    </button>

                    <div className="flex items-center gap-2">
                        {questions.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentQuestionIndex(index)}
                                className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                                    index === currentQuestionIndex
                                        ? colors.activePagination
                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                }`}
                            >
                                {index + 1}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={nextQuestion}
                        disabled={currentQuestionIndex === questions.length - 1}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Suivant
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
