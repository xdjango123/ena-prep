import React from 'react';
import { motion } from 'framer-motion';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import { fadeIn, slideUp, staggerContainer, staggerItem } from '../../utils/animations';

export const Hero: React.FC = () => {
  return (
    <section className="pt-32 pb-20 bg-gradient-to-br from-neutral-100 via-white to-primary-50 overflow-hidden">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            variants={staggerContainer(0.1)}
            initial="hidden"
            animate="visible"
            className="text-center lg:text-left"
          >
            <motion.h1 
              variants={staggerItem}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-950 leading-tight mb-6"
            >
              Le site <span className="text-primary-500">Officiel</span> de Préparation pour l'ENA
            </motion.h1>
            
            <motion.p 
              variants={staggerItem}
              className="text-xl text-neutral-700 mb-8 max-w-lg mx-auto lg:mx-0"
            >
              Maîtrisez chaque épreuve avec notre accompagnement complet et rejoignez l'élite de l'administration française.
            </motion.p>
            
            <motion.div 
              variants={staggerItem}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Button to="/matieres" size="lg">
                Commencer la préparation
              </Button>
              <Button to="/tarification" variant="outline" size="lg">
                Voir les formules
              </Button>
            </motion.div>
            
            <motion.div 
              variants={fadeIn}
              className="mt-10 flex items-center justify-center lg:justify-start"
            >
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <img
                    key={i}
                    className="inline-block h-10 w-10 rounded-full ring-2 ring-white"
                    src={`https://images.pexels.com/photos/${3756679 + i}/pexels-photo-${3756679 + i}.jpeg?auto=compress&cs=tinysrgb&w=40&h=40&dpr=1`}
                    alt={`User ${i}`}
                  />
                ))}
              </div>
              <div className="ml-4 text-left">
                <p className="text-sm font-medium text-neutral-950">
                  Rejoignez +1200 étudiants
                </p>
                <p className="text-xs text-neutral-600">
                  Déjà en préparation active
                </p>
              </div>
            </motion.div>
          </motion.div>
          
          <motion.div 
            variants={slideUp}
            initial="hidden"
            animate="visible"
            className="relative"
          >
            {/* Background shadow cards */}
            <div className="absolute -right-4 -bottom-4 w-full h-full bg-neutral-200 rounded-xl transform rotate-2"></div>
            <div className="absolute -right-2 -bottom-2 w-full h-full bg-neutral-100 rounded-xl transform -rotate-1"></div>
            
            <div className="relative z-10 bg-white rounded-xl shadow-xl p-6 md:p-8">
              <h3 className="text-xl font-semibold mb-4">Question d'exemple</h3>
              <div className="bg-neutral-50 rounded-lg p-4 mb-6">
                <p className="text-neutral-800">
                  "Dans quelle mesure la mondialisation remet-elle en cause le rôle traditionnel de l'État-nation ?"
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center font-medium">
                    A
                  </div>
                  <div className="flex-1 p-3 border border-neutral-200 rounded-lg hover:border-primary-300 transition-colors cursor-pointer">
                    La mondialisation affaiblit la souveraineté économique
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center font-medium">
                    B
                  </div>
                  <div className="flex-1 p-3 border border-neutral-200 rounded-lg hover:border-primary-300 transition-colors cursor-pointer">
                    L'émergence des organisations supranationales modifie le pouvoir décisionnel
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center font-medium">
                    C
                  </div>
                  <div className="flex-1 p-3 border border-neutral-200 rounded-lg hover:border-primary-300 transition-colors cursor-pointer">
                    Les enjeux transnationaux nécessitent une coopération internationale accrue
                  </div>
                </div>
              </div>
              <div className="mt-6 text-center">
                <Button to="/inscription" variant="primary" fullWidth>
                  Répondre à la question
                </Button>
              </div>
              
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary-500 rounded-full opacity-20 blur-xl"></div>
              <div className="absolute -left-8 -top-8 w-32 h-32 bg-primary-500 rounded-full opacity-10 blur-xl"></div>
            </div>
            
            <div className="absolute -z-10 -bottom-6 -right-6 w-full h-full bg-neutral-950 rounded-xl"></div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
};