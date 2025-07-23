import React from 'react';
import { motion } from 'framer-motion';
import { Check, HelpCircle } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { Section, SectionHeader } from '../components/ui/Section';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { pricingTiers } from '../data/pricing';
import { staggerContainer, staggerItem } from '../utils/animations';

const PricingPage: React.FC = () => {
  return (
    <>
      <Section className="pt-8 pb-8">
        <Container>
          <SectionHeader
            title="Tarification"
            subtitle="Choisissez la formule qui correspond à vos besoins et objectifs"
            className="mb-4"
          />
          
          <motion.div
            variants={staggerContainer(0.1)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto mb-4"
          >
            {pricingTiers.filter(tier => tier.id !== 'all').map((tier, idx) => (
              <motion.div 
                key={tier.id} 
                variants={staggerItem}
                className="relative"
              >
                <Card className={`h-full border border-neutral-200 transition-all duration-300 hover:shadow-lg`}>
                  <CardHeader className="text-center">
                    <h3 className="text-2xl font-bold">
                      {idx === 0 ? 'Cour Moyen' : idx === 1 ? 'Cour Moyen Supérieur' : 'Cour Supérieur'}
                    </h3>
                    <div className="mt-4">
                      <span className="text-3xl font-bold">{tier.price}</span>
                    </div>
                    <div className="mt-6">
                      <Button
                        variant="outline"
                        to="/signup"
                        fullWidth
                        size="lg"
                        className="min-h-[50px] flex items-center justify-center text-lg font-bold text-primary-700 border-primary-500 hover:bg-primary-50 hover:text-primary-900"
                      >
                        {tier.buttonText}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <ul className="space-y-3">
                      {tier.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <div className="shrink-0 mt-1">
                            <Check size={18} className="text-primary-500" />
                          </div>
                          <span className="ml-3 text-neutral-700">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Compact horizontal block for Accès Total */}
          <div className="max-w-6xl mx-auto mt-2 flex justify-center">
            {pricingTiers.filter(tier => tier.id === 'all').map((tier) => (
              <div key={tier.id} className="flex flex-col md:flex-row items-center bg-primary-50 border border-primary-200 rounded-2xl shadow-sm px-10 py-6 gap-4 w-full max-w-6xl">
                <div className="flex-1 text-center md:text-left">
                  <div className="text-lg font-bold text-primary-800 mb-1">{tier.name}</div>
                  <div className="text-xl font-bold text-primary-900 mb-1">{tier.price}</div>
                  <div className="text-sm text-primary-700 mb-2">Accès à tous les concours (CM, CMS, CS)</div>
                </div>
                <Button
                  variant="primary"
                  to="/signup"
                  size="lg"
                  className="min-w-[180px]"
                >
                  {tier.buttonText}
                </Button>
              </div>
            ))}
          </div>
          
          <div className="mt-8">
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
                      Nous offrons une garantie de remboursement de 30 jours sur tous nos abonnements Premium et Intégral. Si vous n'êtes pas satisfait, contactez-nous dans les 30 jours suivant votre inscription pour obtenir un remboursement complet, sans justification nécessaire.
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