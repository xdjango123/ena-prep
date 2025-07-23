import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Play, ArrowLeft, Lock, Clock, Target, Shield, Award, Crown } from 'lucide-react';

export const ExamPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [selectedCategory, setSelectedCategory] = useState<'CM' | 'CMS' | 'CS'>('CM');

    // Get available categories based on subscription tier
    const getAvailableCategories = () => {
        if (!user) return [];
        
        switch (user.subscriptionStatus) {
            case 'free':
                return []; // No categories for free tier
            case 'premium':
                // Premium users can only access their selected category
                return user.selectedCategory ? [user.selectedCategory] : [];
            case 'integral':
                // Integral users have access to all categories
                return ['CM', 'CMS', 'CS'];
            default:
                return [];
        }
    };

    const availableCategories = getAvailableCategories();

    // Mock exam categories and access control
    const examCategories = [
        {
            id: 'CM',
            name: 'Court Moyen',
            shortName: 'CM',
            accessible: availableCategories.includes('CM'),
            color: 'bg-blue-500',
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-700',
            borderColor: 'border-blue-200'
        },
        {
            id: 'CMS',
            name: 'Cour Moyen Supérieur',
            shortName: 'CMS',
            accessible: availableCategories.includes('CMS'),
            color: 'bg-green-500',
            bgColor: 'bg-green-50',
            textColor: 'text-green-700',
            borderColor: 'border-green-200'
        },
        {
            id: 'CS',
            name: 'Cour Supérieur',
            shortName: 'CS',
            accessible: availableCategories.includes('CS'),
            color: 'bg-purple-500',
            bgColor: 'bg-purple-50',
            textColor: 'text-purple-700',
            borderColor: 'border-purple-200'
        }
    ];

    // Mock exam data
    const mockExams = [
        {
            id: 1,
            title: 'Examen Blanc #1',
            description: 'Premier examen de simulation complète',
            category: selectedCategory,
            difficulty: 'Intermédiaire',
            estimatedTime: '3h 00min'
        },
        {
            id: 2,
            title: 'Examen Blanc #2',
            description: 'Deuxième examen avec questions avancées',
            category: selectedCategory,
            difficulty: 'Avancé',
            estimatedTime: '3h 00min'
        },
        {
            id: 3,
            title: 'Examen Blanc #3',
            description: 'Examen complet avec cas pratiques',
            category: selectedCategory,
            difficulty: 'Expert',
            estimatedTime: '3h 00min'
        }
    ];

    const handleStartExam = (examId: number) => {
        console.log(`Starting exam ${examId} for category ${selectedCategory}`);
        // Navigate to exam interface (placeholder for now)
        navigate(`/dashboard/exam/${examId}`);
    };

    const handleCategoryChange = (categoryId: 'CM' | 'CMS' | 'CS') => {
        const category = examCategories.find(cat => cat.id === categoryId);
        if (category?.accessible) {
            setSelectedCategory(categoryId);
        }
    };

    const getAccessMessage = (category: typeof examCategories[0]) => {
        if (!category.accessible) {
            if (user?.subscriptionStatus === 'free') {
                return "Nécessite un abonnement Premium ou Intégral";
            } else if (user?.subscriptionStatus === 'premium') {
                return "Non inclus dans votre catégorie sélectionnée";
            }
            return "Accès non autorisé";
        }
        return "";
    };

    // If user is free tier, show upgrade message
    if (user?.subscriptionStatus === 'free') {
        return (
            <div className="p-8 bg-gray-50 min-h-full">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <FileText className="w-10 h-10 text-gray-400" />
                            <div className="flex items-center gap-3">
                                <h1 className="text-4xl font-bold text-gray-600">Examens Blancs</h1>
                                <Lock className="text-4xl text-gray-500" />
                            </div>
                        </div>
                        <Link to="/dashboard" className="text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors flex items-center gap-1.5">
                            <ArrowLeft className="w-4 h-4" />
                            Retour au tableau de bord
                        </Link>
                    </div>

                    <div className="bg-white p-8 rounded-xl shadow-md border text-center">
                        <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                            <Crown className="w-10 h-10 text-gray-400" />
                        </div>
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Accès Premium Requis</h2>
                        <p className="text-gray-600 mb-8 text-lg leading-relaxed max-w-2xl mx-auto">
                            Les examens blancs sont réservés aux abonnés Premium et Intégral. 
                            Passez à un abonnement payant pour accéder aux simulations d'examens en conditions réelles.
                        </p>
                        <div className="flex justify-center gap-4">
                            <Link
                                to="/tarification"
                                className="inline-flex items-center gap-3 px-8 py-4 rounded-lg bg-primary-500 text-white font-bold text-lg hover:bg-primary-600 transition-colors"
                            >
                                <Crown className="w-6 h-6" />
                                Voir les abonnements
                            </Link>
                            <Link
                                to="/dashboard"
                                className="inline-flex items-center gap-3 px-8 py-4 rounded-lg border border-gray-300 text-gray-700 font-bold text-lg hover:bg-gray-50 transition-colors"
                            >
                                Retour au tableau de bord
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 bg-gray-50 min-h-full relative">
            {/* Overlay for locked state */}
            <div className="absolute inset-0 bg-gray-300/20 z-10"></div>
            
            <div className="max-w-6xl mx-auto relative z-20">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <FileText className="w-10 h-10 text-gray-400" />
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-bold text-gray-600">Examens Blancs</h1>
                            <Lock className="text-4xl text-gray-500" />
                        </div>
                    </div>
                    <Link to="/dashboard" className="text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors flex items-center gap-1.5">
                        <ArrowLeft className="w-4 h-4" />
                        Retour au tableau de bord
                    </Link>
                </div>

                {/* Exam Description */}
                <div className="bg-white/80 p-8 rounded-xl shadow-md border mb-8">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-6">L'Expérience d'Examen ENA</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                        <div className="text-center p-4 bg-blue-50/80 rounded-lg border border-blue-200">
                            <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                            <div className="font-bold text-blue-800">3 heures</div>
                            <div className="text-sm text-blue-600">Durée totale</div>
                        </div>
                        <div className="text-center p-4 bg-green-50/80 rounded-lg border border-green-200">
                            <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
                            <div className="font-bold text-green-800">20 questions</div>
                            <div className="text-sm text-green-600">Par matière</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50/80 rounded-lg border border-purple-200">
                            <Shield className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                            <div className="font-bold text-purple-800">Environnement</div>
                            <div className="text-sm text-purple-600">Sécurisé</div>
                        </div>
                        <div className="text-center p-4 bg-orange-50/80 rounded-lg border border-orange-200">
                            <Award className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                            <div className="font-bold text-orange-800">Notation ENA</div>
                            <div className="text-sm text-orange-600">+1, 0, -1</div>
                        </div>
                    </div>

                    <div className="bg-gray-50/80 p-6 rounded-lg">
                        <h3 className="font-semibold text-gray-800 mb-3">Règles de l'examen :</h3>
                        <ul className="space-y-2 text-gray-700">
                            <li className="flex items-start gap-2">
                                <div className="w-2 h-2 bg-gray-400 rounded-full mt-2"></div>
                                <span>Examen chronométré de 3 heures en environnement verrouillé</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="w-2 h-2 bg-gray-400 rounded-full mt-2"></div>
                                <span>20 questions par matière (Anglais, Culture Générale, Logique)</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="w-2 h-2 bg-gray-400 rounded-full mt-2"></div>
                                <span>Système de notation ENA : +1 pour une bonne réponse, 0 pour aucune réponse, -1 pour une mauvaise réponse</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="w-2 h-2 bg-gray-400 rounded-full mt-2"></div>
                                <span>Respect strict des conditions réelles de l'examen de l'ENA</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Category Selection - Only show if user has access to categories */}
                {availableCategories.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-xl font-semibold text-gray-700 mb-4">
                            {user?.subscriptionStatus === 'premium' 
                                ? 'Votre niveau :' 
                                : 'Choisissez votre niveau :'
                            }
                        </h3>
                        <div className="flex gap-4">
                            {examCategories.map((category) => (
                                <div key={category.id} className="relative group">
                                    <button
                                        onClick={() => handleCategoryChange(category.id as 'CM' | 'CMS' | 'CS')}
                                        disabled={!category.accessible}
                                        className={`
                                            px-6 py-3 rounded-full font-medium text-sm transition-all border-2
                                            ${selectedCategory === category.id && category.accessible
                                                ? `${category.color} text-white border-transparent`
                                                : category.accessible
                                                    ? `${category.bgColor} ${category.textColor} ${category.borderColor} hover:${category.color} hover:text-white`
                                                    : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                            }
                                        `}
                                    >
                                        {category.shortName}
                                        {!category.accessible && <Lock className="w-4 h-4 ml-2 inline" />}
                                    </button>
                                    
                                    {!category.accessible && (
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                            {getAccessMessage(category)}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                            {examCategories.find(cat => cat.id === selectedCategory)?.name}
                        </p>
                    </div>
                )}

                {/* Exam Blocks - Only show if user has access */}
                {availableCategories.length > 0 ? (
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-gray-700">Examens disponibles :</h3>
                        {mockExams.map((exam) => (
                            <div key={exam.id} className="bg-white/80 p-6 rounded-xl shadow-md border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="text-lg font-bold text-gray-800">{exam.title}</h4>
                                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                                                {selectedCategory}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 mb-2">{exam.description}</p>
                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                {exam.estimatedTime}
                                            </span>
                                            <span>Difficulté: {exam.difficulty}</span>
                                        </div>
                                    </div>
                                    
                                    <button
                                        onClick={() => handleStartExam(exam.id)}
                                        disabled={true} // Disabled for now
                                        className="px-6 py-3 bg-gray-300 text-gray-500 rounded-lg font-medium flex items-center gap-2 cursor-not-allowed"
                                    >
                                        <Play className="w-5 h-5" />
                                        Commencer
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white/80 p-8 rounded-xl shadow-md border text-center">
                        <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                            <Lock className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-3">Aucun examen disponible</h3>
                        <p className="text-gray-600 mb-6">
                            {user?.subscriptionStatus === 'premium' 
                                ? 'Veuillez sélectionner votre catégorie d\'examen dans votre profil pour accéder aux examens.'
                                : 'Aucun examen disponible pour votre abonnement actuel.'
                            }
                        </p>
                        <Link 
                            to="/dashboard/profile"
                            className="text-primary-600 hover:text-primary-700 underline"
                        >
                            Gérer mon profil
                        </Link>
                    </div>
                )}

                {/* Lock Notice */}
                <div className="mt-8 bg-yellow-50/80 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-yellow-600" />
                        <p className="text-yellow-800 font-medium">
                            Section en cours de développement - Les examens seront bientôt disponibles
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}; 