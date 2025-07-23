import React from 'react';
import { Container } from '../components/ui/Container';
import { Button } from '../components/ui/Button';
import { motion } from 'framer-motion';
import { 
  Users, 
  AlertTriangle,
  UserCheck,
  GraduationCap,
  Clock,
  Mail
} from 'lucide-react';

const TutorPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Container className="py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto text-center"
        >
          {/* Header */}
          <div className="mb-8">
            <div className="p-4 bg-yellow-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Users className="w-10 h-10 text-yellow-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Ask a Tutor</h1>
            <p className="text-lg text-gray-600">
              Obtenez de l'aide personnalisée de nos tuteurs experts ENA
            </p>
          </div>

          {/* Error Message */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-lg border border-yellow-200 p-8 mb-8"
          >
            <div className="flex items-center justify-center mb-6">
              <div className="p-3 bg-yellow-100 rounded-full">
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Service temporairement indisponible
            </h2>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
              <p className="text-lg font-semibold text-yellow-800 mb-2">
                🚧 Nous recrutons encore !
              </p>
              <p className="text-yellow-700">
                Notre équipe de tuteurs experts est en cours de constitution. 
                Ce service sera bientôt disponible pour vous accompagner dans votre préparation ENA.
              </p>
            </div>

            <div className="text-gray-600 space-y-4">
              <p>
                En attendant, n'hésitez pas à utiliser nos autres ressources :
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <GraduationCap className="w-6 h-6 text-blue-600 mb-2" />
                  <h3 className="font-semibold text-blue-800 mb-1">Examens Blancs</h3>
                  <p className="text-sm text-blue-700">Pratiquez avec nos examens officiels</p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <Users className="w-6 h-6 text-green-600 mb-2" />
                  <h3 className="font-semibold text-green-800 mb-1">Forum</h3>
                  <p className="text-sm text-green-700">Discutez avec d'autres candidats</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Coming Soon Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-lg p-8 mb-8"
          >
            <h3 className="text-xl font-bold text-gray-800 mb-6">
              À venir très prochainement
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <UserCheck className="w-5 h-5 text-primary-600" />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-800">Tuteurs Certifiés</h4>
                  <p className="text-sm text-gray-600">Anciens lauréats ENA et professeurs expérimentés</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-800">Réponses Rapides</h4>
                  <p className="text-sm text-gray-600">Réponse garantie sous 24h maximum</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Mail className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-800">Support Personnalisé</h4>
                  <p className="text-sm text-gray-600">Aide adaptée à votre niveau et vos besoins</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button to="/dashboard" variant="primary" size="lg">
              Retour au tableau de bord
            </Button>
            <Button to="/dashboard/forum" variant="outline" size="lg">
              Visiter le forum
            </Button>
          </div>

          {/* Newsletter Signup */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-12 p-6 bg-primary-50 rounded-lg border border-primary-200"
          >
            <h4 className="font-semibold text-primary-800 mb-2">
              Être notifié du lancement
            </h4>
            <p className="text-sm text-primary-700 mb-4">
              Soyez le premier informé quand notre service de tutorat sera disponible
            </p>
            <div className="flex gap-3">
              <input
                type="email"
                placeholder="Votre adresse email"
                className="flex-1 px-4 py-2 border border-primary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <Button variant="primary">
                M'informer
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </Container>
    </div>
  );
};

export default TutorPage; 