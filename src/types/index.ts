export interface SubjectType {
  id: string;
  title: string;
  description: string;
  icon: string;
  sampleQuestion: string;
  sampleAnswer?: string;
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