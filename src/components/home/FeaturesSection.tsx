import React from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, BarChart, Clock, Award, 
  CheckCircle, Users, MessageSquare, FileText 
} from 'lucide-react';
import { Container } from '../ui/Container';
import { Section, SectionHeader } from '../ui/Section';
import { staggerContainer, staggerItem } from '../../utils/animations';

const features = [
  {
    icon: BookOpen,
    title: 'Ressources complètes',
    description: 'Accédez à une bibliothèque exhaustive de cours, questions et exercices.'
  },
  {
    icon: BarChart,
    title: 'Suivi de progression',
    description: 'Visualisez votre évolution et identifiez vos points d\'amélioration.'
  },
  {
    icon: Clock,
    title: 'Examens chronométrés',
    description: 'Entraînez-vous dans les conditions réelles du concours.'
  },
  {
    icon: Award,
    title: 'Certifications',
    description: 'Validez vos compétences à chaque étape de votre préparation.'
  },
  {
    icon: CheckCircle,
    title: 'Corrections détaillées',
    description: 'Bénéficiez d\'explications complètes pour comprendre vos erreurs.'
  },
  {
    icon: Users,
    title: 'Communauté d\'entraide',
    description: 'Échangez avec d\'autres candidats et partagez vos connaissances.'
  },
  {
    icon: MessageSquare,
    title: 'Coaching personnalisé',
    description: 'Profitez de conseils d\'experts adaptés à votre profil.'
  },
  {
    icon: FileText,
    title: 'Ressources actualisées',
    description: 'Contenus mis à jour selon les évolutions du concours.'
  }
];

export const FeaturesSection: React.FC = () => {
  return (
    <Section>
      <Container>
        <SectionHeader
          title="Pourquoi nous choisir"
          subtitle="Une plateforme complète conçue pour maximiser vos chances de réussite"
        />
        
        <motion.div
          variants={staggerContainer(0.05)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            
            return (
              <motion.div 
                key={index}
                variants={staggerItem}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 text-primary-500 mb-4">
                  <Icon size={28} />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-neutral-700">{feature.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </Container>
    </Section>
  );
};