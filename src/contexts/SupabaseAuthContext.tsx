import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  logUserAttempt: (testType: string, category: string, subCategory?: string, testNumber?: number, score?: number) => Promise<boolean>;
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
        // Create profile using the collected data
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            'First Name': firstName,
            'Last Name': lastName,
            exam_type: examType,
            email: user.email,
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

      return { error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
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
    logUserAttempt,
  };

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}; 