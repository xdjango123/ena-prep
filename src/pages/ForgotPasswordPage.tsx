import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { supabase } from '../lib/supabase';
import { CheckCircle, GraduationCap, BookOpen, Target, Award } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "L'email n'est pas valide" }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

const ForgotPasswordPage: React.FC = () => {
  const { resetPassword } = useSupabaseAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [error, setError] = useState('');
  
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema)
  });

  // Function to translate Supabase error messages to French
  const translateError = (errorMessage: string): string => {
    const errorTranslations: { [key: string]: string } = {
      'Invalid email': 'Email invalide',
      'User not found': 'Aucun compte trouvé avec cet email',
      'Email address not authorized': 'Adresse email non autorisée',
      'Too many requests': 'Trop de tentatives. Veuillez réessayer plus tard',
      'Unable to validate email address: invalid format': 'Format d\'email invalide',
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
    return 'Une erreur est survenue. Veuillez réessayer.';
  };

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setError('');
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) {
        setError(translateError(error.message));
      } else {
        setIsEmailSent(true);
      }
    } catch (err) {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEmailSent) {
    return (
      <div className="min-h-screen flex">
        {/* Left Panel */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-900 to-primary-700 flex items-center justify-center p-12">
          <div className="text-white space-y-8">
            <div>
              <GraduationCap className="w-16 h-16 mb-4" />
              <h1 className="text-4xl font-bold mb-4">Bienvenue sur PrepaENA</h1>
              <p className="text-xl text-primary-100">Votre plateforme de préparation aux concours ENA</p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <span>Email envoyé avec succès !</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <span>Vérifiez votre boîte email</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <span>Suivez les instructions</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-neutral-50">
          <div className="w-full max-w-md p-8 space-y-8 bg-white shadow-lg rounded-xl">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-3xl font-extrabold text-neutral-900 mb-2">
                Email envoyé !
              </h2>
              <p className="text-neutral-600">
                Nous avons envoyé un lien de réinitialisation à votre adresse email.
                Vérifiez votre boîte de réception et suivez les instructions.
              </p>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-neutral-500 text-center">
                Vous n'avez pas reçu l'email ? Vérifiez votre dossier spam ou{' '}
                <button 
                  onClick={() => setIsEmailSent(false)}
                  className="text-primary-600 hover:text-primary-500 font-medium cursor-pointer"
                >
                  réessayer
                </button>
              </p>
              
              <div className="text-center">
                <Link 
                  to="/login" 
                  className="text-primary-600 hover:text-primary-500 font-medium"
                >
                  Retour à la connexion
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-900 to-primary-700 flex items-center justify-center p-12">
        <div className="text-white space-y-8">
          <div>
            <GraduationCap className="w-16 h-16 mb-4" />
            <h1 className="text-4xl font-bold mb-4">Bienvenue sur PrepaENA</h1>
            <p className="text-xl text-primary-100">Votre plateforme de préparation aux concours ENA</p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <span>Accès à des milliers de questions</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <span>Tests pratiques et examens blancs</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <span>Suivi de progression personnalisé</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <span>Recommandations intelligentes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-neutral-50">
        <div className="w-full max-w-md p-8 space-y-8 bg-white shadow-lg rounded-xl">
          <div>
            <h2 className="text-center text-3xl font-extrabold text-neutral-900">
              Mot de passe oublié
            </h2>
            <p className="mt-2 text-center text-sm text-neutral-600">
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-600 text-sm text-center">{error}</p>
            </div>
          )}
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <Label htmlFor="email">Adresse email</Label>
              <Input 
                id="email" 
                type="email" 
                autoComplete="email" 
                placeholder="votre@email.com"
                {...register('email')} 
                error={errors.email?.message} 
              />
            </div>

            <div>
              <Button 
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
              </Button>
            </div>
            
            <div className="text-center">
              <Link 
                to="/login" 
                className="text-sm text-primary-600 hover:text-primary-500 font-medium"
              >
                Retour à la connexion
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
