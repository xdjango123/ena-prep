import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, 
  LayoutDashboard, 
  TestTube2, 
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
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  action?: () => void;
}

export const Sidebar: React.FC = () => {
  const { isOpen, toggle } = useSidebar();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMatiereOpen, setMatiereOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/');
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
    { id: 'evaluation', label: 'Test d\'évaluation', icon: <TestTube2 className="w-5 h-5" />, path: '/dashboard/evaluation-test' },
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
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 mb-1 ${
          active 
            ? (isSubItem ? 'bg-primary-100 text-primary-700 font-medium' : 'bg-primary-600 text-white font-semibold shadow-sm')
            : 'text-background-700 hover:bg-background-100 hover:text-background-900'
        } ${!isOpen ? 'justify-center' : ''}`}
      >
        {item.icon}
        {isOpen && <span className="font-medium">{item.label}</span>}
      </Link>
    );
  }

  return (
    <div className={`h-screen fixed top-0 left-0 bg-white border-r border-background-200 flex flex-col transition-all duration-300 z-20 ${isOpen ? 'w-64' : 'w-20'}`}>
      {/* Logo and Toggle */}
      <div className="flex items-center justify-between p-4 border-b border-background-200 h-16 shrink-0">
        {isOpen && (
          <Link to="/" className="flex items-center gap-2 text-primary-600 font-bold text-lg">
                          <GraduationCap size={24} />
              <span>ENAplus<sup className="text-sm">+</sup></span>
          </Link>
        )}
        <button onClick={toggle} className="p-2 rounded-lg text-background-600 hover:bg-background-100">
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
                className={`flex items-center justify-between w-full gap-3 px-4 py-3 rounded-lg text-background-700 hover:bg-background-100 hover:text-background-900 transition-all duration-200 mb-1 ${!isOpen ? 'justify-center' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <BookCopy className="w-5 h-5" />
                  {isOpen && <span className="font-medium">Matières</span>}
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

          {isOpen && <h2 className="px-4 mt-6 mb-3 text-xs font-semibold text-background-500 uppercase tracking-wider">Communauté</h2>}
          <ul>
            {communityItems.map(item => (
              <li key={item.id}>{renderLink({ id: item.id, label: item.label, icon: item.icon as React.ReactElement, path: item.path! })}</li>
            ))}
          </ul>
        </nav>
      </div>

      {/* User Area */}
      <div className="p-4 border-t border-background-200 shrink-0">
        <Link to="/dashboard/profile" className={`flex items-center p-3 rounded-lg hover:bg-background-100 transition-all duration-200 ${!isOpen ? 'justify-center' : ''}`}>
          <img src={`https://ui-avatars.com/api/?name=${user?.name}&background=random`} alt="User avatar" className="w-8 h-8 rounded-full" />
          {isOpen && <span className="ml-3 font-semibold text-background-700 truncate">{user?.name}</span>}
        </Link>
        <button onClick={handleLogout} className={`w-full flex items-center p-3 mt-2 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200 ${!isOpen ? 'justify-center' : ''}`}>
          <LogOut className="w-5 h-5" />
          {isOpen && <span className="ml-3 font-semibold">Se déconnecter</span>}
        </button>
      </div>
    </div>
  );
}; 