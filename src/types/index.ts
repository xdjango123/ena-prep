export interface SubjectType {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface TestimonialType {
  id: string;
  name: string;
  role: string;
  content: string;
  rating: number;
  avatar: string;
}

export interface PricingTierType {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  popular?: boolean;
  buttonText: string;
}

export interface FAQType {
  question: string;
  answer: string;
  category: 'exam' | 'platform' | 'subscription';
}

export interface EvaluationQuestion {
  id: string;
  subject: 'anglais' | 'cultureGenerale' | 'logique';
  difficulty: 'CM' | 'CMS' | 'CS';
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface EvaluationAnswer {
  questionId: string;
  selectedAnswer: number;
  timeSpent: number;
}