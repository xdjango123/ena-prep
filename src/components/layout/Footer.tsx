import React from 'react';
import { Link } from 'react-router-dom';
import { Container } from '../ui/Container';
import { 
  GraduationCap, 
  Mail, 
  Phone, 
  MapPin, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Instagram 
} from 'lucide-react';

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
          <div className="min-w-0">
            <Link to="/" className="flex items-center gap-2 text-primary-500 font-bold text-xl mb-4">
              <GraduationCap size={28} className="flex-shrink-0" />
              <span className="truncate">PrepaENA</span>
            </Link>
            <p className="text-neutral-400 mb-6">
              Le site de référence pour réussir l'ENA. Nous vous accompagnons vers la réussite.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-neutral-400">
                <Mail size={18} className="flex-shrink-0" />
                <span className="truncate">contact@prepaena.fr</span>
              </div>
              <div className="flex items-center gap-3 text-neutral-400">
                <Phone size={18} className="flex-shrink-0" />
                <span className="truncate">+225 XX-XX-XX-XX</span>
              </div>
              <div className="flex items-center gap-3 text-neutral-400">
                <MapPin size={18} className="flex-shrink-0" />
                <span className="truncate">Abidjan, Côte d'Ivoire</span>
              </div>
            </div>
          </div>
          
          <div className="min-w-0">
            <h3 className="font-semibold text-white mb-4">Navigation</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="text-neutral-400 hover:text-white transition-colors">
                  Accueil
                </Link>
              </li>
              <li>
                <Link to="/matieres" className="text-neutral-400 hover:text-white transition-colors">
                  Matières
                </Link>
              </li>
              <li>
                <Link to="/avis" className="text-neutral-400 hover:text-white transition-colors">
                  Avis
                </Link>
              </li>
              <li>
                <Link to="/tarification" className="text-neutral-400 hover:text-white transition-colors">
                  Tarification
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-neutral-400 hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>
          
          <div className="min-w-0">
            <h3 className="font-semibold text-white mb-4">Support</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/centre-aide" className="text-neutral-400 hover:text-white transition-colors">
                  Centre d'aide
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-neutral-400 hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/mentions-legales" className="text-neutral-400 hover:text-white transition-colors">
                  Mentions légales
                </Link>
              </li>
            </ul>
          </div>
          
          <div className="min-w-0">
            <h3 className="font-semibold text-white mb-4">Suivez-nous</h3>
            <div className="flex space-x-4">
              {socialLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.name}
                    href={link.href}
                    className="text-neutral-400 hover:text-white transition-colors"
                    aria-label={link.name}
                  >
                    <Icon size={20} />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
        
        <div className="border-t border-neutral-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-neutral-400 text-sm">
              © {currentYear} PrepaENA. Tous droits réservés.
            </p>
            <div className="flex space-x-6 text-sm">
              <Link to="/confidentialite" className="text-neutral-400 hover:text-white transition-colors">
                Politique de confidentialité
              </Link>
              <Link to="/cookies" className="text-neutral-400 hover:text-white transition-colors">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
};
