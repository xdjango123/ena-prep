import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { fadeIn } from '../utils/animations';

const SignupPage: React.FC = () => {
  return (
    <div className="min-h-screen pt-32 pb-12 bg-neutral-50">
      <Container size="sm">
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
        >
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-primary-500 font-bold text-2xl">
              <GraduationCap size={32} />
              <span>ENA Préparation</span>
            </Link>
            <h1 className="text-3xl font-bold mt-6 mb-2">Créer un compte</h1>
            <p className="text-neutral-700">
              Rejoignez notre communauté et commencez votre préparation
            </p>
          </div>
          
          <Card>
            <CardContent className="p-8">
              <form className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="first-name" className="block text-sm font-medium text-neutral-700 mb-1">
                      Prénom
                    </label>
                    <input
                      id="first-name"
                      name="first-name"
                      type="text"
                      autoComplete="given-name"
                      required
                      className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="last-name" className="block text-sm font-medium text-neutral-700 mb-1">
                      Nom
                    </label>
                    <input
                      id="last-name"
                      name="last-name"
                      type="text"
                      autoComplete="family-name"
                      required
                      className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="votre@email.com"
                  />
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
                    Mot de passe
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <p className="mt-1 text-sm text-neutral-500">
                    Au moins 8 caractères, incluant une lettre majuscule et un chiffre
                  </p>
                </div>
                
                <div>
                  <label htmlFor="password-confirm" className="block text-sm font-medium text-neutral-700 mb-1">
                    Confirmer le mot de passe
                  </label>
                  <input
                    id="password-confirm"
                    name="password-confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                <div className="flex items-start">
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    required
                    className="h-4 w-4 mt-1 text-primary-500 border-neutral-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="terms" className="ml-2 block text-sm text-neutral-700">
                    J'accepte les{' '}
                    <Link to="/conditions" className="text-primary-600 hover:text-primary-500">
                      conditions d'utilisation
                    </Link>{' '}
                    et la{' '}
                    <Link to="/confidentialite" className="text-primary-600 hover:text-primary-500">
                      politique de confidentialité
                    </Link>
                  </label>
                </div>
                
                <Button type="submit" variant="primary" fullWidth size="lg">
                  Créer mon compte
                </Button>
              </form>
              
              <div className="mt-8 pt-6 border-t border-neutral-200 text-center">
                <p className="text-neutral-700">
                  Vous avez déjà un compte ?{' '}
                  <Link to="/connexion" className="text-primary-600 font-medium hover:text-primary-500">
                    Connectez-vous
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </Container>
    </div>
  );
};

export default SignupPage;