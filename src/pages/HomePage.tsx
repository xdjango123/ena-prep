import React from 'react';
import { Hero } from '../components/home/Hero';
import { SubjectsPreview } from '../components/home/SubjectsPreview';
import { TestimonialsPreview } from '../components/home/TestimonialsPreview';
import { FeaturesSection } from '../components/home/FeaturesSection';
import { StatsSection } from '../components/home/StatsSection';
import { CTASection } from '../components/home/CTASection';

const HomePage: React.FC = () => {
  return (
    <>
      <Hero />
      <SubjectsPreview />
      <FeaturesSection />
      <StatsSection />
      <TestimonialsPreview />
      <CTASection />
    </>
  );
};

export default HomePage;