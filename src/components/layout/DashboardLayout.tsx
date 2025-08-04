import React from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import { ScrollToTop } from '../ui/ScrollToTop';
import { useSidebar } from '../../contexts/SidebarContext';
import { ProtectedRoute } from '../auth/ProtectedRoute';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { isOpen, toggle } = useSidebar();

  return (
    <ProtectedRoute>
      <div className="bg-neutral-50">
        <Sidebar />
        <div className={`grid grid-rows-[auto_1fr_auto] min-h-screen transition-all duration-300 ${isOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
          {/* Mobile Header (Grid Row 1) */}
          <div className="lg:hidden bg-white border-b border-gray-200 p-2 flex items-center justify-end sticky top-0 z-10">
            <button
              onClick={toggle}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          {/* Main Content (Grid Row 2 - stretches) */}
          <main className="flex flex-col">
            <div className="flex-grow">
              {children}
            </div>
          </main>

          {/* Footer (Grid Row 3) */}
          <Footer />
        </div>
      </div>
    </ProtectedRoute>
  );
}; 