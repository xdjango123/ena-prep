import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Plus, ArrowRight } from 'lucide-react';
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext';

interface PlanSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentExamType?: string;
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
  currentExamType
}) => {
  const { addExamType, replaceExamType } = useSupabaseAuth();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionType, setActionType] = useState<'add' | 'replace'>('add');

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan);
  };

  const handleConfirm = async () => {
    if (!selectedPlan) return;

    setIsLoading(true);
    try {
      if (actionType === 'add') {
        await addExamType(selectedPlan.examType);
      } else {
        await replaceExamType(selectedPlan.examType);
      }
      onClose();
    } catch (error) {
      console.error('Error updating plan:', error);
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
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="p-4 sm:p-6">
                {/* Action Type Selection */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Que souhaitez-vous faire ?
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  </div>
                </div>

                {/* Plans Grid */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Sélectionnez un plan
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {PLANS.map((plan) => (
                      <div
                        key={plan.id}
                        onClick={() => handlePlanSelect(plan)}
                        className={`relative p-4 sm:p-6 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedPlan?.id === plan.id
                            ? 'border-primary-500 bg-primary-50 shadow-lg'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                        }`}
                      >
                        {plan.isPopular && (
                          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                            <span className="bg-primary-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                              Populaire
                            </span>
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
                    ))}
                  </div>
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
                  disabled={!selectedPlan || isLoading}
                  className="flex-1 px-4 py-3 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Confirmation...
                    </>
                  ) : (
                    <>
                      Confirmer
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PlanSelectionModal;
