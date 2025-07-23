import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Menu, X, GraduationCap, LogOut, User, Settings, CreditCard, TrendingUp, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';

const navigation = [
  { name: 'Accueil', to: '/' },
  { name: 'Matières', to: '/matieres' },
  { name: 'Avis', to: '/avis' },
  { name: 'Tarification', to: '/tarification' },
  { name: 'FAQ', to: '/faq' },
];

export const Header: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (isUserMenuOpen) {
        setIsUserMenuOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('click', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-primary-600 shadow-md py-3' : 'bg-primary-600 shadow-sm py-4'
      }`}
    >
      <Container>
        <div className="flex items-center justify-between w-full">
          {/* Logo - Far Left */}
          <div className="flex-shrink-0">
            <Link 
              to="/" 
              className="flex items-center gap-2 text-white font-bold text-xl"
            >
              <GraduationCap size={28} />
              <span>ENAplus<sup className="text-sm">+</sup></span>
            </Link>
          </div>

          {/* Desktop Navigation - Center */}
          <nav className="hidden md:flex items-center space-x-6 flex-1 justify-center">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.to}
                className={({ isActive }) => 
                  `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-white bg-primary-700'
                      : 'text-white/90 hover:text-white hover:bg-primary-700'
                  }`
                }
              >
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* User Section - Far Right */}
          <div className="hidden md:flex items-center space-x-4 flex-shrink-0">
            {isAuthenticated ? (
              <div 
                className="relative"
                onMouseEnter={() => setIsUserMenuOpen(true)}
                onMouseLeave={() => setIsUserMenuOpen(false)}
              >
                <Link 
                    to="/dashboard" 
                    className="flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium text-white/90 hover:text-white hover:bg-primary-700"
                >
                  <User className="w-5 h-5" />
                  <span>{user?.name}</span>
                </Link>
                
                <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 border"
                  >
                    <div className="px-4 py-2 text-sm text-gray-500 border-b">
                        Connecté en tant que <strong>{user?.name}</strong>
                    </div>
                    <Link
                      to="/dashboard"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Tableau de bord
                    </Link>
                    <div className="border-t border-gray-100 my-1"></div>
                    <Link
                      to="/dashboard/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Mon Profil
                    </Link>
                    <Link
                      to="/dashboard/billing"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Abonnement
                    </Link>
                    <Link
                      to="/dashboard/analytics"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Analytics
                    </Link>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Se déconnecter
                    </button>
                  </motion.div>
                )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" size="sm" className="border-white text-white hover:bg-white hover:text-primary-600">
                    Connexion
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="accent" size="sm">
                    Inscription
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md text-white hover:bg-primary-700"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </Container>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-primary-700 border-t border-primary-500 mt-2"
          >
            <Container>
              <div className="py-2 space-y-1">
                {navigation.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.to}
                    className={({ isActive }) =>
                      `block px-3 py-2 rounded-md text-base font-medium ${
                        isActive
                          ? 'bg-primary-800 text-white'
                          : 'text-white/90 hover:bg-primary-800 hover:text-white'
                      }`
                    }
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                  </NavLink>
                ))}
                <div className="pt-4 pb-2 border-t border-primary-500">
                  {isAuthenticated ? (
                    <div className="space-y-2">
                      <div className="px-3 py-2 text-sm font-medium text-white/70">
                        Connecté en tant que {user?.name}
                      </div>
                      <Link
                        to="/dashboard"
                        className="block px-3 py-2 rounded-md text-base font-medium text-white/90 hover:bg-primary-800 hover:text-white"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Tableau de bord
                      </Link>
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-white/90 hover:bg-primary-800 hover:text-white flex items-center"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Se déconnecter
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-2">
                      <Link to="/login" className="w-full">
                        <Button variant="outline" fullWidth className="border-white text-white hover:bg-white hover:text-primary-600">
                          Connexion
                        </Button>
                      </Link>
                      <Link to="/signup" className="w-full">
                        <Button variant="accent" fullWidth>
                          Inscription
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};