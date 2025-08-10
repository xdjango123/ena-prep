import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BrainCircuit, Target, Shield, Zap, BookOpen, Clock, Play, BarChart, Trophy, ChevronsRight, ArrowLeft } from 'lucide-react';
import { QuizSeries } from '../components/quiz/QuizSeries';
import { QuizReview } from '../components/quiz/QuizReview';
import { QuizCards } from '../components/quiz/QuizCards';
import { QuizResult } from '../components/quiz/QuizResult';
import { getQuestionsBySubject, Question } from '../data/quizQuestions';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { TestResultService } from '../services/testResultService';
import { UserAttemptService } from '../services/userAttemptService';
import { QuestionService } from '../services/questionService';
import {
    TestDetails,
    ActionButton,
    TestListItem,
    FilterPill,
    RecommendationBanner
} from './subjects/SubjectComponents';
import { SubjectHeader } from '../components/SubjectHeader';

const getQuizState = (subject: string) => {
    const savedState = localStorage.getItem(`quizState_${subject}`);
    if (savedState) {
        return JSON.parse(savedState);
    }
    return null;
}

const clearQuizState = (subject: string) => {
    localStorage.removeItem(`quizState_Logique`);
}

const practiceTests = [
    { id: 'p1', name: 'Practice Test 1', questions: 10, time: 15, topic: 'Deductive Reasoning' },
    { id: 'p2', name: 'Practice Test 2', questions: 10, time: 15, topic: 'Inductive Reasoning' },
    { id: 'p3', name: 'Practice Test 3', questions: 10, time: 15, topic: 'Abstract Reasoning' },
    { id: 'p4', name: 'Practice Test 4', questions: 10, time: 15, topic: 'Deductive Reasoning' },
];

const topics = ['All', 'Deductive Reasoning', 'Inductive Reasoning', 'Abstract Reasoning'];

const quizzes = [
    { id: 'q1', name: 'Quiz 1', questions: 10, time: 20 },
    { id: 'q2', name: 'Quiz 2', questions: 10, time: 20 },
    { id: 'q3', name: 'Quiz 3', questions: 10, time: 20 },
];

const lastTest = { name: 'Practice Test 1', completed: 5, total: 20 };
const recommendation = "Your logical reasoning is improving! Keep it up.";

export default function LogicPage() {
	const { profile, user } = useSupabaseAuth();
	const [view, setView] = useState<'main' | 'summary' | 'quiz' | 'review' | 'learn' | 'results'>('main');
	const [activeSection, setActiveSection] = useState<'practice' | 'quiz' | null>('quiz');
	const [selectedTest, setSelectedTest] = useState<TestDetails | null>(null);
	const [lastAnswers, setLastAnswers] = useState<Map<number, string | number>>(new Map());
	const [activeTopic, setActiveTopic] = useState('All');
	const [testResults, setTestResults] = useState<Record<string, { score: number; timeSpent: number }>>({});
	const [lastResult, setLastResult] = useState<{ score: number, correctAnswers: number, totalQuestions: number, timeSpent: number } | null>(null);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isReviewMode, setIsReviewMode] = useState(false);

	// Statistics state
	const [statistics, setStatistics] = useState({
		score: 0,
		testsTaken: 0,
		timeSpent: 0
	});

    const pausedTestState = getQuizState('Logique');

    // Load test results from database
    useEffect(() => {
        const loadTestResults = async () => {
            if (!user?.id) return;
            
            try {
                const attempts = await UserAttemptService.getUserAttemptsByCategory(user.id, 'LOG');
                			const practiceAttempts = attempts.filter(attempt => attempt.test_type === 'practice');
                
                const results: Record<string, { score: number; timeSpent: number }> = {};
                practiceAttempts.forEach(attempt => {
                    if (attempt.test_number && attempt.score !== null) {
                        const testId = `p${attempt.test_number}`;
                        results[testId] = {
                            score: attempt.score,
                            timeSpent: 15 // Assuming 15 minutes per test
                        };
                    }
                });
                
                setTestResults(results);
            } catch (error) {
                console.error('Error loading test results:', error);
            }
        };

        loadTestResults();
    }, [user?.id]);

    // Scroll to top when component mounts
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

	// Fetch statistics from database
	useEffect(() => {
		const fetchStatistics = async () => {
			if (!user?.id) return;
			
			try {
				// Get average score for LOG category from user_attempts table
				const score = await UserAttemptService.getAverageScore(user.id, 'LOG', 'practice');
				
				// Get test count for LOG category from user_attempts table
				const attempts = await UserAttemptService.getUserAttemptsByCategory(user.id, 'LOG');
				const testsTaken = attempts.filter(attempt => attempt.test_type === 'practice').length;
				
				// Calculate time spent (assuming 15 minutes per test for now)
				const timeSpent = Math.round(testsTaken * 15 / 60); // Convert to hours
				
				setStatistics({
					score,
					testsTaken,
					timeSpent
				});
			} catch (error) {
				console.error('Error fetching statistics:', error);
			}
		};

		fetchStatistics();
	}, [user?.id]);

	// Refresh statistics when returning to main view
	useEffect(() => {
		if (view === 'main' && user?.id) {
			refreshStatistics();
		}
	}, [view, user?.id]);

	// Function to refresh statistics
	const refreshStatistics = async () => {
		if (!user?.id) return;
		
		try {
			// Get average score for LOG category from user_attempts table
			const score = await UserAttemptService.getAverageScore(user.id, 'LOG', 'practice');
			
			// Get test count for LOG category from user_attempts table
			const attempts = await UserAttemptService.getUserAttemptsByCategory(user.id, 'LOG');
			const testsTaken = attempts.filter(attempt => attempt.test_type === 'practice').length;
			
			// Calculate time spent (assuming 15 minutes per test for now)
			const timeSpent = Math.round(testsTaken * 15 / 60); // Convert to hours
			
			setStatistics({
				score,
				testsTaken,
				timeSpent
			});

			// Also refresh individual test results
			const practiceAttempts = attempts.filter(attempt => attempt.test_type === 'practice');
			const results: Record<string, { score: number; timeSpent: number }> = {};
			practiceAttempts.forEach(attempt => {
				if (attempt.test_number && attempt.score !== null) {
					const testId = `p${attempt.test_number}`;
					results[testId] = {
						score: attempt.score,
						timeSpent: 15 // Assuming 15 minutes per test
					};
				}
			});
			
			setTestResults(results);
		} catch (error) {
			console.error('Error refreshing statistics:', error);
		}
	};

	// Load questions from database
	useEffect(() => {
		const loadQuestions = async () => {
			setIsLoadingQuestions(true);
			try {
				// Use the passage-aware method to get questions with passages for Logic subject
				const loadedQuestions = await QuestionService.getRandomQuestionsWithPassages('LOG', 10);
				// Convert QuestionWithPassage to the format expected by QuizSeries
				const convertedQuestions = loadedQuestions.map(qwp => ({
					id: parseInt(qwp.question.id),
					type: 'multiple-choice' as const,
					question: qwp.question.question_text,
					options: [qwp.question.answer1, qwp.question.answer2, qwp.question.answer3, qwp.question.answer4].filter(Boolean),
					correctAnswer: qwp.question.correct.charCodeAt(0) - 65, // Convert A=0, B=1, C=2, D=3
					explanation: '', // Database questions don't have explanation field
					difficulty: qwp.question.difficulty,
					passage: qwp.passage // Include passage data
				}));
				setQuestions(convertedQuestions);
			} catch (error) {
				console.error('Error loading questions:', error);
				setError('Failed to load questions');
			} finally {
				setIsLoadingQuestions(false);
			}
		};
		loadQuestions();
	}, [profile?.exam_type]);

	const loadQuestionsForTest = async (testNumber: number) => {
		setIsLoadingQuestions(true);
		try {
			// Use the passage-aware method for practice tests as well
			const loadedQuestions = await QuestionService.getRandomQuestionsWithPassages('LOG', 10);
			// Convert QuestionWithPassage to the format expected by QuizSeries
			const convertedQuestions = loadedQuestions.map(qwp => ({
				id: parseInt(qwp.question.id),
				type: 'multiple-choice' as const,
				question: qwp.question.question_text,
				options: [qwp.question.answer1, qwp.question.answer2, qwp.question.answer3, qwp.question.answer4].filter(Boolean),
				correctAnswer: qwp.question.correct.charCodeAt(0) - 65, // Convert A=0, B=1, C=2, D=3
				explanation: '', // Database questions don't have explanation field
				difficulty: qwp.question.difficulty,
				passage: qwp.passage // Include passage data
			}));
			setQuestions(convertedQuestions);
		} catch (error) {
			console.error('Error loading questions:', error);
			setError('Failed to load questions');
		} finally {
			setIsLoadingQuestions(false);
		}
	};

	// Handle start practice test
	const handleStart = async (test: TestDetails) => {
		// Load questions for this specific test to ensure randomization
		await loadQuestionsForTest(parseInt(test.id.replace('p', '')));
		setSelectedTest(test);
		setView('quiz');
		// Scroll to top when starting test
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	// Handle review practice test
	const handleReview = async (test: TestDetails) => {
		try {
			if (!user?.id) {
				console.error('No user ID available for review');
				return;
			}

			const testNumber = parseInt(test.id.replace('p', ''));
			
			// Try to get the actual test data from the database
			const testData = await UserAttemptService.getTestDataForReview(user.id, 'LOG', testNumber);
			
			if (testData) {
				// Use the actual test data from the database
				console.log('Loading actual test data for review:', testData);
				setQuestions(testData.questions);
				setLastAnswers(testData.userAnswers);
				setLastResult({
					score: testData.score,
					correctAnswers: testData.correctAnswers,
					totalQuestions: testData.totalQuestions,
					timeSpent: testData.timeSpent
				});
				setSelectedTest(test);
				setIsReviewMode(false);
				setView('results');
			} else {
				// Fallback: load questions and show results if no test data found
				await loadQuestionsForTest(testNumber);
				setSelectedTest(test);
				const historicalAttempt = await UserAttemptService.getLatestTestAttempt(user.id, 'LOG', testNumber, 'practice');
				if (historicalAttempt) {
					setLastResult({
						score: historicalAttempt.score || 0,
						correctAnswers: Math.round((historicalAttempt.score || 0) * questions.length / 100),
						totalQuestions: questions.length,
						timeSpent: 15 * 60
					});
				}
				setLastAnswers(new Map());
				setIsReviewMode(false);
				setView('results');
			}
			// Scroll to top when starting review
			window.scrollTo({ top: 0, behavior: 'smooth' });
		} catch (error) {
			console.error('Error loading review data:', error);
			setIsReviewMode(false);
			setView('results');
		}
	};

    const handleSectionToggle = (section: 'practice' | 'quiz') => {
        setActiveSection(prev => (prev === section ? null : section));
        // Scroll to top when switching sections
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const startQuiz = () => {
        setView('quiz');
        // Scroll to top when starting quiz
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const filteredPracticeTests = activeTopic === 'All' 
        ? practiceTests 
        : practiceTests.filter(test => test.topic === activeTopic);

    if (view === 'learn') {
        return <QuizCards subject="Logique" subjectColor="yellow" onExit={() => { setView('main'); setActiveSection('quiz'); }} />
    }

    if (view === 'quiz' && selectedTest) {
        if (isLoadingQuestions) {
            return (
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Chargement des questions...</p>
                    </div>
                </div>
            );
        }

        return (
            <QuizSeries
                subject="Logique"
                subjectColor="yellow"
                questions={questions}
                duration={selectedTest.time * 60}
                onExit={() => { 
                    setView('main'); 
                    setActiveSection('practice'); 
                    setIsReviewMode(false);
                }}
                onFinish={async (answers, timeSpent) => {
					const correctAnswers = questions.reduce((count, q) => {
						// More robust comparison logic
						const isCorrect = (() => {
							if (q.type === 'multiple-choice' && typeof q.correctAnswer === 'number') {
								// For multiple choice, compare the selected index with the correct index
								return answers.get(q.id) === q.correctAnswer;
							} else if (q.type === 'true-false') {
								// For true/false, compare strings
								return String(answers.get(q.id)).toLowerCase() === String(q.correctAnswer).toLowerCase();
							}
							// Fallback comparison
							return answers.get(q.id) === q.correctAnswer;
						})();
						return isCorrect ? count + 1 : count;
					}, 0);
					const score = Math.round((correctAnswers / questions.length) * 100);

					// Save to database
					if (user?.id && selectedTest) {
						try {
							await TestResultService.saveTestResult(
								user.id,
								'practice',
								'LOG',
								score,
								parseInt(selectedTest.id.replace('p', '')) // Extract test number from id
							);
							
							await UserAttemptService.saveUserAttempt(
								user.id,
								'practice',
								'LOG',
								undefined, // subCategory
								parseInt(selectedTest.id.replace('p', '')), // testNumber
								score // score
							);
							
							// Refresh statistics after saving
							await refreshStatistics();
						} catch (error) {
							console.error('Error saving test result to database:', error);
						}
					}

					setLastResult({
						score,
						correctAnswers,
						totalQuestions: questions.length,
						timeSpent
					});
					setLastAnswers(answers);
					setView('results');
				}}
			/>
        );
    }

    if (view === 'results' && lastResult) {
        return (
            <QuizResult
                {...lastResult}
                questions={questions}
                userAnswers={lastAnswers}
                subjectColor="yellow"
                onRedo={() => {
                    setView('summary');
                }}
                onReview={() => setView('review')}
                onExit={() => {
                    setView('main');
                    setActiveSection('practice');
                }}
            />
        );
    }

    if (view === 'review') {
        return (
            <QuizReview 
                questions={questions} 
                userAnswers={lastAnswers}
                onBack={() => setView('main')}
            />
        );
    }

    if (view === 'summary' && selectedTest) {
        return (
            <div className="p-6">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl mx-auto text-center">
                    <h2 className="text-2xl font-bold mb-4">Détails du test</h2>
                    <p className="text-lg mb-2">Sujet: Logique - {selectedTest.name}</p>
                    <p className="text-lg mb-2">Nombre de questions: {selectedTest.questions}</p>
                    <p className="text-lg mb-6">Temps alloué: {selectedTest.time} minutes</p>
                    <div className="flex justify-center gap-4">
                        <button onClick={() => { setView('main'); setActiveSection(null); }} className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">
                            Retour
                        </button>
                        <button onClick={startQuiz} className="px-6 py-2 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600">
                            Commencer
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-2 sm:p-3 lg:p-6 space-y-2 sm:space-y-3 lg:space-y-6 pb-20">
			<SubjectHeader 
				subjectName="Logique"
				icon={BrainCircuit}
				score={statistics.score}
				testsTaken={statistics.testsTaken}
				timeSpent={statistics.timeSpent}
				gradientFrom="from-yellow-500"
				gradientTo="to-yellow-600"
			/>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
				<ActionButton icon={Trophy} title="Quiz" color="yellow" active={activeSection === 'quiz'} onClick={() => handleSectionToggle('quiz')} />
				<ActionButton icon={Target} title="Practice Test" color="yellow" active={activeSection === 'practice'} onClick={() => handleSectionToggle('practice')} />
			</div>

			{activeSection === 'practice' && (
				<div className="space-y-2 sm:space-y-3 lg:space-y-6">
					<div className="bg-white rounded-xl shadow-sm border p-2 sm:p-3 lg:p-6">
						<h2 className="text-base sm:text-lg lg:text-xl font-bold mb-2 sm:mb-3 lg:mb-4">Practice by Topic</h2>
						<div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4 lg:mb-6">
							{topics.map(topic => (
								<FilterPill key={topic} topic={topic} activeTopic={activeTopic} setActiveTopic={setActiveTopic} color="yellow" />
							))}
						</div>
						
						<div className="space-y-1.5 sm:space-y-2 lg:space-y-3">
							{filteredPracticeTests.map(test => (
								<TestListItem 
									key={test.id} 
									test={test} 
									onStart={() => handleStart(test)} 
									onReview={() => handleReview(test)}
									color="yellow"
									result={testResults[test.id]}
								/>
							))}
						</div>
					</div>

					<RecommendationBanner recommendation={recommendation} />
				</div>
			)}

			{activeSection === 'quiz' && (
				<div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4 lg:p-8 mt-4 text-center">
					<Trophy className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-yellow-500 mx-auto mb-3 sm:mb-4" />
					<h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 sm:mb-3">Apprenez avec des quiz interactifs</h2>
					<p className="text-gray-600 max-w-2xl mx-auto mb-4 sm:mb-6 text-xs sm:text-sm lg:text-base">
						Nos quiz d'apprentissage sont conçus pour vous aider à maîtriser les concepts une question à la fois. Obtenez des commentaires immédiats, retournez les cartes pour voir les explications et apprenez à votre propre rythme.
					</p>
					<button 
						onClick={() => setView('learn')}
						className="inline-flex items-center gap-2 px-4 sm:px-6 lg:px-8 py-2 sm:py-3 rounded-lg bg-yellow-500 text-white font-semibold hover:bg-yellow-600 transition-colors text-sm sm:text-base"
					>
						<Play className="w-4 h-4 sm:w-5 sm:h-5" />
						Commencer l'apprentissage
					</button>
				</div>
			)}
		</div>
	);
} 