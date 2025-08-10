import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import { fadeIn, slideUp, staggerContainer, staggerItem } from '../../utils/animations';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Trophy, Target, Star, Award, GraduationCap, BookOpen, Zap, Brain, Users, Clock, CheckCircle } from 'lucide-react';

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

const examLevels = [
  { 
    value: 'CM', 
    label: 'Cour Moyen (CM)'
  },
  { 
    value: 'CMS', 
    label: 'Cour Moyen Supérieur (CMS)'
  },
  { 
    value: 'CS', 
    label: 'Cour Supérieur (CS)'
  },
];

export const Hero: React.FC = () => {
  const [showQuiz, setShowQuiz] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleQuizSelect = (level: string) => {
    navigate(`/quick-quiz?type=${level}`);
    setShowQuiz(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowQuiz(false);
      }
    };

    if (showQuiz) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showQuiz]);

  return (
    <section className="pt-6 xs:pt-8 sm:pt-10 pb-6 xs:pb-8 sm:pb-10 bg-gradient-to-br from-neutral-100 via-white to-primary-50 overflow-hidden relative">
      {/* Simplified Background Image */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-0 opacity-[0.15] bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&dpr=2')`,
            backgroundPosition: 'center right',
            backgroundSize: 'cover'
          }}
        ></div>
        
        {/* Overlay to ensure text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/85 via-white/60 to-transparent"></div>
      </div>

      {/* Simplified Background decorative elements - Mobile optimized */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating icons - Hidden on very small screens, simplified positioning */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 0.08, y: 0 }}
          transition={{ duration: 2, delay: 0.5 }}
          className="absolute top-8 xs:top-16 sm:top-20 left-2 xs:left-4 sm:left-10 text-primary-300 hidden xs:block"
        >
          <Trophy className="w-6 h-6 xs:w-8 xs:h-8 sm:w-10 sm:h-10 sm:w-12 sm:h-12" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 0.08, y: 0 }}
          transition={{ duration: 2, delay: 1 }}
          className="absolute top-16 xs:top-24 sm:top-32 right-2 xs:right-4 sm:right-20 text-accent-300 hidden xs:block"
        >
          <Target className="w-5 h-5 xs:w-6 xs:h-6 sm:w-8 sm:h-8 sm:w-10 sm:h-10" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 0.08, x: 0 }}
          transition={{ duration: 2, delay: 1.5 }}
          className="absolute bottom-16 xs:bottom-24 sm:bottom-32 left-2 xs:left-4 sm:left-20 text-yellow-300 hidden xs:block"
        >
          <Star className="w-6 h-6 xs:w-8 xs:h-8 sm:w-10 sm:h-10 sm:w-12 sm:h-12" />
        </motion.div>
        
        {/* Simplified geometric patterns - Mobile optimized */}
        <div className="absolute top-0 left-0 w-12 h-12 xs:w-16 xs:h-16 sm:w-20 sm:h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-primary-100 to-transparent rounded-full blur-2xl opacity-20 xs:opacity-30"></div>
        <div className="absolute bottom-0 right-0 w-16 h-16 xs:w-20 xs:h-20 sm:w-24 xs:h-24 sm:w-32 sm:h-32 bg-gradient-to-tl from-accent-100 to-transparent rounded-full blur-2xl opacity-20 xs:opacity-30"></div>
        
        {/* Subtle grid pattern - Reduced opacity on mobile */}
        <div className="absolute inset-0 opacity-[0.01] xs:opacity-[0.02]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #3b82f6 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        }}></div>
      </div>

      <Container size="xl" className="relative z-10">
        <div className="flex flex-col items-center text-center min-h-[60vh] xs:min-h-[65vh] sm:min-h-[70vh] justify-center py-8 xs:py-12 sm:py-16">
          {/* Main Hero Content - Mobile optimized */}
          <motion.div
            variants={staggerContainer(0.1)}
            initial="hidden"
            animate="visible"
            className="max-w-5xl mx-auto px-3 xs:px-4 sm:px-6"
          >
            <motion.h1 
              variants={staggerItem}
              className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-neutral-950 leading-tight mb-4 xs:mb-6 px-2 xs:px-0"
            >
              Votre <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-accent-600">Outil de Reference </span><br className="block xs:hidden" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-accent-600">pour Exceller a l'ENA</span>
            </motion.h1>
            
            <motion.p 
              variants={staggerItem}
              className="text-lg xs:text-xl sm:text-2xl md:text-2.5xl text-neutral-700 mb-6 xs:mb-8 sm:mb-10 max-w-3xl mx-auto leading-relaxed px-3 xs:px-4 sm:px-0"
            >
              Preparez le 1er tour avec les meilleurs outils
            </motion.p>
            
            <motion.div 
              variants={staggerItem}
              className="flex flex-col sm:flex-row gap-4 xs:gap-5 justify-center mb-6 xs:mb-8 px-3 xs:px-4 sm:px-0"
            >
              <Button to="/signup" size="lg" className="hidden md:inline-flex text-lg py-3 xs:py-4 px-6 xs:px-8 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                Inscription
              </Button>
              
              {/* Dropdown container - Mobile optimized */}
              <div className="relative w-full sm:w-auto" ref={dropdownRef}>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="text-base xs:text-lg py-3 xs:py-4 px-6 xs:px-8 border-2 border-accent-500 text-accent-600 hover:bg-accent-500 hover:text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 w-full sm:w-auto"
                  onClick={() => setShowQuiz(!showQuiz)}
                >
                  Commencez un quiz rapide
                  <ChevronDown className={`w-4 h-4 xs:w-5 xs:h-5 ml-2 transition-transform duration-300 ${showQuiz ? 'rotate-180' : ''}`} />
                </Button>
                
                {/* Simple dropdown menu - Mobile optimized */}
                {showQuiz && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 mt-2 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 w-full min-w-[250px] xs:min-w-[280px] sm:min-w-[300px]"
                    style={{ minHeight: 'fit-content' }}
                  >
                    {examLevels.map((level, index) => (
                      <button
                        key={level.value}
                        onClick={() => handleQuizSelect(level.value)}
                        className={`w-full px-3 xs:px-4 py-2 xs:py-3 text-left hover:bg-neutral-50 transition-colors text-sm xs:text-base ${
                          index === 0 ? 'rounded-t-lg' : ''
                        } ${
                          index === examLevels.length - 1 ? 'rounded-b-lg' : 'border-b border-neutral-100'
                        }`}
                      >
                        {level.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
            
            <motion.div 
              variants={fadeIn}
              className="flex items-center justify-center px-3 xs:px-4 sm:px-0"
            >
              <div className="flex -space-x-2">
                {userAvatars.map((avatar, i) => (
                  <img
                    key={i}
                    className="inline-block h-8 w-8 xs:h-10 xs:w-10 sm:h-12 sm:w-12 rounded-full ring-2 ring-white"
                    src={avatar.type === 'image' ? avatar.src : `https://ui-avatars.com/api/?name=${avatar.name}&background=random&color=fff`}
                    alt={avatar.type === 'image' ? avatar.alt : avatar.name}
                  />
                ))}
              </div>
              <div className="ml-3 xs:ml-4 text-left min-w-0">
                <p className="text-xs xs:text-sm sm:text-base font-semibold text-neutral-950 truncate">
                  Rejoignez +1200 étudiants
                </p>
                <p className="text-xs xs:text-sm text-neutral-600">
                  Déjà en préparation active
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}