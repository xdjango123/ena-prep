import React from 'react';
import { Lock, Crown, Calendar, AlertTriangle } from 'lucide-react';

interface SubscriptionRequiredProps {
  planName?: string;
  endDate?: string;
  onUpgrade?: () => void;
  children?: React.ReactNode;
}

export const SubscriptionRequired: React.FC<SubscriptionRequiredProps> = ({
  planName,
  endDate,
  onUpgrade,
  children
}) => {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="p-4 bg-red-100 rounded-full">
            <Lock className="w-12 h-12 text-red-600" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">
            Abonnement Requis
          </h2>
          <p className="text-gray-600">
            Cette fonctionnalité nécessite un abonnement actif
          </p>
        </div>

        {/* Plan Info */}
        {planName && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-center space-x-3 mb-2">
              <Crown className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-gray-900">Plan Actuel</span>
            </div>
            <div className="text-xl font-bold text-gray-900 mb-2">
              {planName}
            </div>
            {endDate && (
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Expiré le {formatDate(endDate)}</span>
              </div>
            )}
          </div>
        )}

        {/* Message */}
        <div className="space-y-4">
          <div className="text-lg font-medium text-gray-900">
            Renouvelez votre abonnement
          </div>
          <div className="text-gray-600">
            Pour accéder à cette fonctionnalité, veuillez renouveler votre abonnement 
            et retrouvez tous vos contenus de préparation.
          </div>
        </div>

        {/* Features Blocked */}
        <div className="bg-red-50 rounded-lg p-4 text-left">
          <div className="text-sm font-medium text-red-800 mb-2">
            Fonctionnalités disponibles avec un abonnement actif :
          </div>
          <ul className="text-sm text-red-700 space-y-1">
            <li>• Quiz et exercices pratiques</li>
            <li>• Examens blancs en conditions réelles</li>
            <li>• Contenu premium et exclusif</li>
            <li>• Statistiques détaillées de progression</li>
            <li>• Accès au forum et à la communauté</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Crown className="w-5 h-5" />
              <span>Renouveler mon abonnement</span>
            </button>
          )}
          
          <button
            onClick={() => window.history.back()}
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Retour
          </button>
        </div>

        {/* Testing Mode Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="text-xs text-yellow-800">
            <strong>Mode Test :</strong> Les restrictions d'abonnement sont temporairement 
            désactivées pour permettre les tests. En production, cette fonctionnalité sera activée.
          </div>
        </div>
      </div>
    </div>
  );
};
