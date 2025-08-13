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
  GraduationCap
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
  const { isOpen, toggle } = useSidebar();
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

  const isLinkActive = (path: string) => {
    // Special case for dashboard - only highlight when exactly on dashboard
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/dashboard/';
    }
    // For all other paths, use startsWith as before
    return location.pathname.startsWith(path);
  };

  const navLinks = [
    { id: 'dashboard', label: 'Tableau de bord', icon: <LayoutDashboard className="w-5 h-5" />, path: '/dashboard' },
  ];
  
  const matiereLinks = [
    { id: 'general', label: 'Culture Générale', icon: <Globe className="w-4 h-4" />, path: '/dashboard/subject/general-knowledge' },
    { id: 'english', label: 'Anglais', icon: <Languages className="w-4 h-4" />, path: '/dashboard/subject/english' },
    { id: 'logic', label: 'Logique', icon: <BrainCircuit className="w-4 h-4" />, path: '/dashboard/subject/logic' },
  ];

  const communityItems: NavItem[] = [
    { id: 'forum', label: 'Forum', icon: <MessageSquare className="w-5 h-5" />, path: '/dashboard/forum' },
    { id: 'ask-tutor', label: 'Ask a Tutor', icon: <Users className="w-5 h-5" />, path: '/dashboard/tutor' },
    { id: 'ena-guide', label: 'Guide de L\'ENA', icon: <BookCopy className="w-5 h-5" />, path: '/dashboard/ena-guide' },
  ];
  
  const renderLink = (item: { id: string, label: string, icon: React.ReactNode, path: string }, isSubItem = false) => {
    const active = isLinkActive(item.path);
    return (
      <Link
        key={item.id}
        to={item.path}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors mb-1 ${
          active 
            ? (isSubItem ? 'bg-blue-50 text-blue-600' : 'bg-blue-100 text-blue-600 font-semibold')
            : ''
        } ${!isOpen ? 'justify-center' : ''}`}
      >
        {item.icon}
        {isOpen && <span>{item.label}</span>}
      </Link>
    );
  }

  const userName = profile ? `${profile['First Name']} ${profile['Last Name']}` : user?.email || 'Utilisateur';

  return (
    <div className={`h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300 z-50 lg:z-20 ${
      isOpen ? 'w-64' : 'w-20'
    }`}>
      {/* Logo and Toggle - Hide toggle on mobile since it's handled by DashboardLayout */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 h-16 shrink-0">
        {isOpen && (
          <Link to="/" className="flex items-center gap-2 text-primary-500 font-bold text-lg">
            <GraduationCap size={24} />
            <span>PrepaENA</span>
          </Link>
        )}
        <button onClick={toggle} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 lg:block hidden">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
        <nav>
          <ul>
            {navLinks.map(link => (
              <li key={link.id}>{renderLink(link)}</li>
            ))}
            <li>
              <button
                onClick={() => setMatiereOpen(!isMatiereOpen)}
                className={`flex items-center justify-between w-full gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors mb-1 ${!isOpen ? 'justify-center' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <BookCopy className="w-5 h-5" />
                  {isOpen && <span>Tests</span>}
                </div>
                {isOpen && (isMatiereOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />)}
              </button>
              {isOpen && isMatiereOpen && (
                <ul className="pl-4 mt-1 space-y-1">
                  {matiereLinks.map(link => (
                    <li key={link.id}>{renderLink(link, true)}</li>
                  ))}
                </ul>
              )}
            </li>
             <li>
              {renderLink({ id: 'exams', label: 'Examens', icon: <FileText className="w-5 h-5" />, path: '/dashboard/exams' })}
            </li>
          </ul>

          {isOpen && <h2 className="px-3 mt-6 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Communauté</h2>}
          <ul>
            {communityItems.map(item => (
              <li key={item.id}>{renderLink({ id: item.id, label: item.label, icon: item.icon as React.ReactElement, path: item.path! })}</li>
            ))}
          </ul>
        </nav>
      </div>

      {/* User Area */}
      <div className="p-4 border-t border-gray-200 shrink-0">
        <Link to="/dashboard/profile" className={`flex items-center p-2 rounded-lg hover:bg-gray-100 ${!isOpen ? 'justify-center' : ''}`}>
          <img src={`https://ui-avatars.com/api/?name=${userName}&background=random`} alt="User avatar" className="w-8 h-8 rounded-full" />
          {isOpen && <span className="ml-3 font-semibold text-gray-700 truncate">{userName}</span>}
        </Link>
        <button onClick={handleLogout} className={`w-full flex items-center p-2 mt-2 rounded-lg text-red-600 hover:bg-red-50 ${!isOpen ? 'justify-center' : ''}`}>
          <LogOut className="w-5 h-5" />
          {isOpen && <span className="ml-3 font-semibold">Se déconnecter</span>}
        </button>
      </div>
    </div>
  );
}; 