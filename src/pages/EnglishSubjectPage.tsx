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
    localStorage.removeItem(`quizState_Anglais`);
}

const practiceTests = [
    { id: 'p1', name: 'Practice Test 1', questions: 10, time: 15, topic: 'Grammar' },
    { id: 'p2', name: 'Practice Test 2', questions: 10, time: 15, topic: 'Vocabulary' },
    { id: 'p3', name: 'Practice Test 3', questions: 10, time: 15, topic: 'Reading' },
    { id: 'p4', name: 'Practice Test 4', questions: 10, time: 15, topic: 'Grammar' },
    { id: 'p5', name: 'Practice Test 5', questions: 10, time: 15, topic: 'Vocabulary' },
];

const topics = ['All', 'Grammar', 'Vocabulary', 'Reading'];

const quizzes = [
    { id: 'q1', name: 'Quiz 1', questions: 10, time: 20 },
    { id: 'q2', name: 'Quiz 2', questions: 10, time: 20 },
    { id: 'q3', name: 'Quiz 3', questions: 10, time: 20 },
];

const lastTest = { name: 'Practice Test 2', completed: 15, total: 20 };
const recommendation = "You've mastered Vocabulary! Next, focus on Reading Comprehension.";

export default function EnglishSubjectPage() {
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
  
  // Statistics state
  const [statistics, setStatistics] = useState({
    score: 0,
    testsTaken: 0,
    timeSpent: 0
  });

  useEffect(() => {
    const loadedResults = JSON.parse(localStorage.getItem('english_test_results') || '{}');
    setTestResults(loadedResults);
  }, []);

  // Fetch statistics from database
  useEffect(() => {
    const fetchStatistics = async () => {
      if (!user?.id) return;
      
      try {
        // Get average score for ANG category
        const score = await TestResultService.getAverageScore(user.id, 'ANG');
        
        // Get test count for ANG category
        const testResults = await TestResultService.getTestResultsByCategory(user.id, 'ANG');
        const testsTaken = testResults.length;
        
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

  // Load questions from database
  useEffect(() => {
    const loadQuestions = async () => {
      setIsLoadingQuestions(true);
      try {
        const examType = profile?.exam_type as 'CM' | 'CMS' | 'CS' | undefined;
        const loadedQuestions = await getQuestionsBySubject('english', examType);
        setQuestions(loadedQuestions);
      } catch (error) {
        console.error('Error loading questions:', error);
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    loadQuestions();
  }, [profile?.exam_type]);

  const pausedTestState = getQuizState('English');

  const handleSectionToggle = (section: 'practice' | 'quiz') => {
    setActiveSection(prev => (prev === section ? null : section));
  };

  const handleStart = (test: TestDetails) => {
    if (activeSection === 'practice') {
        clearQuizState('Anglais');
    }
    setSelectedTest(test);
    setView('summary');
  };

  const resumePractice = () => {
    setView('quiz');
  };

  const startQuiz = () => setView('quiz');

  const filteredPracticeTests = activeTopic === 'All' 
    ? practiceTests 
    : practiceTests.filter(test => test.topic === activeTopic);

  if (view === 'learn') {
    return <QuizCards subject="English" subjectColor="green" onExit={() => setView('main')} />
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
        onExit={() => { setView('main'); setActiveSection(null); }}
        onFinish={(answers, timeSpent) => {
					const correctAnswers = questions.reduce((count, q) => {
						// More robust comparison logic
						const isCorrect = (() => {
							if (q.type === 'multiple-choice' && typeof q.correctAnswer === 'number') {
								// For multiple choice, compare the selected option with the correct option text
								const correctOptionText = q.options?.[q.correctAnswer];
								return answers.get(q.id) === correctOptionText;
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

					const newResults = { ...testResults, [selectedTest.id]: { score, timeSpent } };
					localStorage.setItem('english_test_results', JSON.stringify(newResults));
					setTestResults(newResults);

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
    <div className="p-6 space-y-6">
      <SubjectHeader 
        subjectName="Anglais"
        icon={Languages}
        score={statistics.score}
        testsTaken={statistics.testsTaken}
        timeSpent={statistics.timeSpent}
        gradientFrom="from-green-500"
        gradientTo="to-green-600"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ActionButton icon={Trophy} title="Quiz" color="green" active={activeSection === 'quiz'} onClick={() => handleSectionToggle('quiz')} />
        <ActionButton icon={Target} title="Practice Test" color="green" active={activeSection === 'practice'} onClick={() => handleSectionToggle('practice')} />
      </div>

      {activeSection === 'practice' && (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-xl font-bold mb-4">Practice by Topic</h2>
                <div className="flex flex-wrap gap-2 mb-6">
                    {topics.map(topic => (
                        <FilterPill key={topic} topic={topic} activeTopic={activeTopic} setActiveTopic={setActiveTopic} color="green" />
                    ))}
                </div>
                
                <div className="space-y-3">
                    {filteredPracticeTests.map(test => (
                        <TestListItem 
                            key={test.id} 
                            test={test} 
                            onStart={() => handleStart(test)} 
                            color="green"
                            result={testResults[test.id]}
                        />
                    ))}
                </div>
            </div>

            <RecommendationBanner recommendation={recommendation} />
        </div>
      )}

      {activeSection === 'quiz' && (
            <div className="bg-white rounded-xl shadow-sm border p-8 mt-4 text-center">
                <Trophy className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-3">Apprenez avec des quiz interactifs</h2>
                <p className="text-gray-600 max-w-2xl mx-auto mb-6">
                    Nos quiz d'apprentissage sont conçus pour vous aider à maîtriser les concepts une question à la fois. Obtenez des commentaires immédiats, retournez les cartes pour voir les explications et apprenez à votre propre rythme.
                </p>
                <button 
                    onClick={() => setView('learn')}
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors"
                >
                    <Play className="w-5 h-5" />
                    Commencer l'apprentissage
                </button>
            </div>
      )}
    </div>
  );
} 