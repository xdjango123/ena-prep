import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { Section, SectionHeader } from '../components/ui/Section';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { testimonials } from '../data/testimonials';
import { staggerContainer, staggerItem } from '../utils/animations';

const ReviewsPage: React.FC = () => {
  // Calculate average rating
  const averageRating = testimonials.reduce((acc, curr) => acc + curr.rating, 0) / testimonials.length;
  
  return (
    <>
      <Section className="pt-32">
        <Container>
          <SectionHeader
            title="Témoignages de nos étudiants"
            subtitle="Découvrez les retours d'expérience de nos étudiants qui ont réussi le concours de l'ENA"
          />
          
          <div className="mb-12 p-6 bg-white shadow-md rounded-lg">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-center md:text-left">
                <h3 className="text-2xl font-bold mb-2">Satisfaction globale</h3>
                <p className="text-neutral-700 mb-4">
                  Basée sur {testimonials.length} avis vérifiés d'étudiants
                </p>
                <div className="flex items-center justify-center md:justify-start gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={24}
                      className={`${
                        i < Math.floor(averageRating) 
                          ? 'text-primary-500 fill-primary-500' 
                          : i < averageRating 
                            ? 'text-primary-500 fill-primary-500 opacity-50' 
                            : 'text-neutral-300'
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-2xl font-bold">{averageRating.toFixed(1)}</span>
                  <span className="text-neutral-500">/5</span>
                </div>
              </div>
              
              <div className="w-full md:w-auto">
                <Button to="/inscription" variant="primary" size="lg">
                  Rejoindre nos étudiants
                </Button>
              </div>
            </div>
          </div>
          
          <motion.div
            variants={staggerContainer(0.1)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {testimonials.map((testimonial) => (
              <motion.div key={testimonial.id} variants={staggerItem}>
                <Card className="h-full">
                  <CardContent>
                    <div className="flex mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={18}
                          className={`${
                            i < testimonial.rating ? 'text-primary-500 fill-primary-500' : 'text-neutral-300'
                          }`}
                        />
                      ))}
                    </div>
                    
                    <p className="text-neutral-700 mb-6">"{testimonial.content}"</p>
                    
                    <div className="flex items-center">
                      <img
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        className="w-12 h-12 rounded-full mr-4 object-cover"
                      />
                      <div>
                        <p className="font-semibold">{testimonial.name}</p>
                        <p className="text-sm text-neutral-600">{testimonial.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
          
          <div className="mt-12 p-6 text-center bg-neutral-50 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Vous êtes un ancien étudiant ?</h3>
            <p className="text-neutral-700 mb-6">
              Partagez votre expérience avec notre plateforme et aidez les futurs candidats à faire le bon choix.
            </p>
            <Button variant="primary">
              Laisser un avis
            </Button>
          </div>
        </Container>
      </Section>
    </>
  );
};

export default ReviewsPage;