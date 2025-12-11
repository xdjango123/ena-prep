import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile, Subscription, UserPlan, UserExamType } from '../lib/supabase';
import { ExamType, getExamTypeFromPlanName } from '../lib/examTypeUtils';
import { EmailLogService } from '../services/emailLogService';
import { UserAttemptService } from '../services/userAttemptService';

interface SupabaseAuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  subscription: Subscription | null;
  userSubscriptions: Subscription[];
  selectedExamType: 'CM' | 'CMS' | 'CS' | null;
  isSubscriptionActive: boolean;
  subscriptionExpired: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string, examTypes: string[], planNames: string[]) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  updateEmail: (newEmail: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  addExamType: (examType: string) => Promise<{ error: any }>;
  removeExamType: (examType: string) => Promise<{ error: any }>;
  setSelectedExamType: (examType: 'CM' | 'CMS' | 'CS') => Promise<{ error: any }>;
  renewAccountWithPlans: (examTypes: string[], planNames: string[]) => Promise<{ error: any }>;
  replaceExamType: (newExamType: string) => Promise<{ error: any }>;
  cancelSubscription: (examType: string) => Promise<{ error: any }>;
  logUserAttempt: (testType: string, category: string, subCategory?: string, testNumber?: number, score?: number) => Promise<boolean>;
  resetActivityTimer: () => void;
  refreshSubscriptionData: () => Promise<void>;
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
  const [userSubscriptions, setUserSubscriptions] = useState<Subscription[]>([]);
  const [selectedExamType, setSelectedExamTypeState] = useState<'CM' | 'CMS' | 'CS' | null>(null);
  const [isSubscriptionActive, setIsSubscriptionActive] = useState(false);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profileCreated, setProfileCreated] = useState(false);
  
  // Auto-logout functionality
  const activityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds


  // Helper function to check if subscription is active and not expired
  const checkSubscriptionStatus = (subscription: Subscription | null): { isActive: boolean; isExpired: boolean } => {
    if (!subscription) {
      return { isActive: false, isExpired: true };
    }

    // Check if subscription is marked as active
    if (!subscription.is_active) {
      return { isActive: false, isExpired: true };
    }

    // Check expiration date
    if (subscription.end_date) {
      const now = new Date();
      const endDate = new Date(subscription.end_date);
      
      // Enable expiration checking for testing
      if (endDate < now) {
        return { isActive: false, isExpired: true };
      }
    }

    return { isActive: true, isExpired: false };
  };
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

  // Force refresh subscription data
  const refreshSubscriptionData = async () => {
    if (!user) return;
    
    console.log('🔄 Refreshing subscription data...');
    await fetchSubscription();
    await fetchUserSubscriptions();
    console.log('✅ Subscription data refreshed');
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
      fetchUserSubscriptions();
      // Only create profile and subscription if they don't exist (first time user)
      if (!profileCreated) {
        createUserProfileIfNeeded();
      }
    } else {
      setProfile(null);
      setSubscription(null);
      setUserSubscriptions([]);
      setSelectedExamTypeState(null);
      setIsSubscriptionActive(false);
      setSubscriptionExpired(false);
      setProfileCreated(false);
    }
  }, [user, profileCreated]);

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
      // Get ALL subscriptions for this user (including expired ones)
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('end_date', { ascending: false });

      if (error) {
        console.error('Error fetching subscription:', error);
        setSubscription(null);
        setIsSubscriptionActive(false);
        setSubscriptionExpired(true);
      } else if (data && data.length > 0) {
        const now = new Date();
        const toTimestamp = (value?: string | null) => {
          if (!value) return Number.MAX_SAFE_INTEGER;
          const time = new Date(value).getTime();
          return Number.isNaN(time) ? Number.MIN_SAFE_INTEGER : time;
        };

        const latestActive = data.reduce<Subscription | null>((latest, current) => {
          if (!current.is_active) return latest;
          if (current.end_date) {
            const endDate = new Date(current.end_date);
            if (Number.isNaN(endDate.getTime()) || endDate < now) {
              return latest;
            }
          }

          if (!latest) {
            return current;
          }

          return toTimestamp(current.end_date) > toTimestamp(latest.end_date) ? current : latest;
        }, null);

        const fallbackSubscription = data[0];
        const subscriptionToUse = latestActive ?? fallbackSubscription ?? null;

        setSubscription(subscriptionToUse);

        if (subscriptionToUse) {
          const { isActive, isExpired } = checkSubscriptionStatus(subscriptionToUse);
          setIsSubscriptionActive(isActive);
          setSubscriptionExpired(isExpired);

          console.log('Subscription status:', {
            plan: subscriptionToUse.plan_name,
            endDate: subscriptionToUse.end_date,
            isActive,
            isExpired,
            isActiveInDB: subscriptionToUse.is_active,
            selectedSource: latestActive ? 'active' : 'fallback'
          });
        } else {
          setIsSubscriptionActive(false);
          setSubscriptionExpired(true);
        }
      } else {
        // No subscriptions found
        setSubscription(null);
        setIsSubscriptionActive(false);
        setSubscriptionExpired(true);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setSubscription(null);
      setIsSubscriptionActive(false);
      setSubscriptionExpired(true);
    }
  };

  const fetchUserSubscriptions = async () => {
    if (!user) return;

    try {
      // Get subscriptions for this user (including expired ones)
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('end_date', { ascending: false });

      if (error) {
        console.error('Error fetching subscriptions:', error);
        setUserSubscriptions([]);
      } else {
        setUserSubscriptions(data || []);
        console.log(`📋 Loaded ${(data || []).length} subscriptions for user`);
        
        // Auto-select first available exam type if none is selected
        if (!selectedExamType && data && data.length > 0) {
          const activeSubscriptions = data.filter(sub => sub.is_active);
          if (activeSubscriptions.length > 0) {
            const firstSubscription = activeSubscriptions[0];
            const examType = getExamTypeFromPlanName(firstSubscription.plan_name);

            if (!examType) {
              console.error('❌ Could not determine exam type from plan name:', firstSubscription.plan_name);
              return;
            }

            console.log(`🔄 Auto-selecting first available exam type: ${examType} (selectedExamType was null)`);
            setSelectedExamTypeState(examType);
          }
        } else {
          console.log(`ℹ️ fetchUserSubscriptions: selectedExamType already set to ${selectedExamType}, not auto-selecting`);
        }
      }
    } catch (error) {
      console.error('Error fetching user subscriptions:', error);
      setUserSubscriptions([]);
    }
  };

  const createUserProfileIfNeeded = async () => {
    if (!user || profileCreated) return;

    try {
      console.log('🔍 Checking if profile and subscriptions need to be created...');
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
      const examTypes = userMetadata?.exam_types || userData?.examTypes || ['CM'];
      const planNames = userMetadata?.plan_names || userData?.planNames || ['Prépa CM'];
      
      // ✅ Check if user already has profile/subscriptions before validation
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      const { data: existingSubscriptions } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id);

      // If user already has profile/subscriptions, skip creation
      if (existingProfile || (existingSubscriptions && existingSubscriptions.length > 0)) {
        console.log('✅ User already has profile/subscriptions, skipping creation');
        setProfileCreated(true);
        return;
      }
      
      // ✅ Validate that we have exam types and plan names (only for new users)
      if (!examTypes || examTypes.length === 0) {
        console.error('❌ No exam types found in metadata or localStorage, using defaults');
        // Don't throw error, use defaults instead
      }
      if (!planNames || planNames.length === 0) {
        console.error('❌ No plan names found in metadata or localStorage, using defaults');
        // Don't throw error, use defaults instead
      }
      
      console.log('✅ Found exam types:', examTypes, 'and plan names:', planNames);
      
      // Ensure plan names match exam types (use "Prépa" not "Préparation")
      const expectedPlanNames = examTypes.map((examType: string) => 
        examType === 'CM' ? 'Prépa CM' : 
        examType === 'CMS' ? 'Prépa CMS' : 
        examType === 'CS' ? 'Prépa CS' : 'Prépa CM'
      );
      
      // Use the first exam type as the primary one for backward compatibility
      const primaryExamType = examTypes[0]; // ✅ No fallback - should be validated above
      const primaryPlanName = expectedPlanNames[0]; // ✅ No fallback - should be validated above

      console.log('Creating profile with data:', { firstName, lastName, examTypes, planNames });
      console.log('User metadata:', userMetadata);
      console.log('LocalStorage data:', userData);

      // Create profile (we already checked it doesn't exist above)
      console.log('📝 Creating new profile...');
      // Calculate expiration date (6 months from now)
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + 6);

      // Create profile using the collected data
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          first_name: firstName,
          last_name: lastName,
          plan_name: primaryExamType, // Use plan_name instead of exam_type
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

      // Create subscriptions for all plans (we already checked none exist above)
      console.log('📝 Creating subscriptions...');
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      console.log('Creating subscriptions for plans:', planNames);
      
      // Create subscriptions for each plan
      for (let i = 0; i < planNames.length; i++) {
        const planName = planNames[i];
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
          console.error(`Error creating subscription for ${planName}:`, subscriptionError);
        } else {
          console.log(`Subscription created successfully for ${planName}`);
        }
      }
      
      // Fetch subscriptions after creating all
      await fetchSubscription();
      setProfileCreated(true);
      console.log('✅ Profile and subscriptions created successfully');
    } catch (error) {
      console.error('❌ Error in createUserProfileIfNeeded:', error);
      // ✅ Set to true to prevent infinite retry loop
      // Log the error but don't retry indefinitely
      setProfileCreated(true);
      
      // Optionally create a minimal profile for legacy users
      try {
        console.log('🔄 Attempting to create minimal profile for legacy user...');
        const userMetadata = user.user_metadata;
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            first_name: userMetadata?.first_name || 'User',
            last_name: userMetadata?.last_name || '',
            plan_name: 'CM',
            email: user.email,
            is_owner: false,
          });

        if (!profileError) {
          console.log('✅ Minimal profile created for legacy user');
          await fetchProfile();
        }
      } catch (minimalProfileError) {
        console.error('❌ Failed to create minimal profile:', minimalProfileError);
      }
    }
  };

  const signUp = async (
    email: string, 
    password: string, 
    firstName: string, 
    lastName: string, 
    examTypes: string[],
    planNames: string[]
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
            exam_types: examTypes,
            plan_names: planNames,
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
          examTypes,
          planNames
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
      setIsSubscriptionActive(false);
      setSubscriptionExpired(false);
      
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

  const resetPassword = async (email: string) => {
    try {
      // Ensure no double slashes if origin ends with /
      const origin = window.location.origin.replace(/\/$/, '');
      const redirectUrl = `${origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error('❌ Reset password error:', error);
      }

      return { error };
    } catch (error) {
      console.error('Reset password error:', error);
      return { error };
    }
  };


  const replaceExamType = async (newExamType: string) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      // Deactivate all current plans
      const { error: deactivateError } = await supabase
        .from('subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (deactivateError) {
        console.error('Error deactivating plans:', deactivateError);
      }

      // Create new plan
      const planMap = {
        'CM': 'Prépa CM',
        'CMS': 'Prépa CMS',
        'CS': 'Prépa CS'
      };
      
      const planName = planMap[newExamType as keyof typeof planMap];
      if (!planName) {
        return { error: new Error('Type d\'examen invalide') };
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      const { error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_name: planName,
          exam_type: newExamType,
          is_active: true,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        });

      if (!error) {
        // Update profile with new plan name
        await updateProfile({ 
          plan_name: newExamType as any
        });
        await fetchUserSubscriptions();
      }

      return { error };
    } catch (error) {
      console.error('Replace exam type error:', error);
      return { error };
    }
  };

  const switchPlan = async (planId: string) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      // Find the subscription to switch to
      const subscription = userSubscriptions.find(sub => sub.id === planId);
      if (!subscription) {
        return { error: new Error('Plan non trouvé') };
      }

      // Extract exam type from plan name
      const examType = getExamTypeFromPlanName(subscription.plan_name, 'CM');

      // Update profile with selected plan
      const { error } = await updateProfile({ 
        plan_name: examType as any
      });

      if (!error) {
        setSelectedExamTypeState(examType as ExamType);
        await fetchUserSubscriptions();
      }

      return { error };
    } catch (error) {
      console.error('Switch plan error:', error);
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

  // Get available exam types from user's subscriptions
  const getAvailableExamTypes = (): ExamType[] => {
    const examTypes: ExamType[] = [];

    userSubscriptions.forEach(sub => {
      if (sub.is_active) {
        const examType = getExamTypeFromPlanName(sub.plan_name);

        if (examType && !examTypes.includes(examType)) {
          examTypes.push(examType);
        }
      }
    });
    
    return examTypes;
  };

  // Add exam type to user (creates subscription)
  const addExamType = async (examType: string) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const planName = examType === 'CM' ? 'Prépa CM' : 
                      examType === 'CMS' ? 'Prépa CMS' : 
                      examType === 'CS' ? 'Prépa CS' : 'Prépa CM';

      // Check if user already has this exam type (check ALL subscriptions, not just active ones)
      const { data: existingSubscriptions } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('plan_name', planName);

      if (existingSubscriptions && existingSubscriptions.length > 0) {
        // Check if any existing subscription is still active
        const activeSubscription = existingSubscriptions.find(sub => sub.is_active);
        if (activeSubscription) {
          return { error: new Error('Vous avez déjà ce type d\'examen') };
        }
        
        // If there are inactive subscriptions, reactivate the most recent one instead of creating a new one
        const mostRecentSubscription = existingSubscriptions.sort((a, b) => 
          new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
        )[0];
        
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 6); // 6 months from now
        
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            is_active: true,
          })
          .eq('id', mostRecentSubscription.id);
        
        if (!updateError) {
          await fetchSubscription();
          await fetchUserSubscriptions();
        }
        
        return { error: updateError };
      }

      // Create new subscription only if none exists
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 6); // 6 months from now

      const { error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_name: planName,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          is_active: true,
        });

      if (!error) {
        await fetchSubscription();
        await fetchUserSubscriptions();
      }

      return { error };
    } catch (error) {
      console.error('Add exam type error:', error);
      return { error };
    }
  };

  // Remove exam type from user (deactivates subscription)
  const removeExamType = async (examType: string) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const planName = examType === 'CM' ? 'Prépa CM' : 
                      examType === 'CMS' ? 'Prépa CMS' : 
                      examType === 'CS' ? 'Prépa CS' : 'Prépa CM';

      const { error } = await supabase
        .from('subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('plan_name', planName)
        .eq('is_active', true);

      if (!error) {
        await fetchSubscription();
        await fetchUserSubscriptions();
        
        // If we removed the currently selected exam type, select the first available one
        if (selectedExamType === examType) {
          const remainingTypes = getAvailableExamTypes().filter(et => et !== examType);
          if (remainingTypes.length > 0) {
            await setSelectedExamType(remainingTypes[0]);
          } else {
            setSelectedExamTypeState(null);
          }
        }
      }

      return { error };
    } catch (error) {
      console.error('Remove exam type error:', error);
      return { error };
    }
  };

  // Cancel subscription (alias for removeExamType for clarity)
  const cancelSubscription = async (examType: string) => {
    return await removeExamType(examType);
  };

  // Set selected exam type - IMPROVED IMPLEMENTATION
  const setSelectedExamType = async (examType: 'CM' | 'CMS' | 'CS') => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      console.log(`🔄 Switching to exam type: ${examType}`);
      
      // 1. Check if user has an active subscription for this exam type
      const targetPlanName = examType === 'CM' ? 'Prépa CM' : 
                            examType === 'CMS' ? 'Prépa CMS' : 
                            examType === 'CS' ? 'Prépa CS' : 'Prépa CM';
      
      const existingSubscription = userSubscriptions.find(sub => 
        sub.plan_name === targetPlanName && sub.is_active
      );
      
      if (!existingSubscription) {
        console.error(`❌ No active subscription found for ${examType} (${targetPlanName})`);
        return { error: new Error(`No active subscription found for ${examType}`) };
      }
      
      console.log(`✅ Found active subscription for ${examType}:`, existingSubscription.id);
      
      // 2. Update the local state immediately
      setSelectedExamTypeState(examType);
      
      // 3. Update the profile with the new plan name (for tracking)
      await updateProfile({ plan_name: examType });
      
      console.log(`✅ Switched to exam type: ${examType}`);
      
      // 4. Refresh data to ensure consistency
      await fetchUserSubscriptions();

      return { error: null };
    } catch (error) {
      console.error('Set selected exam type error:', error);
      return { error };
    }
  };

  // Extend subscription end date for renewal
  const extendSubscriptionEndDate = async (userId: string, months: number = 6) => {
    try {
      // First, get all expired subscriptions for this user
      const { data: expiredSubs } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', false);

      if (expiredSubs && expiredSubs.length > 0) {
        // Extend each expired subscription
        for (const sub of expiredSubs) {
          const newEndDate = new Date();
          newEndDate.setMonth(newEndDate.getMonth() + months);
          
          await supabase
            .from('subscriptions')
            .update({
              end_date: newEndDate.toISOString(),
              is_active: true
            })
            .eq('id', sub.id);
        }
      }

      return { error: null };
    } catch (error) {
      console.error('Error extending subscription:', error);
      return { error };
    }
  };

  // Create subscriptions for renewal
  const createSubscriptionsForRenewal = async (userId: string, planNames: string[]) => {
    try {
      // Check which plans already exist
      const { data: existingSubs } = await supabase
        .from('subscriptions')
        .select('plan_name')
        .eq('user_id', userId);

      const existingPlanNames = existingSubs?.map(sub => sub.plan_name) || [];
      const newPlanNames = planNames.filter(planName => !existingPlanNames.includes(planName));

      if (newPlanNames.length === 0) {
        console.log('All plans already exist, skipping creation');
        return { error: null };
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 6); // 6 months from now

      const subscriptions = newPlanNames.map(planName => ({
        user_id: userId,
        plan_name: planName,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        is_active: true,
      }));

      console.log(`Creating ${subscriptions.length} new subscriptions:`, newPlanNames);

      const { error } = await supabase
        .from('subscriptions')
        .insert(subscriptions);

      return { error };
    } catch (error) {
      console.error('Error creating renewal subscriptions:', error);
      return { error };
    }
  };

  // Main account renewal function
  const renewAccountWithPlans = async (examTypes: string[], planNames: string[]) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      console.log('Renewing account with plans:', planNames);
      
      // 1. Get all existing subscriptions for this user
      const { data: existingSubscriptions } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id);

      if (existingSubscriptions && existingSubscriptions.length > 0) {
        // 2a. Deactivate ALL existing subscriptions first
        await supabase
          .from('subscriptions')
          .update({ is_active: false })
          .eq('user_id', user.id);

        // 2b. Activate only the selected plans
        for (const planName of planNames) {
          const existingSub = existingSubscriptions.find(sub => sub.plan_name === planName);
          
          if (existingSub) {
            // Extend existing subscription
            const newEndDate = new Date();
            newEndDate.setMonth(newEndDate.getMonth() + 6);
            
            await supabase
              .from('subscriptions')
              .update({
                end_date: newEndDate.toISOString(),
                is_active: true
              })
              .eq('id', existingSub.id);
          } else {
            // Create new subscription for this plan
            await createSubscriptionsForRenewal(user.id, [planName]);
          }
        }
      } else {
        // 2c. Create all subscriptions if none exist
        await createSubscriptionsForRenewal(user.id, planNames);
      }

      // 3. Set selected exam type intelligently
      if (examTypes.length > 0) {
        // If user has multiple exam types, prefer the highest level (CS > CMS > CM)
        let selectedType: 'CM' | 'CMS' | 'CS';
        if (examTypes.includes('CS')) {
          selectedType = 'CS';
        } else if (examTypes.includes('CMS')) {
          selectedType = 'CMS';
        } else {
          selectedType = 'CM';
        }
        console.log('🔄 Renewal: Setting selectedExamType from', selectedExamType, 'to', selectedType, 'based on examTypes:', examTypes);
        setSelectedExamTypeState(selectedType);
        console.log('✅ Renewal: selectedExamType set to:', selectedType);
      }

      // 4. Refresh data
      await fetchSubscription();
      await fetchUserSubscriptions();

      console.log('Account renewed successfully with plans:', planNames);
      return { error: null };
    } catch (error) {
      console.error('Error renewing account:', error);
      return { error };
    }
  };

  const value: SupabaseAuthContextType = {
    user,
    session,
    profile,
    subscription,
    userSubscriptions,
    selectedExamType,
    isSubscriptionActive,
    subscriptionExpired,
    isLoading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    updateEmail,
    updatePassword,
    resetPassword,
    addExamType,
    removeExamType,
    setSelectedExamType,
    renewAccountWithPlans,
    replaceExamType,
    cancelSubscription,
    logUserAttempt,
    resetActivityTimer,
    refreshSubscriptionData,
  };

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
};
