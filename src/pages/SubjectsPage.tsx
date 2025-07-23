import React from 'react';
import { Link } from 'react-router-dom';
import { Container } from '../components/ui/Container';
import { Section, SectionHeader } from '../components/ui/Section';
import { subjects } from '../data/subjects';
import { Globe, Languages, BrainCircuit } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';

const iconMap = {
  globe: Globe,
  languages: Languages,
  brain: BrainCircuit,
};

const colorMap = {
  'Culture Générale': {
    bg: 'bg-blue-50',
    hoverBg: 'hover:bg-blue-100',
    text: 'text-blue-800',
    buttonBg: 'bg-blue-500',
    buttonHoverBg: 'hover:bg-blue-600',
  },
  'Anglais': {
    bg: 'bg-green-50',
    hoverBg: 'hover:bg-green-100',
    text: 'text-green-800',
    buttonBg: 'bg-green-500',
    buttonHoverBg: 'hover:bg-green-600',
  },
  'Logique': {
    bg: 'bg-yellow-50',
    hoverBg: 'hover:bg-yellow-100',
    text: 'text-yellow-800',
    buttonBg: 'bg-yellow-500',
    buttonHoverBg: 'hover:bg-yellow-600',
  },
}

const SubjectsPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <Section className="pt-32">
      <Container>
        <SectionHeader
          title="Nos matières"
          subtitle="Découvrez les différentes épreuves du concours et préparez-vous efficacement"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {subjects.map((subject) => {
            const Icon = iconMap[subject.icon as keyof typeof iconMap] || Globe;
            const colors = colorMap[subject.title as keyof typeof colorMap];
            return (
              <div key={subject.id}>
                <div className={`p-8 rounded-xl h-full flex flex-col shadow-sm transition-all ${colors.bg}`}>
                  <div className="flex-grow">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-5 ${colors.buttonBg}`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className={`text-xl font-bold mb-3 ${colors.text}`}>{subject.title}</h3>
                    <p className="text-neutral-600">{subject.description}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-12 text-center">
          <Button to="/signup" size="lg">
            S'inscrire pour commencer la préparation
          </Button>
        </div>
      </Container>
    </Section>
  );
};

export default SubjectsPage;