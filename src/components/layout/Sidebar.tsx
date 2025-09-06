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
  Settings
} from 'lucide-react';
import { useSidebar } from '../../contexts/SidebarContext';
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  action?: () => void;
}

export const Sidebar: React.FC = () => {
  const { isOpen, isHovered, toggle } = useSidebar();
  const { user, profile, signOut } = useSupabaseAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMatiereOpen, setMatiereOpen] = useState(true);

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
      path: '/dashboard/practice'
    },
    {
      id: 'matieres',
      label: 'Matières',
      icon: <GraduationCap className="w-5 h-5" />,
      action: () => setMatiereOpen(!isMatiereOpen)
    },
    {
      id: 'exams',
      label: 'Examens',
      icon: <FileText className="w-5 h-5" />,
      path: '/dashboard/exams'
    },
    {
      id: 'tutor',
      label: 'Tuteur',
      icon: <Users className="w-5 h-5" />,
      path: '/dashboard/tutor'
    },
    {
      id: 'forum',
      label: 'Forum',
      icon: <MessageSquare className="w-5 h-5" />,
      path: '/dashboard/forum'
    }
  ];

  const matiereItems: NavItem[] = [
    {
      id: 'general_knowledge',
      label: 'Culture Générale',
      icon: <Globe className="w-4 h-4" />,
      path: '/dashboard/subject/general-knowledge'
    },
    {
      id: 'english',
      label: 'Anglais',
      icon: <Languages className="w-4 h-4" />,
      path: '/dashboard/subject/english'
    },
    {
      id: 'logic',
      label: 'Logique',
      icon: <BrainCircuit className="w-4 h-4" />,
      path: '/dashboard/subject/logic'
    }
  ];

  const sidebarExpanded = isOpen || isHovered;

  return (
    <div className="h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {sidebarExpanded && (
            <h1 className="text-xl font-bold text-gray-900">PrepaENA</h1>
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
        {navItems.map((item) => (
          <div key={item.id}>
            {item.action ? (
              <button
                onClick={item.action}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  isLinkActive('/dashboard/subject') && item.id === 'matieres'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.icon}
                {sidebarExpanded && (
                  <>
                    <span className="font-medium">{item.label}</span>
                    {item.id === 'matieres' && (
                      isMatiereOpen ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />
                    )}
                  </>
                )}
              </button>
            ) : (
              <Link
                to={item.path!}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  isLinkActive(item.path!)
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
                {matiereItems.map((matiere) => (
                  <Link
                    key={matiere.id}
                    to={matiere.path!}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      isLinkActive(matiere.path!)
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {matiere.icon}
                    <span className="text-sm">{matiere.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
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
                {profile ? profile['First Name']?.[0] || user?.email?.[0] || 'U' : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {profile ? profile['First Name'] || 'Utilisateur' : 'Utilisateur'}
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
                {profile ? profile['First Name']?.[0] || user?.email?.[0] || 'U' : 'U'}
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
