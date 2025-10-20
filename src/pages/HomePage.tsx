import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Hero } from '../components/home/Hero';
import { FeaturesSection } from '../components/home/FeaturesSection';
import { CTASection } from '../components/home/CTASection';
import { StatsSection } from '../components/home/StatsSection';
import { SubjectsPreview } from '../components/home/SubjectsPreview';
import { TestimonialsPreview } from '../components/home/TestimonialsPreview';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Handle password reset redirects from Supabase emails
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const type = params.get('type');
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    // If this is a password reset confirmation, redirect to dashboard
    // Note: refresh_token might be empty in password reset emails
    if (type === 'recovery' && accessToken) {
      console.log('🔄 Redirecting password reset from homepage to /dashboard');
      // Preserve all URL parameters including the Supabase tokens
      const resetParams = new URLSearchParams(location.search);
      navigate(`/dashboard?${resetParams.toString()}`, { replace: true });
    }
  }, [location.search, navigate]);
  return (
    <>
      <Hero />
      <FeaturesSection />
      <StatsSection />
      <SubjectsPreview />
      <TestimonialsPreview />
      <CTASection />
    </>
  );
};

export default HomePage;