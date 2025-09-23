import React, { useState } from 'react';
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
  Settings,
  ChevronRight
} from 'lucide-react';
import { useSidebar } from '../../contexts/SidebarContext';
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext';
import { useSubscriptionStatus } from '../../hooks/useSubscriptionStatus';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  action?: () => void;
  requiresSubscription?: boolean;
}

export const Sidebar: React.FC = () => {
  const { isOpen, isHovered, toggle } = useSidebar();
  const { user, profile, userSubscriptions, selectedExamType, setSelectedExamType, signOut } = useSupabaseAuth();
  const { hasActiveSubscription } = useSubscriptionStatus();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMatiereOpen, setMatiereOpen] = useState(true);
  const [isExamTypeDropdownOpen, setIsExamTypeDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout fails, redirect to home for better UX
      navigate('/');
    }
  };

  const handleExamTypeChange = async (examType: 'CM' | 'CMS' | 'CS') => {
    try {
      await setSelectedExamType(examType);
      setIsExamTypeDropdownOpen(false);
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

  return (
    <div className="h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {sidebarExpanded && (
            <div className="flex-1">
              {/* Exam Type as Main Title */}
              {(() => {
                const availableExamTypes = userSubscriptions
                  .filter(sub => sub.is_active)
                  .map(sub => {
                    if (sub.plan_name.includes('CMS')) return 'CMS';
                    if (sub.plan_name.includes('CS')) return 'CS';
                    if (sub.plan_name.includes('CM')) return 'CM';
                    return null;
                  })
                  .filter((examType, index, arr) => examType && arr.indexOf(examType) === index) as ('CM' | 'CMS' | 'CS')[];

                if (availableExamTypes.length > 1) {
                  return (
                    <div className="relative">
                      <button
                        onClick={() => setIsExamTypeDropdownOpen(!isExamTypeDropdownOpen)}
                        className="w-full flex items-center justify-between px-3 py-3 text-lg font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <span>
                          {selectedExamType ? getExamTypeDisplayName(selectedExamType) : 'Sélectionner un plan'}
                        </span>
                        <ChevronRight className={`w-5 h-5 text-gray-500 transition-transform ${isExamTypeDropdownOpen ? 'rotate-90' : ''}`} />
                      </button>
                      
                      {isExamTypeDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                          {availableExamTypes.map((examType) => (
                            <button
                              key={examType}
                              onClick={() => handleExamTypeChange(examType)}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                                selectedExamType === examType ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                              }`}
                            >
                              {getExamTypeDisplayName(examType)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                } else if (availableExamTypes.length === 1) {
                  return (
                    <div className="px-3 py-3 text-lg font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg">
                      {getExamTypeDisplayName(availableExamTypes[0])}
                    </div>
                  );
                } else {
                  return (
                    <div className="px-3 py-3 text-lg font-bold text-gray-500 bg-gray-50 border border-gray-200 rounded-lg">
                      PrepaENA
                    </div>
                  );
                }
              })()}
            </div>
          )}
          <button
            onClick={toggle}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
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
                  onClick={isDisabled ? (e) => e.preventDefault() : undefined}
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
                      onClick={isMatiereDisabled ? (e) => e.preventDefault() : undefined}
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
          <div className="space-y-3">
            {/* Profile Info - Clickable on Mobile */}
            <button
              onClick={handleProfileClick}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors text-left"
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
              <Settings className="w-4 h-4 text-gray-400" />
            </button>
            
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors text-left"
              aria-label="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Se déconnecter</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Collapsed Profile - Clickable */}
            <button
              onClick={handleProfileClick}
              className="w-full flex justify-center p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Ouvrir le profil"
            >
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {profile ? profile.first_name?.[0] || user?.email?.[0] || 'U' : 'U'}
              </div>
            </button>
            
            {/* Collapsed Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex justify-center p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              aria-label="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
