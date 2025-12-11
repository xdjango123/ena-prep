import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { PasswordInput } from '../components/ui/PasswordInput';
import { Label } from '../components/ui/Label';
import { AlertCircle, Shield, GraduationCap } from 'lucide-react';

const resetPasswordSchema = z.object({
  password: z.string().min(8, { message: "Le mot de passe doit contenir au moins 8 caractères" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isValidToken, setIsValidToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema)
  });

  useEffect(() => {
    const validateToken = async () => {
      try {
        // Parse URL parameters - Supabase can send tokens in hash fragment OR query params
        // Hash fragment is the default for email links (e.g., #access_token=xxx&type=recovery)
        const hashParams = new URLSearchParams(location.hash.replace('#', ''));
        const queryParams = new URLSearchParams(location.search);
        
        // Try hash fragment first (Supabase default), then fallback to query params
        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
        const type = hashParams.get('type') || queryParams.get('type');

        console.log('🔍 Validating password reset tokens...');
        console.log('Hash params:', location.hash);
        console.log('Type:', type, 'Has access token:', !!accessToken);

        // If we have tokens, we're coming from a Supabase redirect (password reset email)
        if (type === 'recovery' && accessToken) {
          console.log('🔐 Valid tokens found, verifying OTP...');
          
          let sessionCreated = false;
          let lastError = null;

          // Method 1: Try verifyOtp
          try {
            const { data, error } = await supabase.auth.verifyOtp({
              token_hash: accessToken,
              type: 'recovery'
            });

            if (!error && data.session) {
              console.log('✅ Valid session created via OTP verification');
              setIsValidToken(true);
              sessionCreated = true;
            } else {
              lastError = error;
            }
          } catch (err) {
            lastError = err;
          }

          // Method 2: Try setSession as fallback
          if (!sessionCreated) {
            try {
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || ''
              });

              if (!error && data.session) {
                console.log('✅ Valid session created via setSession');
                setIsValidToken(true);
                sessionCreated = true;
              } else {
                lastError = error;
              }
            } catch (err) {
              lastError = err;
            }
          }

          // If both methods failed
          if (!sessionCreated) {
            console.error('❌ Token validation failed:', lastError);
            setError('Le lien de réinitialisation est invalide ou a expiré.');
          }
        } else {
          setError('Aucun lien de réinitialisation valide trouvé.');
        }
      } catch (err) {
        console.error('❌ Token validation error:', err);
        setError('Une erreur est survenue lors de la validation du lien.');
      } finally {
        setIsLoading(false);
      }
    };

    validateToken();

    // Also listen for Supabase auth state changes (backup method)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth state change:', event);
      if (event === 'PASSWORD_RECOVERY') {
        console.log('✅ PASSWORD_RECOVERY event detected');
        setIsValidToken(true);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [location.search, location.hash]);

  // Function to translate Supabase error messages to French
  const translateError = (errorMessage: string): string => {
    const errorTranslations: { [key: string]: string } = {
      'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères',
      'Invalid password': 'Mot de passe invalide',
      'New password should be different from the old password': 'Le nouveau mot de passe doit être différent de l\'ancien',
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

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setError('');
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({ 
        password: data.password 
      });
      
      if (error) {
        setError(translateError(error.message));
      } else {
        console.log('✅ Password updated successfully');
        
        // Refresh the session to ensure it's valid
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Session refresh failed:', sessionError);
          setError('Erreur de session. Veuillez vous reconnecter.');
          return;
        }
        
        if (sessionData.session) {
          reset(); // Clear form
          // Redirect to dashboard
          navigate('/dashboard', { replace: true });
        } else {
          console.error('❌ No valid session after password update');
          setError('Session expirée. Veuillez vous reconnecter.');
        }
      }
    } catch (err) {
      console.error('❌ Password update error:', err);
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while validating tokens
  if (isLoading) {
    return (
      <div className="min-h-screen flex">
        {/* Left Panel */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-900 to-primary-700 flex items-center justify-center p-12">
          <div className="text-white relative h-50 space-y-8">
            <div className="my-20 mb-40">
              <GraduationCap className="w-16 h-16 mb-4" />
              <h1 className="text-4xl font-bold mb-4">Bienvenue sur PrepaENA</h1>
              <p className="text-xl text-primary-100">Votre plateforme de préparation aux concours ENA</p>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-neutral-50">
          <div className="w-full max-w-md p-8 space-y-8 bg-white shadow-lg rounded-xl text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <h2 className="text-3xl font-extrabold text-neutral-900 mb-2">
              Vérification du lien...
            </h2>
            <p className="text-neutral-600">
              Veuillez patienter pendant que nous vérifions votre lien de réinitialisation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error if token is invalid
  if (!isValidToken) {
    return (
      <div className="min-h-screen flex">
        {/* Left Panel */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-900 to-primary-700 flex items-center justify-center p-12">
          <div className="text-white relative h-50 space-y-8">
            <div className="my-20 mb-40">
              <GraduationCap className="w-16 h-16 mb-4" />
              <h1 className="text-4xl font-bold mb-4">Bienvenue sur PrepaENA</h1>
              <p className="text-xl text-primary-100">Votre plateforme de préparation aux concours ENA</p>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-neutral-50">
          <div className="w-full max-w-md p-8 space-y-8 bg-white shadow-lg rounded-xl text-center">
            <div className="p-4 bg-red-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-3xl font-extrabold text-neutral-900 mb-2">
              Lien invalide
            </h2>
            <p className="text-neutral-600 mb-6">
              {error || 'Ce lien de réinitialisation est invalide ou a expiré.'}
            </p>
            <Button
              onClick={() => navigate('/mot-de-passe-oublie')}
              className="w-full bg-primary-600 text-white hover:bg-primary-700"
            >
              Demander un nouveau lien
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show password reset form
  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-900 to-primary-700 flex items-center justify-center p-12">
        <div className="text-white relative h-50 space-y-8">
          <div className="my-20 mb-40">
            <GraduationCap className="w-16 h-16 mb-4" />
            <h1 className="text-4xl font-bold mb-4">Bienvenue sur PrepaENA</h1>
            <p className="text-xl text-primary-100">Votre plateforme de préparation aux concours ENA</p>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-neutral-50">
        <div className="w-full max-w-md p-8 space-y-8 bg-white shadow-lg rounded-xl">
          <div className="text-center">
            <div className="p-4 bg-primary-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary-600" />
            </div>
            <h2 className="text-3xl font-extrabold text-neutral-900 mb-2">
              Réinitialiser le mot de passe
            </h2>
            <p className="text-neutral-600">
              Veuillez entrer votre nouveau mot de passe
            </p>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <PasswordInput
                id="password"
                {...register('password')}
                placeholder="Votre nouveau mot de passe"
                autoComplete="new-password"
              />
              {errors.password && (
                <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <PasswordInput
                id="confirmPassword"
                {...register('confirmPassword')}
                placeholder="Confirmez votre nouveau mot de passe"
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <p className="text-red-600 text-sm mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>
            
            <Button
              type="submit"
              className="w-full bg-primary-600 text-white hover:bg-primary-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Mise à jour...' : 'Réinitialiser le mot de passe'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;