import React from 'react';
import { motion } from 'framer-motion';
import { Container } from '../components/ui/Container';
import { Section, SectionHeader } from '../components/ui/Section';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { fadeIn, slideUp, staggerContainer, staggerItem } from '../utils/animations';

const AboutPage: React.FC = () => {
  const teamMembers = [
    {
      name: 'Dr. Antoine Dupont',
      role: 'Fondateur et Directeur Pédagogique',
      bio: 'Ancien élève de l\'ENA, docteur en sciences politiques et auteur de plusieurs ouvrages de référence sur les concours administratifs.',
      image: 'https://images.pexels.com/photos/5490276/pexels-photo-5490276.jpeg?auto=compress&cs=tinysrgb&w=200'
    },
    {
      name: 'Prof. Marie Laurent',
      role: 'Responsable des Matières Juridiques',
      bio: 'Professeure agrégée de droit public, spécialiste du droit constitutionnel et administratif, avec 15 ans d\'expérience dans la préparation aux concours.',
      image: 'https://images.pexels.com/photos/762020/pexels-photo-762020.jpeg?auto=compress&cs=tinysrgb&w=200'
    },
    {
      name: 'Paul Mercier',
      role: 'Expert en Culture Générale',
      bio: 'Normalien, agrégé de philosophie et auteur de nombreuses publications sur les problématiques contemporaines abordées au concours de l\'ENA.',
      image: 'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=200'
    },
    {
      name: 'Sophie Renard',
      role: 'Responsable des Relations Étudiants',
      bio: 'Diplômée de Sciences Po et de l\'ENA, ancienne haut fonctionnaire, spécialiste de l\'accompagnement personnalisé des candidats.',
      image: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=200'
    }
  ];

  return (
    <>
      <Section className="pt-32">
        <Container>
          <div className="max-w-3xl mx-auto text-center mb-16">
            <motion.h1 
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              className="text-4xl md:text-5xl font-bold mb-6"
            >
              À propos de nous
            </motion.h1>
            
            <motion.p
              variants={slideUp}
              initial="hidden"
              animate="visible"
              className="text-xl text-neutral-700 mb-8"
            >
              Nous sommes une équipe d'anciens élèves de l'ENA et d'experts en préparation aux concours administratifs, dédiés à la réussite de nos étudiants.
            </motion.p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <motion.div
              variants={fadeIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold mb-6">Notre mission</h2>
              <p className="text-lg text-neutral-700 mb-6">
                Fondée en 2018 par d'anciens élèves de l'ENA, notre plateforme est née d'une conviction : la préparation au concours doit être accessible à tous les talents, quelle que soit leur origine sociale ou géographique.
              </p>
              <p className="text-lg text-neutral-700 mb-6">
                Notre mission est de démocratiser l'accès à la haute fonction publique en proposant une préparation en ligne complète et de qualité, à un prix abordable, pour permettre à chacun de donner le meilleur de lui-même.
              </p>
              <p className="text-lg text-neutral-700">
                Chaque année, nous accompagnons des centaines d'étudiants vers la réussite, avec un taux d'admission parmi les plus élevés du secteur.
              </p>
            </motion.div>
            
            <motion.div
              variants={slideUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="rounded-lg overflow-hidden shadow-lg"
            >
              <img 
                src="https://images.pexels.com/photos/3184431/pexels-photo-3184431.jpeg?auto=compress&cs=tinysrgb&w=600" 
                alt="Notre équipe" 
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>
          
          <div className="mb-16">
            <SectionHeader
              title="Notre équipe pédagogique"
              subtitle="Des experts reconnus dans leur domaine, passionnés par la transmission du savoir"
            />
            
            <motion.div
              variants={staggerContainer(0.1)}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {teamMembers.map((member, index) => (
                <motion.div key={index} variants={staggerItem}>
                  <Card className="h-full">
                    <CardContent className="text-center">
                      <img 
                        src={member.image}
                        alt={member.name}
                        className="w-32 h-32 object-cover rounded-full mx-auto mb-4"
                      />
                      <h3 className="text-xl font-bold mb-1">{member.name}</h3>
                      <p className="text-primary-500 font-medium mb-4">{member.role}</p>
                      <p className="text-neutral-700 text-sm">{member.bio}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
          
          <div className="bg-primary-50 rounded-lg p-8 border border-primary-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl font-bold mb-4">Rejoignez notre communauté</h3>
                <p className="text-neutral-700 mb-6">
                  En vous inscrivant sur notre plateforme, vous rejoignez une communauté dynamique d'étudiants et d'anciens élèves qui partagent la même ambition et les mêmes valeurs d'excellence et d'entraide.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button to="/inscription" variant="primary">
                    S'inscrire maintenant
                  </Button>
                  <Button to="/contact" variant="outline">
                    Contactez-nous
                  </Button>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-md">
                <h4 className="font-bold mb-4">Nos valeurs</h4>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <div className="shrink-0 mt-1">
                      <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">1</span>
                      </div>
                    </div>
                    <span className="ml-3 text-neutral-700">
                      <strong className="block text-neutral-900">Excellence</strong>
                      Une exigence de qualité dans tous nos contenus et services
                    </span>
                  </li>
                  <li className="flex items-start">
                    <div className="shrink-0 mt-1">
                      <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">2</span>
                      </div>
                    </div>
                    <span className="ml-3 text-neutral-700">
                      <strong className="block text-neutral-900">Accessibilité</strong>
                      Démocratiser l'accès à la haute fonction publique
                    </span>
                  </li>
                  <li className="flex items-start">
                    <div className="shrink-0 mt-1">
                      <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">3</span>
                      </div>
                    </div>
                    <span className="ml-3 text-neutral-700">
                      <strong className="block text-neutral-900">Innovation</strong>
                      Des méthodes pédagogiques modernes et efficaces
                    </span>
                  </li>
                  <li className="flex items-start">
                    <div className="shrink-0 mt-1">
                      <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">4</span>
                      </div>
                    </div>
                    <span className="ml-3 text-neutral-700">
                      <strong className="block text-neutral-900">Bienveillance</strong>
                      Un accompagnement personnalisé et respectueux
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
};

export default AboutPage;