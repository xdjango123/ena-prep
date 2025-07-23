import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Clock, ChevronRight, ChevronLeft, Check, TestTube, Play } from 'lucide-react';

interface Question {
  id: string;
  subject: 'general_knowledge' | 'english' | 'logic';
  question: string;
  options: string[];
  correctAnswer: number;
}

const TRYOUT_QUESTIONS: Question[] = [
  {
    id: '1',
    subject: 'general_knowledge',
    question: 'Quelle est la capitale du Sénégal ?',
    options: ['Dakar', 'Saint-Louis', 'Thiès', 'Kaolack'],
    correctAnswer: 0
  },
  {
    id: '2',
    subject: 'general_knowledge',
    question: 'En quelle année le Sénégal a-t-il obtenu son indépendance ?',
    options: ['1958', '1960', '1962', '1965'],
    correctAnswer: 1
  },
  {
    id: '3',
    subject: 'general_knowledge',
    question: 'Qui est le premier président du Sénégal ?',
    options: ['Abdoulaye Wade', 'Abdou Diouf', 'Léopold Sédar Senghor', 'Macky Sall'],
    correctAnswer: 2
  },
  {
    id: '4',
    subject: 'english',
    question: 'Choose the correct sentence:',
    options: ['I have went to school', 'I have gone to school', 'I have go to school', 'I has gone to school'],
    correctAnswer: 1
  },
  {
    id: '5',
    subject: 'english',
    question: 'What is the past tense of "run"?',
    options: ['runned', 'ran', 'runed', 'running'],
    correctAnswer: 1
  },
  {
    id: '6',
    subject: 'english',
    question: 'Which word is a synonym for "happy"?',
    options: ['Sad', 'Joyful', 'Angry', 'Tired'],
    correctAnswer: 1
  },
  {
    id: '7',
    subject: 'logic',
    question: 'Si tous les chats sont des mammifères et que tous les mammifères ont un cœur, alors tous les chats ont un cœur. Cette affirmation est-elle vraie ou fausse ?',
    options: ['Vrai', 'Faux'],
    correctAnswer: 0
  },
  {
    id: '8',
    subject: 'logic',
    question: 'Quel est le prochain nombre dans la séquence : 2, 4, 8, 16, ... ?',
    options: ['20', '24', '32', '64'],
    correctAnswer: 2
  },
  {
    id: '9',
    subject: 'logic',
    question: 'Un train quitte Paris à 14h00 et roule à 120 km/h. Un autre train quitte Paris à 15h00 et roule à 180 km/h dans la même direction. À quelle heure le deuxième train rattrapera-t-il le premier ?',
    options: ['16h00', '17h00', '18h00', '19h00'],
    correctAnswer: 2
  }
];

const TIMER_DURATION = 10 * 60; // 10 minutes in seconds

export default function TryoutTestPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (hasStarted && timeLeft > 0 && !isSubmitted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (hasStarted && timeLeft === 0) {
      handleSubmit();
    }
  }, [timeLeft, isSubmitted, hasStarted]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (answerIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [TRYOUT_QUESTIONS[currentQuestion].id]: answerIndex
    }));
  };

  const handleNext = () => {
    if (currentQuestion < TRYOUT_QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const calculateResults = () => {
    const subjectScores: Record<string, { correct: number; total: number }> = {};
    
    TRYOUT_QUESTIONS.forEach(question => {
      if (!subjectScores[question.subject]) {
        subjectScores[question.subject] = { correct: 0, total: 0 };
      }
      subjectScores[question.subject].total++;
      
      if (answers[question.id] === question.correctAnswer) {
        subjectScores[question.subject].correct++;
      }
    });

    const subjectResults = Object.entries(subjectScores).map(([subject, scores]) => ({
      subject,
      score: Math.round((scores.correct / scores.total) * 100),
      correct: scores.correct,
      total: scores.total
    }));

    return subjectResults;
  };

  const handleSubmit = () => {
    const testResults = calculateResults();
    setResults(testResults);
    setIsSubmitted(true);
    
    // Store results in localStorage (in real app, send to backend)
    localStorage.setItem(`tryout_${user?.id}`, JSON.stringify({
      results: testResults,
      completedAt: new Date().toISOString(),
      timeSpent: TIMER_DURATION - timeLeft
    }));
  };

  const getSubjectName = (subject: string) => {
    const names: Record<string, string> = {
      'general_knowledge': 'Culture Générale',
      'english': 'Anglais',
      'logic': 'Logique'
    };
    return names[subject] || subject;
  };

  const getRecommendation = (score: number) => {
    if (score >= 80) return 'Excellent ! Continuez sur cette lancée.';
    if (score >= 60) return 'Bon niveau. Quelques révisions renforceront vos acquis.';
    if (score >= 40) return 'Niveau moyen. Un travail ciblé vous aidera à progresser.';
    return 'Nécessite un travail approfondi. Ne vous découragez pas !';
  };

  if (!hasStarted) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <TestTube className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Prêt à commencer le test ?</h1>
            <p className="text-gray-600 mb-6">
              Une fois que vous cliquez sur "Commencer", le chronomètre de 10 minutes démarrera automatiquement.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => navigate('/dashboard/tryout')}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Retour
              </button>
              <button
                onClick={() => setHasStarted(true)}
                className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                Commencer le test
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isSubmitted && results) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Test d'évaluation terminé !</h1>
              <p className="text-gray-600">Voici vos résultats par matière</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {results.map((result: any) => (
                <div key={result.subject} className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {getSubjectName(result.subject)}
                  </h3>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold text-blue-600">{result.score}%</span>
                    <span className="text-sm text-gray-500">
                      {result.correct}/{result.total} bonnes réponses
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${result.score}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600">{getRecommendation(result.score)}</p>
                </div>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={() => navigate('/dashboard/study-plan')}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors mr-4"
              >
                Voir mon plan d'étude personnalisé
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-gray-200 text-gray-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Retour au tableau de bord
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const question = TRYOUT_QUESTIONS[currentQuestion];
  const progress = ((currentQuestion + 1) / TRYOUT_QUESTIONS.length) * 100;

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Test d'évaluation ENA</h1>
            <div className="flex items-center text-blue-600 font-semibold">
              <Clock className="w-5 h-5 mr-2" />
              {formatTime(timeLeft)}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600">
            Question {currentQuestion + 1} sur {TRYOUT_QUESTIONS.length}
          </p>
        </div>

        {/* Question */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-6">
            <span className="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full mb-4">
              {getSubjectName(question.subject)}
            </span>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {question.question}
            </h2>
          </div>

          <div className="space-y-4 mb-8">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                  answers[question.id] === index
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                    answers[question.id] === index
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {answers[question.id] === index && (
                      <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                    )}
                  </div>
                  <span className="text-gray-900">{option}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Précédent
            </button>

            <div className="flex space-x-4">
              {currentQuestion === TRYOUT_QUESTIONS.length - 1 ? (
                <button
                  onClick={handleSubmit}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  Terminer le test
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="flex items-center bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Suivant
                  <ChevronRight className="w-5 h-5 ml-1" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 