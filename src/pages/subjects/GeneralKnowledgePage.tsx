import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Globe, Shield, Zap, BookOpen, Clock, BarChart, ChevronsRight, ArrowLeft } from 'lucide-react';
import { QuizSeries } from '../../components/quiz/QuizSeries';
import { QuizReview } from '../../components/quiz/QuizReview';
import { QuizCards } from '../../components/quiz/QuizCards';
import { QuizResult } from '../../components/quiz/QuizResult';
import { getQuestionsBySubject, Question } from '../../data/quizQuestions';
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext';
import { TestResultService } from '../../services/testResultService';
import { UserAttemptService } from '../../services/userAttemptService';
import { practiceTestService } from '../../services/practiceTestService';
import { TestDetails, TestListItem, FilterPill } from './SubjectComponents';
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

const DEFAULT_PRACTICE_TESTS = [
    { id: 'p1', name: 'Test Pratique 1', questions: 15, time: 10, topic: 'History' },
    { id: 'p2', name: 'Test Pratique 2', questions: 15, time: 10, topic: 'Geography' },
    { id: 'p3', name: 'Test Pratique 3', questions: 15, time: 10, topic: 'Current Events' },
    { id: 'p4', name: 'Test Pratique 4', questions: 15, time: 10, topic: 'History' },
    { id: 'p5', name: 'Test Pratique 5', questions: 15, time: 10, topic: 'Geography' },
    { id: 'p6', name: 'Test Pratique 6', questions: 15, time: 10, topic: 'Current Events' },
    { id: 'p7', name: 'Test Pratique 7', questions: 15, time: 10, topic: 'History' },
    { id: 'p8', name: 'Test Pratique 8', questions: 15, time: 10, topic: 'Geography' },
    { id: 'p9', name: 'Test Pratique 9', questions: 15, time: 10, topic: 'Current Events' },
    { id: 'p10', name: 'Test Pratique 10', questions: 15, time: 10, topic: 'History' },
];

const topics = ['All', 'History', 'Geography', 'Current Events'];

const quizzes = [
    { id: 'q1', name: 'Quiz Series', questions: 15, time: 20 },
];

const lastTest = { name: 'Test Pratique 2', completed: 10, total: 20 };

export const GeneralKnowledgePage: React.FC = () => {
	const { profile, user, selectedExamType } = useSupabaseAuth();
	const [searchParams, setSearchParams] = useSearchParams();
	const [view, setView] = useState<ViewType>('main');
	const [selectedTest, setSelectedTest] = useState<TestDetails | null>(null);
	const [lastAnswers, setLastAnswers] = useState<Map<number, string | number>>(new Map());
    const [activeTopic, setActiveTopic] = useState('All');
	const [testResults, setTestResults] = useState<Record<string, { score: number; timeSpent: number }>>({});
	const [lastResult, setLastResult] = useState<{ score: number, correctAnswers: number, totalQuestions: number, timeSpent: number } | null>(null);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isReviewMode, setIsReviewMode] = useState(false);
	const [practiceTests, setPracticeTests] = useState(DEFAULT_PRACTICE_TESTS);
	const effectiveExamType = (selectedExamType || profile?.plan_name || 'CM') as 'CM' | 'CMS' | 'CS';

	// Statistics state
	const [statistics, setStatistics] = useState({
		score: 0,
		testsTaken: 0,
		timeSpent: 0
	});
	const [isLoadingStatistics, setIsLoadingStatistics] = useState(false);

	// Load user statistics - REMOVED (using fetchStatistics instead to avoid race conditions)

	const pausedTestState = getQuizState('Culture Générale');

	// Load test results from database
	useEffect(() => {
		const loadTestResults = async () => {
			if (!user?.id) return;
			
			try {
				// Build allowed test pratique numbers from the local definition
				const allowedNumbers = practiceTests.map(t => parseInt(t.id.replace('p', '')));
				
				// Get test results from test_results table
				const attempts = await TestResultService.getTestResultsByCategory(user.id, 'CG', 'practice', effectiveExamType); // Practice tests now include exam_type
				const filteredAttempts = attempts.filter(attempt => 
					attempt.test_number && 
					allowedNumbers.includes(attempt.test_number)
				);
				
				const results: Record<string, { score: number; timeSpent: number }> = {};
				const latestScores = new Map<number, number>();
				
				// Get the latest score for each test number (data is already ordered by created_at desc)
				filteredAttempts.forEach(attempt => {
					if (attempt.test_number && attempt.score !== null && !latestScores.has(attempt.test_number)) {
						latestScores.set(attempt.test_number, attempt.score);
					}
				});
				
				// Create results object with latest scores
				latestScores.forEach((score, testNumber) => {
					const testId = `p${testNumber}`;
					results[testId] = {
						score: score,
						timeSpent: 15 // Assuming 15 minutes per test
					};
				});
				
				setTestResults(results);
			} catch (error) {
				console.error('Error loading test results:', error);
			}
		};

		loadTestResults();
	}, [user?.id, effectiveExamType, practiceTests]);

	// Fetch statistics from database
	useEffect(() => {
		const fetchStatistics = async () => {
			if (!user?.id) return;
			
			setIsLoadingStatistics(true);
			try {
				// Build allowed test pratique numbers from the local definition
				const allowedNumbers = practiceTests.map(t => parseInt(t.id.replace('p', '')));
				
				// Get average score for CG category from test_results table, filtered by allowed tests
				const score = await TestResultService.getAverageScoreForTestNumbers(
					user.id,
					'CG',
					'practice',
					allowedNumbers,
					effectiveExamType // Practice tests now include exam_type
				);
				
				// Get test count for CG category from test_results table
				const attempts = await TestResultService.getTestResultsByCategory(user.id, 'CG', 'practice', effectiveExamType); // Practice tests now include exam_type
				const filteredAttempts = attempts.filter(attempt => 
					attempt.test_number && 
					allowedNumbers.includes(attempt.test_number)
				);
				const uniqueTests = new Set(filteredAttempts.map(a => a.test_number));
				const testsTaken = uniqueTests.size;
				
				// Calculate time spent (assuming 15 minutes per test for now)
				const timeSpent = Math.round(testsTaken * 15 / 60); // Convert to hours
				
				setStatistics({
					score,
					testsTaken,
					timeSpent
				});
			} catch (error) {
				console.error('Error fetching statistics:', error);
			} finally {
				setIsLoadingStatistics(false);
			}
		};

		fetchStatistics();
	}, [user?.id, effectiveExamType, practiceTests]);

	// Function to refresh statistics (same logic as loadUserStatistics)
	const refreshStatistics = async () => {
		if (!user?.id) return;
		
		setIsLoadingStatistics(true);
		try {
			console.log('Refreshing statistics for user:', user.id);
			const allowedNumbers = practiceTests.map(t => parseInt(t.id.replace('p', '')));
			
			// Get average score for CG category from test_results table, filtered by allowed tests
			const score = await TestResultService.getAverageScoreForTestNumbers(
				user.id,
				'CG',
				'practice',
				allowedNumbers,
				selectedExamType || undefined
			);
			console.log('Average score:', score);
			
			// Get test count for CG category from test_results table
			const attempts = await TestResultService.getTestResultsByCategory(user.id, 'CG', 'practice', selectedExamType || undefined);
			console.log('All attempts:', attempts);
			const filteredAttempts = attempts.filter(attempt => 
				attempt.test_number && 
				allowedNumbers.includes(attempt.test_number)
			);
			const uniqueTests = new Set(filteredAttempts.map(a => a.test_number));
			const testsTaken = uniqueTests.size;
			console.log('Tests taken:', testsTaken);
			
			// Calculate time spent (assuming 15 minutes per test for now)
			const timeSpent = Math.round(testsTaken * 15 / 60); // Convert to hours
			
			setStatistics({
				score,
				testsTaken,
				timeSpent
			});
			
			// Also refresh individual test results - get latest score for each allowed test
			const results: Record<string, { score: number; timeSpent: number }> = {};
			const latestScores = new Map<number, number>();
			filteredAttempts.forEach(attempt => {
				if (attempt.test_number && attempt.score !== null && !latestScores.has(attempt.test_number)) {
					latestScores.set(attempt.test_number, attempt.score);
				}
			});
			latestScores.forEach((score, testNumber) => {
				const testId = `p${testNumber}`;
				results[testId] = { score, timeSpent: 15 };
			});
			setTestResults(results);
		} catch (error) {
			console.error('Error refreshing statistics:', error);
		} finally {
			setIsLoadingStatistics(false);
		}
	};

	// Load questions from database
	useEffect(() => {
		const loadQuestions = async () => {
			setIsLoadingQuestions(true);
			try {
			const loadedQuestions = await getQuestionsBySubject('culture-generale', effectiveExamType);
				setQuestions(loadedQuestions.slice(0, 15)); // Limit to 15 questions for quiz
			} catch (error) {
				console.error('Error loading questions:', error);
				setError('Failed to load questions');
			} finally {
				setIsLoadingQuestions(false);
			}
		};
		loadQuestions();
	}, [selectedExamType]);

	const loadQuestionsForTest = useCallback(async (testNumber: number) => {
		setIsLoadingQuestions(true);
		try {
			const loadedQuestions = await getQuestionsBySubject('culture-generale', effectiveExamType, testNumber);
			setQuestions(loadedQuestions.slice(0, 15)); // Limit to 15 questions for quiz
		} catch (error) {
			console.error('Error loading questions:', error);
			setError('Failed to load questions');
		} finally {
			setIsLoadingQuestions(false);
		}
	}, [selectedExamType]);

	// Scroll to top when component mounts
	useEffect(() => {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}, []);

	// Refresh statistics when returning to main view
	useEffect(() => {
		if (view === 'main' && user?.id) {
			refreshStatistics();
		}
	}, [view, user?.id]);

	useEffect(() => {
		let isMounted = true;
		practiceTestService
			.getPracticeTestsByCategory(effectiveExamType, 'CG')
			.then(summaries => {
				if (!isMounted) return;
				setPracticeTests(prev =>
					prev.map(test => {
						const testNumber = parseInt(test.id.replace('p', ''));
						const summary = summaries.find(s => s.test_number === testNumber);
						return summary
							? { ...test, questions: summary.question_count, time: 10 }
							: test;
					})
				);
			})
			.catch(error => {
				console.error('Error loading CG practice tests metadata:', error);
			});
		return () => {
			isMounted = false;
		};
	}, [effectiveExamType]);

	// Handle view changes with scroll management
	const handleViewChange = (newView: ViewType) => {
		setView(newView);
		// Scroll to top when changing views
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	// Handle start test pratique
	const handleStart = useCallback(async (test: TestDetails) => {
		await loadQuestionsForTest(parseInt(test.id.replace('p', '')));
		setSelectedTest(test);
		setView('quiz');
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}, [loadQuestionsForTest]);

	useEffect(() => {
		const practiceParam = searchParams.get('practiceTest');
		if (practiceParam) {
			const targetTest = practiceTests.find(test => test.id === `p${practiceParam}`);
			if (targetTest) {
				void handleStart(targetTest);
			}
			const next = new URLSearchParams(searchParams);
			next.delete('practiceTest');
			setSearchParams(next, { replace: true });
		}
	}, [handleStart, practiceTests, searchParams, setSearchParams]);

	// Handle review test pratique
	const handleReview = async (test: TestDetails) => {
		try {
			if (!user?.id) {
				console.error('No user ID available for review');
				return;
			}

			const testNumber = parseInt(test.id.replace('p', ''));
			
			// Try to get the actual test data from the database
			const testData = await UserAttemptService.getTestDataForReview(user.id, 'CG', testNumber);
			
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
				// Fallback to loading questions and using estimated data
				console.log('No test data found, using fallback review mode');
				await loadQuestionsForTest(testNumber);
				setSelectedTest(test);
				
									// Get historical attempt for score
					const historicalAttempt = await UserAttemptService.getLatestTestAttempt(
						user.id,
						'CG',
						testNumber,
						'practice'
					);
					
					if (historicalAttempt) {
					setLastResult({
						score: historicalAttempt.score || 0,
						correctAnswers: Math.round((historicalAttempt.score || 0) * questions.length / 100),
						totalQuestions: questions.length,
						timeSpent: 15 * 60 // Assuming 15 minutes
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
			// Fallback to normal review mode
			setIsReviewMode(true);
			setView('quiz');
		}
	};

    const filteredPracticeTests = activeTopic === 'All' 
    ? practiceTests 
    : practiceTests.filter(test => test.topic === activeTopic);

	if (view === 'learn') {
		return <QuizCards subject="Culture Générale" subjectColor="blue" onExit={() => { setView('main'); }} />
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
				onExit={() => { 
					setView('main'); 
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
							// Save score to test_results table (for statistics and tracking)
							await TestResultService.saveTestResult(
								user.id,
								'practice',
								'CG',
								score,
								parseInt(selectedTest.id.replace('p', '')), // Extract test number from id
								effectiveExamType // Include exam_type for practice tests
							);
							
							// Save detailed test data to user_attempts table (for review functionality)
							const testData = {
								questions: questions,
								userAnswers: Array.from(answers.entries()),
								correctAnswers: correctAnswers,
								totalQuestions: questions.length,
								timeSpent: timeSpent
							};

							await UserAttemptService.saveUserAttempt(
								user.id,
								'practice',
								'CG',
								undefined, // subCategory
								parseInt(selectedTest.id.replace('p', '')), // testNumber
								score, // score
								testData // test data for review
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
				questions={questions}
				userAnswers={lastAnswers}
				onRedo={() => {
					setView('summary');
				}}
				onReview={() => setView('review')}
				onExit={async () => {
					setView('main');
					// Refresh statistics and test results when returning to main view
					await refreshStatistics();
				}}
			/>
		);
	}

	if (view === 'review') {
		return (
			<QuizReview 
				questions={questions} 
				userAnswers={lastAnswers}
				onBack={async () => {
					setView('main');
					// Refresh statistics and test results when returning to main view
					await refreshStatistics();
				}}
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
						<button onClick={() => { setView('main'); }} className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">
							Retour
						</button>
						<button
							onClick={() => {
								setView('quiz');
								window.scrollTo({ top: 0, behavior: 'smooth' });
							}}
							className="px-6 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
						>
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
				subjectName="Culture Générale"
				icon={Globe}
				score={isLoadingStatistics ? 0 : statistics.score}
				testsTaken={isLoadingStatistics ? 0 : statistics.testsTaken}
				timeSpent={isLoadingStatistics ? 0 : statistics.timeSpent}
				gradientFrom="from-blue-500"
				gradientTo="to-blue-600"
			/>



			<div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4 lg:p-6">
				<h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Tests pratiques</h2>
				<div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4">
					{topics.map(topic => (
						<FilterPill
							key={topic}
							topic={topic}
							activeTopic={activeTopic}
							setActiveTopic={setActiveTopic}
							color="blue"
						/>
					))}
				</div>

				<div className="space-y-1.5 sm:space-y-2 lg:space-y-3">
					{filteredPracticeTests.map(test => (
						<TestListItem
							key={test.id}
							test={test}
							onStart={() => handleStart(test)}
							onReview={() => handleReview(test)}
							color="blue"
							result={testResults[test.id]}
						/>
					))}
				</div>
			</div>
		</div>
	);
}; 
