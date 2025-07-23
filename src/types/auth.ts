export type ExamLevel = 'CM' | 'CMS' | 'CS';
export type SubscriptionTier = 'free' | 'premium' | 'integral';

export interface User {
  id: string;
  name: string;
  email: string;
  subscriptionStatus: SubscriptionTier;
  createdAt: Date;
  // New onboarding fields
  examLevel?: ExamLevel;
  hasCompletedEvaluation?: boolean;
  evaluationResults?: EvaluationResult;
  // For premium users who need to select one category
  selectedCategory?: ExamLevel;
}

export interface EvaluationResult {
  id: string;
  userId: string;
  overallScore: number;
  subjectScores: {
    anglais: number;
    cultureGenerale: number;
    logique: number;
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  completedAt: Date;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, firstName: string, lastName: string, examLevel: ExamLevel) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
}

export interface TryoutTestResult {
  id: string;
  userId: string;
  subject: 'general_knowledge' | 'english' | 'numerical_aptitude' | 'french';
  score: number;
  totalQuestions: number;
  timeSpent: number; // in seconds
  completedAt: Date;
}

export interface StudyPlanTask {
  id: string;
  userId: string;
  task: string;
  subject: string;
  isCompleted: boolean;
  dueDate: Date;
  createdAt: Date;
}

export interface QuizResult {
  id: string;
  userId: string;
  questionId: string;
  isCorrect: boolean;
  timeSpent: number;
  subject: string;
  completedAt: Date;
} 