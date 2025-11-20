import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Clock, Target, Lock } from 'lucide-react';
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus';
import { useRenewalFlow } from '../hooks/useRenewalFlow';
import RenewalModal from '../components/modals/RenewalModal';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';

type ExamType = 'CM' | 'CMS' | 'CS';

const getExamLabel = (type: ExamType) => {
  switch (type) {
    case 'CMS':
      return 'Cours Moyen Supérieur';
    case 'CS':
      return 'Cours Supérieur';
    default:
      return 'Cours Moyen';
  }
};

export default function QuizPage() {
  const navigate = useNavigate();
  const { hasActiveSubscription } = useSubscriptionStatus();
  const { selectedExamType, profile } = useSupabaseAuth();
  const {
    isRenewalModalOpen,
    renewalState,
    openRenewalModal,
    closeRenewalModal,
    handleBackToHome,
  } = useRenewalFlow();

  const effectiveExamType = (selectedExamType || profile?.plan_name || 'CM') as ExamType;

  const handleStartQuiz = () => {
    navigate('/dashboard/quiz/start?autoStart=1');
  };

  const handleUpgrade = () => {
    openRenewalModal('practice_renewal');
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-neutral-50 via-white to-primary-50">
      <div className="w-full bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 xs:px-6 sm:px-8 py-6 space-y-2">
          <h1 className="text-2xl xs:text-3xl sm:text-4xl font-bold text-neutral-900">Quiz rapide</h1>
          <p className="text-neutral-600 text-base xs:text-lg">
            Lancez un quiz quotidien adapté à votre niveau sans quitter votre tableau de bord.
          </p>
        </div>
      </div>
      {!hasActiveSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-center">
            <div className="p-4 bg-red-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Abonnement Expiré</h2>
            <p className="text-gray-600 mb-6">
              Votre abonnement a expiré. Pour continuer à accéder à tous les contenus et fonctionnalités
              de PrepaENA, veuillez renouveler votre abonnement.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleUpgrade}
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
          </div>
        </div>
      )}

      <div className="px-4 xs:px-6 sm:px-8 py-10 sm:py-12 flex items-center justify-center">
        <div className="w-full max-w-3xl">
          <div className="bg-white rounded-2xl shadow-xl border border-primary-100 p-6 sm:p-8 lg:p-10 relative overflow-hidden">
            <div className="absolute inset-y-0 right-0 opacity-10 pointer-events-none">
              <div className="w-48 sm:w-64 h-full bg-gradient-to-br from-primary-400 to-primary-600 blur-3xl rounded-full transform translate-x-20" />
            </div>

            <div className="relative z-10 space-y-6 sm:space-y-8">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary-50 text-primary-700 text-sm font-semibold">
                <Sparkles className="w-4 h-4" />
                Quiz express quotidien
              </div>

              <div>
                <h1 className="text-3xl xs:text-4xl sm:text-5xl font-black text-neutral-900 leading-tight">
                  Continuez votre routine quotidienne
                </h1>
                <p className="mt-4 text-base sm:text-lg text-neutral-600 leading-relaxed">
                  Recevez chaque jour une nouvelle sélection de 15 questions issues de Culture Générale,
                  Logique et Anglais. Idéal pour entretenir vos réflexes avant le concours.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-3 p-4 rounded-2xl border border-neutral-100 bg-neutral-50">
                  <Clock className="w-5 h-5 text-primary-500" />
                  <div>
                    <p className="text-neutral-500">Durée conseillée</p>
                    <p className="font-semibold text-neutral-900">10 minutes</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-2xl border border-neutral-100 bg-neutral-50">
                  <Target className="w-5 h-5 text-primary-500" />
                  <div>
                    <p className="text-neutral-500">Répartition</p>
                    <p className="font-semibold text-neutral-900">5 CG, 5 LOG, 5 ANG</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-2xl border border-neutral-100 bg-neutral-50">
                  <Sparkles className="w-5 h-5 text-primary-500" />
                  <div>
                    <p className="text-neutral-500">Niveau</p>
                    <p className="font-semibold text-neutral-900">{getExamLabel(effectiveExamType)}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center text-center gap-4">
                <button
                  onClick={handleStartQuiz}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-transform hover:scale-[1.01] disabled:opacity-60"
                  disabled={!hasActiveSubscription}
                >
                  Commencez
                  <Sparkles className="w-5 h-5" />
                </button>
                <p className="text-sm sm:text-base text-neutral-500 max-w-xl">
                  Vous resterez dans votre espace sécurisé pendant le quiz ({effectiveExamType}).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <RenewalModal isOpen={isRenewalModalOpen} onClose={closeRenewalModal} {...renewalState} />
    </div>
  );
}
