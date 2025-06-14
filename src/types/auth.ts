export interface User {
  id: string;
  name: string;
  email: string;
  subscriptionStatus: 'active' | 'inactive' | 'trial';
  createdAt: Date;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
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