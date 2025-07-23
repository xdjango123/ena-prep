import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import { fadeIn, slideUp, staggerContainer, staggerItem } from '../../utils/animations';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

const userAvatars = [
  {
    type: 'image',
    src: 'https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&dpr=1',
    alt: 'Etudiant 1'
  },
  {
    type: 'initial',
    name: 'Jean Dupont',
  },
  {
    type: 'image',
    src: 'https://images.pexels.com/photos/8199703/pexels-photo-8199703.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&dpr=1',
    alt: 'Etudiante 2'
  },
  {
    type: 'initial',
    name: 'Awa Cisse',
  },
]

const examTypes = [
  { value: '', label: 'Sélectionnez votre niveau' },
  { value: 'CM', label: 'Cour Moyen (CM)' },
  { value: 'CMS', label: 'Cour Moyen Supérieur (CMS)' },
  { value: 'CS', label: 'Cour Supérieur (CS)' },
];

export const Hero: React.FC = () => {
  const [selectedExam, setSelectedExam] = useState('');
  const navigate = useNavigate();

  const handleStartQuiz = () => {
    if (!selectedExam) {
      alert('Veuillez sélectionner un type d\'examen');
      return;
    }
    navigate(`/quick-quiz?type=${selectedExam}`);
  };

  return (
    <section className="pt-10 pb-10 bg-gradient-to-br from-neutral-100 via-white to-primary-50 overflow-hidden">
      <Container size="xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center min-h-[60vh]">
          {/* LEFT: Hero section, even larger */}
          <motion.div
            variants={staggerContainer(0.1)}
            initial="hidden"
            animate="visible"
            className="lg:col-span-7 col-span-1 flex flex-col justify-center text-center lg:text-left"
          >
            <motion.h1 
              variants={staggerItem}
              className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-neutral-950 leading-tight mb-6"
            >
              Le site de<br />
              <span className="text-primary-500">référence</span> pour<br />
              réussir l'ENA
            </motion.h1>
            
            <motion.p 
              variants={staggerItem}
              className="text-2xl md:text-2.5xl text-neutral-700 mb-10 max-w-xl mx-auto lg:mx-0"
            >
              Maîtrisez chaque épreuve avec notre accompagnement complet et rejoignez l'élite de l'administration ivoirienne.
            </motion.p>
            
            <motion.div 
              variants={staggerItem}
              className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start mb-2"
            >
              <Button to="/signup" size="lg" className="text-lg py-4 px-8">
                Commencer la préparation
              </Button>
              <Button to="/tarification" variant="outline" size="lg" className="text-lg py-4 px-8">
                Voir les formules
              </Button>
            </motion.div>
            
            <motion.div 
              variants={fadeIn}
              className="mt-8 flex items-center justify-center lg:justify-start"
            >
              <div className="flex -space-x-2">
                {userAvatars.map((avatar, i) => (
                  <img
                    key={i}
                    className="inline-block h-12 w-12 rounded-full ring-2 ring-white"
                    src={avatar.type === 'image' ? avatar.src : `https://ui-avatars.com/api/?name=${avatar.name}&background=random&color=fff`}
                    alt={avatar.type === 'image' ? avatar.alt : avatar.name}
                  />
                ))}
              </div>
              <div className="ml-4 text-left">
                <p className="text-base font-semibold text-neutral-950">
                  Rejoignez +1200 étudiants
                </p>
                <p className="text-sm text-neutral-600">
                  Déjà en préparation active
                </p>
              </div>
            </motion.div>
          </motion.div>
          
          {/* RIGHT: Responsive, visually balanced quiz card with abundance shadow effect */}
          <motion.div 
            variants={slideUp}
            initial="hidden"
            animate="visible"
            className="lg:col-span-5 col-span-1 relative flex justify-center mt-6 lg:mt-0 order-2 lg:order-none"
          >
            {/* Abundance shadow effect: 3 offset shadow layers */}
            <div className="hidden lg:block absolute -right-6 -bottom-6 w-full h-full bg-neutral-200 rounded-3xl opacity-60 z-0" style={{filter: 'blur(2px)'}}></div>
            <div className="hidden lg:block absolute -right-3 -bottom-3 w-full h-full bg-neutral-100 rounded-3xl opacity-80 z-0" style={{filter: 'blur(1.5px)'}}></div>
            <div className="hidden lg:block absolute -right-1.5 -bottom-1.5 w-full h-full bg-neutral-50 rounded-3xl opacity-90 z-0" style={{filter: 'blur(1px)'}}></div>
            <div className="block relative z-10 bg-white rounded-3xl border border-neutral-200 shadow-2xl py-3 px-6 w-full flex flex-col justify-center lg:py-3 lg:px-6">
              <h3 className="text-2xl font-bold mb-4 text-center">Commencez votre quiz gratuit</h3>
              {/* Exam Type Dropdown */}
              <div className="mb-2">
                <div className="relative">
                  <select
                    value={selectedExam}
                    onChange={(e) => setSelectedExam(e.target.value)}
                    className="w-full appearance-none bg-white border border-neutral-300 rounded-lg px-4 py-3 pr-12 text-neutral-700 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {examTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-neutral-400 pointer-events-none" />
                </div>
              </div>
              <div className="bg-primary-50 rounded-lg p-3 mb-2 border border-primary-200 shadow-sm">
                <p className="text-primary-900 text-center text-base font-semibold whitespace-pre-line">
                  "En économie, que désigne le terme « main invisible » ?"
                </p>
              </div>
              <div className="space-y-2 mb-2">
                <div className="flex gap-3 items-center">
                  <div className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold shrink-0 text-base">
                    A
                  </div>
                  <div className="flex-1 p-3 border border-neutral-200 rounded-lg text-base whitespace-pre-line">
                    L'autorégulation des marchés par l'intérêt individuel
                  </div>
                </div>
                <div className="flex gap-3 items-center">
                  <div className="w-7 h-7 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center font-bold shrink-0 text-base">
                    B
                  </div>
                  <div className="flex-1 p-3 border border-neutral-200 rounded-lg text-base whitespace-pre-line">
                    L'intervention de l'État dans l'économie
                  </div>
                </div>
                <div className="flex gap-3 items-center">
                  <div className="w-7 h-7 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center font-bold shrink-0 text-base">
                    C
                  </div>
                  <div className="flex-1 p-3 border border-neutral-200 rounded-lg text-base whitespace-pre-line">
                    La division du travail dans les entreprises
                  </div>
                </div>
              </div>
              <div className="mt-1 text-center">
                <Button 
                  onClick={handleStartQuiz}
                  size="lg"
                  disabled={!selectedExam}
                  className={!selectedExam ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  Commencer le quiz
                </Button>
                <p className="font-semibold text-primary-500 text-xs mt-2">
                  {selectedExam ? `Niveau ${selectedExam} sélectionné` : 'Sélectionnez un niveau pour commencer'}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}