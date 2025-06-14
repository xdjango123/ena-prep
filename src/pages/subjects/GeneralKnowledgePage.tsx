import React, { useState } from 'react';
import { Globe, Target, BookOpen, TrendingUp, RotateCcw, Play, Clock, Award, Star, ChevronRight, Zap, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { QuizSeries } from '../../components/quiz/QuizSeries';
import { getQuestionsBySubject } from '../../data/quizQuestions';

export const GeneralKnowledgePage: React.FC = () => {
  const [selectedTestType, setSelectedTestType] = useState<'practice' | 'exam' | 'tutor' | 'lessons' | null>(null);
  const [isAutomatedMode, setIsAutomatedMode] = useState(false);
  const [showQuizSeries, setShowQuizSeries] = useState(false);

  const practiceTests = [
    { id: 1, name: 'Culture Test 1', level: 'Débutant', questions: 15, time: 20, completed: true, score: 72 },
    { id: 2, name: 'Culture Test 2', level: 'Intermédiaire', questions: 20, time: 30, completed: true, score: 68 },
    { id: 3, name: 'Culture Test 3', level: 'Avancé', questions: 25, time: 40, completed: false, score: null },
    { id: 4, name: 'Culture Test 4', level: 'Expert', questions: 30, time: 45, completed: false, score: null }
  ];

  const revisionTopics = [
    { id: 'history', name: 'Histoire', progress: 55, questions: 45, icon: '🏛️' },
    { id: 'geography', name: 'Géographie', progress: 70, questions: 40, icon: '🌍' },
    { id: 'politics', name: 'Politique', progress: 35, questions: 35, icon: '🏛️' },
    { id: 'economics', name: 'Économie', progress: 45, questions: 30, icon: '📊' }
  ];

  const lessonModules = [
    {
      id: 'senegal-history',
      title: 'Histoire du Sénégal',
      description: 'De la préhistoire à nos jours',
      lessons: 18,
      duration: '4h 30min',
      difficulty: 'Intermédiaire',
      progress: 60,
      icon: '🏛️',
      topics: ['Précolonial', 'Colonisation', 'Indépendance', 'Sénégal moderne']
    },
    {
      id: 'african-geography',
      title: 'Géographie Africaine',
      description: 'Géographie physique et humaine de l\'Afrique',
      lessons: 12,
      duration: '3h 00min',
      difficulty: 'Débutant',
      progress: 80,
      icon: '🌍',
      topics: ['Relief', 'Climat', 'Population', 'Ressources']
    },
    {
      id: 'institutions',
      title: 'Institutions Sénégalaises',
      description: 'Organisation politique et administrative',
      lessons: 15,
      duration: '3h 45min',
      difficulty: 'Avancé',
      progress: 25,
      icon: '🏛️',
      topics: ['Constitution', 'Gouvernement', 'Assemblée', 'Justice']
    },
    {
      id: 'world-economy',
      title: 'Économie Mondiale',
      description: 'Grands enjeux économiques contemporains',
      lessons: 10,
      duration: '2h 30min',
      difficulty: 'Avancé',
      progress: 40,
      icon: '📊',
      topics: ['Mondialisation', 'Commerce', 'Développement', 'Crises']
    }
  ];

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Débutant': return 'bg-green-100 text-green-800';
      case 'Intermédiaire': return 'bg-yellow-100 text-yellow-800';
      case 'Avancé': return 'bg-orange-100 text-orange-800';
      case 'Expert': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Show QuizSeries if activated
  if (showQuizSeries) {
    return (
      <QuizSeries
        subject="Culture Générale"
        subjectColor="purple"
        questions={getQuestionsBySubject('culture-generale')}
        onExit={() => {
          setShowQuizSeries(false);
          setIsAutomatedMode(false);
        }}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="w-8 h-8" />
          <h1 className="text-2xl font-bold">Culture Générale</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold">78%</div>
            <div className="text-purple-100">Score actuel</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">35%</div>
            <div className="text-purple-100">Progression</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">12h</div>
            <div className="text-purple-100">Temps d'étude</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button 
          onClick={() => setSelectedTestType('practice')}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer text-left"
        >
          <Target className="w-8 h-8 text-purple-600 mb-2" />
          <h3 className="font-semibold text-gray-900">Tests Pratiques</h3>
          <p className="text-sm text-gray-600">Série de 4 tests</p>
        </button>
        <button 
          onClick={() => setSelectedTestType('exam')}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer text-left"
        >
          <BookOpen className="w-8 h-8 text-purple-600 mb-2" />
          <h3 className="font-semibold text-gray-900">Révisions</h3>
          <p className="text-sm text-gray-600">Par thème</p>
        </button>
        <button 
          onClick={() => setSelectedTestType('tutor')}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer text-left"
        >
          <Users className="w-8 h-8 text-purple-600 mb-2" />
          <h3 className="font-semibold text-gray-900">Ask a tutor</h3>
          <p className="text-sm text-gray-600">Aide personnalisée</p>
        </button>
        <button 
          onClick={() => setSelectedTestType('lessons')}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer text-left"
        >
          <BookOpen className="w-8 h-8 text-purple-600 mb-2" />
          <h3 className="font-semibold text-gray-900">Leçons</h3>
          <p className="text-sm text-gray-600">Modules d'apprentissage</p>
        </button>
      </div>

      {/* Practice Tests Section */}
      {selectedTestType === 'practice' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Tests Pratiques</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsAutomatedMode(!isAutomatedMode)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  isAutomatedMode 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Zap className="w-4 h-4" />
                Mode Automatique
              </button>
              <button
                onClick={() => setSelectedTestType(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>

          {isAutomatedMode && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-purple-900">Mode Automatique Activé</h3>
              </div>
              <p className="text-purple-700 text-sm mb-3">
                Les tests seront lancés automatiquement l'un après l'autre. Vous pouvez arrêter à tout moment.
              </p>
              <button 
                onClick={() => setShowQuizSeries(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Démarrer la série automatique
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {practiceTests.map((test) => (
              <div key={test.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{test.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(test.level)}`}>
                    {test.level}
                  </span>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <BookOpen className="w-4 h-4" />
                    {test.questions} questions
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    {test.time} minutes
                  </div>
                  {test.completed && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Award className="w-4 h-4" />
                      Score: {test.score}%
                    </div>
                  )}
                </div>
                <button 
                  className={`w-full py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    test.completed 
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  <Play className="w-4 h-4" />
                  {test.completed ? 'Refaire le test' : 'Commencer'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revision Section */}
      {selectedTestType === 'exam' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Révisions par Thème</h2>
            <button
              onClick={() => setSelectedTestType(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {revisionTopics.map((topic) => (
              <div key={topic.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{topic.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{topic.name}</h3>
                    <p className="text-sm text-gray-600">{topic.questions} questions disponibles</p>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Progression</span>
                    <span className="font-medium text-gray-900">{topic.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${topic.progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 bg-purple-600 text-white py-2 px-3 rounded-lg hover:bg-purple-700 transition-colors text-sm">
                    Réviser
                  </button>
                  <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                    Test rapide
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ask a Tutor Section */}
      {selectedTestType === 'tutor' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Ask a Tutor - Culture Générale</h2>
            <button
              onClick={() => setSelectedTestType(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* Hiring Message */}
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Nous recrutons des tuteurs!</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Notre service de tutorat personnalisé arrive bientôt. Nous recherchons actuellement des tuteurs experts en culture générale pour rejoindre notre équipe.
            </p>
            <div className="space-y-3">
              <div className="bg-purple-50 rounded-lg p-4 max-w-sm mx-auto">
                <h4 className="font-semibold text-purple-900 mb-2">🎯 Vous êtes tuteur?</h4>
                <p className="text-sm text-purple-800 mb-3">
                  Rejoignez notre plateforme et aidez les étudiants à réussir leur concours ENA.
                </p>
                <button className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors">
                  Postuler comme tuteur
                </button>
              </div>
              <p className="text-sm text-gray-500">
                Cette fonctionnalité sera disponible prochainement pour nos abonnés Premium.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lessons Section */}
      {selectedTestType === 'lessons' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Modules de Leçons</h2>
            <button
              onClick={() => setSelectedTestType(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {lessonModules.map((module) => (
              <div key={module.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{module.icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{module.title}</h3>
                      <p className="text-sm text-gray-600">{module.description}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(module.difficulty)}`}>
                    {module.difficulty}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">{module.lessons}</div>
                    <div className="text-xs text-gray-600">Leçons</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">{module.duration}</div>
                    <div className="text-xs text-gray-600">Durée</div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Progression</span>
                    <span className="font-medium text-gray-900">{module.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${module.progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Sujets couverts:</h4>
                  <div className="flex flex-wrap gap-1">
                    {module.topics.map((topic, index) => (
                      <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                <button className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors">
                  {module.progress > 0 ? 'Continuer' : 'Commencer'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Default Continue Learning */}
      {!selectedTestType && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Continuer l'apprentissage</h2>
            <button 
              onClick={() => setSelectedTestType('practice')}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Commencer
            </button>
          </div>
          <div className="text-gray-600">
            <p>Explorez l'histoire, la géographie et les institutions à travers nos modules interactifs.</p>
          </div>
        </div>
      )}
    </div>
  );
}; 