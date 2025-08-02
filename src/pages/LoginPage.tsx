import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, Loader, GraduationCap, BookOpen, Target, Award } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email({ message: "L'email n'est pas valide" }),
  password: z.string().min(1, { message: "Le mot de passe est requis" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema)
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async (data: LoginFormValues) => {
    setError('');
    try {
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch (err) {
      setError('Email ou mot de passe incorrect.');
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
              Se connecter
            </h2>
            <p className="mt-2 text-center text-sm text-neutral-600">
              Ou <Link to="/signup" className="font-medium text-primary-600 hover:text-primary-500">créez un compte</Link> si vous n'en avez pas
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
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
              <Input id="password" type="password" autoComplete="current-password" {...register('password')} error={errors.password?.message} />
            </div>
            
            <div className="flex items-center">
              <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-primary-500 border-neutral-300 rounded focus:ring-primary-500" />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-neutral-700">Se souvenir de moi</label>
            </div>

            <div>
              <Button type="submit" fullWidth disabled={isSubmitting}>
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