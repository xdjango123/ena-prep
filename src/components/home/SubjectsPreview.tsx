import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Container } from '../ui/Container';
import { Section, SectionHeader } from '../ui/Section';
import { Card, CardContent } from '../ui/Card';
import { subjects } from '../../data/subjects';
import { staggerContainer, staggerItem } from '../../utils/animations';

export const SubjectsPreview: React.FC = () => {
  return (
    <Section>
      <Container>
        <SectionHeader
          title="Nos matières"
          subtitle="Découvrez les différentes épreuves du concours et préparez-vous efficacement"
        />
        
        <motion.div
          variants={staggerContainer(0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {subjects.map((subject) => {
            // @ts-ignore - Dynamic icon component
            const IconComponent = Icons[subject.icon] || Icons.BookOpen;
            
            return (
              <motion.div key={subject.id} variants={staggerItem}>
                <Link to={`/matieres/${subject.id}`}>
                  <Card interactive className="h-full transition-all hover:scale-105">
                    <CardContent className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mb-4">
                        <IconComponent size={28} className="text-primary-500" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">{subject.title}</h3>
                      <p className="text-neutral-700 text-sm mb-4">{subject.description}</p>
                      <div className="mt-auto flex items-center text-primary-500 font-medium">
                        <span>En savoir plus</span>
                        <ChevronRight size={16} className="ml-1" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
        
        <div className="text-center mt-10">
          <Link 
            to="/matieres" 
            className="inline-flex items-center text-lg font-medium text-primary-500 hover:text-primary-600"
          >
            Voir toutes les matières
            <ChevronRight size={20} className="ml-1" />
          </Link>
        </div>
      </Container>
    </Section>
  );
};