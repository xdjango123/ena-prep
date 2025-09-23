import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { Container } from '../components/ui/Container';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PasswordInput } from '../components/ui/PasswordInput';
import { Label } from '../components/ui/Label';
import PlanSelectionModal from '../components/modals/PlanSelectionModal';
import WelcomeBackModal from '../components/modals/WelcomeBackModal';
import { motion } from 'framer-motion';
import { 
  User, 
  CreditCard,
  Shield,
  Mail,
  Phone,
  Calendar,
  Award,
  GraduationCap,
  Edit3,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Clock,
  Plus
} from 'lucide-react';

// Validation schemas
const emailSchema = z.object({
  newEmail: z.string().email({ message: "L'email n'est pas valide" }),
  confirmEmail: z.string().email({ message: "L'email n'est pas valide" }),
}).refine((data) => data.newEmail === data.confirmEmail, {
  message: "Les emails ne correspondent pas",
  path: ["confirmEmail"],
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, { message: "Le mot de passe actuel est requis" }),
  newPassword: z.string().min(8, { message: "Le nouveau mot de passe doit contenir au moins 8 caractères" }),
  confirmPassword: z.string().min(1, { message: "La confirmation du mot de passe est requise" }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type EmailFormValues = z.infer<typeof emailSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, subscription, userSubscriptions, selectedExamType, isSubscriptionActive, subscriptionExpired, updateProfile, updateEmail, updatePassword, setSelectedExamType, cancelSubscription } = useSupabaseAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'billing'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Email change form
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  
  // Password change form
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Plan selection modal
  const [showPlanModal, setShowPlanModal] = useState(false);
  
  // Welcome back modal
  const [showWelcomeBackModal, setShowWelcomeBackModal] = useState(false);
  const [renewedPlans, setRenewedPlans] = useState<string[]>([]);
  
  // Plan switching
  const [isSwitchingPlan, setIsSwitchingPlan] = useState(false);
  const [planSwitchMessage, setPlanSwitchMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [planAddedMessage, setPlanAddedMessage] = useState<string | null>(null);
  
  // Plan cancellation
  const [isCancellingPlan, setIsCancellingPlan] = useState(false);
  const [planToCancel, setPlanToCancel] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  const userName = profile ? `${profile.first_name} ${profile.last_name}` : user?.email || 'Utilisateur';
  
  const [editForm, setEditForm] = useState({
    firstName: profile?.first_name || '',
    lastName: profile?.last_name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    country: 'Côte d\'Ivoire'
  });

  // Email change form
  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      newEmail: user?.email || '',
      confirmEmail: user?.email || '',
    }
  });

  // Password change form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema)
  });

  const handlePlansAdded = (planNames: string[]) => {
    setPlanAddedMessage(`${planNames.join(', ')} ajouté(s) avec succès!`);
    // Clear message after 5 seconds
    setTimeout(() => setPlanAddedMessage(null), 5000);
  };

  const handleAccountRenewed = (planNames: string[]) => {
    setRenewedPlans(planNames);
    setShowWelcomeBackModal(true);
  };

  const handleWelcomeBackClose = () => {
    setShowWelcomeBackModal(false);
    navigate('/dashboard');
  };

  const handleSwitchPlan = async (examType: 'CM' | 'CMS' | 'CS') => {
    setIsSwitchingPlan(true);
    setPlanSwitchMessage(null);
    
    try {
      const { error } = await setSelectedExamType(examType);
      if (error) {
        setPlanSwitchMessage({ type: 'error', text: error.message });
      } else {
        setPlanSwitchMessage({ type: 'success', text: 'Plan changé avec succès!' });
        // Clear message after 3 seconds
        setTimeout(() => setPlanSwitchMessage(null), 3000);
      }
    } catch (error) {
      setPlanSwitchMessage({ type: 'error', text: 'Erreur lors du changement de plan' });
    } finally {
      setIsSwitchingPlan(false);
    }
  };

  const handleCancelPlan = async (examType: 'CM' | 'CMS' | 'CS') => {
    setIsCancellingPlan(true);
    setPlanSwitchMessage(null);
    
    try {
      const { error } = await cancelSubscription(examType);
      if (error) {
        setPlanSwitchMessage({ type: 'error', text: error.message });
      } else {
        setPlanSwitchMessage({ type: 'success', text: 'Plan annulé avec succès!' });
        // Clear message after 3 seconds
        setTimeout(() => setPlanSwitchMessage(null), 3000);
      }
    } catch (error) {
      setPlanSwitchMessage({ type: 'error', text: 'Erreur lors de l\'annulation du plan' });
    } finally {
      setIsCancellingPlan(false);
      setShowCancelConfirm(false);
      setPlanToCancel(null);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const { error } = await updateProfile({
        first_name: editForm.firstName,
        last_name: editForm.lastName
      });

      if (error) {
        setSaveMessage({ type: 'error', text: 'Erreur lors de la sauvegarde' });
      } else {
        setSaveMessage({ type: 'success', text: 'Profil mis à jour avec succès' });
        setIsEditing(false);
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Erreur inattendue' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmailChange = async (data: EmailFormValues) => {
    setIsChangingEmail(true);
    setSaveMessage(null);

    try {
      const { error } = await updateEmail(data.newEmail);
      
      if (error) {
        setSaveMessage({ type: 'error', text: error.message || 'Erreur lors du changement d\'email' });
      } else {
        setSaveMessage({ type: 'success', text: 'Email mis à jour avec succès. Vérifiez votre nouvelle adresse email.' });
        setShowEmailForm(false);
        emailForm.reset();
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Erreur inattendue' });
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handlePasswordChange = async (data: PasswordFormValues) => {
    setIsChangingPassword(true);
    setSaveMessage(null);

    try {
      const { error } = await updatePassword(data.newPassword);
      
      if (error) {
        setSaveMessage({ type: 'error', text: error.message || 'Erreur lors du changement de mot de passe' });
      } else {
        setSaveMessage({ type: 'success', text: 'Mot de passe mis à jour avec succès' });
        setShowPasswordForm(false);
        passwordForm.reset();
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Erreur inattendue' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const isAccountExpired = (dateString?: string | null) => {
    if (!dateString) return false;
    
    try {
      const expirationDate = new Date(dateString);
      const now = new Date();
      return now > expirationDate;
    } catch (error) {
      return false;
    }
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-800">Informations personnelles</h3>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Modifier
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditForm({
                    firstName: profile?.first_name || '',
                    lastName: profile?.last_name || '',
                    email: user?.email || '',
                    phone: '',
                    address: '',
                    city: '',
                    country: 'Côte d\'Ivoire'
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Annuler
              </button>
            </div>
          )}
        </div>

        {saveMessage && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
            saveMessage.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {saveMessage.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="text-sm">{saveMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="firstName">Prénom</Label>
            {isEditing ? (
              <Input
                id="firstName"
                value={editForm.firstName}
                onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="Votre prénom"
              />
            ) : (
              <div className="mt-1 p-3 bg-gray-50 rounded-lg text-gray-900">
                {profile?.first_name || 'Non renseigné'}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="lastName">Nom</Label>
            {isEditing ? (
              <Input
                id="lastName"
                value={editForm.lastName}
                onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="Votre nom"
              />
            ) : (
              <div className="mt-1 p-3 bg-gray-50 rounded-lg text-gray-900">
                {profile?.last_name || 'Non renseigné'}
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="email">Email</Label>
            <div className="mt-1 flex items-center gap-3">
              <div className="flex-1 p-3 bg-gray-50 rounded-lg text-gray-900">
                {user?.email || 'Non renseigné'}
              </div>
              <button
                onClick={() => setShowEmailForm(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Modifier
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Account Security */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-4">Sécurité du compte</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-800">Mot de passe</p>
              <p className="text-sm text-yellow-600">Dernière modification: Jamais</p>
            </div>
            <button
              onClick={() => setShowPasswordForm(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-yellow-700 hover:text-yellow-800 hover:bg-yellow-100 rounded-lg transition-colors"
            >
              <Shield className="w-4 h-4" />
              Changer le mot de passe
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBillingTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-6">Concours</h3>
        
        <div className="space-y-4">
          {planAddedMessage && (
            <div className="p-3 rounded-lg text-sm bg-green-50 text-green-700 border border-green-200">
              {planAddedMessage}
            </div>
          )}
          
          {planSwitchMessage && (
            <div className={`p-3 rounded-lg text-sm ${
              planSwitchMessage.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {planSwitchMessage.text}
            </div>
          )}
          
          {userSubscriptions.length > 0 ? (
            <div className="space-y-3">
              {userSubscriptions
                .filter(sub => sub.is_active)
                .reduce((unique, subscription) => {
                  // Deduplicate by plan_name to prevent showing duplicate plans
                  const existing = unique.find(sub => sub.plan_name === subscription.plan_name);
                  
                  if (!existing) {
                    unique.push(subscription);
                  }
                  
                  return unique;
                }, [] as typeof userSubscriptions)
                .map((subscription) => {
                  const examType = subscription.plan_name.includes('CMS') ? 'CMS' : 
                                  subscription.plan_name.includes('CS') ? 'CS' : 
                                  subscription.plan_name.includes('CM') ? 'CM' : 'CM';
                  const isSelected = selectedExamType === examType;
                  const isExpired = isAccountExpired(subscription.end_date);
                  
                  return (
                    <div
                      key={subscription.id}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            isSelected ? 'bg-primary-500' : 'bg-gray-300'
                          }`} />
                          <div>
                            <p className="font-medium text-gray-900">{subscription.plan_name}</p>
                            <p className="text-sm text-gray-600">Concours {examType}</p>
                            {subscription.end_date && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                <Calendar className="w-3 h-3" />
                                <span>
                                  {isExpired 
                                    ? `Expiré le ${new Date(subscription.end_date).toLocaleDateString('fr-FR')}`
                                    : `Expire le ${new Date(subscription.end_date).toLocaleDateString('fr-FR')}`
                                  }
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            isExpired
                              ? 'bg-red-100 text-red-800'
                              : isSelected
                              ? 'bg-primary-100 text-primary-700'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {isExpired ? 'Expiré' : isSelected ? 'Actuel' : 'Actif'}
                          </span>
                          {!isExpired && !isSelected && (
                            <button
                              onClick={() => handleSwitchPlan(examType as 'CM' | 'CMS' | 'CS')}
                              disabled={isSwitchingPlan}
                              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isSwitchingPlan ? 'Changement...' : 'Activer'}
                            </button>
                          )}
                          {(() => {
                            // Only show cancel button if user has more than 1 active concour
                            const activeConcours = userSubscriptions.filter(sub => sub.is_active).length;
                            if (activeConcours > 1 && !isExpired) {
                              return (
                                <button
                                  onClick={() => {
                                    setPlanToCancel(examType);
                                    setShowCancelConfirm(true);
                                  }}
                                  disabled={isCancellingPlan}
                                  className="px-3 py-1 rounded-lg text-sm font-medium transition-colors bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Annuler
                                </button>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="p-3 bg-gray-50 rounded-lg text-gray-500 text-center">
              Aucun concours disponible
            </div>
          )}
          
          {(() => {
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
            
            // Only show add button if user doesn't have all exam types or if account is expired
            if (!hasAllExamTypes || subscriptionExpired) {
              return (
                <button
                  onClick={() => setShowPlanModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-400 hover:text-primary-600 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Ajouter un concour
                </button>
              );
            }
            
            return (
              <div className="text-center py-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-green-800 font-medium mb-1">
                    🎉 Félicitations !
                  </div>
                  <div className="text-green-700 text-sm">
                    Vous avez accès à tous les concours disponibles
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Container>
        <div className="py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Mon Profil</h1>
              <p className="text-gray-600 mt-2">Gérez vos informations personnelles et vos paramètres</p>
            </div>

            <div className="bg-white rounded-xl shadow-md mb-8">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {[
                    { id: 'profile', name: 'Profil', icon: User },
                    { id: 'billing', name: 'Abonnement', icon: CreditCard }
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                          activeTab === tab.id
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {tab.name}
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'profile' && renderProfileTab()}
                {activeTab === 'billing' && renderBillingTab()}
              </div>
            </div>
          </motion.div>
        </div>
      </Container>

      {/* Email Change Modal */}
      {showEmailForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Changer l'email</h3>
            <form onSubmit={emailForm.handleSubmit(handleEmailChange)} className="space-y-4">
              <div>
                <Label htmlFor="newEmail">Nouvel email</Label>
                <Input
                  id="newEmail"
                  type="email"
                  {...emailForm.register('newEmail')}
                  placeholder="nouveau@email.com"
                />
                {emailForm.formState.errors.newEmail && (
                  <p className="text-red-600 text-sm mt-1">{emailForm.formState.errors.newEmail.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="confirmEmail">Confirmer l'email</Label>
                <Input
                  id="confirmEmail"
                  type="email"
                  {...emailForm.register('confirmEmail')}
                  placeholder="nouveau@email.com"
                />
                {emailForm.formState.errors.confirmEmail && (
                  <p className="text-red-600 text-sm mt-1">{emailForm.formState.errors.confirmEmail.message}</p>
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEmailForm(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isChangingEmail}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {isChangingEmail ? 'Changement...' : 'Changer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Changer le mot de passe</h3>
            <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                <PasswordInput
                  id="currentPassword"
                  {...passwordForm.register('currentPassword')}
                  placeholder="Votre mot de passe actuel"
                />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-red-600 text-sm mt-1">{passwordForm.formState.errors.currentPassword.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <PasswordInput
                  id="newPassword"
                  {...passwordForm.register('newPassword')}
                  placeholder="Votre nouveau mot de passe"
                />
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-red-600 text-sm mt-1">{passwordForm.formState.errors.newPassword.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <PasswordInput
                  id="confirmPassword"
                  {...passwordForm.register('confirmPassword')}
                  placeholder="Confirmez votre nouveau mot de passe"
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-red-600 text-sm mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPasswordForm(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {isChangingPassword ? 'Changement...' : 'Changer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plan Selection Modal */}
      <PlanSelectionModal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        currentExamTypes={profile?.plan_name ? [profile.plan_name] : []}
        userSubscriptions={userSubscriptions}
        onPlansAdded={handlePlansAdded}
        onAccountRenewed={handleAccountRenewed}
        isAccountExpired={subscriptionExpired}
      />

      {/* Welcome Back Modal */}
      <WelcomeBackModal
        isOpen={showWelcomeBackModal}
        onClose={handleWelcomeBackClose}
        planNames={renewedPlans}
        userName={userName}
      />

      {/* Cancellation Confirmation Modal */}
      {showCancelConfirm && planToCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirmer l'annulation</h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir annuler l'accès au concour {planToCancel} ? 
              Cette action est irréversible et vous perdrez immédiatement l'accès au contenu de ce concour.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelConfirm(false);
                  setPlanToCancel(null);
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleCancelPlan(planToCancel as 'CM' | 'CMS' | 'CS')}
                disabled={isCancellingPlan}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isCancellingPlan ? 'Annulation...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
