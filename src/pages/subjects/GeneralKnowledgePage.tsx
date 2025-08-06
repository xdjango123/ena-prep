import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Target, Shield, Zap, BookOpen, Clock, Play, BarChart, Trophy, ChevronsRight, ArrowLeft } from 'lucide-react';
import { QuizSeries } from '../../components/quiz/QuizSeries';
import { QuizReview } from '../../components/quiz/QuizReview';
import { QuizCards } from '../../components/quiz/QuizCards';
import { QuizResult } from '../../components/quiz/QuizResult';
import { getQuestionsBySubject, Question } from '../../data/quizQuestions';
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext';
import { TestResultService } from '../../services/testResultService';
import { UserAttemptService } from '../../services/userAttemptService';
import {
	TestDetails,
	ActionButton,
	TestListItem,
	FilterPill,
	RecommendationBanner
} from './SubjectComponents';
import { SubjectHeader } from '../../components/SubjectHeader';

type ViewType = 'main' | 'summary' | 'quiz' | 'review' | 'results' | 'learn';

const getQuizState = (subject: string) => {
	const savedState = localStorage.getItem(`quizState_${subject}`);
	if (savedState) {
		return JSON.parse(savedState);
	}
	return null;
}

const clearQuizState = (subject: string) => {
	localStorage.removeItem(`quizState_${subject}`);
}

const practiceTests = [
    { id: 'p1', name: 'Practice Test 1', questions: 10, time: 15, topic: 'History' },
    { id: 'p2', name: 'Practice Test 2', questions: 10, time: 15, topic: 'Geography' },
    { id: 'p3', name: 'Practice Test 3', questions: 10, time: 15, topic: 'Current Events' },
    { id: 'p4', name: 'Practice Test 4', questions: 10, time: 15, topic: 'History' },
    { id: 'p5', name: 'Practice Test 5', questions: 10, time: 15, topic: 'Geography' },
];

const topics = ['All', 'History', 'Geography', 'Current Events'];

const quizzes = [
    { id: 'q1', name: 'Quiz 1', questions: 10, time: 20 },
    { id: 'q2', name: 'Quiz 2', questions: 10, time: 20 },
    { id: 'q3', name: 'Quiz 3', questions: 10, time: 20 },
];

const lastTest = { name: 'Practice Test 2', completed: 10, total: 20 };
const recommendation = "You're doing great in History! Try focusing on Current Events next.";

export const GeneralKnowledgePage: React.FC = () => {
	const { profile, user } = useSupabaseAuth();
	const [view, setView] = useState<ViewType>('main');
	const [activeSection, setActiveSection] = useState<'quiz' | 'practice' | null>('quiz');
	const [selectedTest, setSelectedTest] = useState<TestDetails | null>(null);
	const [lastAnswers, setLastAnswers] = useState<Map<number, string | number>>(new Map());
    const [activeTopic, setActiveTopic] = useState('All');
	const [testResults, setTestResults] = useState<Record<string, { score: number; timeSpent: number }>>({});
	const [lastResult, setLastResult] = useState<{ score: number, correctAnswers: number, totalQuestions: number, timeSpent: number } | null>(null);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
	
	// Statistics state
	const [statistics, setStatistics] = useState({
		score: 0,
		testsTaken: 0,
		timeSpent: 0
	});

	const pausedTestState = getQuizState('Culture Générale');

	// Load test results from database
	useEffect(() => {
		const loadTestResults = async () => {
			if (!user?.id) return;
			
			try {
				const attempts = await UserAttemptService.getUserAttemptsByCategory(user.id, 'CG');
				const practiceAttempts = attempts.filter(attempt => attempt.test_type === 'Practice');
				
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

	// Fetch statistics from database
	useEffect(() => {
		const fetchStatistics = async () => {
			if (!user?.id) return;
			
			try {
				// Get average score for CG category from user_attempts table
				const score = await UserAttemptService.getAverageScore(user.id, 'CG', 'Practice');
				
				// Get test count for CG category from user_attempts table
				const attempts = await UserAttemptService.getUserAttemptsByCategory(user.id, 'CG');
				const testsTaken = attempts.filter(attempt => attempt.test_type === 'Practice').length;
				
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

	// Function to refresh statistics
	const refreshStatistics = async () => {
		if (!user?.id) return;
		
		try {
			// Get average score for CG category from user_attempts table
			const score = await UserAttemptService.getAverageScore(user.id, 'CG', 'Practice');
			
			// Get test count for CG category from user_attempts table
			const attempts = await UserAttemptService.getUserAttemptsByCategory(user.id, 'CG');
			const testsTaken = attempts.filter(attempt => attempt.test_type === 'Practice').length;
			
			// Calculate time spent (assuming 15 minutes per test for now)
			const timeSpent = Math.round(testsTaken * 15 / 60); // Convert to hours
			
			setStatistics({
				score,
				testsTaken,
				timeSpent
			});

			// Also refresh individual test results
			const practiceAttempts = attempts.filter(attempt => attempt.test_type === 'Practice');
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
				const examType = profile?.exam_type as 'CM' | 'CMS' | 'CS' | undefined;
				const loadedQuestions = await getQuestionsBySubject('culture-generale', examType);
				setQuestions(loadedQuestions.slice(0, 10)); // Limit to 10 questions
			} catch (error) {
				console.error('Error loading questions:', error);
			} finally {
				setIsLoadingQuestions(false);
			}
		};

		loadQuestions();
	}, [profile?.exam_type]);

	// Scroll to top when component mounts
	useEffect(() => {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}, []);

	// Handle section toggle with scroll management
	const handleSectionToggle = (section: 'quiz' | 'practice') => {
		setActiveSection(section);
		// Scroll to top of the page when switching sections
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	// Handle view changes with scroll management
	const handleViewChange = (newView: ViewType) => {
		setView(newView);
		// Scroll to top when changing views
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	// Handle start quiz with scroll management
	const startQuiz = () => {
		setView('quiz');
		// Scroll to top when starting quiz
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	// Handle start practice test
	const handleStart = (test: TestDetails) => {
		if (activeSection === 'practice') {
			clearQuizState('Culture Générale');
		}
		setSelectedTest(test);
		setView('summary');
		// Scroll to top when starting test
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

    const filteredPracticeTests = activeTopic === 'All' 
    ? practiceTests 
    : practiceTests.filter(test => test.topic === activeTopic);

	if (view === 'learn') {
		return <QuizCards subject="Culture Générale" subjectColor="blue" onExit={() => setView('main')} />
	}

	if (view === 'quiz') {
		if (!selectedTest) {
			return (
				<div className="flex items-center justify-center min-h-screen">
					<div className="text-center">
						<div className="text-red-600 text-xl mb-4">Erreur: Aucun test sélectionné</div>
						<button 
							onClick={() => setView('main')} 
							className="px-6 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
						>
							Retour au menu principal
						</button>
					</div>
				</div>
			);
		}

		if (isLoadingQuestions) {
			return (
				<div className="flex items-center justify-center min-h-screen">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
						<p className="mt-4 text-gray-600">Chargement des questions...</p>
					</div>
				</div>
			);
		}

		return (
			<QuizSeries
				subject="Culture Générale"
				subjectColor="blue"
				questions={questions}
				duration={selectedTest.time * 60}
				onExit={() => { setView('main'); setActiveSection(null); }}
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
								'Practice',
								'CG',
								score,
								parseInt(selectedTest.id.replace('p', '')) // Extract test number from id
							);
							
							await UserAttemptService.saveUserAttempt(
								user.id,
								'Practice',
								'CG',
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
				subjectColor="blue"
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
					<p className="text-lg mb-2">Sujet: Culture Générale - {selectedTest.name}</p>
					<p className="text-lg mb-2">Nombre de questions: {selectedTest.questions}</p>
					<p className="text-lg mb-6">Temps alloué: {selectedTest.time} minutes</p>
					<div className="flex justify-center gap-4">
						<button onClick={() => { setView('main'); setActiveSection(null); }} className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">
							Retour
						</button>
						<button onClick={startQuiz} className="px-6 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600">
							Commencer
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="p-4 lg:p-6 space-y-4 lg:space-y-6 pb-20">
			<SubjectHeader 
				subjectName="Culture Générale"
				icon={Globe}
				score={statistics.score}
				testsTaken={statistics.testsTaken}
				timeSpent={statistics.timeSpent}
				gradientFrom="from-blue-500"
				gradientTo="to-blue-600"
			/>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<ActionButton icon={Trophy} title="Quiz" color="blue" active={activeSection === 'quiz'} onClick={() => handleSectionToggle('quiz')} />
				<ActionButton icon={Target} title="Practice Test" color="blue" active={activeSection === 'practice'} onClick={() => handleSectionToggle('practice')} />
			</div>

			{activeSection === 'practice' && (
				<div className="space-y-4 lg:space-y-6">
					<div className="bg-white rounded-xl shadow-sm border p-4 lg:p-6">
						<h2 className="text-lg lg:text-xl font-bold mb-4">Practice by Topic</h2>
						<div className="flex flex-wrap gap-2 mb-6">
							{topics.map(topic => (
								<FilterPill key={topic} topic={topic} activeTopic={activeTopic} setActiveTopic={setActiveTopic} color="blue" />
							))}
						</div>
						
						<div className="space-y-3">
							{filteredPracticeTests.map(test => (
								<TestListItem 
									key={test.id} 
									test={test} 
									onStart={() => handleStart(test)} 
									color="blue"
									result={testResults[test.id]}
								/>
							))}
						</div>
					</div>

					<RecommendationBanner recommendation={recommendation} />
				</div>
			)}

			{activeSection === 'quiz' && (
				<div className="bg-white rounded-xl shadow-sm border p-6 lg:p-8 mt-4 text-center">
					<Trophy className="w-12 h-12 lg:w-16 lg:h-16 text-blue-500 mx-auto mb-4" />
					<h2 className="text-xl lg:text-2xl font-bold mb-3">Apprenez avec des quiz interactifs</h2>
					<p className="text-gray-600 max-w-2xl mx-auto mb-6 text-sm lg:text-base">
						Nos quiz d'apprentissage sont conçus pour vous aider à maîtriser les concepts une question à la fois. Obtenez des commentaires immédiats, retournez les cartes pour voir les explications et apprenez à votre propre rythme.
					</p>
					<button 
						onClick={() => setView('learn')}
						className="inline-flex items-center gap-2 px-6 lg:px-8 py-3 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors"
					>
						<Play className="w-5 h-5" />
						Commencer l'apprentissage
					</button>
				</div>
			)}
		</div>
	);
}; 