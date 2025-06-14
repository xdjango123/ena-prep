import React from 'react';
import { motion } from 'framer-motion';
import { Star, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Container } from '../ui/Container';
import { Section, SectionHeader } from '../ui/Section';
import { Card, CardContent } from '../ui/Card';
import { testimonials } from '../../data/testimonials';
import { staggerContainer, staggerItem } from '../../utils/animations';

export const TestimonialsPreview: React.FC = () => {
  const displayedTestimonials = testimonials.slice(0, 3);
  
  return (
    <Section className="bg-neutral-50">
      <Container>
        <SectionHeader
          title="Ce que disent nos étudiants"
          subtitle="Découvrez comment notre plateforme a aidé nos étudiants à réussir l'ENA"
        />
        
        <motion.div
          variants={staggerContainer(0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {displayedTestimonials.map((testimonial) => (
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
        
        <div className="text-center mt-10">
          <Link 
            to="/avis" 
            className="inline-flex items-center text-lg font-medium text-primary-500 hover:text-primary-600"
          >
            Voir tous les témoignages
            <ChevronRight size={20} className="ml-1" />
          </Link>
        </div>
      </Container>
    </Section>
  );
};