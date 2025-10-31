import React from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { ScrollToTop } from '../ui/ScrollToTop';
import { useSidebar } from '../../contexts/SidebarContext';
import { ProtectedRoute } from '../auth/ProtectedRoute';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { isOpen, isHovered, toggle, setHovered } = useSidebar();

  // Determine if sidebar should be visible (open or hovered)
  const sidebarVisible = isOpen || isHovered;

  return (
    <ProtectedRoute>
      <div className="bg-neutral-50 min-h-screen w-full max-w-full overflow-x-hidden">
        {/* Sidebar - Fixed with hover functionality */}
        <div 
          className={`fixed inset-y-0 left-0 z-50 transition-all duration-300 ${
            sidebarVisible ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <Sidebar />
        </div>

        {/* Mobile overlay */}
        <div className={`fixed inset-0 z-40 lg:hidden ${isOpen ? 'block' : 'hidden'}`}>
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={toggle}></div>
        </div>

        {/* Main Content Area - Responsive to sidebar state */}
        <div className={`transition-all duration-300 ${
          sidebarVisible ? 'lg:ml-64' : 'lg:ml-16'
        }`}>
          {/* Mobile Header - Only show on mobile */}
          <div className="lg:hidden bg-white border-b border-gray-200 px-3 xs:px-4 py-3 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={toggle}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 flex-shrink-0"
                aria-label="Toggle sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="font-semibold text-gray-800 truncate text-sm xs:text-base">PrepaENA</span>
            </div>
          </div>

          {/* Main Content */}
          <main className="px-3 xs:px-4 sm:px-6 lg:px-8">
            {children}
          </main>

          {/* Footer */}
          <Footer />
        </div>
      </div>
    </ProtectedRoute>
  );
};
