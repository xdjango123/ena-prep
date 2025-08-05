import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';
import { Container } from '../ui/Container';

const footerNavigation = {
  main: [
    { name: 'Accueil', to: '/' },
    { name: 'Matières', to: '/matieres' },
    { name: 'Avis', to: '/avis' },
    { name: 'Tarification', to: '/tarification' },
    { name: 'À propos', to: '/a-propos' },
    { name: 'FAQ', to: '/faq' },
  ],
  legal: [
    { name: 'Conditions d\'utilisation', to: '/conditions' },
    { name: 'Politique de confidentialité', to: '/confidentialite' },
    { name: 'Mentions légales', to: '/mentions-legales' },
  ],
  support: [
    { name: 'Centre d\'aide', to: '/aide' },
    { name: 'Contact', to: '/contact' },
  ],
};

const socialLinks = [
  { name: 'Facebook', icon: Facebook, href: '#' },
  { name: 'Twitter', icon: Twitter, href: '#' },
  { name: 'LinkedIn', icon: Linkedin, href: '#' },
  { name: 'Instagram', icon: Instagram, href: '#' },
];

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-neutral-950 text-white pt-12 pb-8 mt-16">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div>
            <Link to="/" className="flex items-center gap-2 text-primary-500 font-bold text-xl mb-4">
              <GraduationCap size={28} />
              <span>PrepaENA</span>
            </Link>
            <p className="text-neutral-400 mb-6">
              Le site de référence pour réussir l'ENA. Nous vous accompagnons vers la réussite.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-neutral-400">
                <Mail size={18} />
                <span>contact@prepaena.fr</span>
              </div>
              <div className="flex items-center gap-3 text-neutral-400">
                <Phone size={18} />
                <span>+225 XX-XX-XX-XX</span>
              </div>
              <div className="flex items-center gap-3 text-neutral-400">
                <MapPin size={18} />
                <span>Abidjan, Côte d'Ivoire</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Navigation</h3>
            <ul className="space-y-2">
              {footerNavigation.main.map((item) => (
                <li key={item.name}>
                  <Link to={item.to} className="text-neutral-400 hover:text-primary-500 transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              {footerNavigation.support.map((item) => (
                <li key={item.name}>
                  <Link to={item.to} className="text-neutral-400 hover:text-primary-500 transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
            
            <h3 className="text-lg font-semibold mt-6 mb-4">Mentions légales</h3>
            <ul className="space-y-2">
              {footerNavigation.legal.map((item) => (
                <li key={item.name}>
                  <Link to={item.to} className="text-neutral-400 hover:text-primary-500 transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Suivez-nous</h3>
            <div className="flex space-x-4 mb-6">
              {socialLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <a 
                    key={item.name}
                    href={item.href}
                    className="text-neutral-400 hover:text-primary-500 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon size={24} />
                  </a>
                );
              })}
            </div>
            
            <h3 className="text-lg font-semibold mb-4">Newsletter</h3>
            <p className="text-neutral-400 mb-3">
              Recevez nos conseils et actualités
            </p>
            <form className="flex">
              <input
                type="email"
                placeholder="Votre email"
                className="px-4 py-2 bg-neutral-800 text-white rounded-l-md flex-1 focus:outline-none"
              />
              <button
                type="submit"
                className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-r-md transition-colors"
              >
                S'abonner
              </button>
            </form>
          </div>
        </div>
        
        <div className="pt-8 border-t border-neutral-800 text-center text-neutral-500">
          <p>© {currentYear} PrepaENA. Tous droits réservés.</p>
        </div>
      </Container>
    </footer>
  );
};