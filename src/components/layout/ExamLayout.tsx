import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DashboardLayout } from './DashboardLayout';

interface ExamLayoutProps {
  children: React.ReactNode;
}

export const ExamLayout: React.FC<ExamLayoutProps> = ({ children }) => {
  const location = useLocation();
  
  // Check if we're on an exam route
  const isExamRoute = location.pathname.startsWith('/dashboard/secure-exam/');
  
  // Add/remove exam mode class based on route
  useEffect(() => {
    if (isExamRoute) {
      document.body.classList.add('exam-mode');
    } else {
      document.body.classList.remove('exam-mode');
    }
    
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('exam-mode');
    };
  }, [isExamRoute]);
  
  // For exam routes, render children directly without dashboard layout
  if (isExamRoute) {
    return <>{children}</>;
  }
  
  // For other routes, use normal dashboard layout
  return <DashboardLayout>{children}</DashboardLayout>;
};
