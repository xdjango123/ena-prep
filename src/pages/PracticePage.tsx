import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Calculator, Globe, Languages, ChevronRight, Sparkles, BrainCircuit, ArrowLeft, Target, Lock, Crown } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus';
import { useRenewalFlow } from '../hooks/useRenewalFlow';
import RenewalModal from '../components/modals/RenewalModal';

const subjects = [
  { name: 'Culture Générale', icon: <Globe className="w-6 h-6 text-blue-500" />, path: '/dashboard/subject/general-knowledge' },
  { name: 'Anglais', icon: <Languages className="w-6 h-6 text-green-500" />, path: '/dashboard/subject/english' },
  { name: 'Logique', icon: <BrainCircuit className="w-6 h-6 text-yellow-500" />, path: '/dashboard/subject/logic' },
];

export default function PracticePage() {
  const navigate = useNavigate();
  const { hasActiveSubscription, getPlanName, getEndDate } = useSubscriptionStatus();
  
  // Import renewal flow hook
  const { 
    isRenewalModalOpen, 
    renewalState, 
    openRenewalModal, 
    closeRenewalModal, 
    handleBackToHome 
  } = useRenewalFlow();

  const handleStartRandomTest = () => {
    // Navigate to the random practice test within dashboard
    navigate('/dashboard/random-practice');
  };

  const handleUpgrade = () => {
    openRenewalModal('practice_renewal');
  };

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col relative">
      {/* Locked State Overlay */}
      {!hasActiveSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-center">
            <div className="p-4 bg-red-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Abonnement Expiré</h2>
            <p className="text-gray-600 mb-6">
              Votre abonnement a expiré. Pour continuer à accéder à tous les contenus et fonctionnalités de PrepaENA, veuillez renouveler votre abonnement.
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
      
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
        {/* Clean Header - Enhanced Design */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8 lg:p-10 mb-6 sm:mb-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4 sm:mb-6">
              <Target className="w-8 h-8 text-orange-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Mode Pratique
            </h1>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Choisissez votre mode de pratique et améliorez vos compétences de manière ciblée
            </p>
            <div className="mt-4 sm:mt-6">
              <Link 
                to="/dashboard" 
                className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour au tableau de bord
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content - Centered and Responsive */}
        <div className="max-w-4xl mx-auto w-full">
          {/* Practice Rapide - Enhanced Design */}
          <div className="mb-8 sm:mb-10">
            <button
              onClick={handleStartRandomTest}
              className="group w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 sm:p-8 lg:p-10 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 text-left flex items-center justify-between hover:from-orange-600 hover:to-orange-700 transform hover:scale-[1.02]"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div className="p-2 sm:p-3 bg-white/20 rounded-xl flex-shrink-0">
                    <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-orange-200" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold text-white mb-1 sm:mb-2 leading-tight">
                      Practice Rapide
                    </h2>
                    <p className="text-orange-100 text-sm sm:text-base lg:text-lg leading-relaxed">
                      Testez vos connaissances sur toutes les matières en un seul test
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-orange-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-200 rounded-full flex-shrink-0"></div>
                    <span className="text-xs sm:text-sm font-medium">15 questions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-200 rounded-full flex-shrink-0"></div>
                    <span className="text-xs sm:text-sm font-medium">15 minutes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-200 rounded-full flex-shrink-0"></div>
                    <span className="text-xs sm:text-sm font-medium">3 matières</span>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 ml-3 sm:ml-4">
                <div className="p-3 sm:p-4 bg-white/20 rounded-xl group-hover:bg-white/30 transition-colors">
                  <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
              </div>
            </button>
          </div>

          {/* Subject Selection - Enhanced Cards */}
          <div>
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
                Ou choisissez une matière
              </h2>
              <p className="text-gray-600 text-sm sm:text-base lg:text-lg">
                Concentrez-vous sur une matière spécifique pour un apprentissage approfondi
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {subjects.map((subject, index) => (
                <Link
                  to={subject.path}
                  key={subject.name}
                  className="group bg-white p-4 sm:p-6 lg:p-8 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl hover:border-orange-300 transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1"
                >
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 group-hover:bg-orange-50 rounded-2xl mb-3 sm:mb-4 transition-colors">
                      {subject.icon}
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3 group-hover:text-orange-600 transition-colors">
                      {subject.name}
                    </h3>
                    <p className="text-gray-600 mb-3 sm:mb-4 leading-relaxed text-sm sm:text-base">
                      Pratiquez avec des questions spécialisées dans cette matière
                    </p>
                    <div className="inline-flex items-center gap-2 text-orange-600 font-semibold group-hover:text-orange-700 transition-colors text-sm sm:text-base">
                      Commencer la pratique
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Additional Info Section - Enhanced */}
          <div className="mt-8 sm:mt-12 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-200">
            <div className="text-center">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
                Conseils pour une pratique efficace
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0"></div>
                  <span>Commencez par les tests aléatoires</span>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0"></div>
                  <span>Révisez régulièrement chaque matière</span>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0"></div>
                  <span>Analysez vos résultats pour progresser</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Renewal Modal */}
      <RenewalModal
        isOpen={isRenewalModalOpen}
        onClose={closeRenewalModal}
        currentPlan={renewalState?.currentPlan}
        returnTo={renewalState?.returnTo}
        intent={renewalState?.intent}
      />
    </div>
  );
}
