import React, { useState, useEffect, useMemo } from 'react';
import { getQuestionsBySubject, Question } from '../../data/quizQuestions';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, XCircle } from 'lucide-react';

interface ChallengeQuizProps {
    subject: string;
    onExit: () => void;
}

export const ChallengeQuiz: React.FC<ChallengeQuizProps> = ({ subject, onExit }) => {
    const navigate = useNavigate();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<(string | null)[]>(Array(10).fill(null));
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
    const [isFinished, setIsFinished] = useState(false);

    // Load questions from database
    useEffect(() => {
        const loadQuestions = async () => {
            setLoading(true);
            try {
                const subjectLower = subject.toLowerCase().replace(' ', '-');
                const loadedQuestions = await getQuestionsBySubject(subjectLower);
                setQuestions(loadedQuestions.slice(0, 10)); // Limit to 10 questions
            } catch (error) {
                setError('Failed to fetch questions');
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        loadQuestions();
    }, [subject]);

    useEffect(() => {
        if (isFinished) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setIsFinished(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isFinished]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Chargement des questions...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="text-red-600 text-xl mb-4">{error}</div>
                    <button 
                        onClick={onExit} 
                        className="px-6 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600"
                    >
                        Retour
                    </button>
                </div>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="text-red-600 text-xl mb-4">Aucune question disponible</div>
                    <button 
                        onClick={onExit} 
                        className="px-6 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600"
                    >
                        Retour
                    </button>
                </div>
            </div>
        );
    }

    const handleAnswer = (answer: string) => {
        const newAnswers = [...userAnswers];
        newAnswers[currentQuestionIndex] = answer;
        setUserAnswers(newAnswers);
    };

    const goToNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            setIsFinished(true);
        }
    };

    const calculateScore = () => {
        return userAnswers.reduce((score, answer, index) => {
            const question = questions[index];
            // More robust comparison logic
            const isCorrect = (() => {
                if (question.type === 'multiple-choice' && typeof question.correctAnswer === 'number') {
                    // For multiple choice, compare the selected option with the correct option text
                    const correctOptionText = question.options?.[question.correctAnswer];
                    return answer === correctOptionText;
                } else if (question.type === 'true-false') {
                    // For true/false, compare strings
                    return String(answer).toLowerCase() === String(question.correctAnswer).toLowerCase();
                }
                // Fallback comparison
                return answer === question.correctAnswer;
            })();
            return isCorrect ? score + 1 : score;
        }, 0);
    };

    if (isFinished) {
        const score = calculateScore();
        return (
            <div className="p-8 max-w-2xl mx-auto text-center">
                <h1 className="text-3xl font-bold mb-4">Défi terminé !</h1>
                <p className="text-xl mb-6">Votre score : <span className="font-bold text-primary-500">{score} / {questions.length}</span></p>
                <div className="space-y-4">
                    {questions.map((q: Question, index: number) => {
                         // More robust comparison logic for display
                         const isCorrect = (() => {
                             if (q.type === 'multiple-choice' && typeof q.correctAnswer === 'number') {
                                 // For multiple choice, compare the selected option with the correct option text
                                 const correctOptionText = q.options?.[q.correctAnswer];
                                 return userAnswers[index] === correctOptionText;
                             } else if (q.type === 'true-false') {
                                 // For true/false, compare strings
                                 return String(userAnswers[index]).toLowerCase() === String(q.correctAnswer).toLowerCase();
                             }
                             // Fallback comparison
                             return userAnswers[index] === q.correctAnswer;
                         })();
                         
                         const correctAnswerValue = q.type === 'multiple-choice' && typeof q.correctAnswer === 'number'
                             ? q.options?.[q.correctAnswer]
                             : q.correctAnswer;
                         
                         return (
                            <div key={q.id} className={`p-4 rounded-lg border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <p className="font-semibold">{q.question}</p>
                                <div className="flex items-center justify-center mt-2">
                                    {isCorrect ? <CheckCircle className="w-5 h-5 text-green-500 mr-2" /> : <XCircle className="w-5 h-5 text-red-500 mr-2" />}
                                    <p>Votre réponse: {userAnswers[index] ?? 'Non répondu'}</p>
                                    {!isCorrect && <p className="ml-4">|  Réponse correcte: {correctAnswerValue}</p>}
                                </div>
                            </div>
                         )
                    })}
                </div>
                <button onClick={onExit} className="mt-8 px-6 py-3 rounded-lg bg-primary-500 text-white font-semibold hover:bg-primary-600">
                    Retour à la page matière
                </button>
            </div>
        );
    }
    
    const currentQuestion = questions[currentQuestionIndex];
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Défi Hebdomadaire: {subject}</h1>
                <div className="flex items-center gap-2 text-xl font-semibold text-red-500">
                    <Clock />
                    <span>{minutes}:{seconds < 10 ? `0${seconds}` : seconds}</span>
                </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
                <div className="bg-primary-500 h-2.5 rounded-full" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}></div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg">
                <h2 className="text-xl font-semibold mb-4">{currentQuestionIndex + 1}. {currentQuestion.question}</h2>
                <div className="space-y-3">
                    {currentQuestion.options?.map((option: string, index: number) => (
                        <button
                            key={index}
                            onClick={() => handleAnswer(option)}
                            className={`w-full text-left p-4 rounded-lg border transition-colors text-lg ${userAnswers[currentQuestionIndex] === option ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-300' : 'bg-gray-50 hover:bg-gray-100 border-gray-200'}`}
                        >
                            {option}
                        </button>
                    ))}
                    {currentQuestion.type === 'true-false' && ['Vrai', 'Faux'].map((option: string) => (
                        <button
                            key={option}
                            onClick={() => handleAnswer(option.toLowerCase())}
                             className={`w-full text-left p-4 rounded-lg border transition-colors text-lg ${userAnswers[currentQuestionIndex] === option.toLowerCase() ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-300' : 'bg-gray-50 hover:bg-gray-100 border-gray-200'}`}
                        >
                            {option}
                        </button>
                    ))}
                </div>
                <button
                    onClick={goToNext}
                    disabled={userAnswers[currentQuestionIndex] === null}
                    className="mt-6 w-full py-3 px-5 rounded-lg bg-primary-500 text-white font-semibold hover:bg-primary-600 disabled:bg-gray-300 transition-all text-lg"
                >
                    {currentQuestionIndex < questions.length - 1 ? 'Suivant' : 'Terminer'}
                </button>
            </div>
        </div>
    );
}; 