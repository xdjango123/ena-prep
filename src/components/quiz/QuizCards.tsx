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

    // Reset selectedOption when question changes, but don't override user selections
    useEffect(() => {
        setSelectedOption(null);
    }, [question.id]);

    const handleOptionClick = (option: string | number) => {
        // Allow changing selection even after answering
        setSelectedOption(option);
    };

    const handleSubmit = () => {
        console.log('handleSubmit called with selectedOption:', selectedOption, 'type:', typeof selectedOption);
        if (selectedOption !== null) {
            console.log('Calling onAnswer with:', selectedOption);
            onAnswer(selectedOption);
            // Automatically flip the card after submitting
            toggleFlip();
        } else {
            console.log('selectedOption is null, not calling onAnswer');
        }
    };
    
    // More robust comparison logic
    const isCorrect = (() => {
      if (userAnswer === null) return false;
      
      if (question.type === 'multiple-choice' && typeof question.correctAnswer === 'number') {
        // For multiple choice, compare the selected index with the correct index
        return userAnswer === question.correctAnswer;
      } else if (question.type === 'true-false') {
        // For true/false, compare strings
        return String(userAnswer).toLowerCase() === String(question.correctAnswer).toLowerCase();
      }
      // Fallback comparison
      return userAnswer === question.correctAnswer;
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
            return question.options.map((option, index) => {
                const isSelected = selectedOption === index;
                const isCorrectOption = index === question.correctAnswer;
                // Only show correct/incorrect feedback when the card is flipped (back side)
                const showCorrect = isFlipped;
                
                let optionClass = 'w-full text-left p-4 rounded-lg border transition-colors text-lg ';
                
                if (showCorrect && isCorrectOption) {
                    optionClass += 'bg-green-100 border-green-400 text-green-800';
                } else if (showCorrect && isSelected && !isCorrectOption) {
                    optionClass += 'bg-red-100 border-red-400 text-red-800';
                } else if (isSelected) {
                    optionClass += colors.activeOption;
                } else {
                    optionClass += 'bg-gray-50 hover:bg-gray-100 border-gray-200';
                }
                
                return (
                    <button
                        key={index}
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            handleOptionClick(index); 
                        }}
                        disabled={hasAnswered}
                        className={optionClass}
                        style={{ cursor: hasAnswered ? 'not-allowed' : 'pointer' }}
                    >
                        {option}
                    </button>
                );
            });
        }
        if (question.type === 'true-false') {
            return ['True', 'False'].map((option, index) => {
                const answerValue = index === 0 ? 'true' : 'false';
                const isSelected = selectedOption === answerValue;
                const isCorrectOption = String(question.correctAnswer).toLowerCase() === answerValue;
                // Only show correct/incorrect feedback when the card is flipped (back side)
                const showCorrect = isFlipped;
                
                let optionClass = 'w-full text-left p-4 rounded-lg border transition-colors text-lg ';
                
                if (showCorrect && isCorrectOption) {
                    optionClass += 'bg-green-100 border-green-400 text-green-800';
                } else if (showCorrect && isSelected && !isCorrectOption) {
                    optionClass += 'bg-red-100 border-red-400 text-red-800';
                } else if (isSelected) {
                    optionClass += colors.activeOption;
                } else {
                    optionClass += 'bg-gray-50 hover:bg-gray-100 border-gray-200';
                }
                
                return (
                    <button
                        key={option}
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            handleOptionClick(answerValue); 
                        }}
                        disabled={hasAnswered}
                        className={optionClass}
                        style={{ cursor: hasAnswered ? 'not-allowed' : 'pointer' }}
                    >
                        {option}
                    </button>
                );
            });
        }
        return <p className="text-gray-500">This question type is not supported yet.</p>;
    };

    return (
        <div className="w-full max-w-md mx-auto transition-all duration-500">
            <div className="relative w-full h-full">
                {/* Front of card */}
                <div
                    className={`w-full bg-white rounded-2xl shadow-lg p-6 lg:p-8 border-2 transition-opacity duration-150 ${
                        isFlipped ? 'opacity-0 pointer-events-none' : 'opacity-100'
                    } ${hasAnswered ? 'cursor-pointer' : ''}`}
                    onClick={hasAnswered ? toggleFlip : undefined}
                    role={hasAnswered ? 'button' : undefined}
                    aria-pressed={hasAnswered ? (isFlipped ? true : false) : undefined}
                    tabIndex={hasAnswered ? 0 : -1}
                    onKeyDown={(e) => {
                        if (!hasAnswered) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleFlip();
                        }
                    }}
                >
                    {/* Passage Section - Show if question has a passage */}
                    {question.passage && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <div className="mb-3">
                                <h3 className="text-base font-semibold text-blue-900 mb-2">
                                    {question.passage.title || 'Texte de référence'}
                                </h3>
                                {question.passage.category && (
                                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                        {question.passage.category}
                                    </span>
                                )}
                            </div>
                            <div className="prose prose-sm max-w-none">
                                <div className="text-blue-800 leading-relaxed whitespace-pre-wrap text-sm">
                                    {question.passage.content}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div className="text-center mb-6">
                        <h2 className="text-lg lg:text-xl font-bold text-gray-800 mb-4">{question.question}</h2>
                    </div>
                    
                                         <div className="space-y-3">
                         {/* Disable selecting answers after the question has been answered */}
                         <fieldset disabled={hasAnswered} className={hasAnswered ? 'opacity-100' : ''}>
                             {renderOptions()}
                         </fieldset>
                     </div>
                    
                    {selectedOption !== null && !hasAnswered && (
                        <div className="mt-6 text-center">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleSubmit(); }}
                                className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${colors.button}`}
                            >
                                Valider ma réponse
                            </button>
                        </div>
                    )}
                    
                    {hasAnswered && !isFlipped && (
                        <p className="mt-3 text-center text-xs text-gray-500">
                            Réponse verrouillée — cliquez n'importe où sur la carte pour afficher/cacher la correction.
                        </p>
                    )}
                    
                    {/* Hint shown above; clicking anywhere toggles when validée */}
                </div>

                {/* Back of card */}
                <div 
                    className={`absolute inset-0 w-full bg-white rounded-2xl shadow-lg p-6 lg:p-8 border-2 transition-opacity duration-150 cursor-pointer ${
                        isFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                    onClick={toggleFlip}
                >
                    {/* Passage Section - Show if question has a passage */}
                    {question.passage && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <div className="mb-3">
                                <h3 className="text-base font-semibold text-blue-900 mb-2">
                                    {question.passage.title || 'Texte de référence'}
                                </h3>
                                {question.passage.category && (
                                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                        {question.passage.category}
                                    </span>
                                )}
                            </div>
                            <div className="prose prose-sm max-w-none">
                                <div className="text-blue-800 leading-relaxed whitespace-pre-wrap text-sm">
                                    {question.passage.content}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div className="text-center">
                        <div className={`mb-4 p-4 rounded-lg ${
                            isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                            <div className="font-bold text-lg mb-2">
                                {isCorrect ? 'Correct !' : 'Incorrect'}
                            </div>
                            <div className="text-sm mb-2">
                                Votre réponse : {(() => {
                                    if (question.type === 'multiple-choice') {
                                        const index = typeof userAnswer === 'number' ? userAnswer : Number(userAnswer);
                                        const opts = Array.isArray(question.options) ? question.options : [];
                                        const inRange = Number.isInteger(index) && index >= 0 && index < opts.length;
                                        // Debug: ensure we see what we're rendering
                                        console.log('Render user answer', { index, optsLength: opts.length, inRange, opts });
                                        return inRange ? opts[index] : 'Aucune réponse';
                                    }
                                    return userAnswer ?? 'Aucune réponse';
                                })()}
                            </div>
                            <div className="text-sm">
                                La réponse correcte est : {displayCorrectAnswer}
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
                
                // For daily quizzes: don't pass testNumber to ensure daily question rotation
                // This will use the current date as seed for consistent daily questions
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

    const goToNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            // Pre-reset flip state so back is not briefly visible
            setFlippedCards(prev => {
                const newSet = new Set(prev);
                newSet.delete(questions[currentQuestionIndex].id);
                newSet.delete(questions[currentQuestionIndex + 1].id);
                return newSet;
            });
            setCurrentQuestionIndex(i => i + 1);
            // Scroll to top when navigating to next question
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const goToPrevious = () => {
        if (currentQuestionIndex > 0) {
            // Pre-reset flip state so back is not briefly visible
            setFlippedCards(prev => {
                const newSet = new Set(prev);
                newSet.delete(questions[currentQuestionIndex].id);
                newSet.delete(questions[currentQuestionIndex - 1].id);
                return newSet;
            });
            setCurrentQuestionIndex(i => i - 1);
            // Scroll to top when navigating to previous question
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleFinish = () => {
        setIsCompleted(true);
    };

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
    
    const currentQuestion = questions[currentQuestionIndex];
    const answeredCount = answeredQuestions.size;
    const totalQuestions = questions.length;
    const canFinish = answeredCount === totalQuestions;

    if (loading) {
        return <div className="text-center py-8">Loading...</div>;
    }

    if (error) {
        return <div className="text-center py-8 text-red-500">{error}</div>;
    }

    if (!currentQuestion) {
        return <div className="text-center py-8">No questions available for this subject.</div>;
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

        return (
            <div className="min-h-screen bg-gray-50 flex flex-col p-4">
                <div className="max-w-4xl mx-auto w-full">
                    {/* Results Header */}
                    <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
                        <div className="text-center">
                            <h1 className="text-3xl font-bold text-gray-900 mb-4">Quiz Terminé !</h1>
                            <p className="text-gray-600 mb-8">{getSubtitle(score)}</p>
                            
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
                                    <h3 className="text-3xl font-bold">{answeredCount}</h3>
                                    <p className="text-sm text-gray-500">Répondu</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="text-3xl font-bold">{questions.length}</h3>
                                    <p className="text-sm text-gray-500">Questions</p>
                                </div>
                            </div>

                            {/* Score Comment */}
                            <div className="mb-8">
                                <div className={`inline-block px-6 py-3 rounded-full ${colors.activePagination.replace('bg-', 'bg-').replace(' scale-110', '')} text-white font-semibold text-lg`}>
                                    {getScoreComment(score)}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row justify-center gap-4">
                                <button 
                                    onClick={() => {
                                        setCurrentQuestionIndex(0);
                                        setUserAnswers(new Map());
                                        setAnsweredQuestions(new Set());
                                        setIsCompleted(false);
                                        setFlippedCards(new Set());
                                    }}
                                    className={`flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-lg ${colors.activePagination.replace(' scale-110', '')} text-white font-semibold hover:opacity-90 transition-colors`}
                                >
                                    <Repeat className="w-5 h-5" />
                                    Refaire le quiz
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

    return (
        <div className="p-4 lg:p-6 bg-gray-50 flex flex-col w-full overflow-x-hidden">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Quiz: {subject}</h1>
                <button onClick={onExit} className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors">
                    <X className="w-5 h-5 lg:w-6 lg:h-6 text-gray-700" />
                </button>
            </div>

            {/* Progress indicator */}
            <div className="mb-4 text-center">
                <p className="text-sm text-gray-600">
                    {answeredCount} / {totalQuestions} questions répondues
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                        className={`h-2 rounded-full ${colors.activePagination.replace(' scale-110', '')} transition-all duration-300`}
                        style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
                    ></div>
                </div>
            </div>

            <div className="flex flex-wrap justify-center gap-1 mb-6 lg:mb-8 w-full">
                {questions.map((q, index) => (
                    <button 
                        key={q.id}
                        onClick={() => {
                            setCurrentQuestionIndex(index);
                            // Reset flip state when navigating via pagination
                            setFlippedCards(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(q.id);
                                return newSet;
                            });
                            // Scroll to top when clicking pagination button
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`w-6 h-6 lg:w-8 lg:h-8 rounded-full text-xs font-semibold transition-all flex items-center justify-center
                            ${index === currentQuestionIndex 
                                ? colors.activePagination 
                                : answeredQuestions.has(q.id)
                                ? 'bg-green-200 text-green-800'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                    >
                        {index + 1}
                    </button>
                ))}
            </div>

            <div className="flex-1 flex items-center justify-center">
                {(() => {
                    const userAnswer = userAnswers.get(currentQuestion.id);
                    console.log('Passing to QuestionCard:', {
                        questionId: currentQuestion.id,
                        userAnswer,
                        userAnswerType: typeof userAnswer,
                        allUserAnswers: Array.from(userAnswers.entries())
                    });
                    return (
                        <QuestionCard
                            question={currentQuestion}
                            isFlipped={flippedCards.has(currentQuestion.id)}
                            userAnswer={userAnswer ?? null}
                            onAnswer={(answer) => handleAnswer(currentQuestion.id, answer)}
                            toggleFlip={() => toggleFlip(currentQuestion.id)}
                            color={subjectColor}
                        />
                    );
                })()}
            </div>

            <div className="flex justify-between items-center mt-6 lg:mt-8">
                <button
                    onClick={goToPrevious}
                    disabled={currentQuestionIndex === 0}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ChevronLeft className="w-5 h-5" />
                    <span className="hidden sm:inline">Précédent</span>
                </button>
                
                <div className="text-sm text-gray-600">
                    {currentQuestionIndex + 1} / {questions.length}
                </div>
                
                {canFinish ? (
                    <button
                        onClick={handleFinish}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg ${colors.activePagination.replace(' scale-110', '')} text-white font-semibold hover:opacity-90 transition-colors`}
                    >
                        <span className="hidden sm:inline">Terminer</span>
                        <Trophy className="w-5 h-5" />
                    </button>
                ) : (
                    <button
                        onClick={goToNext}
                        disabled={currentQuestionIndex === questions.length - 1}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="hidden sm:inline">Suivant</span>
                        <ChevronRight className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    );
}; 