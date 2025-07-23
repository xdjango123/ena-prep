import React from 'react';
import { Container } from '../components/ui/Container';
import { Button } from '../components/ui/Button';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  GraduationCap,
  Clock,
  Users,
  Target,
  Award,
  CheckCircle,
  Calendar,
  FileText,
  Lightbulb,
  TrendingUp,
  Star,
  Info,
  ArrowRight,
  Download
} from 'lucide-react';

const EnaGuidePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Container className="py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8 rounded-2xl shadow-lg mb-8">
          <div className="text-center">
            <div className="p-4 bg-white/20 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <BookOpen className="w-10 h-10" />
            </div>
            <h1 className="text-4xl font-bold mb-2">Guide de l'ENA</h1>
            <p className="text-blue-100 text-lg">
              Tout ce que vous devez savoir pour réussir le concours de l'École Nationale d'Administration
            </p>
          </div>
        </div>

        {/* Quick Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-8 mb-8"
        >
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Aperçu du Concours ENA</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center p-6 bg-blue-50 rounded-xl border border-blue-200">
              <GraduationCap className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-bold text-blue-800 mb-2">3 Niveaux</h3>
              <p className="text-blue-600">CM, CMS, CS selon votre niveau d'études</p>
            </div>
            
            <div className="text-center p-6 bg-green-50 rounded-xl border border-green-200">
              <Clock className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-bold text-green-800 mb-2">Durée</h3>
              <p className="text-green-600">3h30 à 4h15 selon le niveau</p>
            </div>
            
            <div className="text-center p-6 bg-purple-50 rounded-xl border border-purple-200">
              <Target className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h3 className="font-bold text-purple-800 mb-2">3 Matières</h3>
              <p className="text-purple-600">Culture générale, Anglais, Logique</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <Info className="w-6 h-6 text-yellow-600 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-yellow-800 mb-2">Important à savoir</h4>
                <p className="text-yellow-700">
                  L'ENA forme les futurs cadres de l'administration publique de Côte d'Ivoire. 
                  Le concours est très sélectif et nécessite une préparation rigoureuse dans toutes les matières.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Exam Levels Detail */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg p-8 mb-8"
        >
          <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-blue-600" />
            Niveaux de Concours
          </h2>
          
          <div className="space-y-6">
            {[
              {
                level: 'CM',
                title: 'Cour Moyen',
                requirement: 'BEPC ou BAC',
                duration: '3h00',
                questions: '80-90 questions',
                description: 'Niveau d\'entrée pour les titulaires du BEPC ou du BAC. Questions de niveau fondamental.',
                color: 'blue'
              },
              {
                level: 'CMS',
                title: 'Cour Moyen Supérieur',
                requirement: 'Licence (BAC+3)',
                duration: '3h30',
                questions: '95-105 questions',
                description: 'Niveau intermédiaire pour les titulaires d\'une Licence. Difficultés progressives.',
                color: 'orange'
              },
              {
                level: 'CS',
                title: 'Cour Supérieur',
                requirement: 'Master (BAC+5)',
                duration: '4h00',
                questions: '110-120 questions',
                description: 'Niveau avancé pour les titulaires d\'un Master. Questions complexes et approfondies.',
                color: 'red'
              }
            ].map((level, index) => (
              <div key={index} className={`p-6 bg-${level.color}-50 rounded-xl border border-${level.color}-200`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className={`text-xl font-bold text-${level.color}-800 mb-1`}>
                      {level.level} - {level.title}
                    </h3>
                    <p className={`text-${level.color}-600 font-medium`}>
                      Requis : {level.requirement}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium text-${level.color}-700 mb-1`}>
                      {level.duration}
                    </div>
                    <div className={`text-xs text-${level.color}-600`}>
                      {level.questions}
                    </div>
                  </div>
                </div>
                <p className={`text-${level.color}-700`}>{level.description}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Subjects Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-lg p-8 mb-8"
        >
          <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <FileText className="w-8 h-8 text-green-600" />
            Structure des Épreuves
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[
              {
                subject: 'Culture Générale',
                icon: <BookOpen className="w-8 h-8 text-blue-600" />,
                color: 'blue',
                topics: [
                  'Histoire du Sénégal et de l\'Afrique',
                  'Géographie et économie',
                  'Institutions politiques',
                  'Actualités nationales et internationales',
                  'Littérature et arts'
                ],
                tips: 'Lisez quotidiennement la presse et les revues spécialisées'
              },
              {
                subject: 'Anglais',
                icon: <Users className="w-8 h-8 text-green-600" />,
                color: 'green',
                topics: [
                  'Grammaire et conjugaison',
                  'Vocabulaire professionnel',
                  'Compréhension de texte',
                  'Expression écrite',
                  'Anglais des affaires'
                ],
                tips: 'Pratiquez la lecture d\'articles en anglais chaque jour'
              },
              {
                subject: 'Logique et Mathématiques',
                icon: <Target className="w-8 h-8 text-purple-600" />,
                color: 'purple',
                topics: [
                  'Raisonnement logique',
                  'Suites numériques',
                  'Problèmes arithmétiques',
                  'Analyse de données',
                  'Géométrie de base'
                ],
                tips: 'Entraînez-vous régulièrement avec des exercices variés'
              }
            ].map((subject, index) => (
              <div key={index} className={`p-6 bg-${subject.color}-50 rounded-xl border border-${subject.color}-200`}>
                <div className="flex items-center gap-3 mb-4">
                  {subject.icon}
                  <h3 className={`text-xl font-bold text-${subject.color}-800`}>
                    {subject.subject}
                  </h3>
                </div>
                
                <div className="mb-4">
                  <h4 className={`font-semibold text-${subject.color}-700 mb-2`}>Thèmes principaux :</h4>
                  <ul className="space-y-1">
                    {subject.topics.map((topic, topicIndex) => (
                      <li key={topicIndex} className={`flex items-center gap-2 text-${subject.color}-600 text-sm`}>
                        <CheckCircle className="w-3 h-3" />
                        {topic}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className={`p-3 bg-${subject.color}-100 rounded-lg`}>
                  <div className="flex items-start gap-2">
                    <Lightbulb className={`w-4 h-4 text-${subject.color}-600 mt-0.5 flex-shrink-0`} />
                    <p className={`text-${subject.color}-700 text-sm font-medium`}>
                      {subject.tips}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Preparation Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl shadow-lg p-8 mb-8"
        >
          <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-orange-600" />
            Conseils de Préparation
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: <Calendar className="w-6 h-6 text-blue-600" />,
                title: 'Planification',
                tip: 'Établissez un planning de révision sur 6 mois minimum',
                color: 'blue'
              },
              {
                icon: <Clock className="w-6 h-6 text-green-600" />,
                title: 'Gestion du temps',
                tip: 'Entraînez-vous avec des examens chronométrés',
                color: 'green'
              },
              {
                icon: <BookOpen className="w-6 h-6 text-purple-600" />,
                title: 'Lectures régulières',
                tip: 'Lisez quotidiennement journaux et revues spécialisées',
                color: 'purple'
              },
              {
                icon: <Users className="w-6 h-6 text-orange-600" />,
                title: 'Groupes d\'étude',
                tip: 'Rejoignez des groupes de candidats pour échanger',
                color: 'orange'
              },
              {
                icon: <Target className="w-6 h-6 text-red-600" />,
                title: 'Tests blancs',
                tip: 'Passez des examens blancs régulièrement',
                color: 'red'
              },
              {
                icon: <Award className="w-6 h-6 text-yellow-600" />,
                title: 'Motivation',
                tip: 'Gardez vos objectifs de carrière en tête',
                color: 'yellow'
              }
            ].map((tip, index) => (
              <div key={index} className={`p-4 bg-${tip.color}-50 rounded-lg border border-${tip.color}-200`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 bg-${tip.color}-100 rounded-lg`}>
                    {tip.icon}
                  </div>
                  <div>
                    <h4 className={`font-bold text-${tip.color}-800 mb-1`}>{tip.title}</h4>
                    <p className={`text-${tip.color}-600 text-sm`}>{tip.tip}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Calendar & Resources */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Important Dates */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-3">
              <Calendar className="w-6 h-6 text-blue-600" />
              Calendrier 2024
            </h3>
            
            <div className="space-y-4">
              {[
                { event: 'Ouverture des inscriptions', date: 'Mars 2024', status: 'completed' },
                { event: 'Clôture des inscriptions', date: 'Mai 2024', status: 'completed' },
                { event: 'Examens écrits', date: 'Juillet 2024', status: 'upcoming' },
                { event: 'Publication des résultats', date: 'Septembre 2024', status: 'future' },
                { event: 'Examens oraux', date: 'Octobre 2024', status: 'future' }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-800">{item.event}</div>
                    <div className="text-sm text-gray-600">{item.date}</div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${
                    item.status === 'completed' ? 'bg-green-500' :
                    item.status === 'upcoming' ? 'bg-orange-500' :
                    'bg-gray-300'
                  }`} />
                </div>
              ))}
            </div>
          </motion.div>

          {/* Resources */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.0 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-3">
              <Download className="w-6 h-6 text-green-600" />
              Ressources Utiles
            </h3>
            
            <div className="space-y-3">
              {[
                { name: 'Annales des 5 dernières années', type: 'PDF', size: '2.3 MB' },
                { name: 'Guide officiel ENA 2024', type: 'PDF', size: '1.8 MB' },
                { name: 'Bibliographie recommandée', type: 'PDF', size: '0.5 MB' },
                { name: 'Modèles de réponses', type: 'PDF', size: '3.1 MB' }
              ].map((resource, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-red-600" />
                    <div>
                      <div className="font-medium text-gray-800">{resource.name}</div>
                      <div className="text-sm text-gray-600">{resource.type} • {resource.size}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white text-center"
        >
          <Star className="w-12 h-12 mx-auto mb-4 opacity-90" />
          <h3 className="text-2xl font-bold mb-4">Prêt à commencer votre préparation ?</h3>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Rejoignez ENAplus+ et bénéficiez d'une préparation complète avec des examens blancs, 
            des corrections détaillées et un suivi personnalisé.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button to="/dashboard/evaluation-test" variant="secondary" size="lg">
              Faire le test d'évaluation
            </Button>
            <Button to="/tarification" variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-blue-600">
              Voir nos formules
            </Button>
          </div>
        </motion.div>
      </Container>
    </div>
  );
};

export default EnaGuidePage; 