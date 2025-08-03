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
    <section className="pt-10 pb-10 bg-gradient-to-br from-neutral-100 via-white to-primary-50 overflow-visible relative">
      {/* Enhanced Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating icons with more variety */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 0.08, y: 0 }}
          transition={{ duration: 2, delay: 0.5 }}
          className="absolute top-20 left-10 text-primary-300"
        >
          <Trophy className="w-16 h-16" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 0.08, y: 0 }}
          transition={{ duration: 2, delay: 1 }}
          className="absolute top-40 right-20 text-accent-300"
        >
          <Target className="w-12 h-12" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 0.08, x: 0 }}
          transition={{ duration: 2, delay: 1.5 }}
          className="absolute bottom-40 left-20 text-yellow-300"
        >
          <Star className="w-14 h-14" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 0.08, x: 0 }}
          transition={{ duration: 2, delay: 2 }}
          className="absolute bottom-20 right-10 text-green-300"
        >
          <Award className="w-10 h-10" />
        </motion.div>
        
        {/* Additional floating elements */}
        <motion.div
          initial={{ opacity: 0, rotate: -180 }}
          animate={{ opacity: 0.06, rotate: 0 }}
          transition={{ duration: 2.5, delay: 0.8 }}
          className="absolute top-60 left-1/4 text-blue-300"
        >
          <Brain className="w-8 h-8" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.06, scale: 1 }}
          transition={{ duration: 2, delay: 1.2 }}
          className="absolute top-80 right-1/3 text-purple-300"
        >
          <Users className="w-10 h-10" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 0.06, y: 0 }}
          transition={{ duration: 2, delay: 1.8 }}
          className="absolute bottom-60 left-1/3 text-orange-300"
        >
          <Clock className="w-9 h-9" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, rotate: 180 }}
          animate={{ opacity: 0.06, rotate: 0 }}
          transition={{ duration: 2.5, delay: 2.2 }}
          className="absolute bottom-40 right-1/4 text-teal-300"
        >
          <CheckCircle className="w-7 h-7" />
        </motion.div>
        
        {/* Enhanced geometric patterns */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-primary-100 to-transparent rounded-full blur-3xl opacity-30"></div>
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-accent-100 to-transparent rounded-full blur-3xl opacity-30"></div>
        <div className="absolute top-1/2 left-0 w-24 h-24 bg-gradient-to-r from-yellow-100 to-transparent rounded-full blur-2xl opacity-25"></div>
        <div className="absolute top-1/3 right-0 w-28 h-28 bg-gradient-to-l from-green-100 to-transparent rounded-full blur-2xl opacity-25"></div>
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #3b82f6 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>
        
        {/* Floating particles */}
        <motion.div
          animate={{ 
            y: [0, -10, 0],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/4 left-1/6 w-2 h-2 bg-primary-400 rounded-full"
        ></motion.div>
        <motion.div
          animate={{ 
            y: [0, 15, 0],
            opacity: [0.4, 0.7, 0.4]
          }}
          transition={{ 
            duration: 5, 
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute top-3/4 right-1/5 w-1.5 h-1.5 bg-accent-400 rounded-full"
        ></motion.div>
        <motion.div
          animate={{ 
            y: [0, -8, 0],
            opacity: [0.2, 0.5, 0.2]
          }}
          transition={{ 
            duration: 3.5, 
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute bottom-1/3 left-1/4 w-1 h-1 bg-yellow-400 rounded-full"
        ></motion.div>
      </div>

      <Container size="xl" className="relative z-10">
        <div className="flex flex-col items-center text-center min-h-[60vh] justify-center">
          {/* Main Hero Content - Centered */}
          <motion.div
            variants={staggerContainer(0.1)}
            initial="hidden"
            animate="visible"
            className="max-w-5xl mx-auto"
          >
            {/* Enhanced title with icons */}
            <motion.div 
              variants={staggerItem}
              className="flex items-center justify-center gap-4 mb-6"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full shadow-lg"
              >
                <GraduationCap className="w-8 h-8 text-white" />
              </motion.div>
              <motion.div
                initial={{ scale: 0, rotate: 180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="p-3 bg-gradient-to-br from-accent-500 to-accent-600 rounded-full shadow-lg"
              >
                <BookOpen className="w-8 h-8 text-white" />
              </motion.div>
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="p-3 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full shadow-lg"
              >
                <Zap className="w-8 h-8 text-white" />
              </motion.div>
            </motion.div>

            <motion.h1 
              variants={staggerItem}
              className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-neutral-950 leading-tight mb-6"
            >
              Votre <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-accent-600">Passport</span> vers<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-accent-600">l'Excellence</span> ENA
            </motion.h1>
            
            <motion.p 
              variants={staggerItem}
              className="text-2xl md:text-2.5xl text-neutral-700 mb-10 max-w-3xl mx-auto leading-relaxed"
            >
              Maîtrisez chaque épreuve avec notre accompagnement complet et affrontez le concours sans crainte.
            </motion.p>
            
            <motion.div 
              variants={staggerItem}
              className="flex flex-col sm:flex-row gap-5 justify-center mb-8"
            >
              <Button to="/signup" size="lg" className="text-lg py-4 px-8 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                Inscription
              </Button>
              
              {/* Dropdown container */}
              <div className="relative" ref={dropdownRef}>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="text-lg py-4 px-8 border-2 border-accent-500 text-accent-600 hover:bg-accent-500 hover:text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  onClick={() => setShowQuiz(!showQuiz)}
                >
                  Commencez un quiz rapide
                  <ChevronDown className={`w-5 h-5 ml-2 transition-transform duration-300 ${showQuiz ? 'rotate-180' : ''}`} />
                </Button>
                
                {/* Simple dropdown menu */}
                {showQuiz && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 mt-2 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 w-full min-w-[300px]"
                    style={{ minHeight: 'fit-content' }}
                  >
                    {examLevels.map((level, index) => (
                      <button
                        key={level.value}
                        onClick={() => handleQuizSelect(level.value)}
                        className={`w-full px-4 py-3 text-left hover:bg-neutral-50 transition-colors ${
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
              className="flex items-center justify-center"
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
        </div>
      </Container>
    </section>
  );
}