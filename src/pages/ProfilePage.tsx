import React, { useState } from 'react';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { Container } from '../components/ui/Container';
import { Button } from '../components/ui/Button';
import { motion } from 'framer-motion';
import { 
  User, 
  Settings,
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
  CheckCircle
} from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { user, profile, subscription, updateProfile } = useSupabaseAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'billing' | 'settings'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const userName = profile ? `${profile['First Name']} ${profile['Last Name']}` : user?.email || 'Utilisateur';
  
  const [editForm, setEditForm] = useState({
    firstName: profile?.['First Name'] || '',
    lastName: profile?.['Last Name'] || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    country: 'Côte d\'Ivoire'
  });

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const { error } = await updateProfile({
        'First Name': editForm.firstName,
        'Last Name': editForm.lastName
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

  const getExamLevelLabel = (level?: string) => {
    switch (level) {
      case 'CM': return 'Cour Moyen';
      case 'CMS': return 'Cour Moyen Supérieur';
      case 'CS': return 'Cour Supérieur';
      case 'ALL': return 'Tous niveaux';
      default: return 'Non défini';
    }
  };

  const getSubscriptionLabel = (planName?: string) => {
    switch (planName) {
      case 'Prépa CM': return 'Prépa CM';
      case 'Prépa CMS': return 'Prépa CMS';
      case 'Prépa CS': return 'Prépa CS';
      default: return 'Non défini';
    }
  };

  const getSubscriptionColor = (isActive?: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <img 
              src={`https://ui-avatars.com/api/?name=${userName}&background=random&size=80`} 
              alt="Profile" 
              className="w-20 h-20 rounded-full"
            />
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{userName}</h2>
              <p className="text-gray-600">{user?.email}</p>
              <div className="flex items-center gap-3 mt-2">
                {subscription && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSubscriptionColor(subscription.is_active)}`}>
                    {getSubscriptionLabel(subscription.plan_name)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? <X className="w-4 h-4 mr-2" /> : <Edit3 className="w-4 h-4 mr-2" />}
            {isEditing ? 'Annuler' : 'Modifier'}
          </Button>
        </div>

        {saveMessage && (
          <div className={`mb-4 p-3 rounded-lg ${
            saveMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {saveMessage.type === 'success' ? <CheckCircle className="w-4 h-4 inline mr-2" /> : <AlertCircle className="w-4 h-4 inline mr-2" />}
            {saveMessage.text}
          </div>
        )}

        {/* Profile Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
            {isEditing ? (
              <input
                type="text"
                value={editForm.firstName}
                onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            ) : (
              <div className="px-4 py-2 bg-gray-50 rounded-lg">{profile?.['First Name'] || 'Non renseigné'}</div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
            {isEditing ? (
              <input
                type="text"
                value={editForm.lastName}
                onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            ) : (
              <div className="px-4 py-2 bg-gray-50 rounded-lg">{profile?.['Last Name'] || 'Non renseigné'}</div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <div className="px-4 py-2 bg-gray-50 rounded-lg">{user?.email}</div>
          </div>


        </div>

        {isEditing && (
          <div className="mt-6 flex gap-3">
            <Button onClick={handleSaveProfile} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Annuler
            </Button>
          </div>
        )}
      </div>

      {/* Account Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">


        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CreditCard className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Abonnement</h3>
              <p className="text-gray-600">
                {subscription ? getSubscriptionLabel(subscription.plan_name) : 'Aucun abonnement'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Membre depuis</h3>
              <p className="text-gray-600">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Récemment'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBillingTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Informations d'abonnement</h3>
        
        {subscription ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-800">{getSubscriptionLabel(subscription.plan_name)}</h4>
                <p className="text-sm text-gray-600">
                  Du {new Date(subscription.start_date).toLocaleDateString('fr-FR')} 
                  au {new Date(subscription.end_date).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSubscriptionColor(subscription.is_active)}`}>
                {subscription.is_active ? 'Actif' : 'Expiré'}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucun abonnement actif</p>
            <Button className="mt-4" to="/tarification">
              Voir les abonnements
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Paramètres du compte</h3>
        <p className="text-gray-600">Les paramètres avancés seront disponibles prochainement.</p>
      </div>
    </div>
  );



  return (
    <div className="min-h-screen bg-gray-50">
      <Container>
        <div className="py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Mon Profil</h1>
            <p className="text-gray-600 mt-2">Gérez vos informations personnelles et vos paramètres</p>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-md mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'profile', name: 'Profil', icon: User },
                  { id: 'billing', name: 'Abonnement', icon: CreditCard },
                  { id: 'settings', name: 'Paramètres', icon: Settings }
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
                {activeTab === 'settings' && renderSettingsTab()}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default ProfilePage; 