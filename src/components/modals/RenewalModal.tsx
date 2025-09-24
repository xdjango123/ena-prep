import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ArrowRight } from 'lucide-react';
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext';
import { useNavigate } from 'react-router-dom';

interface RenewalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: {
    name: string;
    cycle: string;
    price: string;
  };
  returnTo?: string;
  intent?: string;
}

type RenewalStep = 'selection' | 'plan-selection' | 'confirmation' | 'success';

const RenewalModal: React.FC<RenewalModalProps> = ({
  isOpen,
  onClose,
  currentPlan,
  returnTo,
  intent
}) => {
  const { renewAccountWithPlans, userSubscriptions } = useSupabaseAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<RenewalStep>('selection');
  const [selectedAction, setSelectedAction] = useState<'continue' | 'change'>('continue');
  const [selectedPlan, setSelectedPlan] = useState(currentPlan);
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // All available plans (hardcoded to match subscription plan_name values)
  const allAvailablePlans = useMemo(() => [
    { name: 'Prépa CM', cycle: 'Mensuel', price: 'Gratuit', examType: 'CM' },
    { name: 'Prépa CMS', cycle: 'Mensuel', price: 'Gratuit', examType: 'CMS' },
    { name: 'Prépa CS', cycle: 'Mensuel', price: 'Gratuit', examType: 'CS' }
  ], []);

  // Get available plans from user subscriptions (most recent based on end_date)
  const availablePlans = useMemo(() => {
    if (!userSubscriptions || userSubscriptions.length === 0) {
      return allAvailablePlans;
    }

    // Sort subscriptions by end_date (most recent first)
    const sortedSubscriptions = [...userSubscriptions].sort((a, b) => 
      new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
    );

    // Get the most recent end_date
    const mostRecentEndDate = sortedSubscriptions[0]?.end_date;

    // Filter subscriptions that have the same most recent end_date
    const latestSubscriptions = sortedSubscriptions.filter(sub => 
      sub.end_date === mostRecentEndDate
    );

    // Extract unique plans from the latest subscriptions only
    const uniquePlans = latestSubscriptions.reduce((acc, subscription) => {
      const planName = subscription.plan_name;
      if (!acc.find(p => p.name === planName)) {
        acc.push({
          name: planName,
          cycle: 'Mensuel', // Default cycle
          price: 'Gratuit', // Default price
          examType: planName.includes('CMS') ? 'CMS' : 
                   planName.includes('CS') ? 'CS' : 'CM'
        });
      }
      return acc;
    }, [] as any[]);

    console.log('Latest subscriptions for user:', {
      mostRecentEndDate,
      latestSubscriptions: latestSubscriptions.map(s => ({ plan: s.plan_name, endDate: s.end_date })),
      availablePlans: uniquePlans.map(p => p.name)
    });

    return uniquePlans;
  }, [userSubscriptions, allAvailablePlans]);

  const handleActionSelect = (action: 'continue' | 'change') => {
    setSelectedAction(action);
    if (action === 'continue') {
      setCurrentStep('confirmation');
    } else {
      // For change action, go to plan selection step
      setCurrentStep('plan-selection');
    }
  };

  const handlePlanToggle = (planName: string) => {
    setSelectedPlans(prev => 
      prev.includes(planName) 
        ? prev.filter(p => p !== planName)
        : [...prev, planName]
    );
  };

  const handlePlanSelectionComplete = () => {
    if (selectedPlans.length === 0) {
      alert('Veuillez sélectionner au moins un plan');
      return;
    }
    setCurrentStep('confirmation');
  };

  const handleConfirmRenewal = async () => {
    setIsLoading(true);
    try {
      let planNames: string[] = [];
      let examTypes: string[] = [];

      if (selectedAction === 'continue') {
        // Continue with current plan
        planNames = [currentPlan?.name || 'Prépa CM'];
        examTypes = [currentPlan?.name?.includes('CMS') ? 'CMS' : 
                    currentPlan?.name?.includes('CS') ? 'CS' : 'CM'];
      } else if (selectedAction === 'change') {
        // Change plan (use selected plans)
        planNames = selectedPlans.length > 0 ? selectedPlans : [currentPlan?.name || 'Prépa CM'];
        examTypes = planNames.map(planName => 
          planName.includes('CMS') ? 'CMS' : 
          planName.includes('CS') ? 'CS' : 'CM'
        );
      }

      const { error } = await renewAccountWithPlans(examTypes, planNames);
      
      if (!error) {
        setCurrentStep('success');
      } else {
        console.error('Renewal error:', error);
        // Handle error - could show error message
      }
    } catch (error) {
      console.error('Renewal error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = () => {
    onClose();
    if (returnTo) {
      navigate(returnTo);
    } else {
      navigate('/dashboard');
    }
  };

  const handleBackToHome = () => {
    onClose();
    navigate('/dashboard');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              Abonnement expiré
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {currentStep === 'selection' && (
              <SelectionStep 
                currentPlan={currentPlan}
                availablePlans={availablePlans}
                onActionSelect={handleActionSelect}
                onBackToHome={handleBackToHome}
              />
            )}

            {currentStep === 'plan-selection' && (
              <PlanSelectionStep
                allAvailablePlans={allAvailablePlans}
                selectedPlans={selectedPlans}
                onPlanToggle={handlePlanToggle}
                onComplete={handlePlanSelectionComplete}
                onBack={() => setCurrentStep('selection')}
              />
            )}

            {currentStep === 'confirmation' && (
              <ConfirmationStep
                selectedAction={selectedAction}
                currentPlan={currentPlan}
                selectedPlan={selectedPlan}
                selectedPlans={selectedPlans}
                allAvailablePlans={allAvailablePlans}
                onPlanSelect={setSelectedPlan}
                onConfirm={handleConfirmRenewal}
                onBack={() => setCurrentStep(selectedAction === 'change' ? 'plan-selection' : 'selection')}
                isLoading={isLoading}
              />
            )}

            {currentStep === 'success' && (
              <SuccessStep onContinue={handleSuccess} />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Selection Step Component
const SelectionStep: React.FC<{
  currentPlan?: any;
  availablePlans: any[];
  onActionSelect: (action: 'continue' | 'change') => void;
  onBackToHome: () => void;
}> = ({ currentPlan, availablePlans, onActionSelect, onBackToHome }) => (
  <div className="space-y-6">
    {/* Available Plans Info */}
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-900 mb-3">Vos plans disponibles</div>
      {availablePlans.map((plan, index) => (
        <div key={index} className={`bg-gray-50 rounded-lg p-4 ${currentPlan?.name === plan.name ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-gray-900">{plan.name}</div>
              <div className="text-sm text-gray-600">{plan.cycle} • {plan.price}</div>
            </div>
            {currentPlan?.name === plan.name && (
              <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                Actuel
              </div>
            )}
          </div>
        </div>
      ))}
    </div>

    {/* Message */}
    <div className="text-center space-y-4">
      <div className="text-gray-600">
        Pour continuer à accéder à tous les contenus et fonctionnalités de PrepaENA, 
        veuillez renouveler votre abonnement.
      </div>
    </div>

    {/* Primary Actions */}
    <div className="space-y-3">
      <button
        onClick={() => onActionSelect('continue')}
        className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-3 px-4 rounded-lg font-medium hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 shadow-md"
      >
        Continuer avec ce plan
      </button>
      
      <button
        onClick={() => onActionSelect('change')}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        Changer de plan
      </button>
    </div>

    {/* Secondary Actions */}
    <div className="flex space-x-3">
      <button
        onClick={onBackToHome}
        className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
      >
        Retour à l'accueil
      </button>
      <button className="flex-1 text-blue-600 py-3 px-4 rounded-lg font-medium hover:bg-blue-50 transition-colors">
        Besoin d'aide ?
      </button>
    </div>
  </div>
);

// Plan Selection Step Component
const PlanSelectionStep: React.FC<{
  allAvailablePlans: any[];
  selectedPlans: string[];
  onPlanToggle: (planName: string) => void;
  onComplete: () => void;
  onBack: () => void;
}> = ({ allAvailablePlans, selectedPlans, onPlanToggle, onComplete, onBack }) => (
  <div className="space-y-6">
    <div className="text-center">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Sélectionner vos plans
      </h3>
      <p className="text-gray-600">
        Choisissez un ou plusieurs plans pour votre abonnement
      </p>
    </div>

    {/* Plan Selection */}
    <div className="space-y-3">
      {allAvailablePlans.map((plan, index) => (
        <label
          key={index}
          className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
            selectedPlans.includes(plan.name)
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <input
            type="checkbox"
            checked={selectedPlans.includes(plan.name)}
            onChange={() => onPlanToggle(plan.name)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <div className="ml-3 flex-1">
            <div className="font-medium text-gray-900">{plan.name}</div>
            <div className="text-sm text-gray-600">{plan.cycle} • {plan.price}</div>
          </div>
        </label>
      ))}
    </div>

    {/* Actions */}
    <div className="space-y-3">
      <button
        onClick={onComplete}
        disabled={selectedPlans.length === 0}
        className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-3 px-4 rounded-lg font-medium hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continuer ({selectedPlans.length} plan{selectedPlans.length > 1 ? 's' : ''} sélectionné{selectedPlans.length > 1 ? 's' : ''})
      </button>
      
      <button
        onClick={onBack}
        className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
      >
        Retour
      </button>
    </div>
  </div>
);

// Confirmation Step Component
const ConfirmationStep: React.FC<{
  selectedAction: 'continue' | 'change';
  currentPlan?: any;
  selectedPlan?: any;
  selectedPlans: string[];
  allAvailablePlans: any[];
  onPlanSelect: (plan: any) => void;
  onConfirm: () => void;
  onBack: () => void;
  isLoading: boolean;
}> = ({ selectedAction, currentPlan, selectedPlan, selectedPlans, allAvailablePlans, onPlanSelect, onConfirm, onBack, isLoading }) => {
  // Calculate combined pricing for multiple plans
  const getCombinedPricing = () => {
    if (selectedAction === 'continue') {
      return {
        plans: [currentPlan?.name || 'Prépa CM'],
        cycle: currentPlan?.cycle || 'Mensuel',
        price: currentPlan?.price || 'Gratuit'
      };
    } else {
      const selectedPlanDetails = selectedPlans.map(planName => 
        allAvailablePlans.find(p => p.name === planName)
      ).filter(Boolean);
      
      return {
        plans: selectedPlans,
        cycle: selectedPlanDetails[0]?.cycle || 'Mensuel',
        price: selectedPlanDetails.length > 1 ? 'Gratuit' : (selectedPlanDetails[0]?.price || 'Gratuit')
      };
    }
  };

  const combinedPricing = getCombinedPricing();

  return (
  <div className="space-y-6">
    <div className="text-center">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {selectedAction === 'continue' && 'Continuer avec ce plan'}
        {selectedAction === 'change' && 'Confirmer votre sélection'}
      </h3>
      <p className="text-gray-600">
        {selectedAction === 'continue' && 'Vous allez continuer avec votre plan actuel'}
        {selectedAction === 'change' && 'Vérifiez les détails de votre sélection'}
      </p>
    </div>

    {/* Summary */}
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="text-sm font-medium text-gray-900 mb-3">Résumé :</div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Plan{combinedPricing.plans.length > 1 ? 's' : ''} :</span>
          <span className="font-medium text-right">
            {combinedPricing.plans.join(', ')}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Cycle :</span>
          <span>{combinedPricing.cycle}</span>
        </div>
        <div className="flex justify-between">
          <span>Prix :</span>
          <span className="font-medium">{combinedPricing.price}</span>
        </div>
        <div className="flex justify-between">
          <span>Prochaine échéance :</span>
          <span>{new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')}</span>
        </div>
      </div>
    </div>

    {/* Actions */}
    <div className="flex space-x-3">
      <button
        onClick={onBack}
        className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
      >
        Annuler
      </button>
      <button
        onClick={onConfirm}
        disabled={isLoading}
        className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-3 px-4 rounded-lg font-medium hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 shadow-md disabled:opacity-50"
      >
        {isLoading ? 'Confirmation...' : 'Confirmer la relance'}
      </button>
    </div>
  </div>
  );
};

// Success Step Component
const SuccessStep: React.FC<{
  onContinue: () => void;
}> = ({ onContinue }) => (
  <div className="text-center space-y-6">
    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
      <Check className="w-8 h-8 text-green-600" />
    </div>
    
    <div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        C'est reparti 🎉
      </h3>
      <p className="text-gray-600">
        Accès réactivé. Vous pouvez maintenant continuer votre préparation.
      </p>
    </div>

    <button
      onClick={onContinue}
      className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-3 px-4 rounded-lg font-medium hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 shadow-md"
    >
      Continuer
    </button>
  </div>
);

export default RenewalModal;
