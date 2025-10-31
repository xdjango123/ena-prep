import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Container } from '../ui/Container';
import { Section, SectionHeader } from '../ui/Section';
import { staggerContainer, staggerItem } from '../../utils/animations';
import { Award, GraduationCap, Star } from 'lucide-react';

const concours = [
  {
    id: 'cm',
    title: 'CM (Cour Moyen)',
    price: '10 000 FCFA',
    icon: GraduationCap,
    color: 'blue',
    description: "Pour les titulaires du BEPC ou BAC. Durée : 3h00. Niveau fondamental."
  },
  {
    id: 'cms',
    title: 'CMS (Cour Moyen Supérieur)',
    price: '15 000 FCFA',
    icon: Award,
    color: 'orange',
    description: "Pour les titulaires d'une Licence (BAC+3). Durée : 3h30. Difficulté intermédiaire."
  },
  {
    id: 'cs',
    title: 'CS (Cour Supérieur)',
    price: '20 000 FCFA',
    icon: Star,
    color: 'red',
    description: "Pour les titulaires d'un Master (BAC+5). Durée : 4h00. Niveau avancé."
  }
];

const colorMap = {
  blue: {
    bg: 'bg-blue-50',
    hoverBg: 'hover:bg-blue-100',
    text: 'text-blue-800',
    buttonBg: 'bg-blue-500',
  },
  orange: {
    bg: 'bg-orange-50',
    hoverBg: 'hover:bg-orange-100',
    text: 'text-orange-800',
    buttonBg: 'bg-orange-500',
  },
  red: {
    bg: 'bg-red-50',
    hoverBg: 'hover:bg-red-100',
    text: 'text-red-800',
    buttonBg: 'bg-red-500',
  },
};

export const SubjectsPreview: React.FC = () => {
  const navigate = useNavigate();

  const handleCompetitionClick = (id: string) => {
    navigate(`/signup?competition=${id}`);
  };

  return (
    <Section>
      <Container>
        <SectionHeader
          title="Concours et matières"
          subtitle="Chaque concours comprend 3 matières : Culture Générale, Anglais, Logique"
        />
        <motion.div
          variants={staggerContainer(0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {concours.map((c) => {
            const Icon = c.icon;
            const colors = colorMap[c.color as keyof typeof colorMap];
            return (
              <motion.div key={c.id} variants={staggerItem}>
                <div
                  className={`p-8 rounded-xl h-full flex flex-col shadow-sm transition-all cursor-pointer ${colors.bg} ${colors.hoverBg}`}
                  onClick={() => handleCompetitionClick(c.id)}
                >
                  <div className="flex-grow flex flex-col items-center text-center">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-5 ${colors.buttonBg}`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className={`text-xl font-bold mb-2 ${colors.text}`}>{c.title}</h3>
                    <div className="text-lg font-semibold mb-2 text-gray-900">{c.price}</div>
                    <p className="text-neutral-600 mb-2">{c.description}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </Container>
    </Section>
  );
};