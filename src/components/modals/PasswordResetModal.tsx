import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../ui/Button';
import { PasswordInput } from '../ui/PasswordInput';
import { Label } from '../ui/Label';
import { supabase } from '../../lib/supabase';
import { AlertCircle, Shield, X } from 'lucide-react';

const resetPasswordSchema = z.object({
  password: z.string().min(8, { message: "Le mot de passe doit contenir au moins 8 caractères" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  canClose?: boolean;
}

const PasswordResetModal: React.FC<PasswordResetModalProps> = ({ isOpen, onClose, onSuccess, canClose = true }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema)
  });

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
          console.log('✅ Session refreshed successfully');
          reset(); // Clear form
          onSuccess();
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

  const handleClose = () => {
    if (!canClose) {
      return; // Don't allow closing if canClose is false
    }
    reset();
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Shield className="w-5 h-5 mr-2 text-primary-600" />
            Réinitialiser le mot de passe
          </h3>
          {canClose && (
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          
          <div className="flex gap-3 pt-4">
            {canClose && (
              <Button
                type="button"
                onClick={handleClose}
                className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
                disabled={isSubmitting}
              >
                Annuler
              </Button>
            )}
            <Button
              type="submit"
              className={`${canClose ? 'flex-1' : 'w-full'} bg-primary-600 text-white hover:bg-primary-700`}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Mise à jour...' : 'Réinitialiser'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordResetModal;

