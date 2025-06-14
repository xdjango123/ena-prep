import React from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { Container } from '../components/ui/Container';
import { Section, SectionHeader } from '../components/ui/Section';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { subjects } from '../data/subjects';
import { staggerContainer, staggerItem } from '../utils/animations';

const SubjectsPage: React.FC = () => {
  return (
    <>
      <Section className="pt-32">
        <Container>
          <SectionHeader
            title="Nos matières"
            subtitle="Découvrez les différentes épreuves du concours et préparez-vous efficacement avec nos modules spécialisés"
          />
          
          <motion.div
            variants={staggerContainer(0.1)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {subjects.map((subject) => {
              // @ts-ignore - Dynamic icon component
              const IconComponent = Icons[subject.icon] || Icons.BookOpen;
              
              return (
                <motion.div key={subject.id} variants={staggerItem}>
                  <Card className="h-full">
                    <CardContent>
                      <div className="flex flex-col md:flex-row md:items-start gap-6">
                        <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center shrink-0 mx-auto md:mx-0">
                          <IconComponent size={28} className="text-primary-500" />
                        </div>
                        
                        <div>
                          <h3 className="text-2xl font-bold mb-3 text-center md:text-left">{subject.title}</h3>
                          <p className="text-neutral-700 mb-6">{subject.description}</p>
                          
                          <div className="bg-neutral-50 rounded-lg p-4 mb-6">
                            <p className="font-medium mb-2">Question d'exemple:</p>
                            <p className="text-neutral-800 italic mb-3">{subject.sampleQuestion}</p>
                            {subject.sampleAnswer && (
                              <div className="text-primary-600">
                                <p className="font-medium">Réponse: {subject.sampleAnswer}</p>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col sm:flex-row gap-4">
                            <Button 
                              to={`/matieres/${subject.id}`} 
                              variant="primary"
                            >
                              Explorer cette matière
                            </Button>
                            <Button 
                              to="/inscription" 
                              variant="outline"
                            >
                              S'inscrire pour y accéder
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
          
          <div className="mt-12 p-6 bg-primary-50 rounded-lg border border-primary-100">
            <h3 className="text-xl font-semibold mb-4 text-primary-800">Vous souhaitez accéder à l'ensemble de nos contenus ?</h3>
            <p className="text-neutral-700 mb-6">
              Inscrivez-vous dès maintenant pour bénéficier d'un accès complet à notre plateforme de préparation.
              Nos modules d'apprentissage comprennent des milliers de questions, des examens blancs et un suivi personnalisé.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button to="/inscription" variant="primary" size="lg">
                S'inscrire maintenant
              </Button>
              <Button to="/tarification" variant="outline" size="lg">
                Voir nos formules
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
};

export default SubjectsPage;