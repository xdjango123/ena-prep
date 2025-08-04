import React from 'react';
import { Container } from '../components/ui/Container';
import { Button } from '../components/ui/Button';
import { motion } from 'framer-motion';
import { 
  Users, 
  AlertTriangle
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

          {/* Service Temporairement Indisponible */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-lg p-12"
          >
            <div className="flex items-center justify-center mb-6">
              <div className="p-3 bg-yellow-100 rounded-full">
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Service Temporairement Indisponible
            </h2>
            
            <p className="text-gray-600 text-lg mb-8">
              Notre service de tutorat est actuellement en maintenance. 
              Nous travaillons pour vous offrir une meilleure expérience.
            </p>

            <Button to="/dashboard" variant="primary" size="lg">
              Retour au tableau de bord
            </Button>
          </motion.div>
        </motion.div>
      </Container>
    </div>
  );
};

export default TutorPage; 