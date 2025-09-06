import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile, Subscription } from '../lib/supabase';
import { EmailLogService } from '../services/emailLogService';
import { UserAttemptService } from '../services/userAttemptService';

interface SupabaseAuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  subscription: Subscription | null;
  isLoading: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string, examType: string, planName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  updateEmail: (newEmail: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  addExamType: (examType: string) => Promise<{ error: any }>;
  replaceExamType: (newExamType: string) => Promise<{ error: any }>;
  logUserAttempt: (testType: string, category: string, subCategory?: string, testNumber?: number, score?: number) => Promise<boolean>;
  resetActivityTimer: () => void;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined);

export const useSupabaseAuth = () => {
  const context = useContext(SupabaseAuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
};

interface SupabaseAuthProviderProps {
  children: ReactNode;
}

export const SupabaseAuthProvider: React.FC<SupabaseAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Auto-logout functionality
  const activityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds

  // Reset activity timer
  const resetActivityTimer = () => {
    if (activityTimerRef.current) {
      clearTimeout(activityTimerRef.current);
    }
    
    if (user) {
      activityTimerRef.current = setTimeout(() => {
        console.log('Auto-logout: User inactive for 10 minutes');
        signOut();
      }, INACTIVITY_TIMEOUT);
    }
  };

  // Track user activity to reset timer
  useEffect(() => {
    if (!user) return;

    const handleActivity = () => {
      resetActivityTimer();
    };

    // Add event listeners for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Initial timer setup
    resetActivityTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      if (activityTimerRef.current) {
        clearTimeout(activityTimerRef.current);
      }
    };
  }, [user]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch profile and subscription when user changes
  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchSubscription();
      // Create profile and subscription if they don't exist
      createUserProfileIfNeeded();
    } else {
      setProfile(null);
      setSubscription(null);
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchSubscription = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching subscription:', error);
        setSubscription(null);
      } else {
        setSubscription(data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setSubscription(null);
    }
  };

  const createUserProfileIfNeeded = async () => {
    if (!user) return;

    try {
      // Get user data from localStorage (backup)
      const pendingUserData = localStorage.getItem('pendingUserData');
      let userData = null;
      
      if (pendingUserData) {
        try {
          userData = JSON.parse(pendingUserData);
          localStorage.removeItem('pendingUserData'); // Clean up
        } catch (e) {
          console.error('Error parsing pending user data:', e);
        }
      }

      // Get user data from Supabase user metadata (primary source)
      const userMetadata = user.user_metadata;
      
      // Use metadata from Supabase, fallback to localStorage, then defaults
      const firstName = userMetadata?.first_name || userData?.firstName || 'User';
      const lastName = userMetadata?.last_name || userData?.lastName || '';
      const examType = userMetadata?.exam_type || userData?.examType || 'CM';
      
      // Ensure plan name matches exam type
      let planName = userMetadata?.plan_name || userData?.planName;
      if (!planName) {
        planName = examType === 'CM' ? 'Prépa CM' : 
                  examType === 'CMS' ? 'Prépa CMS' : 
                  examType === 'CS' ? 'Prépa CS' : 'Prépa CM';
      }
      
      // Double-check that plan name matches exam type
      const expectedPlanName = examType === 'CM' ? 'Prépa CM' : 
                              examType === 'CMS' ? 'Prépa CMS' : 
                              examType === 'CS' ? 'Prépa CS' : 'Prépa CM';
      
      if (planName !== expectedPlanName) {
        console.warn(`Plan name mismatch! Expected ${expectedPlanName} for exam type ${examType}, but got ${planName}. Using expected plan name.`);
        planName = expectedPlanName;
      }

      console.log('Creating profile with data:', { firstName, lastName, examType, planName });
      console.log('User metadata:', userMetadata);
      console.log('LocalStorage data:', userData);

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existingProfile) {
        // Calculate expiration date (6 months from now)
        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + 6);

        // Create profile using the collected data
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            'First Name': firstName,
            'Last Name': lastName,
            exam_type: examType,
            email: user.email,
            expiration_date: expirationDate.toISOString(),
            is_owner: false,
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
        } else {
          console.log('Profile created successfully');
          await fetchProfile();
        }
      }

      // Check if subscription exists
      const { data: existingSubscription } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!existingSubscription) {
        // Create subscription using the collected data
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        console.log('Creating subscription with plan_name:', planName);
        const { error: subscriptionError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: user.id,
            plan_name: planName,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            is_active: true,
          });

        if (subscriptionError) {
          console.error('Error creating subscription:', subscriptionError);
        } else {
          console.log('Subscription created successfully');
          await fetchSubscription();
        }
      }
    } catch (error) {
      console.error('Error in createUserProfileIfNeeded:', error);
    }
  };

  const signUp = async (
    email: string, 
    password: string, 
    firstName: string, 
    lastName: string, 
    examType: string,
    planName: string
  ) => {
    try {
      console.log('Starting signup process for:', email);
      
      // Sign up the user WITH metadata to capture user data
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            exam_type: examType,
            plan_name: planName,
          },
        },
      });

      if (error) {
        console.error('Auth signup error:', error);
        return { error };
      }

      console.log('Auth signup successful, user ID:', data.user?.id);

      // Store the user data in localStorage as backup for profile creation
      if (data.user) {
        localStorage.setItem('pendingUserData', JSON.stringify({
          firstName,
          lastName,
          examType,
          planName
        }));
      }

      console.log('Signup process completed successfully');
      return { error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error) {
        // Reset activity timer on successful sign in
        resetActivityTimer();
      }

      return { error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      // Clear activity timer
      if (activityTimerRef.current) {
        clearTimeout(activityTimerRef.current);
        activityTimerRef.current = null;
      }

      // Clear local state first to ensure immediate UI update
      setUser(null);
      setSession(null);
      setProfile(null);
      setSubscription(null);
      
      // Then attempt Supabase logout
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
      }
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if there's an error, clear local state for better UX
      setUser(null);
      setSession(null);
      setProfile(null);
      setSubscription(null);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (!error) {
        await fetchProfile();
      }

      return { error };
    } catch (error) {
      console.error('Update profile error:', error);
      return { error };
    }
  };

  const updateEmail = async (newEmail: string) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (!error) {
        // Update profile email as well
        await updateProfile({ email: newEmail });
      }

      return { error };
    } catch (error) {
      console.error('Update email error:', error);
      return { error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      return { error };
    } catch (error) {
      console.error('Update password error:', error);
      return { error };
    }
  };

  const addExamType = async (examType: string) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      // Check if user already has this exam type
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('exam_type')
        .eq('id', user.id)
        .single();

      if (existingProfile?.exam_type === examType) {
        return { error: new Error('Vous avez déjà ce type d\'examen') };
      }

      // Update the profile with the new exam type
      const { error } = await updateProfile({ exam_type: examType as any });

      if (!error) {
        // Also update the subscription plan name
        const planMap = {
          'CM': 'Prépa CM',
          'CMS': 'Prépa CMS',
          'CS': 'Prépa CS'
        };
        
        const newPlanName = planMap[examType as keyof typeof planMap];
        if (newPlanName) {
          // Update subscription
          const { error: subError } = await supabase
            .from('subscriptions')
            .update({ plan_name: newPlanName })
            .eq('user_id', user.id)
            .eq('is_active', true);

          if (subError) {
            console.error('Error updating subscription:', subError);
          } else {
            await fetchSubscription();
          }
        }
      }

      return { error };
    } catch (error) {
      console.error('Add exam type error:', error);
      return { error };
    }
  };

  const replaceExamType = async (newExamType: string) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      // Update the profile with the new exam type
      const { error } = await updateProfile({ exam_type: newExamType as any });

      if (!error) {
        // Also update the subscription plan name
        const planMap = {
          'CM': 'Prépa CM',
          'CMS': 'Prépa CMS',
          'CS': 'Prépa CS'
        };
        
        const newPlanName = planMap[newExamType as keyof typeof planMap];
        if (newPlanName) {
          // Update subscription
          const { error: subError } = await supabase
            .from('subscriptions')
            .update({ plan_name: newPlanName })
            .eq('user_id', user.id)
            .eq('is_active', true);

          if (subError) {
            console.error('Error updating subscription:', subError);
          } else {
            await fetchSubscription();
          }
        }
      }

      return { error };
    } catch (error) {
      console.error('Replace exam type error:', error);
      return { error };
    }
  };

  const logUserAttempt = async (
    testType: string,
    category: string,
    subCategory?: string,
    testNumber?: number,
    score?: number
  ) => {
    if (!user) return false;

    try {
      return await UserAttemptService.saveUserAttempt(
        user.id,
        testType,
        category,
        subCategory,
        testNumber,
        score
      );
    } catch (error) {
      console.error('Error logging user attempt:', error);
      return false;
    }
  };

  const value: SupabaseAuthContextType = {
    user,
    session,
    profile,
    subscription,
    isLoading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    updateEmail,
    updatePassword,
    addExamType,
    replaceExamType,
    logUserAttempt,
    resetActivityTimer,
  };

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
};
