import React from 'react';
import { motion } from 'framer-motion';
import { Container } from '../ui/Container';
import { Section } from '../ui/Section';
import { Button } from '../ui/Button';
import { fadeIn, slideUp } from '../../utils/animations';

export const CTASection: React.FC = () => {
  return (
    <Section className="bg-primary-500 text-white">
      <Container>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <motion.div 
            variants={fadeIn}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mb-8 lg:mb-0 lg:max-w-xl"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Prêt à commencer votre préparation pour l'ENA?
            </h2>
            <p className="text-lg opacity-90 mb-6">
              Inscrivez-vous dès aujourd'hui et bénéficiez d'un accès immédiat à toutes nos ressources.
              Nos formules s'adaptent à vos besoins et à votre budget.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                to="/signup" 
                variant="secondary" 
                size="lg"
              >
                S'inscrire maintenant
              </Button>
            </div>
          </motion.div>
          
          <motion.div
            variants={slideUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="bg-white text-neutral-950 rounded-lg p-6 shadow-lg lg:w-96"
          >
            <h3 className="text-xl font-bold mb-4">Garantie satisfait ou remboursé</h3>
            <p className="text-neutral-700 mb-4">
              Nous sommes tellement confiants dans la qualité de notre plateforme que nous vous offrons une garantie de remboursement de 30 jours.
            </p>
            <ul className="space-y-2 mb-6">
              <li className="flex items-start">
                <svg className="h-5 w-5 text-primary-500 mr-2 mt-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Remboursement intégral sous 30 jours</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-primary-500 mr-2 mt-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Sans justification nécessaire</span>
              </li>
              <li className="flex items-start">
                <svg className="h-5 w-5 text-primary-500 mr-2 mt-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Procédure simple et rapide</span>
              </li>
            </ul>
            <Button to="/tarification" variant="primary" fullWidth>
              Choisir ma formule
            </Button>
          </motion.div>
        </div>
      </Container>
    </Section>
  );
};