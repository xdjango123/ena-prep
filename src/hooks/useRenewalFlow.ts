import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';

export interface RenewalState {
  returnTo: string;
  intent: string;
  currentPlan?: {
    name: string;
    cycle: string;
    price: string;
  };
}

export const useRenewalFlow = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { renewAccountWithPlans, userSubscriptions } = useSupabaseAuth();
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [renewalState, setRenewalState] = useState<RenewalState | null>(null);

  // Get current plan from user subscriptions (not hardcoded) - MOVED FIRST
  const getCurrentPlan = useCallback(() => {
    if (!userSubscriptions || userSubscriptions.length === 0) {
      return { name: 'Prépa CM', cycle: 'Mensuel', price: 'Gratuit' };
    }

    // Get the most recent subscription (active or expired)
    const sortedSubscriptions = [...userSubscriptions].sort((a, b) => 
      new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
    );
    
    const currentSubscription = sortedSubscriptions[0];
    return {
      name: currentSubscription.plan_name,
      cycle: 'Mensuel',
      price: 'Gratuit'
    };
  }, [userSubscriptions]);

  // Save current route and intent for return after renewal - MOVED AFTER getCurrentPlan
  const saveReturnContext = useCallback((intent?: string) => {
    const returnTo = location.pathname + location.search;
    const renewalIntent = intent || 'renewal';
    
    setRenewalState({
      returnTo,
      intent: renewalIntent,
      currentPlan: getCurrentPlan()
    });
  }, [location, getCurrentPlan]);

  // Open renewal modal with context
  const openRenewalModal = useCallback((intent?: string) => {
    saveReturnContext(intent);
    setIsRenewalModalOpen(true);
  }, [saveReturnContext]);

  // Close renewal modal
  const closeRenewalModal = useCallback(() => {
    setIsRenewalModalOpen(false);
    setRenewalState(null);
  }, []);

  // Handle renewal completion
  const handleRenewalComplete = useCallback(async (
    examTypes: string[],
    planNames: string[]
  ) => {
    try {
      const { error } = await renewAccountWithPlans(examTypes, planNames);
      
      if (!error) {
        // Show success toast
        console.log('🎉 Renewal successful!');
        
        // Close modal
        closeRenewalModal();
        
        // Return to original location
        if (renewalState?.returnTo) {
          navigate(renewalState.returnTo);
        } else {
          navigate('/dashboard');
        }
        
        return { success: true };
      } else {
        console.error('Renewal failed:', error);
        return { success: false, error };
      }
    } catch (error) {
      console.error('Renewal error:', error);
      return { success: false, error };
    }
  }, [renewAccountWithPlans, closeRenewalModal, renewalState, navigate]);

  // Handle renewal cancellation
  const handleRenewalCancel = useCallback(() => {
    closeRenewalModal();
    // Stay on current page, do nothing
  }, [closeRenewalModal]);

  // Handle back to home
  const handleBackToHome = useCallback(() => {
    closeRenewalModal();
    navigate('/');
  }, [closeRenewalModal, navigate]);

  return {
    isRenewalModalOpen,
    renewalState,
    openRenewalModal,
    closeRenewalModal,
    handleRenewalComplete,
    handleRenewalCancel,
    handleBackToHome,
    getCurrentPlan
  };
};
