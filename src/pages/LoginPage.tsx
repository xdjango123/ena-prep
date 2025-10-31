import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PasswordInput } from '../components/ui/PasswordInput';
import { Label } from '../components/ui/Label';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { CheckCircle, Loader, GraduationCap, BookOpen, Target, Award } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email({ message: "L'email n'est pas valide" }),
  password: z.string().min(1, { message: "Le mot de passe est requis" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const { signIn, user, isLoading } = useSupabaseAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema)
  });

  useEffect(() => {
    if (user && !isLoading) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  // Function to translate Supabase error messages to French
  const translateError = (errorMessage: string): string => {
    const errorTranslations: { [key: string]: string } = {
      'Invalid email or password': 'Mot de passe incorrect',
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
      'Invalid login credentials': 'Mot de passe incorrect'
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
    return 'Mot de passe incorrect';
  };

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    setError('');
    
    try {
      const { error } = await signIn(data.email, data.password);
      
      if (error) {
        const translatedError = translateError(error.message);
        setError(translatedError);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError('Une erreur inattendue est survenue.');
      console.error('Login error:', err);
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

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-primary-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 flex flex-col justify-between h-full px-12 py-12 text-white">
          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-4">Bienvenue sur PrepaENA</h1>
              <p className="text-xl text-primary-100">
                Votre plateforme de préparation aux concours ENA
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
              Se connecter
            </h2>
            <p className="mt-2 text-center text-sm text-neutral-600">
              Ou <Link to="/signup" className="font-medium text-primary-600 hover:text-primary-500">créez un compte</Link> si vous n'en avez pas
            </p>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-600 text-sm text-center">{error}</p>
            </div>
          )}
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register('email')} error={errors.email?.message} />
            </div>
            
            <div>
                <div className="flex items-center justify-between">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Link to="/mot-de-passe-oublie" className="text-sm text-primary-600 hover:text-primary-500">
                      Mot de passe oublié ?
                    </Link>
                </div>
              <PasswordInput id="password" autoComplete="current-password" {...register('password')} error={errors.password?.message} />
            </div>
            
            <div className="flex items-center">
              <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-primary-500 border-neutral-300 rounded focus:ring-primary-500" />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-neutral-700">Se souvenir de moi</label>
            </div>

            <div>
              <Button type="submit" fullWidth disabled={isSubmitting || isLoading}>
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Connexion...</span>
                  </div>
                ) : 'Se connecter'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
