import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SidebarProvider } from './contexts/SidebarContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { DashboardLayout } from './components/layout/DashboardLayout';
import HomePage from './pages/HomePage';
import SubjectsPage from './pages/SubjectsPage';
import ReviewsPage from './pages/ReviewsPage';
import PricingPage from './pages/PricingPage';
import AboutPage from './pages/AboutPage';
import FAQPage from './pages/FAQPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import TryoutTestPage from './pages/TryoutTestPage';
import EvaluationTestPage from './pages/EvaluationTestPage';
import EnglishTestPage from './pages/EnglishTestPage';
import EnglishSubjectPage from './pages/EnglishSubjectPage';
import { GeneralKnowledgePage } from './pages/subjects/GeneralKnowledgePage';
import { MathPage } from './pages/subjects/MathPage';
import { FrenchPage } from './pages/subjects/FrenchPage';
import { AnalyticsPage } from './pages/dashboard/AnalyticsPage';
import { StudyPlanPage } from './pages/dashboard/StudyPlanPage';
import { ExamPage } from './pages/exams/ExamPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
          <Route path="/matieres" element={<PublicLayout><SubjectsPage /></PublicLayout>} />
          <Route path="/avis" element={<PublicLayout><ReviewsPage /></PublicLayout>} />
          <Route path="/tarification" element={<PublicLayout><PricingPage /></PublicLayout>} />
          <Route path="/a-propos" element={<PublicLayout><AboutPage /></PublicLayout>} />
          <Route path="/faq" element={<PublicLayout><FAQPage /></PublicLayout>} />
          <Route path="/connexion" element={<PublicLayout><LoginPage /></PublicLayout>} />
          <Route path="/inscription" element={<PublicLayout><SignupPage /></PublicLayout>} />
          
          {/* Protected Dashboard Routes */}
          <Route 
            path="/dashboard/*" 
            element={
              <ProtectedRoute requiresSubscription={true}>
                <SidebarProvider>
                  <DashboardLayout>
                    <Routes>
                      <Route index element={<DashboardPage />} />
                      <Route path="tryout" element={<EvaluationTestPage />} />
                      <Route path="tryout/test" element={<TryoutTestPage />} />
                      
                      {/* Subject Routes */}
                      <Route path="subject/english" element={<EnglishSubjectPage />} />
                      <Route path="subject/general" element={<GeneralKnowledgePage />} />
                      <Route path="subject/math" element={<MathPage />} />
                      <Route path="subject/french" element={<FrenchPage />} />
                      
                      {/* Practice Routes */}
                      <Route path="practice/english" element={<EnglishTestPage />} />
                      
                      {/* Analytics & Study Plan */}
                      <Route path="analytics" element={<AnalyticsPage />} />
                      <Route path="study-plan" element={<StudyPlanPage />} />
                      
                      {/* Exam Routes */}
                      <Route path="exam/1" element={<ExamPage examNumber={1} />} />
                      <Route path="exam/2" element={<ExamPage examNumber={2} />} />
                      <Route path="exam/3" element={<ExamPage examNumber={3} />} />
                      
                      {/* Placeholder routes for sidebar items */}
                      <Route path="practice" element={<PlaceholderPage title="Examens Pratiques" />} />
                      <Route path="mistakes" element={<PlaceholderPage title="Mes Erreurs" />} />
                      <Route path="bookmarks" element={<PlaceholderPage title="Favoris" />} />
                      <Route path="forum" element={<PlaceholderPage title="Forum" />} />
                      <Route path="support" element={<PlaceholderPage title="Support" />} />
                      <Route path="profile" element={<PlaceholderPage title="Mon Profil" />} />
                      <Route path="billing" element={<PlaceholderPage title="Abonnement" />} />
                    </Routes>
                  </DashboardLayout>
                </SidebarProvider>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

// Public Layout Component
const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col min-h-screen bg-white">
    <Header />
    <main className="flex-grow">
      {children}
    </main>
    <Footer />
  </div>
);

// Placeholder Component for future pages
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="p-6">
    <div className="bg-white rounded-xl p-8 text-center">
      <div className="text-6xl mb-4">🚧</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-600">
        Cette section est en cours de développement. Revenez bientôt !
      </p>
    </div>
  </div>
);

export default App;