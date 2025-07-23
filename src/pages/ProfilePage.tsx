import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Container } from '../components/ui/Container';
import { Button } from '../components/ui/Button';
import { motion } from 'framer-motion';
import { 
  User, 
  Settings,
  CreditCard,
  Bell,
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
  const { user, updateUserProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'billing' | 'settings' | 'notifications'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    country: 'Côte d\'Ivoire'
  });

  const handleSaveProfile = async () => {
    try {
      await updateUserProfile({
        name: editForm.name,
        email: editForm.email
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const getExamLevelLabel = (level?: string) => {
    switch (level) {
      case 'CM': return 'Cour Moyen';
      case 'CMS': return 'Cour Moyen Supérieur';
      case 'CS': return 'Cour Supérieur';
      default: return 'Non défini';
    }
  };

  const getSubscriptionLabel = (status?: string) => {
    switch (status) {
      case 'active': return 'Premium Actif';
      case 'trial': return 'Gratuit';
      case 'inactive': return 'Expiré';
      default: return 'Non défini';
    }
  };

  const getSubscriptionColor = (status?: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trial': return 'bg-blue-100 text-blue-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <img 
              src={`https://ui-avatars.com/api/?name=${user?.name}&background=random&size=80`} 
              alt="Profile" 
              className="w-20 h-20 rounded-full"
            />
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{user?.name}</h2>
              <p className="text-gray-600">{user?.email}</p>
              <div className="flex items-center gap-3 mt-2">
                {user?.examLevel && (
                  <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                    {getExamLevelLabel(user.examLevel)}
                  </span>
                )}
                {user?.subscriptionStatus && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSubscriptionColor(user.subscriptionStatus)}`}>
                    {getSubscriptionLabel(user.subscriptionStatus)}
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

        {/* Profile Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nom complet</label>
            {isEditing ? (
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            ) : (
              <div className="px-4 py-2 bg-gray-50 rounded-lg">{user?.name}</div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            {isEditing ? (
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            ) : (
              <div className="px-4 py-2 bg-gray-50 rounded-lg">{user?.email}</div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
            {isEditing ? (
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="+225 XX XX XX XX"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            ) : (
              <div className="px-4 py-2 bg-gray-50 rounded-lg">{editForm.phone || 'Non renseigné'}</div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pays</label>
            <div className="px-4 py-2 bg-gray-50 rounded-lg">{editForm.country}</div>
          </div>
        </div>

        {isEditing && (
          <div className="mt-6 flex gap-3">
            <Button onClick={handleSaveProfile}>
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder
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
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h3 className="font-semibold">Membre depuis</h3>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-6 h-6 text-green-600" />
            <h3 className="font-semibold">Tests complétés</h3>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {user?.evaluationResults ? '1' : '0'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <GraduationCap className="w-6 h-6 text-purple-600" />
            <h3 className="font-semibold">Score moyen</h3>
          </div>
          <p className="text-2xl font-bold text-purple-600">
            {user?.evaluationResults ? `${user.evaluationResults.overallScore}%` : 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );

  const renderBillingTab = () => (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Formule actuelle</h3>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 className="font-semibold text-gray-800">
              {user?.subscriptionStatus === 'trial' ? 'Formule Gratuite' : 
               user?.subscriptionStatus === 'active' ? 'Formule Premium' : 'Aucune formule'}
            </h4>
            <p className="text-gray-600">
              {user?.subscriptionStatus === 'trial' ? '10 questions/jour, accès limité' :
               user?.subscriptionStatus === 'active' ? 'Accès complet aux examens' : 'Accès limité'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-800">
              {user?.subscriptionStatus === 'trial' ? '0,00€' : 
               user?.subscriptionStatus === 'active' ? '39,99€' : '0,00€'}
            </div>
            <div className="text-sm text-gray-600">par mois</div>
          </div>
        </div>
        
        <div className="mt-6 flex gap-3">
          <Button to="/tarification">
            Changer de formule
          </Button>
          {user?.subscriptionStatus === 'active' && (
            <Button variant="outline">
              Annuler l'abonnement
            </Button>
          )}
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Méthode de paiement</h3>
        <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
          <CreditCard className="w-8 h-8 text-gray-400" />
          <div className="flex-1">
            <p className="text-gray-600">Aucune carte enregistrée</p>
            <p className="text-sm text-gray-500">Ajoutez une méthode de paiement pour souscrire à un abonnement</p>
          </div>
          <Button variant="outline" size="sm">
            Ajouter une carte
          </Button>
        </div>
      </div>

      {/* Billing History */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Historique de facturation</h3>
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Aucune facture disponible</p>
          <p className="text-sm text-gray-500">Vos factures apparaîtront ici après votre premier paiement</p>
        </div>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      {/* Account Settings */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Paramètres du compte</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-semibold text-gray-800">Authentification à deux facteurs</h4>
              <p className="text-sm text-gray-600">Sécurisez votre compte avec la 2FA</p>
            </div>
            <Button variant="outline" size="sm">
              Activer
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-semibold text-gray-800">Changer le mot de passe</h4>
              <p className="text-sm text-gray-600">Dernière modification il y a 30 jours</p>
            </div>
            <Button variant="outline" size="sm">
              Modifier
            </Button>
          </div>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Confidentialité</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-800">Profil public</h4>
              <p className="text-sm text-gray-600">Permettre aux autres utilisateurs de voir votre profil</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-800">Afficher les résultats</h4>
              <p className="text-sm text-gray-600">Partager vos scores avec la communauté</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-red-200">
        <h3 className="text-xl font-bold text-red-600 mb-4">Zone de danger</h3>
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-semibold text-red-800 mb-2">Supprimer le compte</h4>
            <p className="text-sm text-red-700 mb-4">
              Cette action est irréversible. Toutes vos données seront définitivement supprimées.
            </p>
            <Button variant="outline" size="sm" className="border-red-300 text-red-600 hover:bg-red-50">
              Supprimer mon compte
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Préférences de notification</h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Notifications par email</h4>
            <div className="space-y-3">
              {[
                { label: 'Nouveaux examens disponibles', description: 'Soyez informé des nouveaux contenus' },
                { label: 'Rappels d\'étude', description: 'Recevez des rappels pour vos sessions d\'étude' },
                { label: 'Résultats de tests', description: 'Notifications des résultats de vos examens' },
                { label: 'Newsletter hebdomadaire', description: 'Conseils et astuces pour réussir l\'ENA' }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <h5 className="font-medium text-gray-800">{item.label}</h5>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked={index < 2} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Notifications push</h4>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-blue-600" />
                <div>
                  <h5 className="font-medium text-blue-800">Notifications push désactivées</h5>
                  <p className="text-sm text-blue-700">Activez les notifications dans votre navigateur pour recevoir des alertes en temps réel</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="mt-3">
                Activer les notifications
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'billing', label: 'Facturation', icon: CreditCard },
    { id: 'settings', label: 'Paramètres', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Container className="py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Mon Profil</h1>
          <p className="text-gray-600">Gérez vos informations personnelles et préférences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <div className="bg-white rounded-xl shadow-md p-6">
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-100 text-primary-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'profile' && renderProfileTab()}
              {activeTab === 'billing' && renderBillingTab()}
              {activeTab === 'settings' && renderSettingsTab()}
              {activeTab === 'notifications' && renderNotificationsTab()}
            </motion.div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default ProfilePage; 