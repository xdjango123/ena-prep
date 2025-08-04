import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { TestResultService } from '../services/testResultService';
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
  Info
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
  const { user, profile, subscription } = useSupabaseAuth();
  const navigate = useNavigate();
  const [overallProgress, setOverallProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserProgress();
    }
  }, [user]);

  const fetchUserProgress = async () => {
    if (!user) return;

    try {
      const averageScore = await TestResultService.getAverageScore(user.id);
      setOverallProgress(averageScore);
    } catch (error) {
      console.error('Error fetching user progress:', error);
    } finally {
      setIsLoading(false);
    }
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

  const getSubscriptionIcon = (planName: string) => {
    switch (planName) {
      case 'Prépa CM': return <Crown size={16} />;
      case 'Prépa CMS': return <Star size={16} />;
      default: return <Award size={16} />;
    }
  };

  // Get available categories based on subscription
  const getAvailableCategories = () => {
    if (!subscription) return [];
    
    switch (subscription.plan_name) {
      case 'Prépa CM':
        return ['CM'];
      case 'Prépa CMS':
        return ['CMS'];
      case 'Prépa CS':
        return ['CS'];
      default:
        return [];
    }
  };

  // Check if user has active subscription
  const hasActiveSubscription = subscription && subscription.is_active;

  const availableCategories = getAvailableCategories();
  const userName = profile ? profile['First Name'] : user?.email || 'Utilisateur';

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
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Welcome Header - Cleaner Design */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-8 rounded-2xl shadow-lg mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-white">
                Bonjour, {userName}! 👋
              </h1>
              <p className="text-primary-100 text-lg">
                Qu'allons-nous réviser aujourd'hui ?
              </p>
            </div>
            
            {/* User Profile Labels - Better positioned */}
            <div className="flex flex-col items-end gap-3">
              {hasActiveSubscription && subscription && subscription.plan_name !== 'Prépa CS' && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${getSubscriptionColor(subscription.plan_name)}`}>
                  {getSubscriptionIcon(subscription.plan_name)}
                  <span>{getSubscriptionLabel(subscription.plan_name)}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Home page link positioned at bottom */}
          <div className="mt-6 text-right">
            <Link 
              to="/" 
              className="text-sm text-primary-100 hover:text-white transition-colors underline"
            >
              ← Retour à l'accueil
            </Link>
          </div>
        </div>

        {/* Main Actions - Cleaner Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Practice Section */}
          <div className="bg-gradient-to-br from-accent-400 to-accent-500 text-background-900 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer"
               onClick={() => navigate('/dashboard/practice')}>
            <div className="flex items-center justify-between">
              <div>
                <div className="p-3 bg-white/20 rounded-lg w-fit mb-4">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Practice</h2>
                <p className="text-background-800">Lancer une série de questions</p>
              </div>
              <ChevronRight className="w-8 h-8 opacity-70" />
            </div>
          </div>
          
          {/* Subjects Section - Conditional rendering based on subscription */}
          {!hasActiveSubscription ? (
            // No active subscription - show upgrade message
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-background-200">
              <div className="text-center">
                <div className="p-4 bg-background-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-background-400" />
                </div>
                <h2 className="text-xl font-bold text-background-800 mb-3">Accès Gratuit</h2>
                <p className="text-background-600 mb-6">
                  Passez à un abonnement premium ou intégral pour accéder aux matières spécialisées et examens blancs.
                </p>
                <Link 
                  to="/tarification"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                >
                  <Crown className="w-5 h-5" />
                  Voir les abonnements
                </Link>
              </div>
            </div>
          ) : (
            // Has subscription - show subjects
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-background-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-background-800">Matières</h2>
              <div className="text-right">
                <div className="text-sm text-background-600 mb-1 flex items-center gap-1">
                  Progression
                  <div className="relative group inline-block ml-1">
                    <Info className="w-4 h-4 text-background-400 cursor-pointer group-hover:text-accent-500 transition-colors" />
                    <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 bg-white text-background-700 text-xs rounded-lg shadow-lg p-3 z-10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200">
                      Votre progression est basée sur la moyenne de vos scores aux tests de pratique dans chaque matière.
                    </div>
                  </div>
                </div>
                <div className="text-lg font-bold text-accent-500">{overallProgress}%</div>
              </div>
            </div>
            
            <div className="w-full bg-background-200 rounded-full h-2 mb-6">
              <div className="bg-accent-400 h-2 rounded-full transition-all duration-500" 
                   style={{ width: `${overallProgress}%` }}></div>
            </div>
            
              {availableCategories.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {subjects.map(subject => (
                <Link 
                  to={subject.path} 
                  key={subject.id} 
                  className={`p-4 rounded-xl border border-background-200 flex flex-col items-center text-center transition-all hover:shadow-md ${subject.bgColor} ${subject.color}`}
                >
                  {subject.icon}
                  <p className="mt-2 font-medium text-sm">{subject.name}</p>
                </Link>
              ))}
            </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-background-500 mb-4">
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
          )}
        </div>

        {/* Secondary Actions - Cleaner Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to="/dashboard/exams" 
                className="bg-white p-6 rounded-xl shadow-md border border-background-200 hover:shadow-lg hover:border-primary-300 transition-all group relative">
            <div className="absolute top-4 right-4">
              <Lock className="w-5 h-5 text-background-400" />
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-100 rounded-lg group-hover:bg-primary-200 transition-colors">
                <FileText className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-bold text-background-800">Examens</h3>
                <p className="text-sm text-background-500">Conditions réelles</p>
              </div>
            </div>
          </Link>
          
          <Link to="/dashboard/tutor" 
                className="bg-white p-6 rounded-xl shadow-md border border-background-200 hover:shadow-lg hover:border-success-300 transition-all group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-success-100 rounded-lg group-hover:bg-success-200 transition-colors">
                <Users className="w-6 h-6 text-success-600" />
              </div>
              <div>
                <h3 className="font-bold text-background-800">Ask a Tutor</h3>
                <p className="text-sm text-background-500">Aide d'experts</p>
              </div>
            </div>
          </Link>
          
          <Link to="/dashboard/forum" 
                className="bg-white p-6 rounded-xl shadow-md border border-background-200 hover:shadow-lg hover:border-accent-300 transition-all group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent-100 rounded-lg group-hover:bg-accent-200 transition-colors">
                <Users className="w-6 h-6 text-accent-600" />
              </div>
              <div>
                <h3 className="font-bold text-background-800">Communauté</h3>
                <p className="text-sm text-background-500">Échanges candidats</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
} 