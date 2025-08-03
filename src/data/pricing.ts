import { PricingTierType } from '../types';

export const pricingTiers: PricingTierType[] = [
  {
    id: 'cm',
    name: 'Prépa CM',
    price: '10 000 FCFA',
    description: 'Accès complet au concours Cour Moyen (CM)',
    features: [
      'Accès illimité aux questions CM',
      'Examens blancs chronométrés',
      'Corrections détaillées',
      'Suivi de progression',
      'Support par email'
    ],
    buttonText: 'S\'abonner CM'
  },
  {
    id: 'cms',
    name: 'Prépa CMS',
    price: '15 000 FCFA',
    description: 'Accès complet au concours Cour Moyen Supérieur (CMS)',
    features: [
      'Accès illimité aux questions CMS',
      'Examens blancs chronométrés',
      'Corrections détaillées',
      'Suivi de progression',
      'Support par email'
    ],
    buttonText: 'S\'abonner CMS'
  },
  {
    id: 'cs',
    name: 'Prépa CS',
    price: '20 000 FCFA',
    description: 'Accès complet au concours Cour Supérieur (CS)',
    features: [
      'Accès illimité aux questions CS',
      'Examens blancs chronométrés',
      'Corrections détaillées',
      'Suivi de progression',
      'Support par email'
    ],
    buttonText: 'S\'abonner CS'
  }
];