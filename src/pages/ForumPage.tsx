import React from 'react';
import { Container } from '../components/ui/Container';
import { Button } from '../components/ui/Button';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Users,
  Sparkles,
  Heart,
  MessageCircle,
  TrendingUp,
  Clock,
  User,
  ArrowRight
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

        {/* Coming Soon Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-8 mb-8 text-center"
        >
          <div className="p-4 bg-orange-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-orange-600" />
          </div>
          
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Bientôt disponible !
          </h2>
          
          <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
            Notre forum communautaire est en cours de développement. Vous pourrez bientôt échanger 
            avec d'autres candidats, partager vos expériences et obtenir des conseils de préparation.
          </p>

          {/* Preview Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="p-6 bg-blue-50 rounded-xl border border-blue-200">
              <MessageCircle className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-bold text-blue-800 mb-2">Discussions</h3>
              <p className="text-blue-600 text-sm">Posez vos questions et partagez vos conseils</p>
            </div>
            
            <div className="p-6 bg-green-50 rounded-xl border border-green-200">
              <Users className="w-8 h-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-bold text-green-800 mb-2">Communauté</h3>
              <p className="text-green-600 text-sm">Connectez-vous avec d'autres candidats</p>
            </div>
            
            <div className="p-6 bg-purple-50 rounded-xl border border-purple-200">
              <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-3" />
              <h3 className="font-bold text-purple-800 mb-2">Ressources</h3>
              <p className="text-purple-600 text-sm">Partagez des ressources utiles</p>
            </div>
          </div>

          <Button size="lg" to="/dashboard">
            Retour au tableau de bord
          </Button>
        </motion.div>

        {/* Preview of Forum Features */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Mock Discussion Preview */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-orange-600" />
              Aperçu des discussions
            </h3>
            
            <div className="space-y-4">
              {[
                {
                  title: "Conseils pour la culture générale",
                  author: "Marie K.",
                  replies: 12,
                  time: "2h",
                  category: "Culture Générale"
                },
                {
                  title: "Partage de ressources anglais",
                  author: "Ahmed D.",
                  replies: 8,
                  time: "5h",
                  category: "Anglais"
                },
                {
                  title: "Stratégies pour les exercices de logique",
                  author: "Fatou M.",
                  replies: 15,
                  time: "1j",
                  category: "Logique"
                }
              ].map((discussion, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200 opacity-60">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 mb-1">{discussion.title}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {discussion.author}
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          {discussion.replies} réponses
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {discussion.time}
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                      {discussion.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Community Stats Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <Users className="w-6 h-6 text-green-600" />
              Statistiques communauté
            </h3>
            
            <div className="space-y-6">
              <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                <div className="text-3xl font-bold text-blue-600 mb-1">500+</div>
                <div className="text-blue-700 font-medium">Candidats inscrits</div>
              </div>
              
              <div className="text-center p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                <div className="text-3xl font-bold text-green-600 mb-1">1,200+</div>
                <div className="text-green-700 font-medium">Messages échangés</div>
              </div>
              
              <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                <div className="text-3xl font-bold text-purple-600 mb-1">150+</div>
                <div className="text-purple-700 font-medium">Ressources partagées</div>
              </div>
            </div>

            {/* Categories Preview */}
            <div className="mt-6">
              <h4 className="font-semibold text-gray-800 mb-3">Catégories disponibles</h4>
              <div className="space-y-2">
                {[
                  { name: "Culture Générale", color: "bg-blue-100 text-blue-700" },
                  { name: "Anglais", color: "bg-green-100 text-green-700" },
                  { name: "Logique & Maths", color: "bg-yellow-100 text-yellow-700" },
                  { name: "Conseils Généraux", color: "bg-purple-100 text-purple-700" },
                  { name: "Témoignages", color: "bg-pink-100 text-pink-700" }
                ].map((category, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded opacity-60">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${category.color}`}>
                      {category.name}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Newsletter Signup */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-8 text-white text-center"
        >
          <Heart className="w-12 h-12 mx-auto mb-4 opacity-90" />
          <h3 className="text-2xl font-bold mb-4">Soyez notifié du lancement</h3>
          <p className="text-orange-100 mb-6 max-w-2xl mx-auto">
            Inscrivez-vous pour être parmi les premiers à rejoindre notre communauté 
            et recevoir des conseils exclusifs de préparation ENA.
          </p>
          
          <div className="max-w-md mx-auto">
            <div className="flex gap-3">
              <input
                type="email"
                placeholder="Votre adresse email"
                className="flex-1 px-4 py-3 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
              <Button variant="secondary" size="lg">
                M'informer
              </Button>
            </div>
          </div>
        </motion.div>
      </Container>
    </div>
  );
};

export default ForumPage; 