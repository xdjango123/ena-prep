import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, 
  LayoutDashboard, 
  BookCopy, 
  Globe, 
  Languages, 
  Calculator, 
  BrainCircuit, 
  FileText, 
  Users, 
  MessageSquare, 
  LogOut, 
  ChevronDown, 
  ChevronUp,
  GraduationCap,
  Home
} from 'lucide-react';
import { useSidebar } from '../../contexts/SidebarContext';
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext';
import { useSubscriptionStatus } from '../../hooks/useSubscriptionStatus';
import { getExamTypeFromPlanName } from '../../lib/examTypeUtils';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  action?: () => void;
  requiresSubscription?: boolean;
}

export const Sidebar: React.FC = () => {
  const { isOpen, isHovered, toggle, close } = useSidebar();
  const { user, profile, userSubscriptions, selectedExamType, setSelectedExamType, signOut } = useSupabaseAuth();
  const { hasActiveSubscription } = useSubscriptionStatus();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMatiereOpen, setMatiereOpen] = useState(true);
  const [isExamTypeDropdownOpen, setIsExamTypeDropdownOpen] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  const availableExamTypes = useMemo(() => {
    const derived = userSubscriptions
      .filter(sub => sub.is_active)
      .map(sub => getExamTypeFromPlanName(sub.plan_name))
      .filter((type): type is 'CM' | 'CMS' | 'CS' => type !== null)
      .filter((type, index, arr) => arr.indexOf(type) === index);

    if (selectedExamType && !derived.includes(selectedExamType)) {
      return [...derived, selectedExamType];
    }

    return derived;
  }, [userSubscriptions, selectedExamType]);

  const handleLogout = async () => {
    try {
      await signOut();
      setIsExamTypeDropdownOpen(false);
      setShowLogout(false);
      close();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout fails, redirect to home for better UX
      navigate('/');
    }
  };

  const handleReturnHome = () => {
    setIsExamTypeDropdownOpen(false);
    setShowLogout(false);
    close();
    navigate('/');
  };

  const handleExamTypeChange = async (examType: 'CM' | 'CMS' | 'CS') => {
    try {
      await setSelectedExamType(examType);
      setIsExamTypeDropdownOpen(false);
      close();
    } catch (error) {
      console.error('Error changing exam type:', error);
    }
  };

  const getExamTypeDisplayName = (examType: string) => {
    const names = {
      'CM': 'CM - Cour Moyen',
      'CMS': 'CMS - Cour Moyen Supérieur', 
      'CS': 'CS - Cour Supérieur'
    };
    return names[examType as keyof typeof names] || examType;
  };

  const handleProfileClick = () => {
    setIsExamTypeDropdownOpen(false);
    setShowLogout(false);
    close();
    navigate('/dashboard/profile');
  };

  const isLinkActive = (path: string) => {
    // Special case for dashboard - only highlight when exactly on dashboard
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: <LayoutDashboard className="w-5 h-5" />,
      path: '/dashboard'
    },
    {
      id: 'practice',
      label: 'Pratique',
      icon: <BookCopy className="w-5 h-5" />,
      path: '/dashboard/practice',
      requiresSubscription: true
    },
    {
      id: 'matieres',
      label: 'Matières',
      icon: <GraduationCap className="w-5 h-5" />,
      action: () => setMatiereOpen(!isMatiereOpen),
      requiresSubscription: true
    },
    {
      id: 'exams',
      label: 'Examens',
      icon: <FileText className="w-5 h-5" />,
      path: '/dashboard/exams',
      requiresSubscription: true
    },
    {
      id: 'tutor',
      label: 'Tuteur',
      icon: <Users className="w-5 h-5" />,
      path: '/dashboard/tutor',
      requiresSubscription: true
    },
    {
      id: 'forum',
      label: 'Forum',
      icon: <MessageSquare className="w-5 h-5" />,
      path: '/dashboard/forum',
      requiresSubscription: true
    }
  ];

  const matiereItems: NavItem[] = [
    {
      id: 'general_knowledge',
      label: 'Culture Générale',
      icon: <Globe className="w-4 h-4" />,
      path: '/dashboard/subject/general-knowledge',
      requiresSubscription: true
    },
    {
      id: 'english',
      label: 'Anglais',
      icon: <Languages className="w-4 h-4" />,
      path: '/dashboard/subject/english',
      requiresSubscription: true
    },
    {
      id: 'logic',
      label: 'Logique',
      icon: <BrainCircuit className="w-4 h-4" />,
      path: '/dashboard/subject/logic',
      requiresSubscription: true
    }
  ];

  const sidebarExpanded = isOpen || isHovered;
  const examTypeTitle = selectedExamType
    ? getExamTypeDisplayName(selectedExamType)
    : availableExamTypes.length > 0
      ? getExamTypeDisplayName(availableExamTypes[0])
      : 'PrepaENA';

  const handleNavigationClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>, disabled: boolean) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    setIsExamTypeDropdownOpen(false);
    setShowLogout(false);
    close();
  };

  useEffect(() => {
    if (!sidebarExpanded) {
      setIsExamTypeDropdownOpen(false);
      setShowLogout(false);
    }
  }, [sidebarExpanded]);

  return (
    <div className="h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between gap-3">
          {sidebarExpanded && (
            <div className="flex-1">
              {availableExamTypes.length > 1 ? (
                <div className="relative">
                  <button
                    onClick={() => setIsExamTypeDropdownOpen(prev => !prev)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-gray-900 bg-gray-100 border border-gray-200 rounded-xl hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-200"
                  >
                    <span className="truncate">{examTypeTitle}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isExamTypeDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isExamTypeDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                      {availableExamTypes.map((examType) => (
                        <button
                          key={examType}
                          onClick={() => handleExamTypeChange(examType)}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                            selectedExamType === examType
                              ? 'bg-primary-50 text-primary-700'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {getExamTypeDisplayName(examType)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full px-4 py-3 text-sm font-semibold text-gray-900 bg-gray-100 border border-gray-200 rounded-xl">
                  {examTypeTitle}
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => {
              setIsExamTypeDropdownOpen(false);
              toggle();
            }}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isDisabled = item.requiresSubscription && !hasActiveSubscription;
          
          return (
            <div key={item.id}>
              {item.action ? (
                <button
                  onClick={isDisabled ? undefined : item.action}
                  disabled={isDisabled}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    isDisabled
                      ? 'text-gray-400 cursor-not-allowed opacity-50'
                      : isLinkActive('/dashboard/subject') && item.id === 'matieres'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.icon}
                  {sidebarExpanded && (
                    <>
                      <span className="font-medium">{item.label}</span>
                      {item.id === 'matieres' && !isDisabled && (
                        isMatiereOpen ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />
                      )}
                    </>
                  )}
                </button>
              ) : (
                <Link
                  to={isDisabled ? '#' : item.path!}
                  onClick={(e) => handleNavigationClick(e, isDisabled)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    isDisabled
                      ? 'text-gray-400 cursor-not-allowed opacity-50'
                      : isLinkActive(item.path!)
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.icon}
                  {sidebarExpanded && <span className="font-medium">{item.label}</span>}
                </Link>
              )}

            {/* Matiere submenu */}
            {item.id === 'matieres' && isMatiereOpen && sidebarExpanded && (
              <div className="ml-6 mt-2 space-y-1">
                {matiereItems.map((matiere) => {
                  const isMatiereDisabled = matiere.requiresSubscription && !hasActiveSubscription;
                  
                  return (
                    <Link
                      key={matiere.id}
                      to={isMatiereDisabled ? '#' : matiere.path!}
                      onClick={(e) => handleNavigationClick(e, isMatiereDisabled)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        isMatiereDisabled
                          ? 'text-gray-400 cursor-not-allowed opacity-50'
                          : isLinkActive(matiere.path!)
                          ? 'bg-primary-50 text-primary-600'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {matiere.icon}
                      <span className="text-sm">{matiere.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
        })}
      </nav>

      {/* User Profile - Enhanced for Mobile */}
      <div className="p-4 border-t border-gray-200">
        {sidebarExpanded ? (
          <div className="relative space-y-3">
            {showLogout && (
              <button
                type="button"
                onClick={handleLogout}
                className="absolute left-0 right-0 top-0 -translate-y-full flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 shadow-lg transition-colors hover:bg-red-50"
                aria-label="Se déconnecter"
              >
                <LogOut className="w-4 h-4" />
                <span>Se déconnecter</span>
              </button>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleProfileClick}
                className="flex-1 flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors text-left"
              >
                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                  {profile ? profile.first_name?.[0] || user?.email?.[0] || 'U' : 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {profile ? profile.first_name || 'Utilisateur' : 'Utilisateur'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email}
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setShowLogout(prev => !prev)}
                className={`p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0 ${showLogout ? 'text-gray-700' : ''}`}
                aria-label={showLogout ? "Masquer l'option de déconnexion" : "Afficher l'option de déconnexion"}
                aria-expanded={showLogout}
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${showLogout ? 'rotate-180' : ''}`} />
              </button>
            </div>
            <button
              type="button"
              onClick={handleReturnHome}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Retour à l'accueil</span>
            </button>
          </div>
        ) : (
          <div className="relative space-y-2">
            {showLogout && (
              <button
                type="button"
                onClick={handleLogout}
                className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 shadow-lg transition-colors hover:bg-red-50"
                aria-label="Se déconnecter"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleProfileClick}
              className="w-full flex justify-center p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Ouvrir le profil"
            >
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {profile ? profile.first_name?.[0] || user?.email?.[0] || 'U' : 'U'}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setShowLogout(prev => !prev)}
              className={`w-full flex justify-center p-2 rounded-lg hover:bg-gray-100 transition-colors ${showLogout ? 'text-gray-700' : 'text-gray-500'}`}
              aria-label={showLogout ? "Masquer l'option de déconnexion" : "Afficher l'option de déconnexion"}
              aria-expanded={showLogout}
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showLogout ? 'rotate-180' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleReturnHome}
              className="w-full flex justify-center p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              aria-label="Retour à l'accueil"
            >
              <Home className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
