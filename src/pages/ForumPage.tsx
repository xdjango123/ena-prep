import React from 'react';
import { Container } from '../components/ui/Container';
import { Button } from '../components/ui/Button';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  AlertTriangle
} from 'lucide-react';

const ForumPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Container className="py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-8 rounded-2xl shadow-lg mb-8">
          <div className="text-center">
            <div className="p-4 bg-white/20 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <MessageSquare className="w-10 h-10" />
            </div>
            <h1 className="text-4xl font-bold mb-2">Forum Communauté</h1>
            <p className="text-orange-100 text-lg">
              Échangez avec d'autres candidats ENA
            </p>
          </div>
        </div>

        {/* Service Temporairement Indisponible */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-12 text-center max-w-2xl mx-auto"
        >
          <div className="p-4 bg-orange-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-orange-600" />
          </div>
          
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Service Temporairement Indisponible
          </h2>
          
          <p className="text-gray-600 text-lg mb-8">
            Notre forum communautaire est actuellement en maintenance. 
            Nous travaillons pour vous offrir une meilleure expérience.
          </p>

          <Button size="lg" to="/dashboard">
            Retour au tableau de bord
          </Button>
        </motion.div>
      </Container>
    </div>
  );
};

export default ForumPage; 