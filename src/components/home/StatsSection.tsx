import React from 'react';
import { motion } from 'framer-motion';
import { Container } from '../ui/Container';
import { Section } from '../ui/Section';
import { fadeIn, staggerContainer, staggerItem } from '../../utils/animations';

const stats = [
  { value: '95%', label: 'Taux de satisfaction' },
  { value: '+1200', label: 'Étudiants actifs' },
  { value: '87%', label: 'Taux de réussite' },
  { value: '+5000', label: 'Questions d\'entrainement' },
];

export const StatsSection: React.FC = () => {
  return (
    <Section className="bg-neutral-950 text-white">
      <Container>
        <motion.div
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Nos résultats en chiffres</h2>
          <p className="text-lg text-neutral-400 max-w-3xl mx-auto">
            Des statistiques qui témoignent de l'efficacité de notre méthode de préparation
          </p>
        </motion.div>
        
        <motion.div
          variants={staggerContainer(0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 items-stretch"
        >
          {stats.map((stat, index) => (
            <motion.div 
              key={index}
              variants={staggerItem}
              className="flex"
            >
              <div className="flex w-full rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 p-[1px]">
                <div className="flex w-full flex-col items-center justify-center rounded-lg bg-neutral-950 p-6 min-h-[12rem]">
                  <p className="text-4xl md:text-5xl font-bold text-primary-500 tabular-nums">{stat.value}</p>
                  <p className="text-neutral-400 mt-2">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </Section>
  );
};
