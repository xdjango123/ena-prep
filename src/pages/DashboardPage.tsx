import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import { TestResultService } from '../services/testResultService';
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus';
import { useRenewalFlow } from '../hooks/useRenewalFlow';
import RenewalModal from '../components/modals/RenewalModal';
import { supabase } from '../lib/supabase';
import { 
  BookOpen, 
  BrainCircuit, 
  Globe, 
  Languages,
  Users,
  ChevronRight,
  Sparkles,
  FileText,
  GraduationCap,
  Award,
  TestTube2,
  TrendingUp,
  Lock,
  Crown,
  Star,
  Info,
  Target,
  BarChart3,
  Clock,
  Bookmark
} from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  icon: React.ReactNode;
  path: string;
  color: string;
  bgColor: string;
}

const subjects: Subject[] = [
  {
    id: 'general_knowledge',
    name: 'Culture Générale',
    icon: <Globe className="w-6 h-6" />,
    path: '/dashboard/subject/general-knowledge',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 hover:bg-blue-100'
  },
  {
    id: 'english',
    name: 'Anglais',
    icon: <Languages className="w-6 h-6" />,
    path: '/dashboard/subject/english',
    color: 'text-green-700',
    bgColor: 'bg-green-50 hover:bg-green-100'
  },
  {
    id: 'logic',
    name: 'Logique',
    icon: <BrainCircuit className="w-6 h-6" />,
    path: '/dashboard/subject/logic',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50 hover:bg-yellow-100'
  }
];

export default function DashboardPage() {
  const { user, profile, subscription, selectedExamType, refreshSubscriptionData, userSubscriptions } = useSupabaseAuth();
  const { close } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const [overallProgress, setOverallProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  
  // Import renewal flow hook
  const { 
    isRenewalModalOpen, 
    renewalState, 
    openRenewalModal, 
    closeRenewalModal, 
    handleRenewalComplete, 
    handleBackToHome 
  } = useRenewalFlow();
  
  // Use subscription status hook
  const {
    hasActiveSubscription,
    isSubscriptionExpired,
    canAccessFeature,
    getSubscriptionStatus,
    getPlanName,
    getEndDate,
    getDaysUntilExpiry,
    isExpiringSoon
  } = useSubscriptionStatus();

  useEffect(() => {
    if (user) {
      fetchUserProgress();
    }
    // Close sidebar only once on initial load (user wants clean dashboard view)
    if (!hasInitialized) {
      close();
      setHasInitialized(true);
    }
    // Scroll to top when component mounts
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [user, close, hasInitialized, selectedExamType]);



  const fetchUserProgress = async () => {
    if (!user) return;

    try {
      // Compute the progression as the mean of per-subject averages (CG, ANG, LOG)
      const [cg, ang, log] = await Promise.all([
        TestResultService.getAverageScore(user.id, 'CG', 'practice', selectedExamType || undefined),
        TestResultService.getAverageScore(user.id, 'ANG', 'practice', selectedExamType || undefined),
        TestResultService.getAverageScore(user.id, 'LOG', 'practice', selectedExamType || undefined)
      ]);
      const avg = Math.round((cg + ang + log) / 3);
      setOverallProgress(avg);
    } catch (error) {
      console.error('Error fetching user progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle navigation with scroll management
  const handleNavigation = (path: string) => {
    navigate(path);
    // Scroll to top when navigating
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getExamLevelLabel = (level: string) => {
    switch (level) {
      case 'CM': return 'Cour Moyen';
      case 'CMS': return 'Cour Moyen Supérieur';
      case 'CS': return 'Cour Supérieur';
      case 'ALL': return 'Tous niveaux';
      default: return level;
    }
  };

  const getSubscriptionLabel = (planName: string) => {
    switch (planName) {
      case 'Prépa CM': return 'Prépa CM';
      case 'Prépa CMS': return 'Prépa CMS';
      case 'Prépa CS': return 'Prépa CS';
      default: return planName;
    }
  };

  const getSubscriptionColor = (planName: string) => {
    switch (planName) {
      case 'Prépa CM': return 'bg-primary-100 text-primary-700 border-primary-200';
      case 'Prépa CMS': return 'bg-accent-100 text-accent-700 border-accent-200';
      case 'Prépa CS': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-background-100 text-background-700 border-background-200';
    }
  };


  // Handle subscription upgrade - open renewal modal instead of going to profile
  const handleUpgrade = () => {
    openRenewalModal('dashboard_renewal');
  };
  const getSubscriptionIcon = (planName: string) => {
    switch (planName) {
      case 'Prépa CM': return <Crown size={16} />;
      case 'Prépa CMS': return <Star size={16} />;
      case 'Prépa CS': return <Award size={16} />;
      default: return <Award size={16} />;
    }
  };

  // Get available categories based on selected exam type
  const getAvailableCategories = () => {
    if (!selectedExamType) return [];
    
    switch (selectedExamType) {
      case 'CM':
        return ['CM'];
      case 'CMS':
        return ['CMS'];
      case 'CS':
        return ['CS'];
      default:
        return [];
    }
  };

  // Check if user has active subscription (now using hook)
  // const hasActiveSubscription = subscription && subscription.is_active; // Replaced by hook

  const availableCategories = getAvailableCategories();
  const userName = profile ? profile.first_name : user?.email || 'Utilisateur';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full max-w-full overflow-x-hidden relative">
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
      <div className="p-4 lg:p-6 max-w-7xl mx-auto pb-20 w-full max-w-full overflow-x-hidden">
        {/* Welcome Header - Enhanced Design */}
        <div className="bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 text-white p-6 lg:p-8 rounded-2xl shadow-xl mb-6 lg:mb-8 w-full max-w-full overflow-x-hidden relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12"></div>
          </div>
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 w-full max-w-full">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl lg:text-3xl font-bold mb-2 text-white truncate">
                Bonjour, {userName}!
              </h1>
              <p className="text-primary-100 text-base lg:text-lg">
                Qu'allons-nous réviser aujourd'hui ?
              </p>
            </div>
            
            {/* User Profile Labels - Better positioned */}
            <div className="flex flex-col items-start lg:items-end gap-3 min-w-0">
              {selectedExamType && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${getSubscriptionColor(`Prépa ${selectedExamType}`)}`}>
                  {getSubscriptionIcon(`Prépa ${selectedExamType}`)}
                  <span className="truncate">{getSubscriptionLabel(`Prépa ${selectedExamType}`)}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Home page link positioned at bottom */}
          <div className="relative z-10 mt-6 text-right">
            <Link 
              to="/" 
              className="text-sm text-primary-100 hover:text-white transition-colors underline"
            >
              ← Retour à l'accueil
            </Link>
          </div>
        </div>

        {/* Main Actions - Enhanced Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-6 lg:mb-8 w-full max-w-full overflow-x-hidden">
          {/* Practice Rapide Section - Enhanced Design */}
          <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 text-white p-6 lg:p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all cursor-pointer w-full max-w-full overflow-x-hidden group relative overflow-hidden"
               onClick={() => handleNavigation('/dashboard/practice')}>
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-20 h-20 bg-white rounded-full -translate-y-10 translate-x-10"></div>
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-white rounded-full translate-y-8 -translate-x-8"></div>
            </div>
            
            <div className="relative z-10 flex items-center justify-between w-full max-w-full">
              <div className="min-w-0 flex-1">
                <div className="p-3 bg-white/20 rounded-xl w-fit mb-4 group-hover:bg-white/30 transition-colors">
                  <Target className="w-6 h-6 lg:w-8 lg:h-8" />
                </div>
                <h2 className="text-xl lg:text-2xl font-bold mb-2">Practice Rapide</h2>
                <p className="text-orange-100 text-sm lg:text-base">Lancer une série de questions</p>
              </div>
              <ChevronRight className="w-6 h-6 lg:w-8 lg:h-8 opacity-70 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
          
          {/* Subjects Section - Enhanced Design */}
          <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-xl border border-gray-200 w-full max-w-full relative overflow-visible">
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary-50 rounded-full -translate-y-8 translate-x-8"></div>
            
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4 w-full max-w-full">
              <h2 className="text-xl lg:text-2xl font-bold text-gray-800">Matières</h2>
              <div className="text-left lg:text-right min-w-0">
                <div className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                  Progression
                  <div className="relative group inline-block ml-1">
                    <Info className="w-4 h-4 text-gray-400 cursor-pointer group-hover:text-primary-500 transition-colors" />
                    <div className="fixed top-24 left-1/2 -translate-x-1/2 w-80 bg-white text-gray-700 text-sm rounded-lg shadow-2xl p-4 z-[99999] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 border border-gray-200">
                      <div className="text-center">
                        <div className="font-semibold text-gray-800 mb-2">Progression</div>
                        <div className="text-gray-600">Votre progression est basée sur la moyenne de vos scores aux tests de pratique dans chaque matière.</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-lg font-bold text-primary-500">{overallProgress}%</div>
              </div>
            </div>
            
            <div className="relative z-10 w-full bg-gray-200 rounded-full h-3 mb-6">
              <div className="bg-gradient-to-r from-primary-400 to-primary-500 h-3 rounded-full transition-all duration-500" 
                   style={{ width: `${overallProgress}%` }}></div>
            </div>
            
            {availableCategories.length > 0 ? (
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-full overflow-x-hidden">
              {subjects.map(subject => (
                <Link 
                  to={subject.path} 
                  key={subject.id} 
                  className={`p-4 rounded-xl border border-gray-200 flex flex-col items-center text-center transition-all hover:shadow-lg hover:-translate-y-1 ${subject.bgColor} ${subject.color} w-full max-w-full overflow-x-hidden group`}
                >
                  <div className="group-hover:scale-110 transition-transform">
                    {subject.icon}
                  </div>
                  <p className="mt-2 font-medium text-sm truncate">{subject.name}</p>
                </Link>
              ))}
            </div>
            ) : (
              <div className="relative z-10 text-center py-8 w-full max-w-full">
                <p className="text-gray-500 mb-4">
                  Aucune matière disponible pour votre abonnement actuel.
                </p>
                <Link 
                  to="/dashboard/profile"
                  className="text-primary-600 hover:text-primary-700 underline"
                >
                  Gérer mon profil
                </Link>
              </div>
            )}
          </div>
        </div>


        {/* Secondary Actions - Enhanced Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 w-full max-w-full overflow-x-hidden">
          <Link to="/dashboard/exams" 
                className="bg-white p-4 lg:p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl hover:border-primary-300 transition-all group relative w-full max-w-full overflow-x-hidden">
            <div className="absolute top-4 right-4">
              <Lock className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex items-center gap-4 w-full max-w-full">
              <div className="p-3 bg-primary-100 rounded-lg group-hover:bg-primary-200 transition-colors flex-shrink-0">
                <FileText className="w-6 h-6 text-primary-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-gray-800">Examens</h3>
                <p className="text-sm text-gray-500">Conditions réelles</p>
              </div>
            </div>
          </Link>
          
          <Link to="/dashboard/tutor" 
                className="bg-white p-4 lg:p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl hover:border-green-300 transition-all group w-full max-w-full overflow-x-hidden">
            <div className="flex items-center gap-4 w-full max-w-full">
              <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors flex-shrink-0">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-gray-800">Ask a Tutor</h3>
                <p className="text-sm text-gray-500">Aide d'experts</p>
              </div>
            </div>
          </Link>
          
          <Link to="/dashboard/forum" 
                className="bg-white p-4 lg:p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl hover:border-orange-300 transition-all group w-full max-w-full overflow-x-hidden">
            <div className="flex items-center gap-4 w-full max-w-full">
              <div className="p-3 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors flex-shrink-0">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-gray-800">Communauté</h3>
                <p className="text-sm text-gray-500">Échanges candidats</p>
              </div>
            </div>
          </Link>
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
