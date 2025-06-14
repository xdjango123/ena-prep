import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, 
  LayoutDashboard, 
  TestTube, 
  BookOpen, 
  Globe, 
  Languages, 
  Calculator, 
  Book,
  ClipboardList,
  FileText,
  MessageSquare,
  HelpCircle,
  LogOut,
  ChevronDown,
  ChevronRight,
  Heart
} from 'lucide-react';
import { useSidebar } from '../../contexts/SidebarContext';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: NavItem[];
  action?: () => void;
}

export const Sidebar: React.FC = () => {
  const { isOpen, toggle } = useSidebar();
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState<string[]>(['subjects']);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navigationItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: <LayoutDashboard className="w-5 h-5" />,
      path: '/dashboard'
    },
    {
      id: 'assessment',
      label: 'Test d\'évaluation',
      icon: <TestTube className="w-5 h-5" />,
      path: '/dashboard/tryout'
    },
    {
      id: 'subjects',
      label: 'Matières',
      icon: <BookOpen className="w-5 h-5" />,
      children: [
        {
          id: 'general',
          label: 'Culture Générale',
          icon: <Globe className="w-4 h-4" />,
          path: '/dashboard/subject/general'
        },
        {
          id: 'english',
          label: 'Anglais',
          icon: <Languages className="w-4 h-4" />,
          path: '/dashboard/subject/english'
        },
        {
          id: 'math',
          label: 'Aptitude Numérique',
          icon: <Calculator className="w-4 h-4" />,
          path: '/dashboard/subject/math'
        },
        {
          id: 'french',
          label: 'Français',
          icon: <Book className="w-4 h-4" />,
          path: '/dashboard/subject/french'
        },
        {
          id: 'study-plan',
          label: 'Plan d\'étude',
          icon: <ClipboardList className="w-4 h-4" />,
          path: '/dashboard/study-plan'
        }
      ]
    }
  ];

  const examItems: NavItem[] = [
    {
      id: 'exam-1',
      label: 'Examen Blanc 1',
      icon: <FileText className="w-5 h-5" />,
      path: '/dashboard/exam/1'
    },
    {
      id: 'exam-2',
      label: 'Examen Blanc 2',
      icon: <FileText className="w-5 h-5" />,
      path: '/dashboard/exam/2'
    },
    {
      id: 'exam-3',
      label: 'Examen Blanc 3',
      icon: <FileText className="w-5 h-5" />,
      path: '/dashboard/exam/3'
    },
    {
      id: 'bookmarked',
      label: 'Favoris',
      icon: <Heart className="w-5 h-5" />,
      path: '/dashboard/bookmarks'
    }
  ];

  const communityItems: NavItem[] = [
    {
      id: 'forum',
      label: 'Forum',
      icon: <MessageSquare className="w-5 h-5" />,
      path: '/dashboard/forum'
    },
    {
      id: 'support',
      label: 'Support',
      icon: <HelpCircle className="w-5 h-5" />,
      path: '/dashboard/support'
    }
  ];

  const accountItems: NavItem[] = [
    {
      id: 'logout',
      label: 'Se déconnecter',
      icon: <LogOut className="w-5 h-5" />,
      action: handleLogout
    }
  ];

  const isActive = (path: string) => location.pathname === path;
  const isParentActive = (children: NavItem[]) => 
    children.some(child => child.path && isActive(child.path));

  const renderNavItem = (item: NavItem, isChild = false) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const active = item.path ? isActive(item.path) : (hasChildren ? isParentActive(item.children!) : false);

    if (hasChildren) {
      return (
        <div key={item.id}>
          <button
            onClick={() => toggleExpanded(item.id)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              active 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-700 hover:bg-gray-100'
            } ${!isOpen && !isChild ? 'justify-center' : ''}`}
          >
            <div className="flex items-center">
              {item.icon}
              {(isOpen || isChild) && <span className="ml-3">{item.label}</span>}
            </div>
            {(isOpen || isChild) && (
              isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {isExpanded && (isOpen || isChild) && (
            <div className="ml-4 mt-1 space-y-1">
              {item.children!.map(child => renderNavItem(child, true))}
            </div>
          )}
        </div>
      );
    }

    if (item.action) {
      return (
        <button
          key={item.id}
          onClick={item.action}
          className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            item.id === 'logout'
              ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
              : active 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-700 hover:bg-gray-100'
          } ${!isOpen && !isChild ? 'justify-center' : ''}`}
        >
          {item.icon}
          {(isOpen || isChild) && <span className="ml-3">{item.label}</span>}
        </button>
      );
    }

    return (
      <Link
        key={item.id}
        to={item.path!}
        className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          active 
            ? 'bg-blue-100 text-blue-700' 
            : 'text-gray-700 hover:bg-gray-100'
        } ${!isOpen && !isChild ? 'justify-center' : ''}`}
      >
        {item.icon}
        {(isOpen || isChild) && <span className="ml-3">{item.label}</span>}
      </Link>
    );
  };

  const renderSection = (title: string, items: NavItem[]) => (
    <div className="space-y-1">
      {isOpen && <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>}
      {items.map(item => renderNavItem(item))}
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={toggle}
          style={{ top: '4rem' }}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed left-0 top-16 z-40 bg-white border-r border-gray-200 transition-all duration-300 ${
        isOpen ? 'w-64' : 'w-16'
      } lg:relative lg:top-0 lg:z-auto`} style={{ height: 'calc(100vh - 4rem)' }}>

        {/* Toggle Button */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {isOpen && (
            <span className="text-sm font-medium text-gray-600">Navigation</span>
          )}
          <button
            onClick={toggle}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors lg:block hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Content */}
        <div className="flex flex-col" style={{ height: 'calc(100% - 5rem)' }}>
          {/* Main Navigation */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              {/* Primary Navigation */}
              <div className="space-y-1">
                {navigationItems.map(item => renderNavItem(item))}
              </div>

              {/* Exams */}
              {renderSection('Examens', examItems)}

              {/* Community */}
              {renderSection('Communauté', communityItems)}
            </div>
          </div>

          {/* Account Actions - Fixed at bottom */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="space-y-1">
              {accountItems.map(item => renderNavItem(item))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}; 