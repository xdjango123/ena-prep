import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Plus, ArrowRight } from 'lucide-react';
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext';

interface PlanSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentExamTypes?: string[];
  userSubscriptions?: any[];
  onPlansAdded?: (planNames: string[]) => void;
  onAccountRenewed?: (planNames: string[]) => void;
  isAccountExpired?: boolean;
}

interface Plan {
  id: string;
  name: string;
  examType: 'CM' | 'CMS' | 'CS';
  description: string;
  features: string[];
  price: string;
  isPopular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'cm',
    name: 'Préparation CM',
    examType: 'CM',
    description: 'Préparation complète pour le Concours CM',
    features: [
      'Questions CM spécialisées',
      'Tests pratiques CM',
      'Suivi de progression',
      'Support 24/7'
    ],
    price: 'Gratuit',
    isPopular: false
  },
  {
    id: 'cms',
    name: 'Préparation CMS',
    examType: 'CMS',
    description: 'Préparation complète pour le Concours CMS',
    features: [
      'Questions CMS spécialisées',
      'Tests pratiques CMS',
      'Suivi de progression',
      'Support 24/7'
    ],
    price: 'Gratuit',
    isPopular: true
  },
  {
    id: 'cs',
    name: 'Préparation CS',
    examType: 'CS',
    description: 'Préparation complète pour le Concours CS',
    features: [
      'Questions CS spécialisées',
      'Tests pratiques CS',
      'Suivi de progression',
      'Support 24/7'
    ],
    price: 'Gratuit',
    isPopular: false
  }
];

const PlanSelectionModal: React.FC<PlanSelectionModalProps> = ({
  isOpen,
  onClose,
  currentExamTypes = [],
  userSubscriptions = [],
  onPlansAdded,
  onAccountRenewed,
  isAccountExpired = false
}) => {
  const { addExamType, replaceExamType, renewAccountWithPlans, cancelSubscription } = useSupabaseAuth();
  const [selectedPlans, setSelectedPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionType, setActionType] = useState<'add' | 'replace' | 'cancel'>('add');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Check if user has all 3 exam types
  const userExamTypes = userSubscriptions
    .filter(sub => sub.is_active)
    .map(sub => {
      if (sub.plan_name.includes('CM')) return 'CM';
      if (sub.plan_name.includes('CMS')) return 'CMS';
      if (sub.plan_name.includes('CS')) return 'CS';
      return null;
    })
    .filter((examType, index, arr) => examType && arr.indexOf(examType) === index);

  const hasAllExamTypes = userExamTypes.length >= 3;
  const availablePlans = hasAllExamTypes && !isAccountExpired ? [] : PLANS;

  // Set default action type based on user's exam types
  React.useEffect(() => {
    if (hasAllExamTypes) {
      setActionType('replace');
    } else {
      setActionType('add');
    }
  }, [hasAllExamTypes]);

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlans(prev => {
      const isSelected = prev.some(p => p.id === plan.id);
      if (isSelected) {
        return prev.filter(p => p.id !== plan.id);
      } else {
        return [...prev, plan];
      }
    });
  };

  const handleConfirm = async () => {
    if (selectedPlans.length === 0) return;

    // Show confirmation for cancellation
    if (actionType === 'cancel') {
      setShowCancelConfirm(true);
      return;
    }

    setIsLoading(true);
    try {
      const planNames = selectedPlans.map(plan => plan.name);
      const examTypes = selectedPlans.map(plan => plan.examType);
      
      if (isAccountExpired) {
        // Use renewal function for expired accounts
        const { error } = await renewAccountWithPlans(examTypes, planNames);
        if (!error && onAccountRenewed) {
          onAccountRenewed(planNames);
        }
      } else {
        // Use regular add/replace logic for active accounts
        const planNames: string[] = [];
        
        for (const plan of selectedPlans) {
          if (actionType === 'add') {
            const { error } = await addExamType(plan.examType);
            if (!error) {
              planNames.push(plan.name);
            }
          } else {
            const { error } = await replaceExamType(plan.examType);
            if (!error) {
              planNames.push(plan.name);
            }
          }
        }
        
        if (planNames.length > 0 && onPlansAdded) {
          onPlansAdded(planNames);
        }
      }
      
      onClose();
    } catch (error) {
      console.error('Error updating plans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelConfirm = async () => {
    setIsLoading(true);
    try {
      const cancelledPlans: string[] = [];
      
      for (const plan of selectedPlans) {
        const { error } = await cancelSubscription(plan.examType);
        if (!error) {
          cancelledPlans.push(plan.name);
        }
      }
      
      if (cancelledPlans.length > 0 && onPlansAdded) {
        onPlansAdded(cancelledPlans.map(name => `${name} annulé`));
      }
      
      setShowCancelConfirm(false);
      onClose();
    } catch (error) {
      console.error('Error cancelling plans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          
          {/* Modal Container - Mobile Optimized */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Choisir un plan
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="p-4 sm:p-6 pb-6">
                {/* Action Type Selection */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Que souhaitez-vous faire ?
                  </h3>
                  <div className={`grid gap-3 ${hasAllExamTypes ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                    {!hasAllExamTypes && (
                      <button
                        onClick={() => setActionType('add')}
                        className={`p-4 rounded-lg border-2 transition-colors text-left ${
                          actionType === 'add'
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Plus className="w-5 h-5" />
                          <div>
                            <div className="font-medium">Ajouter un plan</div>
                            <div className="text-sm text-gray-600">
                              Garder votre plan actuel et en ajouter un nouveau
                            </div>
                          </div>
                        </div>
                      </button>
                    )}
                    <button
                      onClick={() => setActionType('replace')}
                      className={`p-4 rounded-lg border-2 transition-colors text-left ${
                        actionType === 'replace'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <ArrowRight className="w-5 h-5" />
                        <div>
                          <div className="font-medium">Remplacer le plan</div>
                          <div className="text-sm text-gray-600">
                            Remplacer votre plan actuel par un nouveau
                          </div>
                        </div>
                      </div>
                    </button>
                    {userExamTypes.length > 1 && (
                      <button
                        onClick={() => setActionType('cancel')}
                        className={`p-4 rounded-lg border-2 transition-colors text-left ${
                          actionType === 'cancel'
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-200 hover:border-red-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <X className="w-5 h-5" />
                          <div>
                            <div className="font-medium">Annuler un plan</div>
                            <div className="text-sm text-gray-600">
                              Annuler l'accès à un concour spécifique
                            </div>
                          </div>
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                {/* Plans Grid */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {actionType === 'cancel' ? 'Sélectionnez le plan à annuler' : 'Sélectionnez un plan'}
                  </h3>
                  
                  {actionType === 'cancel' ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {PLANS.filter(plan => {
                        // Only show plans that user currently has
                        return userSubscriptions.some(sub => 
                          sub.is_active && sub.plan_name.includes(plan.examType)
                        );
                      }).map((plan) => {
                        const isSelected = selectedPlans.some(p => p.id === plan.id);
                        
                        return (
                          <div
                            key={plan.id}
                            onClick={() => handlePlanSelect(plan)}
                            className={`relative p-4 sm:p-6 rounded-xl border-2 transition-all ${
                              isSelected
                                ? 'border-red-500 bg-red-50 shadow-lg cursor-pointer'
                                : 'border-gray-200 hover:border-red-300 hover:shadow-md cursor-pointer'
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute top-2 right-2">
                                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                                  <X className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            )}
                            
                            <div className="text-center">
                              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                                {plan.name}
                              </h4>
                              <p className="text-sm text-gray-600 mb-4">
                                {plan.description}
                              </p>
                              <div className="text-lg font-bold text-red-600 mb-4">
                                Annuler l'accès
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : hasAllExamTypes && !isAccountExpired ? (
                    <div className="text-center py-8">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                        <div className="text-green-800 font-medium mb-2">
                          🎉 Félicitations !
                        </div>
                        <div className="text-green-700 text-sm">
                          Vous avez déjà accès à tous les concours disponibles (CM, CMS, CS).
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {availablePlans.map((plan) => {
                      const isSelected = selectedPlans.some(p => p.id === plan.id);
                      // Check if user already has this exam type (active subscription)
                      const isAlreadyOwned = userSubscriptions.some(sub => 
                        sub.is_active && sub.plan_name.includes(plan.examType)
                      );
                      
                      return (
                        <div
                          key={plan.id}
                          onClick={() => !isAlreadyOwned && handlePlanSelect(plan)}
                          className={`relative p-4 sm:p-6 rounded-xl border-2 transition-all ${
                            isAlreadyOwned
                              ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                              : isSelected
                              ? 'border-primary-500 bg-primary-50 shadow-lg cursor-pointer'
                              : 'border-gray-200 hover:border-gray-300 hover:shadow-md cursor-pointer'
                          }`}
                        >
                        {plan.isPopular && (
                          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                            <span className="bg-primary-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                              Populaire
                            </span>
                          </div>
                        )}
                        
                        {isAlreadyOwned && (
                          <div className="absolute -top-2 right-2">
                            <span className="bg-green-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                              Possédé
                            </span>
                          </div>
                        )}
                        
                        {isSelected && !isAlreadyOwned && (
                          <div className="absolute top-2 right-2">
                            <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}
                        
                        <div className="text-center">
                          <h4 className="text-lg font-bold text-gray-900 mb-2">
                            {plan.name}
                          </h4>
                          <p className="text-sm text-gray-600 mb-4">
                            {plan.description}
                          </p>
                          <div className="text-2xl font-bold text-primary-600 mb-4">
                            {plan.price}
                          </div>
                          
                          <ul className="space-y-2 text-sm text-gray-600">
                            {plan.features.map((feature, index) => (
                              <li key={index} className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      );
                    })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer - Sticky */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={selectedPlans.length === 0 || isLoading || (hasAllExamTypes && !isAccountExpired)}
                  className={`flex-1 px-4 py-3 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 ${
                    actionType === 'cancel' 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-primary-600 hover:bg-primary-700'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {actionType === 'cancel' ? 'Annulation...' : 'Confirmation...'}
                    </>
                  ) : (
                    <>
                      {actionType === 'cancel' ? 'Annuler' : 'Confirmer'} {selectedPlans.length > 0 && `(${selectedPlans.length})`}
                      {actionType === 'cancel' ? <X className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Cancellation Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirmer l'annulation</h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir annuler l'accès aux concours suivants ?
              <br />
              <strong>{selectedPlans.map(plan => plan.name).join(', ')}</strong>
              <br />
              <br />
              Cette action est irréversible et vous perdrez immédiatement l'accès au contenu de ces concours.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Annulation...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PlanSelectionModal;
