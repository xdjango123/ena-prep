import React from 'react';
import { TrendingUp, BarChart3, PieChart, Calendar } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-8 h-8" />
          <h1 className="text-2xl font-bold">Analytics & Statistiques</h1>
        </div>
        <p className="text-indigo-100">
          Suivez votre progression détaillée et identifiez vos points forts et axes d'amélioration
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <BarChart3 className="w-8 h-8 text-indigo-600 mb-2" />
          <h3 className="font-semibold text-gray-900">Score Global</h3>
          <div className="text-2xl font-bold text-indigo-600">78.5%</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <PieChart className="w-8 h-8 text-green-600 mb-2" />
          <h3 className="font-semibold text-gray-900">Tests Réalisés</h3>
          <div className="text-2xl font-bold text-green-600">47</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <Calendar className="w-8 h-8 text-orange-600 mb-2" />
          <h3 className="font-semibold text-gray-900">Temps d'Étude</h3>
          <div className="text-2xl font-bold text-orange-600">35h</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <TrendingUp className="w-8 h-8 text-purple-600 mb-2" />
          <h3 className="font-semibold text-gray-900">Progression</h3>
          <div className="text-2xl font-bold text-purple-600">+12%</div>
        </div>
      </div>

      {/* Coming Soon Message */}
      <div className="bg-white rounded-xl p-8 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Tableaux de bord détaillés</h2>
        <p className="text-gray-600 mb-4">
          Des graphiques interactifs et des analyses approfondies de vos performances arrivent bientôt !
        </p>
        <div className="text-sm text-gray-500">
          • Évolution des scores par matière<br/>
          • Comparaison avec d'autres utilisateurs<br/>
          • Recommandations personnalisées d'étude<br/>
          • Prédictions de réussite aux examens
        </div>
      </div>
    </div>
  );
}; 