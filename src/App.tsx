import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { SupabaseAuthProvider } from './contexts/SupabaseAuthContext';
import { SidebarProvider } from './contexts/SidebarContext';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import { GeneralKnowledgePage } from './pages/subjects/GeneralKnowledgePage';
import EnglishSubjectPage from './pages/EnglishSubjectPage';
import LogicPage from './pages/LogicPage';
import { ExamPage } from './pages/exams/ExamPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { PublicLayout } from './components/layout/PublicLayout';
import HomePage from './pages/HomePage';
import SubjectsPage from './pages/SubjectsPage';
import ReviewsPage from './pages/ReviewsPage';
import PricingPage from './pages/PricingPage';
import FAQPage from './pages/FAQPage';
import PracticePage from './pages/PracticePage';
import ForumPage from './pages/ForumPage';
import TutorPage from './pages/TutorPage';
import ProfilePage from './pages/ProfilePage';
import EnaGuidePage from './pages/EnaGuidePage';
import QuickQuizPage from './pages/QuickQuizPage';
import ScrollToTop from './components/ScrollToTop';

// A placeholder for pages that are not yet implemented
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold">{title}</h1>
    <p>This page is under construction.</p>
  </div>
);


function App() {
  return (
    <SupabaseAuthProvider>
      <Router>
        <ScrollToTop />
        <SidebarProvider>
            <Routes>
              <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
              <Route path="/login" element={<PublicLayout><LoginPage /></PublicLayout>} />
              <Route path="/signup" element={<PublicLayout><SignupPage /></PublicLayout>} />
              <Route path="/matieres" element={<PublicLayout><SubjectsPage /></PublicLayout>} />
              <Route path="/avis" element={<PublicLayout><ReviewsPage /></PublicLayout>} />
              <Route path="/tarification" element={<PublicLayout><PricingPage /></PublicLayout>} />
              <Route path="/faq" element={<PublicLayout><FAQPage /></PublicLayout>} />
              <Route path="/quick-quiz" element={<PublicLayout><QuickQuizPage /></PublicLayout>} />

              <Route path="/dashboard" element={<DashboardLayout><Outlet /></DashboardLayout>}>
                <Route index element={<DashboardPage />} />
                <Route path="practice" element={<PracticePage />} />
                
                {/* Subject Pages */}
                <Route path="subject/general-knowledge" element={<GeneralKnowledgePage />} />
                <Route path="subject/english" element={<EnglishSubjectPage />} />
                <Route path="subject/logic" element={<LogicPage />} />
                
                {/* Exam Page */}
                <Route path="exams" element={<ExamPage />} />

                {/* Community & Support Pages */}
                <Route path="forum" element={<ForumPage />} />
                <Route path="tutor" element={<TutorPage />} />
                <Route path="ena-guide" element={<EnaGuidePage />} />
                
                {/* User Pages */}
                <Route path="profile" element={<ProfilePage />} />

                {/* Placeholder routes */}
                <Route path="billing" element={<PlaceholderPage title="Abonnement" />} />
                <Route path="analytics" element={<PlaceholderPage title="Analytics" />} />
              </Route>
            </Routes>
          </SidebarProvider>
        </Router>
    </SupabaseAuthProvider>
  );
}

export default App;