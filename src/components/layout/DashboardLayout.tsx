import React from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import { ScrollToTop } from '../ui/ScrollToTop';
import { useSidebar } from '../../contexts/SidebarContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { isOpen, toggle } = useSidebar();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header />
      
      <div className="flex pt-16">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main content wrapper */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Mobile header */}
          <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
            <button
              onClick={toggle}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
            <div className="min-h-full pb-16">
              {children}
            </div>
          </main>
        </div>
      </div>
      
      {/* Footer - Full width outside sidebar */}
      <div className="mt-16">
        <Footer />
      </div>
      
      {/* Scroll to top button */}
      <ScrollToTop />
    </div>
  );
}; 