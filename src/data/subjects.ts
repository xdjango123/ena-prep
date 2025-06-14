import { SubjectType } from '../types';

export const subjects: SubjectType[] = [
  {
    id: 'numerical',
    title: 'Aptitude Numérique',
    description: 'Développez vos compétences en raisonnement mathématique et résolution de problèmes quantitatifs, essentiels pour l\'ENA.',
    icon: 'calculator',
    sampleQuestion: 'Si 3 examinateurs peuvent évaluer 15 candidats en 5 heures, combien faut-il d\'examinateurs pour évaluer 45 candidats en 3 heures?',
    sampleAnswer: '15 examinateurs'
  },
  {
    id: 'verbal',
    title: 'Aptitude Verbale',
    description: 'Améliorez votre maîtrise de la langue française, compréhension de texte et expression écrite.',
    icon: 'book-open',
    sampleQuestion: 'Quel est l\'antonyme du mot "Prolixe"?',
    sampleAnswer: 'Concis'
  },
  {
    id: 'culture',
    title: 'Culture Générale',
    description: 'Enrichissez vos connaissances sur l\'histoire, la politique, l\'économie et les enjeux contemporains.',
    icon: 'globe',
    sampleQuestion: 'Quel traité a marqué la création de l\'Union européenne?',
    sampleAnswer: 'Le Traité de Maastricht'
  },
  {
    id: 'english',
    title: 'Anglais',
    description: 'Perfectionnez votre anglais professionnel pour les épreuves internationales de l\'ENA.',
    icon: 'languages',
    sampleQuestion: 'What is the equivalent of the ENA in the United Kingdom?',
    sampleAnswer: 'The Civil Service Fast Stream'
  }
];