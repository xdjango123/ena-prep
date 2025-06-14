import { PricingTierType } from '../types';

export const pricingTiers: PricingTierType[] = [
  {
    id: 'free',
    name: 'Découverte',
    price: 'Gratuit',
    description: 'Accès limité aux ressources de base pour découvrir la plateforme',
    features: [
      'Accès à 10 questions par matière',
      'Articles de blog éducatifs',
      'Guide d\'introduction à l\'ENA',
      'Forum communautaire (lecture seule)'
    ],
    buttonText: 'Commencer gratuitement'
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '39,99€/mois',
    description: 'Accès complet à toutes les ressources et fonctionnalités',
    popular: true,
    features: [
      'Accès illimité à toutes les questions',
      'Examens blancs chronométrés',
      'Suivi de progression personnalisé',
      'Corrections détaillées et personnalisées',
      'Accès à la communauté d\'entraide',
      'Séminaires mensuels en ligne',
      'Garantie de remboursement de 30 jours'
    ],
    buttonText: 'S\'abonner maintenant'
  },
  {
    id: 'coaching',
    name: 'Coaching',
    price: '99,99€/mois',
    description: 'L\'expérience Premium avec un coach personnel pour un accompagnement sur mesure',
    features: [
      'Tous les avantages Premium',
      '2 sessions de coaching individuel par mois',
      'Feedback personnalisé sur vos réponses',
      'Plan d\'étude sur mesure',
      'Préparation à l\'entretien oral',
      'Accès prioritaire aux nouveaux contenus',
      'Support 7j/7 par email'
    ],
    buttonText: 'Démarrer avec un coach'
  }
];