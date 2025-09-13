import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PasswordInput } from '../components/ui/PasswordInput';
import { Label } from '../components/ui/Label';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { CheckCircle, Loader, GraduationCap, BookOpen, Target, Award, AlertCircle } from 'lucide-react';

const signupSchema = z.object({
  firstName: z.string().min(1, { message: "Le prénom est requis" }),
  lastName: z.string().min(1, { message: "Le nom est requis" }),
  email: z.string().email({ message: "L'email n'est pas valide" }),
  password: z.string().min(8, { message: "Le mot de passe doit contenir au moins 8 caractères" }),
  confirmPassword: z.string().min(1, { message: "La confirmation du mot de passe est requise" }),
  examType: z.enum(['CM', 'CMS', 'CS'], { message: "Veuillez sélectionner un type d'examen" }),
  planName: z.string().min(1, { message: "Veuillez sélectionner un plan" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

const SignupPage: React.FC = () => {
  const { signUp, user, isLoading } = useSupabaseAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, watch } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      examType: 'CM',
      planName: 'Prépa CM'
    }
  });

  const watchedExamType = watch('examType');

  // Function to translate Supabase error messages to French
  const translateError = (errorMessage: string): string => {
    const errorTranslations: { [key: string]: string } = {
      'Invalid email or password': 'Incorrect Email ou Mot de passe',
      'Email not confirmed': 'Email non confirmé',
      'Too many requests': 'Trop de tentatives. Veuillez réessayer plus tard',
      'User not found': 'Utilisateur non trouvé',
      'Invalid email': 'Email invalide',
      'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères',
      'Unable to validate email address: invalid format': 'Format d\'email invalide',
      'Signup is disabled': 'L\'inscription est désactivée',
      'Email address not authorized': 'Adresse email non autorisée',
      'Invalid password': 'Mot de passe incorrect',
      'Invalid credentials': 'Mot de passe incorrect',
      'User already registered': 'Utilisateur déjà enregistré',
      'Email already registered': 'Email déjà enregistré',
      'Password is too weak': 'Le mot de passe est trop faible',
      'Invalid email format': 'Format d\'email invalide'
    };

    // Check for exact matches first
    if (errorTranslations[errorMessage]) {
      return errorTranslations[errorMessage];
    }

    // Check for partial matches
    for (const [english, french] of Object.entries(errorTranslations)) {
      if (errorMessage.toLowerCase().includes(english.toLowerCase())) {
        return french;
      }
    }

    // Default fallback
    return 'Une erreur est survenue lors de l\'inscription.';
  };

  // Update plan name when exam type changes
  React.useEffect(() => {
    const planMap = {
      'CM': 'Prépa CM',
      'CMS': 'Prépa CMS',
      'CS': 'Prépa CS'
    };
    
    // This will be handled by the form validation, but we can set it for display
  }, [watchedExamType]);

  const onSubmit = async (data: SignupFormValues) => {
    setIsSubmitting(true);
    setError('');
    
    try {
      // Ensure plan name matches exam type
      const planMap = {
        'CM': 'Prépa CM',
        'CMS': 'Prépa CMS',
        'CS': 'Prépa CS'
      };
      
      const finalData = {
        ...data,
        planName: planMap[data.examType]
      };

      const { error } = await signUp(
        finalData.email,
        finalData.password,
        finalData.firstName,
        finalData.lastName,
        finalData.examType,
        finalData.planName
      );
      
      if (error) {
        const translatedError = translateError(error.message);
        setError(translatedError);
      } else {
        setSuccess(true);
        // Don't navigate immediately, show success message first
      }
    } catch (err) {
      setError('Une erreur inattendue est survenue.');
      console.error('Signup error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const benefits = [
    "Accès à des milliers de questions",
    "Tests pratiques et examens blancs",
    "Suivi de progression personnalisé",
    "Recommandations intelligentes",
  ];

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Inscription réussie !</h2>
          <p className="text-gray-600 mb-6">
            Vérifiez votre email pour confirmer votre compte avant de vous connecter.
          </p>
          <Button onClick={() => navigate('/login')} fullWidth>
            Aller à la connexion
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-primary-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 flex flex-col justify-between h-full px-12 py-12 text-white">
          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-4">Rejoignez PrepaENA</h1>
              <p className="text-xl text-primary-100">
                Commencez votre préparation aux concours ENA dès aujourd'hui
              </p>
            </div>
            
            <ul className="space-y-4">
              {benefits.map((benefit, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-primary-200 flex-shrink-0" />
                  <span className="text-primary-100">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Copyright - Fixed at bottom */}
          <div className="text-primary-200 text-sm">
            © {new Date().getFullYear()} PrepaENA. Tous droits réservés.
          </div>
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
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-600 text-sm text-center">{error}</p>
            </div>
          )}
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Prénom</Label>
                <Input id="firstName" {...register('firstName')} error={errors.firstName?.message} />
              </div>
              <div>
                <Label htmlFor="lastName">Nom</Label>
                <Input id="lastName" {...register('lastName')} error={errors.lastName?.message} />
              </div>
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register('email')} error={errors.email?.message} />
            </div>
            
            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <PasswordInput id="password" autoComplete="new-password" {...register('password')} error={errors.password?.message} />
            </div>
            
            <div>
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <PasswordInput id="confirmPassword" autoComplete="new-password" {...register('confirmPassword')} error={errors.confirmPassword?.message} />
            </div>
            
            <div>
              <Label htmlFor="examType">Type de Concour</Label>
              <select 
                id="examType" 
                {...register('examType')} 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                <option value="CM">CM - Cour Moyen</option>
                <option value="CMS">CMS - Cour Moyen Superieur</option>
                <option value="CS">CS - Cour Superieur</option>
              </select>
              {errors.examType && (
                <p className="mt-1 text-sm text-red-600">{errors.examType.message}</p>
              )}
            </div>

            <div>
              <Button type="submit" fullWidth disabled={isSubmitting || isLoading}>
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Inscription...</span>
                  </div>
                ) : 'Créer un compte'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
