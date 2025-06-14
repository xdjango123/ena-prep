import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { Section, SectionHeader } from '../components/ui/Section';
import { Button } from '../components/ui/Button';
import { faqs } from '../data/faqs';
import { fadeIn } from '../utils/animations';

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer, isOpen, onToggle }) => {
  return (
    <div className="border-b border-neutral-200 last:border-b-0">
      <button
        className="flex justify-between items-center w-full py-4 text-left"
        onClick={onToggle}
      >
        <h3 className="text-lg font-medium pr-4">{question}</h3>
        <ChevronDown
          size={20}
          className={`text-neutral-500 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pb-4 text-neutral-700">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FAQPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'exam' | 'platform' | 'subscription'>('all');
  
  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };
  
  const filteredFaqs = activeCategory === 'all' 
    ? faqs 
    : faqs.filter(faq => faq.category === activeCategory);
  
  return (
    <>
      <Section className="pt-32">
        <Container>
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
          >
            <SectionHeader
              title="Questions fréquentes"
              subtitle="Retrouvez les réponses aux questions les plus courantes concernant l'ENA et notre plateforme"
            />
            
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              <button
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === 'all'
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
                onClick={() => setActiveCategory('all')}
              >
                Toutes les questions
              </button>
              <button
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === 'exam'
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
                onClick={() => setActiveCategory('exam')}
              >
                Concours ENA
              </button>
              <button
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === 'platform'
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
                onClick={() => setActiveCategory('platform')}
              >
                Notre plateforme
              </button>
              <button
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === 'subscription'
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
                onClick={() => setActiveCategory('subscription')}
              >
                Abonnements
              </button>
            </div>
          </motion.div>
          
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {filteredFaqs.map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={openIndex === index}
                onToggle={() => handleToggle(index)}
              />
            ))}
          </div>
          
          <div className="mt-12 bg-primary-50 rounded-lg p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">Une autre question ?</h3>
            <p className="text-neutral-700 mb-6 max-w-2xl mx-auto">
              Vous n'avez pas trouvé la réponse à votre question ? N'hésitez pas à nous contacter, notre équipe se fera un plaisir de vous aider.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button to="/contact" variant="primary" size="lg">
                Contactez-nous
              </Button>
              <Button to="/inscription" variant="outline" size="lg">
                S'inscrire
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
};

export default FAQPage;