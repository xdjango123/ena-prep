import React, { useState } from 'react';
import { TestTube, Play, Clock, Target, BookOpen, TrendingUp, Award, Users, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function EvaluationTestPage() {
  const navigate = useNavigate();
  const [showTestInfo, setShowTestInfo] = useState(false);

  const testStats = [
    { label: 'Questions', value: '8', icon: BookOpen },
    { label: 'Durée', value: '10 min', icon: Clock },
    { label: 'Matières', value: '4', icon: Target }
  ];

  const subjects = [
    { name: 'Culture Générale', questions: 2, color: 'bg-purple-100 text-purple-800' },
    { name: 'Anglais', questions: 2, color: 'bg-blue-100 text-blue-800' },
    { name: 'Aptitude Numérique', questions: 2, color: 'bg-green-100 text-green-800' },
    { name: 'Français', questions: 2, color: 'bg-orange-100 text-orange-800' }
  ];

  const previousResults = JSON.parse(localStorage.getItem('tryout_results') || '[]');

  const startTest = () => {
    navigate('/dashboard/tryout/test');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <TestTube className="w-8 h-8" />
          <h1 className="text-2xl font-bold">Test d'évaluation</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testStats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="text-purple-100 flex items-center justify-center gap-1">
                <stat.icon className="w-4 h-4" />
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button 
          onClick={startTest}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer text-left"
        >
          <Play className="w-8 h-8 text-purple-600 mb-2" />
          <h3 className="font-semibold text-gray-900">Commencer le test</h3>
          <p className="text-sm text-gray-600">Évaluation complète</p>
        </button>
        <button 
          onClick={() => setShowTestInfo(!showTestInfo)}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer text-left"
        >
          <BookOpen className="w-8 h-8 text-purple-600 mb-2" />
          <h3 className="font-semibold text-gray-900">Informations</h3>
          <p className="text-sm text-gray-600">Détails du test</p>
        </button>
        <Link to="/dashboard/analytics" className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
          <TrendingUp className="w-8 h-8 text-purple-600 mb-2" />
          <h3 className="font-semibold text-gray-900">Mes résultats</h3>
          <p className="text-sm text-gray-600">Historique des tests</p>
        </Link>
        <Link to="/dashboard/study-plan" className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
          <Target className="w-8 h-8 text-purple-600 mb-2" />
          <h3 className="font-semibold text-gray-900">Plan d'étude</h3>
          <p className="text-sm text-gray-600">Recommandations</p>
        </Link>
      </div>

      {/* Test Information */}
      {showTestInfo && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Informations sur le test</h2>
            <button
              onClick={() => setShowTestInfo(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Structure du test</h3>
              <div className="space-y-2">
                {subjects.map((subject, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-900">{subject.name}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${subject.color}`}>
                      {subject.questions} questions
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Instructions</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold">•</span>
                  Vous avez 10 minutes pour répondre à 8 questions
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold">•</span>
                  Une seule réponse par question
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold">•</span>
                  Vous pouvez naviguer entre les questions
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold">•</span>
                  Le test se termine automatiquement à la fin du temps
                </li>
              </ul>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={startTest}
              className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <Play className="w-5 h-5" />
              Commencer maintenant
            </button>
          </div>
        </div>
      )}

      {/* Previous Results */}
      {previousResults.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Derniers résultats</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {previousResults.slice(0, 2).map((result: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">
                    {new Date(result.completedAt).toLocaleDateString()}
                  </span>
                  <span className="text-lg font-bold text-purple-600">
                    {Math.round(result.results.reduce((acc: number, r: any) => acc + r.score, 0) / result.results.length)}%
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  Temps: {Math.floor(result.timeSpent / 60)}:{(result.timeSpent % 60).toString().padStart(2, '0')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Default Continue Learning */}
      {!showTestInfo && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Prêt pour votre évaluation ?</h2>
            <button 
              onClick={startTest}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Commencer
            </button>
          </div>
          <div className="text-gray-600">
            <p>Ce test d'évaluation vous permettra de connaître votre niveau actuel dans les 4 matières principales du concours ENA.</p>
          </div>
        </div>
      )}
    </div>
  );
} 