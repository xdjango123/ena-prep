import React from 'react';
import { ClipboardList, Calendar, Target, BookOpen } from 'lucide-react';

export const StudyPlanPage: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <ClipboardList className="w-8 h-8" />
          <h1 className="text-2xl font-bold">Plan d'Étude Personnalisé</h1>
        </div>
        <p className="text-emerald-100">
          Un programme d'étude adapté à vos objectifs et votre rythme d'apprentissage
        </p>
      </div>

      {/* Features Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <Calendar className="w-8 h-8 text-emerald-600 mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">Planning Intelligent</h3>
          <p className="text-gray-600 text-sm">
            Création automatique d'un planning d'étude basé sur votre disponibilité et vos objectifs
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <Target className="w-8 h-8 text-emerald-600 mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">Objectifs Personnalisés</h3>
          <p className="text-gray-600 text-sm">
            Définition d'objectifs réalistes et mesurables pour chaque matière
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <BookOpen className="w-8 h-8 text-emerald-600 mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">Suivi des Progrès</h3>
          <p className="text-gray-600 text-sm">
            Ajustement automatique du plan selon vos performances et votre progression
          </p>
        </div>
      </div>

      {/* Coming Soon Message */}
      <div className="bg-white rounded-xl p-8 text-center">
        <div className="text-6xl mb-4">🗓️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Planification Intelligente</h2>
        <p className="text-gray-600 mb-4">
          Notre IA analyse vos performances pour créer un plan d'étude sur mesure
        </p>
        <div className="text-sm text-gray-500">
          • Répartition optimale du temps d'étude<br/>
          • Révisions programmées intelligemment<br/>
          • Alertes et rappels personnalisés<br/>
          • Adaptation en temps réel selon vos progrès
        </div>
      </div>
    </div>
  );
}; 