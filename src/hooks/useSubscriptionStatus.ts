import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';

export const useSubscriptionStatus = () => {
  const { 
    user, 
    subscription, 
    isSubscriptionActive, 
    subscriptionExpired, 
    isLoading 
  } = useSupabaseAuth();

  // Helper functions
  const hasActiveSubscription = () => {
    return user && isSubscriptionActive && !subscriptionExpired;
  };

  const isSubscriptionExpired = () => {
    return user && subscriptionExpired;
  };

  const canAccessFeature = (feature: 'quiz' | 'practice' | 'exams' | 'premium') => {
    // For testing expiration logic, check if subscription is active
    return hasActiveSubscription();
  };

  const getSubscriptionStatus = () => {
    if (!user) return 'not_logged_in';
    if (isLoading) return 'loading';
    if (subscriptionExpired) return 'expired';
    if (isSubscriptionActive) return 'active';
    return 'inactive';
  };

  const getPlanName = () => {
    return subscription?.plan_name || 'Aucun plan';
  };

  const getEndDate = () => {
    return subscription?.end_date || null;
  };

  const getDaysUntilExpiry = () => {
    if (!subscription?.end_date) return null;
    
    try {
      const endDate = new Date(subscription.end_date);
      const now = new Date();
      const diffTime = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return null;
    }
  };

  const isExpiringSoon = (daysThreshold: number = 7) => {
    const daysUntilExpiry = getDaysUntilExpiry();
    return daysUntilExpiry !== null && daysUntilExpiry <= daysThreshold && daysUntilExpiry > 0;
  };

  return {
    // Status
    hasActiveSubscription: hasActiveSubscription(),
    isSubscriptionExpired: isSubscriptionExpired(),
    isLoading,
    
    // Helper functions
    canAccessFeature,
    getSubscriptionStatus,
    getPlanName,
    getEndDate,
    getDaysUntilExpiry,
    isExpiringSoon,
    
    // Raw data
    subscription,
    user
  };
};
