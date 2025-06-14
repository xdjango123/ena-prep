import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  BookOpen, 
  Brain, 
  Calculator, 
  Globe, 
  Languages,
  TrendingUp,
  Users,
  ClipboardList,
  Play,
  Award,
  HelpCircle
} from 'lucide-react';

interface SubjectProgress {
  subject: string;
  name: string;
  icon: React.ReactNode;
  progress: number;
  score: number;
  color: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [subjectProgress, setSubjectProgress] = useState<SubjectProgress[]>([]);
  const [hasTakenTryout, setHasTakenTryout] = useState(false);

  useEffect(() => {
    // Load user progress data
    // In a real app, this would come from your backend
    const mockProgress: SubjectProgress[] = [
      {
        subject: 'general_knowledge',
        name: 'Culture Générale',
        icon: <Globe className="w-6 h-6" />,
        progress: 65,
        score: 78,
        color: 'bg-blue-500'
      },
      {
        subject: 'english',
        name: 'Anglais',
        icon: <Languages className="w-6 h-6" />,
        progress: 45,
        score: 82,
        color: 'bg-green-500'
      },
      {
        subject: 'numerical_aptitude',
        name: 'Aptitude Numérique',
        icon: <Calculator className="w-6 h-6" />,
        progress: 30,
        score: 65,
        color: 'bg-purple-500'
      },
      {
        subject: 'french',
        name: 'Français',
        icon: <BookOpen className="w-6 h-6" />,
        progress: 55,
        score: 88,
        color: 'bg-red-500'
      }
    ];

    setSubjectProgress(mockProgress);
    // Check if user has taken tryout test
    const tryoutTaken = localStorage.getItem(`tryout_${user?.id}`);
    setHasTakenTryout(!!tryoutTaken);
  }, [user]);

  const overallProgress = Math.round(
    subjectProgress.reduce((acc, subject) => acc + subject.progress, 0) / subjectProgress.length
  );

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Bonjour, {user?.name} ! 👋
        </h1>
        <p className="text-blue-100">
          Bienvenue sur votre tableau de bord ENA. Prêt à exceller ?
        </p>
      </div>

        {/* Tryout Test CTA */}
        {!hasTakenTryout && (
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 mb-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Évaluez votre niveau !</h2>
                <p className="text-blue-100 mb-4">
                  Passez notre test d'évaluation pour identifier vos points forts et axes d'amélioration.
                </p>
                <Link 
                  to="/dashboard/tryout"
                  className="inline-flex items-center px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Commencer le test d'évaluation
                </Link>
              </div>
              <Brain className="w-24 h-24 text-blue-200" />
            </div>
          </div>
        )}

        {/* Progress Overview */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Votre progression</h2>
          
          {/* Overall Progress */}
          <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Progression générale</h3>
              <span className="text-2xl font-bold text-blue-600">{overallProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              ></div>
            </div>
            <Link 
              to="/dashboard/study-plan"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline"
            >
              → Voir mon plan d'étude personnalisé
            </Link>
          </div>

          {/* Subject Progress Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {subjectProgress.map((subject) => {
              const getSubjectPath = (subjectKey: string) => {
                const pathMap: { [key: string]: string } = {
                  'general_knowledge': '/dashboard/subject/general',
                  'english': '/dashboard/subject/english',
                  'numerical_aptitude': '/dashboard/subject/math',
                  'french': '/dashboard/subject/french'
                };
                return pathMap[subjectKey] || '#';
              };

              const cardContent = (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2 rounded-lg ${subject.color} text-white`}>
                      {subject.icon}
                    </div>
                    <span className="text-sm font-medium text-gray-500">
                      {subject.score}% Score
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{subject.name}</h3>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className={`${subject.color} h-2 rounded-full transition-all duration-300`}
                      style={{ width: `${subject.progress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600">
                    {subject.progress}% terminé
                    <span className="block text-blue-600 text-xs mt-1 font-medium">
                      Cliquez pour pratiquer →
                    </span>
                  </p>
                </>
              );

              return (
                <Link 
                  key={subject.subject}
                  to={getSubjectPath(subject.subject)}
                  className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-all hover:scale-105 cursor-pointer"
                >
                  {cardContent}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link 
            to="/dashboard/forum"
            className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-all hover:scale-105"
          >
            <div className="flex items-center mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="ml-3 font-semibold text-gray-900">Forum</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Échangez avec la communauté d'étudiants
            </p>
          </Link>

          <Link 
            to="/dashboard/support"
            className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-all hover:scale-105"
          >
            <div className="flex items-center mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <HelpCircle className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="ml-3 font-semibold text-gray-900">Support</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Besoin d'aide ? Contactez notre équipe
            </p>
          </Link>
        </div>
    </div>
  );
} 