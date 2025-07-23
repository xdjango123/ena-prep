import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Container } from '../components/ui/Container';
import { Button } from '../components/ui/Button';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  BookOpen, 
  Clock, 
  Target,
  CheckCircle2,
  AlertCircle,
  Info,
  Award,
  Play,
  RotateCcw,
  TestTube2
} from 'lucide-react';

const EvaluationTestPage: React.FC = () => {
  const { user } = useAuth();

  const hasResults = user?.evaluationResults;

  // Mock test data
  const mockTestData = {
    totalQuestions: 15,
    duration: 10,
    subjects: [
      { name: 'Anglais', questions: 5, color: 'bg-blue-100 text-blue-800' },
      { name: 'Culture Générale', questions: 5, color: 'bg-green-100 text-green-800' },
      { name: 'Logique', questions: 5, color: 'bg-yellow-100 text-yellow-800' }
    ]
  };

  const renderContent = () => {
    if (!hasResults) {
      return (
        <div className="space-y-8">
          {/* No Results State */}
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="p-3 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <TestTube2 className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">
              Aucun test d'évaluation complété
            </h3>
            <p className="text-gray-600 mb-6 max-w-lg mx-auto">
              Commencez par passer votre test d'évaluation personnalisée pour découvrir 
              vos forces et axes d'amélioration.
            </p>
            
            <Button size="lg" className="bg-primary-600 hover:bg-primary-700 mb-6">
              <Play className="w-5 h-5 mr-2" />
              Commencer le test d'évaluation
            </Button>
            
            {/* Mock Test Preview */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h4 className="font-semibold text-gray-800 mb-4">Aperçu du test</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-white rounded-lg">
                  <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <div className="font-semibold">{mockTestData.duration} minutes</div>
                  <div className="text-sm text-gray-600">Durée totale</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg">
                  <Target className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <div className="font-semibold">{mockTestData.totalQuestions} questions</div>
                  <div className="text-sm text-gray-600">Au total</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg">
                  <BookOpen className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                  <div className="font-semibold">3 matières</div>
                  <div className="text-sm text-gray-600">Différentes</div>
                </div>
              </div>
              
              <div className="space-y-3">
                {mockTestData.subjects.map((subject, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <span className="font-medium">{subject.name}</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${subject.color}`}>
                      {subject.questions} questions
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    const { overallScore, subjectScores, strengths, weaknesses, recommendations } = hasResults;

    return (
      <div className="space-y-8">
        {/* Results Header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white p-8 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">Vos Résultats</h2>
              <p className="text-primary-100">Analyse complète de votre test d'évaluation</p>
            </div>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Repasser le test
            </Button>
          </div>
        </div>

        {/* Overall Score */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center">
            <div className="p-4 bg-yellow-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Award className="w-10 h-10 text-yellow-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Score Global</h3>
            <div className="text-6xl font-bold text-primary-600 mb-4">{overallScore}%</div>
            <p className="text-gray-600 text-lg">
              {overallScore >= 70 ? 'Excellent niveau ! 🎉' : 
               overallScore >= 50 ? 'Bon niveau, continuez vos efforts 💪' : 
               'Des améliorations sont nécessaires 📚'}
            </p>
          </div>
        </div>

        {/* Subject Breakdown */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">Détail par matière</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-blue-800">Anglais</h4>
                <div className="text-2xl font-bold text-blue-600">{subjectScores.anglais}%</div>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${subjectScores.anglais}%` }}
                />
              </div>
            </div>

            <div className="p-6 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-green-800">Culture Générale</h4>
                <div className="text-2xl font-bold text-green-600">{subjectScores.cultureGenerale}%</div>
              </div>
              <div className="w-full bg-green-200 rounded-full h-3">
                <div 
                  className="bg-green-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${subjectScores.cultureGenerale}%` }}
                />
              </div>
            </div>

            <div className="p-6 bg-yellow-50 rounded-xl border border-yellow-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-yellow-800">Logique</h4>
                <div className="text-2xl font-bold text-yellow-600">{subjectScores.logique}%</div>
              </div>
              <div className="w-full bg-yellow-200 rounded-full h-3">
                <div 
                  className="bg-yellow-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${subjectScores.logique}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Strengths and Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {strengths.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <h3 className="text-xl font-bold text-green-800">Points forts</h3>
              </div>
              <ul className="space-y-3">
                {strengths.map((strength: string, index: number) => (
                  <li key={index} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-green-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {weaknesses.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-center gap-3 mb-6">
                <Target className="w-6 h-6 text-red-600" />
                <h3 className="text-xl font-bold text-red-800">À améliorer</h3>
              </div>
              <ul className="space-y-3">
                {weaknesses.map((weakness: string, index: number) => (
                  <li key={index} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <span className="text-red-700">{weakness}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-bold text-blue-800">Recommandations personnalisées</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.map((recommendation: string, index: number) => (
                <div key={index} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-blue-700">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Container className="py-8">
        {/* Page Title - Compact */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white p-6 rounded-2xl shadow-lg mb-8">
          <div className="text-center">
            <div className="p-3 bg-white/20 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
              <TestTube2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2 text-white">Test d'Évaluation</h1>
            <p className="text-white/90">
              Découvrez votre niveau et obtenez des recommandations personnalisées
            </p>
          </div>
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {renderContent()}
        </motion.div>
      </Container>
    </div>
  );
};

export default EvaluationTestPage; 