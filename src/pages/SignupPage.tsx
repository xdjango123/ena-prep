import React from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { useAuth } from '../contexts/AuthContext';
import { ExamLevel } from '../types/auth';
import { CheckCircle, GraduationCap, BookOpen, Target, Award } from 'lucide-react';

const signupSchema = z.object({
  firstName: z.string().min(1, { message: "Le prénom est requis" }),
  lastName: z.string().min(1, { message: "Le nom est requis" }),
  email: z.string().email({ message: "L'email n'est pas valide" }),
  password: z.string().min(8, { message: "Le mot de passe doit contenir au moins 8 caractères" }),
  confirmPassword: z.string(),
  examLevel: z.string().min(1, { message: "Veuillez sélectionner un accès" })
}).refine(data => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

const SignupPage: React.FC = () => {
  const { signup } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema)
  });

  const onSubmit = async (data: SignupFormValues) => {
    try {
      await signup(data.email, data.password, data.firstName, data.lastName, data.examLevel as ExamLevel);
    } catch (error) {
      console.error(error);
    }
  };

  const benefits = [
    "Accès à des milliers de questions",
    "Tests pratiques et examens blancs",
    "Suivi de progression personnalisé",
    "Recommandations intelligentes",
  ]

  const examOptions = [
    { value: 'CM', label: 'Cour Moyen (CM)' },
    { value: 'CMS', label: 'Cour Moyen Supérieur (CMS)' },
    { value: 'CS', label: 'Cour Supérieur (CS)' }
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Panel with Custom Educational Theme */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20">
            <BookOpen className="w-32 h-32 text-white transform rotate-12" />
          </div>
          <div className="absolute top-40 right-32">
            <GraduationCap className="w-24 h-24 text-white transform -rotate-12" />
          </div>
          <div className="absolute bottom-40 left-32">
            <Target className="w-28 h-28 text-white transform rotate-45" />
          </div>
          <div className="absolute bottom-20 right-20">
            <Award className="w-20 h-20 text-white transform -rotate-45" />
          </div>
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          <div className="mb-8">
            <GraduationCap className="w-16 h-16 text-primary-200 mb-6" />
            <h2 className="text-4xl font-bold text-white mb-6">
              Rejoignez des milliers d'étudiants et réussissez votre concours
            </h2>
            <p className="text-primary-100 text-lg mb-8">
              Notre plateforme vous donne tous les outils pour maîtriser chaque épreuve et atteindre vos objectifs.
            </p>
          </div>
          
          <ul className="space-y-4">
            {benefits.map((benefit, i) => (
              <li key={i} className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-primary-300 flex-shrink-0" />
                <span className="text-white text-lg">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="text-primary-200 text-sm relative z-10">
                      © {new Date().getFullYear()} PrepaENA. Tous droits réservés.
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-neutral-50">
        <div className="w-full max-w-md p-8 space-y-8 bg-white shadow-lg rounded-xl">
          <div>
            <h2 className="text-center text-3xl font-extrabold text-neutral-900">
              Créer un compte
            </h2>
            <p className="mt-2 text-center text-sm text-neutral-600">
              Ou <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">connectez-vous</Link> si vous avez déjà un compte
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Prénom</Label>
                <Input id="firstName" type="text" {...register('firstName')} error={errors.firstName?.message} />
              </div>
              <div>
                <Label htmlFor="lastName">Nom</Label>
                <Input id="lastName" type="text" {...register('lastName')} error={errors.lastName?.message} />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register('email')} error={errors.email?.message} />
            </div>
            
            {/* New Onboarding Questions */}
            <div>
              <Label htmlFor="examLevel">Quel accès souhaitez-vous ?</Label>
              <select 
                id="examLevel" 
                {...register('examLevel')}
                className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Sélectionnez votre accès</option>
                {examOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {errors.examLevel && <p className="mt-1 text-sm text-red-600">{errors.examLevel.message}</p>}
            </div>

            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" autoComplete="new-password" {...register('password')} error={errors.password?.message} />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input id="confirmPassword" type="password" autoComplete="new-password" {...register('confirmPassword')} error={errors.confirmPassword?.message} />
            </div>

            <div>
              <Button type="submit" fullWidth disabled={isSubmitting}>
                {isSubmitting ? 'Création en cours...' : 'Créer mon compte'}
              </Button>
            </div>
          </form>
          <p className="px-8 text-center text-sm text-neutral-500">
            En créant un compte, vous acceptez nos <a href="#" className="underline">Conditions d'utilisation</a> et notre <a href="#" className="underline">Politique de confidentialité</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;