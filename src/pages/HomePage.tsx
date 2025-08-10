import React from 'react';
import { Hero } from '../components/home/Hero';
import { FeaturesSection } from '../components/home/FeaturesSection';
import { CTASection } from '../components/home/CTASection';
import { StatsSection } from '../components/home/StatsSection';
import { SubjectsPreview } from '../components/home/SubjectsPreview';
import { TestimonialsPreview } from '../components/home/TestimonialsPreview';

const HomePage: React.FC = () => {
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