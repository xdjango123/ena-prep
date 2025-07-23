import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType, ExamLevel } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth token on app load
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          // In a real app, validate token with backend
          // For now, simulate a logged-in user with integral tier for testing
          setUser({
            id: '1',
            name: 'Django Yepidan',
            email: 'django@example.com',
            subscriptionStatus: 'integral', // Change this to test different tiers: 'free', 'premium', 'integral'
            createdAt: new Date(),
            examLevel: 'CM',
            hasCompletedEvaluation: false,
            // selectedCategory: 'CM', // Uncomment for premium tier testing
          });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock successful login - you can change subscriptionStatus here to test different tiers
      const userData: User = {
        id: '1',
        name: 'Django Yepidan',
        email,
        subscriptionStatus: 'integral', // Change to 'free', 'premium', or 'integral' for testing
        createdAt: new Date(),
        examLevel: 'CM',
        hasCompletedEvaluation: false,
        // selectedCategory: 'CM', // Add this for premium tier testing
      };
      
      setUser(userData);
      localStorage.setItem('authToken', 'mock-jwt-token');
    } catch (error) {
      throw new Error('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, firstName: string, lastName: string, examLevel: ExamLevel) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newUser: User = {
        id: new Date().getTime().toString(),
        name: `${firstName} ${lastName}`,
        email,
        subscriptionStatus: 'free', // New users start with free tier
        createdAt: new Date(),
        examLevel,
        hasCompletedEvaluation: false,
      };
      
      setUser(newUser);
      localStorage.setItem('authToken', 'mock-jwt-token');
    } catch (error) {
      throw new Error('Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserProfile = async (updates: Partial<User>) => {
    if (!user) return;
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      
      // In a real app, you'd also update localStorage or send to backend
    } catch (error) {
      throw new Error('Profile update failed');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('authToken');
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 