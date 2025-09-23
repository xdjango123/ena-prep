import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Languages, Target, Shield, Zap, BookOpen, Clock, Play, BarChart, Trophy, ChevronsRight, ArrowLeft } from 'lucide-react';
import { QuizSeries } from '../components/quiz/QuizSeries';
import { QuizReview } from '../components/quiz/QuizReview';
import { QuizCards } from '../components/quiz/QuizCards';
import { QuizResult } from '../components/quiz/QuizResult';
import { getQuestionsBySubject, Question } from '../data/quizQuestions';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { TestResultService } from '../services/testResultService';
import { UserAttemptService } from '../services/userAttemptService';
import {
  TestDetails,
  ActionButton,
  TestListItem,
  FilterPill,
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
    localStorage.removeItem(`quizState_Anglais`);
}

const practiceTests = [
    { id: 'p1', name: 'Test Pratique 1', questions: 10, time: 15, topic: 'Grammar' },
    { id: 'p2', name: 'Test Pratique 2', questions: 10, time: 15, topic: 'Vocabulary' },
    { id: 'p3', name: 'Test Pratique 3', questions: 10, time: 15, topic: 'Reading' },
    { id: 'p4', name: 'Test Pratique 4', questions: 10, time: 15, topic: 'Grammar' },
    { id: 'p5', name: 'Test Pratique 5', questions: 10, time: 15, topic: 'Vocabulary' },
    { id: 'p6', name: 'Test Pratique 6', questions: 10, time: 15, topic: 'Reading' },
    { id: 'p7', name: 'Test Pratique 7', questions: 10, time: 15, topic: 'Grammar' },
    { id: 'p8', name: 'Test Pratique 8', questions: 10, time: 15, topic: 'Vocabulary' },
    { id: 'p9', name: 'Test Pratique 9', questions: 10, time: 15, topic: 'Reading' },
    { id: 'p10', name: 'Test Pratique 10', questions: 10, time: 15, topic: 'Grammar' },
];

const topics = ['All', 'Grammar', 'Vocabulary', 'Reading'];

const quizzes = [
    { id: 'q1', name: 'Quiz Series', questions: 15, time: 20 },
];

const lastTest = { name: 'Test Pratique 2', completed: 15, total: 20 };

export default function EnglishSubjectPage() {
	const { profile, user, selectedExamType } = useSupabaseAuth();
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
  const [isLoadingStatistics, setIsLoadingStatistics] = useState(false);

  // Load test results from database
  useEffect(() => {
    const loadTestResults = async () => {
      if (!user?.id) return;
      
      try {
        // Build allowed test pratique numbers from the local definition
        const allowedNumbers = practiceTests.map(t => parseInt(t.id.replace('p', '')));
        
        // Get test results from test_results table (consistent with other pages)
        const attempts = await TestResultService.getTestResultsByCategory(user.id, 'ANG', 'practice', selectedExamType || 'CM'); // Practice tests now include exam_type
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
  }, [user?.id, selectedExamType]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (view === 'main' && user?.id) {
      refreshStatistics();
    }
  }, [view, user?.id]);

  // Fetch statistics from database
  useEffect(() => {
    const fetchStatistics = async () => {
      if (!user?.id) return;
      
      setIsLoadingStatistics(true);
      try {
        const allowedNumbers = practiceTests.map(t => parseInt(t.id.replace('p', '')));
        
        // Get average score for ANG category from test_results table, filtered by allowed tests
        const score = await TestResultService.getAverageScoreForTestNumbers(
          user.id,
          'ANG',
          'practice',
          allowedNumbers,
          selectedExamType || 'CM' // Practice tests now include exam_type
        );
        
        // Get test count for ANG category from test_results table
        const attempts = await TestResultService.getTestResultsByCategory(user.id, 'ANG', 'practice', selectedExamType || 'CM'); // Practice tests now include exam_type
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
  }, [user?.id, selectedExamType]);

  // Function to refresh statistics (same logic as fetchStatistics)
  const refreshStatistics = async () => {
    if (!user?.id) return;
    
    setIsLoadingStatistics(true);
    try {
      const allowedNumbers = practiceTests.map(t => parseInt(t.id.replace('p', '')));
      
      // Get average score for ANG category from test_results table, filtered by allowed tests
      const score = await TestResultService.getAverageScoreForTestNumbers(
        user.id,
        'ANG',
        'practice',
        allowedNumbers,
        selectedExamType || undefined
      );
      
      // Get test count for ANG category from test_results table
      const attempts = await TestResultService.getTestResultsByCategory(user.id, 'ANG', 'practice', selectedExamType || undefined);
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
        const loadedQuestions = await getQuestionsBySubject('english', selectedExamType || 'CM');
        setQuestions(loadedQuestions.slice(0, 10));
      } catch (error) {
        console.error('Error loading questions:', error);
        setError('Failed to load questions');
      } finally {
        setIsLoadingQuestions(false);
      }
    };
    loadQuestions();
  }, [selectedExamType]);

  const loadQuestionsForTest = async (testNumber: number) => {
    setIsLoadingQuestions(true);
    try {
      const loadedQuestions = await getQuestionsBySubject('english', selectedExamType || 'CM', testNumber);
      setQuestions(loadedQuestions.slice(0, 10));
    } catch (error) {
      console.error('Error loading questions:', error);
      setError('Failed to load questions');
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const pausedTestState = getQuizState('English');

  const handleSectionToggle = (section: 'practice' | 'quiz') => {
    setActiveSection(prev => (prev === section ? null : section));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStart = async (test: TestDetails) => {
    await loadQuestionsForTest(parseInt(test.id.replace('p', '')));
    setSelectedTest(test);
    setView('quiz');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle review test pratique
  const handleReview = async (test: TestDetails) => {
    try {
      if (!user?.id) return;
      const testNumber = parseInt(test.id.replace('p', ''));
      const testData = await UserAttemptService.getTestDataForReview(user.id, 'ANG', testNumber);
      if (testData) {
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
        await loadQuestionsForTest(testNumber);
        setSelectedTest(test);
        const historicalAttempt = await UserAttemptService.getLatestTestAttempt(user.id, 'ANG', testNumber, 'practice');
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error loading review data:', error);
      setIsReviewMode(false);
      setView('results');
    }
  };

  const resumePractice = () => {
    setView('quiz');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startQuiz = () => {
    setView('quiz');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredPracticeTests = activeTopic === 'All' 
    ? practiceTests 
    : practiceTests.filter(test => test.topic === activeTopic);

  if (view === 'learn') {
    return <QuizCards subject="English" subjectColor="green" onExit={() => { setView('main'); setActiveSection('quiz'); }} />
  }

  if (view === 'quiz' && selectedTest) {
    if (isLoadingQuestions) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement des questions...</p>
          </div>
        </div>
      );
    }

    return (
      <QuizSeries
        subject="Anglais"
        subjectColor="green"
        questions={questions}
        duration={selectedTest.time * 60}
        onExit={() => { 
          setView('main'); 
          setActiveSection('practice'); 
          setIsReviewMode(false);
        }}
        onFinish={async (answers, timeSpent) => {
          const correctAnswers = questions.reduce((count, q) => {
            const isCorrect = (() => {
              if (q.type === 'multiple-choice' && typeof q.correctAnswer === 'number') {
                return answers.get(q.id) === q.correctAnswer;
              } else if (q.type === 'true-false') {
                return String(answers.get(q.id)).toLowerCase() === String(q.correctAnswer).toLowerCase();
              }
              return answers.get(q.id) === q.correctAnswer;
            })();
            return isCorrect ? count + 1 : count;
          }, 0);
          const score = Math.round((correctAnswers / questions.length) * 100);

          if (user?.id && selectedTest) {
            try {
              await TestResultService.saveTestResult(
                user.id,
                'practice',
                'ANG',
                score,
                parseInt(selectedTest.id.replace('p', '')),
                selectedExamType || 'CM' // Include exam_type for practice tests
              );
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
                'ANG',
                undefined,
                parseInt(selectedTest.id.replace('p', '')),
                score,
                testData
              );
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
        subjectColor="green"
        questions={questions}
        userAnswers={lastAnswers}
        onRedo={() => {
          setView('summary');
        }}
        onReview={() => setView('review')}
        onExit={async () => {
          setView('main');
          setActiveSection('practice');
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
              await refreshStatistics();
            }}
        />
    )
  }

  if (view === 'summary' && selectedTest) {
    return (
      <div className="p-6">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">Détails du test</h2>
            <p className="text-lg mb-2">Sujet: Anglais - {selectedTest.name}</p>
            <p className="text-lg mb-2">Nombre de questions: {selectedTest.questions}</p>
            <p className="text-lg mb-6">Temps alloué: {selectedTest.time} minutes</p>
            <div className="flex justify-center gap-4">
                <button onClick={() => setView('main')} className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">
                    Retour
                </button>
                <button onClick={startQuiz} className="px-6 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600">
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
        subjectName="Anglais"
        icon={Languages}
        score={isLoadingStatistics ? 0 : statistics.score}
        testsTaken={isLoadingStatistics ? 0 : statistics.testsTaken}
        timeSpent={isLoadingStatistics ? 0 : statistics.timeSpent}
        gradientFrom="from-green-500"
        gradientTo="to-green-600"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
        <ActionButton icon={Trophy} title="Quiz" color="green" active={activeSection === 'quiz'} onClick={() => handleSectionToggle('quiz')} />
        <ActionButton icon={Target} title="Test Pratique" color="green" active={activeSection === 'practice'} onClick={() => handleSectionToggle('practice')} />
      </div>

      {activeSection === 'practice' && (
        <div className="space-y-2 sm:space-y-3 lg:space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-2 sm:p-3 lg:p-6">
            <h2 className="text-base sm:text-lg lg:text-xl font-bold mb-2 sm:mb-3 lg:mb-4">Practice by Topic</h2>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4 lg:mb-6">
              {topics.map(topic => (
                <FilterPill key={topic} topic={topic} activeTopic={activeTopic} setActiveTopic={setActiveTopic} color="green" />
              ))}
            </div>
            
            <div className="space-y-1.5 sm:space-y-2 lg:space-y-3">
              {filteredPracticeTests.map(test => (
                <TestListItem 
                  key={test.id} 
                  test={test} 
                  onStart={() => handleStart(test)} 
                  onReview={() => handleReview(test)}
                  color="green"
                  result={testResults[test.id]}
                />
              ))}
            </div>
          </div>

        </div>
      )}

      {activeSection === 'quiz' && (
        <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4 lg:p-8 mt-4 text-center">
          <Trophy className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-green-500 mx-auto mb-3 sm:mb-4" />
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 sm:mb-3">Apprenez avec des quiz interactifs</h2>
          <p className="text-gray-600 max-w-2xl mx-auto mb-4 sm:mb-6 text-xs sm:text-sm lg:text-base">
            Nos quiz d'apprentissage sont conçus pour vous aider à maîtriser les concepts une question à la fois. Obtenez des commentaires immédiats, retournez les cartes pour voir les explications et apprenez à votre propre rythme.
          </p>
          <button 
            onClick={() => setView('learn')}
            className="inline-flex items-center gap-2 px-4 sm:px-6 lg:px-8 py-2 sm:py-3 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors text-sm sm:text-base"
          >
            <Play className="w-4 h-4 sm:w-5 sm:h-5" />
            Commencer l'apprentissage
          </button>
        </div>
      )}
    </div>
  );
} 