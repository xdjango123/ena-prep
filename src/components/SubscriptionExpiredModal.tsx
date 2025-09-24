import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SubscriptionExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  endDate: string;
  onUpgrade: () => void;
}

export const SubscriptionExpiredModal: React.FC<SubscriptionExpiredModalProps> = ({
  isOpen,
  onClose,
  planName,
  endDate,
  onUpgrade
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

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

  const handleBackToHome = () => {
    onClose();
    navigate('/dashboard');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Abonnement Expiré
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Plan Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm font-medium text-gray-900 mb-2">Plan Actuel</div>
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {planName}
            </div>
            <div className="text-sm text-gray-600">
              Expiré le {formatDate(endDate)}
            </div>
          </div>

          {/* Message */}
          <div className="text-center space-y-4">
            <div className="text-lg font-medium text-gray-900">
              Votre abonnement a expiré
            </div>
            <div className="text-gray-600">
              Pour continuer à accéder à tous les contenus et fonctionnalités de PrepaENA, 
              veuillez renouveler votre abonnement.
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={onUpgrade}
              className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-3 px-4 rounded-lg font-medium hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 shadow-md"
            >
              Renouveler mon abonnement
            </button>
            
            <button
              onClick={handleBackToHome}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Retour à l'accueil
            </button>
          </div>

          {/* Testing Mode Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="text-xs text-yellow-800">
              <strong>Mode Test :</strong> Les dates d'expiration sont temporairement ignorées 
              pour permettre les tests. En production, cette fonctionnalité sera activée.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
