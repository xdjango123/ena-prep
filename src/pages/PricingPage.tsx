import React from 'react';
import { motion } from 'framer-motion';
import { Check, HelpCircle } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { Section, SectionHeader } from '../components/ui/Section';
import { Card, CardHeader, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { pricingTiers } from '../data/pricing';
import { staggerContainer, staggerItem } from '../utils/animations';

const PricingPage: React.FC = () => {
  return (
    <>
      <Section className="pt-32">
        <Container>
          <SectionHeader
            title="Tarification"
            subtitle="Choisissez la formule qui correspond à vos besoins et objectifs"
          />
          
          <motion.div
            variants={staggerContainer(0.1)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {pricingTiers.map((tier) => (
              <motion.div 
                key={tier.id} 
                variants={staggerItem}
                className={`relative ${tier.popular ? 'md:-mt-4 md:mb-4' : ''}`}
              >
                {tier.popular && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Recommandé
                  </div>
                )}
                
                <Card className={`h-full border ${tier.popular ? 'border-primary-500 shadow-xl' : 'border-neutral-200'}`}>
                  <CardHeader className={`${tier.popular ? 'bg-primary-50' : ''}`}>
                    <h3 className="text-2xl font-bold">{tier.name}</h3>
                    <div className="mt-4">
                      <span className="text-3xl font-bold">{tier.price}</span>
                      {tier.id !== 'free' && <span className="text-neutral-600 ml-2">/mois</span>}
                    </div>
                    <p className="mt-2 text-neutral-600">{tier.description}</p>
                  </CardHeader>
                  
                  <CardContent>
                    <ul className="space-y-3">
                      {tier.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <div className="shrink-0 mt-1">
                            <Check size={18} className="text-primary-500" />
                          </div>
                          <span className="ml-3 text-neutral-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  
                  <CardFooter>
                    <Button
                      variant={tier.popular ? 'primary' : 'outline'}
                      to="/inscription"
                      fullWidth
                      size="lg"
                    >
                      {tier.buttonText}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </motion.div>
          
          <div className="mt-16">
            <h3 className="text-2xl font-bold mb-6 text-center">Questions fréquentes sur les abonnements</h3>
            
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="bg-white shadow-sm rounded-lg p-6">
                <div className="flex items-start">
                  <div className="shrink-0 mt-1">
                    <HelpCircle size={20} className="text-primary-500" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium mb-2">Puis-je changer de formule à tout moment ?</h4>
                    <p className="text-neutral-700">
                      Oui, vous pouvez passer à une formule supérieure à tout moment. Le montant sera calculé au prorata de votre abonnement actuel. Pour passer à une formule inférieure, le changement prendra effet à la fin de votre période de facturation en cours.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white shadow-sm rounded-lg p-6">
                <div className="flex items-start">
                  <div className="shrink-0 mt-1">
                    <HelpCircle size={20} className="text-primary-500" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium mb-2">Comment fonctionne la garantie satisfait ou remboursé ?</h4>
                    <p className="text-neutral-700">
                      Nous offrons une garantie de remboursement de 30 jours sur tous nos abonnements Premium et Coaching. Si vous n'êtes pas satisfait, contactez-nous dans les 30 jours suivant votre inscription pour obtenir un remboursement complet, sans justification nécessaire.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white shadow-sm rounded-lg p-6">
                <div className="flex items-start">
                  <div className="shrink-0 mt-1">
                    <HelpCircle size={20} className="text-primary-500" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium mb-2">Y a-t-il un engagement de durée ?</h4>
                    <p className="text-neutral-700">
                      Non, tous nos abonnements sont sans engagement. Vous pouvez annuler à tout moment depuis votre espace membre. L'annulation prendra effet à la fin de votre période de facturation en cours.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
};

export default PricingPage;